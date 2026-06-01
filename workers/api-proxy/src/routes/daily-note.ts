import type { Env } from '../env';
import { readCache, writeCache } from '../daily-note-cache';
import { PART_OF_DAY_CUTOFFS } from '../translations/dictionary/part-of-day';
import { computeMoonPhase } from '../translations/daily-notes/moon-phase';
import { synthesizeDailyNote } from '../translations/daily-notes/picker';
import { LIBRARY_VERSION } from '../translations/types';
import type {
  DailyNoteOutput,
  DailyNoteResponseShape,
} from '../translations/types';
import { handleSearch } from './search';

/**
 * GET /daily-note?lat=<n>&lng=<n>&tz=<iana>
 *
 * Returns the contract response per PICKER-CONTRACT.md §2:
 *   { daily_note, saved_searches: [], total_saved_count: 0,
 *     library_version, part_of_day_cutoffs }
 *
 * Cache key includes LIBRARY_VERSION so a library bump (astrologer-ruling
 * lockstep PR) atomically invalidates all entries — see contract §6 and
 * daily-note-cache.ts.
 *
 * The activity used for the underlying search is `business_launch` — chosen
 * because (a) it produces the most balanced factor distribution for a
 * general-purpose daily reading, (b) it never depends on natal data, and
 * (c) it's an MVP activity so the API key already authorizes it.
 *
 * Saved-search status fan-out is deferred to a follow-on task — for MVP the
 * endpoint returns `saved_searches: []` and the mobile client derives its
 * own saved-search statuses using local data (or via a future endpoint that
 * accepts saved searches in a POST body).
 */
export async function handleDailyNote(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const latRaw = url.searchParams.get('lat');
  const lngRaw = url.searchParams.get('lng');
  const tz = url.searchParams.get('tz') ?? 'UTC';
  const deviceId = req.headers.get('X-Device-Id');

  // Device id is required: /daily-note internally fans out to /electional/
  // search which enforces its own X-Device-Id contract for rate-limit
  // attribution. Without the header here, the fan-out call would return 400
  // missing_device_id and we'd silently 502 — the same failure mode the
  // field-name bug had. Match the /electional/search contract explicitly
  // so this route fails loudly at the boundary, not deep in the pipeline.
  if (!deviceId) {
    return Response.json(
      { error: 'missing_device_id', message: 'X-Device-Id header required' },
      { status: 400 },
    );
  }

  // Explicit null-check FIRST. `Number(null)` returns 0 (not NaN), so a missing
  // lat/lng would silently pass the isFinite check below and the route would
  // proceed with lat=0 lng=0 — wrong location, valid coordinates.
  if (latRaw === null || lngRaw === null) {
    return Response.json(
      { error: 'bad_request', message: 'lat and lng are required' },
      { status: 400 },
    );
  }

  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json(
      { error: 'bad_request', message: 'lat and lng must be numeric' },
      { status: 400 },
    );
  }

  const now = new Date();

  // Dev/demo date override. Lets developers and demo recorders see
  // strong/good/mixed/closed days on the Today screen without waiting
  // for them to occur naturally — particularly useful for stakeholder
  // demo recordings of the mood cycle and for smoke-testing edge cases
  // like full-moon-on-closed-day collisions.
  //
  // Gated on env.ENV !== 'production' so the override is silently ignored
  // in production (production always uses computed-today, regardless of
  // what ?date= query param a client tries to send). The silent-ignore
  // semantics match the principle that production users get the actual
  // sky for actual today; any debug query param a curious user passes
  // doesn't accidentally show them yesterday's reading or a contrived
  // demo state.
  //
  // The cache key already embeds dateIso, so override dates naturally
  // get separate cache entries without any cache-layer change.
  const dateOverride = url.searchParams.get('date');
  let dateIso: string;
  if (dateOverride && env.ENV !== 'production') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOverride)) {
      return Response.json(
        { error: 'bad_request', message: 'date must be YYYY-MM-DD' },
        { status: 400 },
      );
    }
    dateIso = dateOverride;
  } else {
    dateIso = formatDateInTz(now, tz);
  }

  const cacheKey = { lat, lng, dateIso };

  // Read cache. On hit we have the daily_note portion; envelope is added below.
  let dailyNote: DailyNoteOutput | null = await readCache(env, cacheKey);
  let cacheHit = dailyNote !== null;

  if (!dailyNote) {
    // Cache miss — fetch a same-day single-window search to get the top
    // window and excluded ranges. Synthesize an internal request and call
    // the existing /electional/search handler in-process.
    // Field names MUST match ElectionalSearchRequestSchema in
    // @inceptio/shared-types (lat/lng/start/end/city/timezone/activity). The
    // original draft used latitude/longitude/date_from/date_to which the
    // canonical schema rejects via Zod → handleSearch returned non-OK →
    // this route silently 502'd on every call. Latent since 224ec5a (Task 18
    // of the Worker build); surfaced when the mobile integration first hit
    // the live endpoint. Regression guard in
    // src/__tests__/daily-note-route-e2e.test.ts exercises the real
    // handleSearch path so this class of body-shape bug fails loudly going
    // forward (the existing daily-note-route.test.ts mocks handleSearch and
    // therefore can't catch field-name drift).
    //
    // `city` is required by the schema but the daily-note's location-
    // agnostic fan-out has no meaningful city label. Placeholder is fine:
    // city is a display label, never used for chart math.
    const searchBody = {
      activity: 'business_launch',
      lat,
      lng,
      start: dateIso,
      end: dateIso,
      timezone: tz,
      city: 'unknown',
    };
    const internalReq = new Request('https://internal/electional/search', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // Pass the device id through so handleSearch's rate-limit fires
        // against the same counter as a direct /electional/search call.
        // The X-Device-Id presence is guarded at the top of this handler.
        'X-Device-Id': deviceId,
      },
      body: JSON.stringify(searchBody),
    });
    const searchRes = await handleSearch(internalReq, env);
    if (!searchRes.ok) {
      return Response.json(
        { error: 'upstream_failure', message: 'electional/search failed' },
        { status: 502 },
      );
    }
    // handleSearch returns the translated v3 envelope: { success, data: {
    // top_windows, excluded_ranges, ... }, metadata, ... }. The route reads
    // top_windows/excluded_ranges from inside `data` — NOT at the top level.
    const searchPayload = (await searchRes.json()) as {
      data?: {
        top_windows?: Array<{ score: number; factors: unknown[] }>;
        excluded_ranges?: Array<{ reason_id: string; severity: 'hard_stop' | 'medium' }>;
        summary?: { no_viable_windows?: boolean };
      };
    };

    const topWindow = searchPayload.data?.top_windows?.[0] ?? null;
    const excludedRanges = searchPayload.data?.excluded_ranges ?? [];
    // `summary.no_viable_windows` is the authoritative day-closed signal —
    // upstream determined no viable election exists anywhere in the day. A
    // missing summary defaults to `false` (fail-safe: prefer score-based
    // bucketing over collapsing to closed when the contract slips). See
    // quality-bucket.ts for the empirical rationale.
    const noViableWindows = searchPayload.data?.summary?.no_viable_windows ?? false;

    // No-viable-windows is a NORMAL daily-note case, not an error. Two
    // distinct shapes the route handles:
    //
    //   (a) Full-day exclusion (e.g. all-day Moon-VoC): upstream returns
    //       top_windows: [] + excluded_ranges: [reason] + summary.no_viable_windows:
    //       true. Picker takes the closed path via reason_id mapping.
    //
    //   (b) Partial-day exclusion (e.g. morning Moon-VoC with afternoon
    //       windows): upstream returns top_windows: [...] (the surviving
    //       slots) + excluded_ranges: [reason] + summary.no_viable_windows:
    //       false. Picker routes through the mixed bucket — voice spec §3.3
    //       entries #10-14 are designed for "positive with a caveat".
    //
    // 502 stays for the genuine no-data case (no top window AND no
    // exclusions) — upstream has nothing usable to say about the day.
    if (!topWindow && excludedRanges.length === 0) {
      return Response.json(
        { error: 'no_top_window', message: 'upstream returned no top window and no exclusions' },
        { status: 502 },
      );
    }
    const effectiveTopWindow = topWindow ?? { score: 0, factors: [] };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- upstream types live in shared-types; runtime guarded by handleSearch's Zod parse
    const picked = synthesizeDailyNote({
      topWindow: effectiveTopWindow as any,
      excludedRangesActiveToday: excludedRanges as any,
      today_iso_date: dateIso,
      noViableWindows,
    });

    // Compose PickResult + moon_phase into DailyNoteOutput
    dailyNote = {
      ...picked,
      moon_phase: computeMoonPhase(dateIso),
    };

    const nowUnix = Math.floor(now.getTime() / 1000);
    await writeCache(env, cacheKey, dailyNote, nowUnix);
  }

  const response: DailyNoteResponseShape & { cache_hit: boolean } = {
    daily_note: dailyNote,
    saved_searches: [],            // MVP: mobile derives client-side; future task adds fan-out
    total_saved_count: 0,          // matches saved_searches length for MVP
    library_version: LIBRARY_VERSION,
    part_of_day_cutoffs: PART_OF_DAY_CUTOFFS,
    cache_hit: cacheHit,
  };

  return Response.json(response);
}

function formatDateInTz(d: Date, tz: string): string {
  // Intl.DateTimeFormat with `en-CA` produces YYYY-MM-DD natively.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(d);
}
