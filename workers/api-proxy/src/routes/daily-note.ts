import type { Env } from '../env';
import { ActivitySchema, type Activity } from '@inceptio/shared-types';
import { readCache, writeCache } from '../daily-note-cache';
import { PART_OF_DAY_CUTOFFS } from '../translations/dictionary/part-of-day';
import { composeDisplayable } from '../translations/daily-notes/composer';
import { computeMoonPhase } from '../translations/daily-notes/moon-phase';
import { synthesizeDailyNote } from '../translations/daily-notes/picker';
import { LIBRARY_VERSION } from '../translations/types';
import type {
  DailyNoteOutput,
  DailyNoteResponseShape,
} from '../translations/types';
import { handleSearch } from './search';
import tzLookup from '@photostructure/tz-lookup';

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
 * Activity selection (Phase A — feature/activity-preference):
 *   - The client MAY supply ?activity=<wedding|contracts|business_launch|travel>.
 *     The chosen activity drives the underlying /electional/search call (so the
 *     daily note reflects the activity the user actually cares about) and will,
 *     in Task 2.3, be embedded in the cache key.
 *   - If the param is missing (legacy mobile clients pre-rollout), the route
 *     logs a `console.warn` and falls back to `business_launch`. The fallback
 *     is temporary: Phase B (Task 8.1) makes activity required and removes
 *     the fallback once the mobile rollout completes.
 *   - If the param is present but not a known MVP activity, the route returns
 *     400 `invalid_activity` with the enumerated valid values. We fail loudly
 *     here rather than silently substituting business_launch — an unknown
 *     activity from a client is a contract violation, not a legacy gap.
 *
 * Why business_launch as the fallback: (a) it produces the most balanced
 * factor distribution for a general-purpose daily reading, (b) it never
 * depends on natal data, and (c) it's an MVP activity so the API key
 * already authorizes it.
 *
 * Saved-search status fan-out is deferred to a follow-on task — for MVP the
 * endpoint returns `saved_searches: []` and the mobile client derives its
 * own saved-search statuses using local data (or via a future endpoint that
 * accepts saved searches in a POST body).
 */
/**
 * Best-effort KV counter used by the Phase A activity-missing rate metric.
 * Read-modify-write — not atomic, but Workers KV doesn't expose atomic
 * increment and a single-digit miss rate on a 14-day rolling counter
 * is well within the accuracy needed at Checkpoint 3 (gate is "did the
 * mobile rollout actually happen?", not exact arithmetic).
 *
 * Errors are swallowed: a KV outage MUST NOT bubble up and 5xx a
 * user-facing /daily-note request just because a metric write failed.
 */
const COUNTER_TTL_SECONDS = 14 * 86400;

async function bumpCounter(kv: KVNamespace, key: string): Promise<void> {
  try {
    const prev = await kv.get(key);
    const prevNum = prev !== null ? Number(prev) : 0;
    // Guard against corruption: if KV ever returns a non-numeric string
    // (e.g. literal 'NaN' from an earlier corrupt write, or a stray
    // non-digit value), Number(prev) yields NaN. Without this guard,
    // NaN + 1 = NaN → String(NaN) = 'NaN' written back to KV — the
    // counter would then stay stuck at 'NaN' for the full 14-day TTL.
    // Treat non-finite reads as zero and reset cleanly on the next bump.
    const base = Number.isFinite(prevNum) ? prevNum : 0;
    const next = String(base + 1);
    await kv.put(key, next, { expirationTtl: COUNTER_TTL_SECONDS });
  } catch {
    // Best-effort: swallow KV errors so the user request still succeeds.
    // The counter is monitoring infrastructure, not load-bearing.
  }
}

/**
 * @photostructure/tz-lookup throws on invalid coords ('invalid coordinates').
 * Wrap defensively so the authority logic can null-coalesce to client tz on
 * unresolvable coordinates (truly invalid lat/lng).
 *
 * Spec §7 + EC-T1.
 */
function tryWorkerTzLookup(lat: number, lng: number): string | null {
  try {
    return tzLookup(lat, lng);
  } catch {
    return null;
  }
}

/**
 * No-op ExecutionContext fallback for legacy callers (sibling test files
 * that haven't been updated to pass ctx). In production the entry handler
 * in src/index.ts always passes the real ctx from the Worker runtime;
 * this default only fires from tests that pre-date Task 2.6. waitUntil
 * just executes the promise (best-effort fire-and-forget) so counter
 * writes still happen — without the deferred lifetime extension, but
 * that's harmless in tests.
 */
const NOOP_CTX: ExecutionContext = {
  waitUntil(p: Promise<unknown>) {
    void p;
  },
  passThroughOnException() {
    // no-op
  },
  // `props` is required by recent @cloudflare/workers-types but is only
  // used by Workers-for-Platforms; empty object satisfies the type.
  props: {},
};

export async function handleDailyNote(
  req: Request,
  env: Env,
  ctx: ExecutionContext = NOOP_CTX,
): Promise<Response> {
  const url = new URL(req.url);
  const latRaw = url.searchParams.get('lat');
  const lngRaw = url.searchParams.get('lng');
  // Preserve raw client-supplied tz as null when absent — needed for mismatch
  // detection below (a missing tz param is NOT a mismatch candidate).
  const clientTz: string | null = url.searchParams.get('tz');
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

  // Hoisted once for both observability paths below (tz-mismatch + activity-
  // missing) so two separate `new Date()` calls can't straddle the UTC midnight
  // boundary and produce different date keys for counters that should agree.
  // activityRaw is hoisted alongside so the tz-mismatch warn payload can name
  // the activity without re-parsing the query string.
  const todayUtc = new Date().toISOString().slice(0, 10);
  const activityRaw = url.searchParams.get('activity');

  // ── Tz authority block (Spec §7 / Task 3.2) ────────────────────────────────
  // The Worker is the canonical timezone source: derive from coordinates, fall
  // back to client-supplied tz, fall back to UTC. All downstream logic uses
  // effectiveTz, NOT the raw clientTz. This ensures even legacy mobile builds
  // (or browser clients) that send a stale deviceTimezone get the correct
  // local date for their actual location.
  const derivedTz: string | null = tryWorkerTzLookup(lat, lng);
  const effectiveTz: string = derivedTz ?? clientTz ?? 'UTC';

  // Mismatch observability: when the Worker can resolve a tz from the
  // coordinates AND the client supplied a different one, warn + bump counter.
  // Fires on gradual-rollout drift detection; does NOT fire when client omitted
  // tz entirely (clientTz === null) — that's the legacy no-tz-param path.
  if (derivedTz !== null && clientTz !== null && clientTz !== derivedTz) {
    console.warn('[daily-note] tz_lat_lng_mismatch:', {
      lat,
      lng,
      got: clientTz,
      expected: derivedTz,
      activity: activityRaw ?? 'unknown',
      date: todayUtc,
    });
    ctx.waitUntil(bumpCounter(env.CACHE, `metrics:dn-tz-mismatch:${todayUtc}`));
  }
  // ────────────────────────────────────────────────────────────────────────────

  // Activity selection (Phase A). See route docstring for full rationale.
  //   - Present + valid  → use it
  //   - Present + invalid → 400 invalid_activity (loud contract violation)
  //   - Missing          → warn + fall back to business_launch (legacy compat,
  //                        removed in Phase B / Task 8.1)
  //
  // We use ActivitySchema.safeParse so the same enum that validates
  // /electional/search bodies validates this query param — single source of
  // truth for the four MVP activities lives in @inceptio/shared-types.
  // (activityRaw hoisted above the tz authority block.)
  let activity: Activity;
  // Tracks whether the missing-?activity= branch fired. Threaded to the
  // composer so an asymmetric severity_hint composed against the default
  // business_launch can emit a diagnostic warn. Phase B (Task 8.1) removes
  // both the fallback and this boolean once the mobile rollout completes.
  let wasActivityFallback = false;
  if (activityRaw === null) {
    console.warn('[daily-note] activity missing, defaulting to business_launch');
    activity = 'business_launch';
    wasActivityFallback = true;
  } else {
    const parsed = ActivitySchema.safeParse(activityRaw);
    if (!parsed.success) {
      // `ActivitySchema.options` is Zod 3's literal-tuple exposure for
      // z.enum([...]) — single source of truth so this list never drifts
      // when a future activity (e.g. v1.4 surgery/legal) is added to the
      // schema. Previously hard-coded ['wedding','contracts',...]; a
      // schema addition would have silently shipped an outdated 400
      // response body until someone noticed in production.
      return Response.json(
        {
          error: 'invalid_activity',
          valid: ActivitySchema.options,
        },
        { status: 400 },
      );
    }
    activity = parsed.data;
  }
  // `activity` is now a guaranteed Activity. Task 2.3 embeds it in the
  // cache key; Task 2.4 threads it through composeDisplayable for the
  // activity-specific severity_hint and the fallback diagnostic warn.

  // Phase A activity-missing rate counter (Task 2.6). Gates Checkpoint 3 —
  // we want a queryable rolling rate of "what % of /daily-note requests
  // are still hitting the legacy no-activity fallback?" before flipping
  // Phase B (Task 8.1) which removes the fallback. Counter is intentionally
  // dated by UTC `today` to give a 14-day rolling window via TTL; the date
  // boundary is fine for a rate metric even if individual requests are in
  // other timezones. ctx.waitUntil keeps the read-modify-write off the
  // response critical path; the helper swallows errors so a KV outage
  // doesn't 5xx the user's request.
  //
  // TODO(follow-up before Checkpoint 3): add /admin/activity-missing-rate
  // endpoint and query-activity-missing-rate.ts CLI per plan Task 2.6 Step 5.
  // Counter primitives ship now; the read-side query surface lands when
  // Checkpoint 3 actually fires in Phase 8.
  // (todayUtc hoisted above the tz authority block.)
  ctx.waitUntil(bumpCounter(env.CACHE, `metrics:dn-total:${todayUtc}`));
  if (wasActivityFallback) {
    ctx.waitUntil(bumpCounter(env.CACHE, `metrics:dn-activity-missing:${todayUtc}`));
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
    dateIso = formatDateInTz(now, effectiveTz);
  }

  // Activity is part of the cache key (Task 2.3) so cross-activity requests
  // don't share entries. Phase A fallback case (activity defaulted to
  // business_launch above) is naturally namespaced under
  // `...:business_launch`; when the client later upgrades to ?activity=wedding,
  // it's a fresh cache miss against `...:wedding` — correct behavior.
  const cacheKey = { lat, lng, dateIso, activity };

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
      activity,
      lat,
      lng,
      start: dateIso,
      end: dateIso,
      timezone: effectiveTz,
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

    // Compose PickResult + moon_phase (+ activity-asymmetric severity_hint
    // when the picked entry warrants one) into DailyNoteOutput. The composer
    // is activity-aware; the picker is not.
    dailyNote = composeDisplayable({
      picked,
      moonPhase: computeMoonPhase(dateIso),
      activity,
      wasActivityFallback,
    });

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
