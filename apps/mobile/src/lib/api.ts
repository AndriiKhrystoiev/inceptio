import {
  ApiEnvelopeSchema,
  ElectionalSearchRequestSchema,
  DailyNoteResponseSchema,
} from '@inceptio/shared-types';
import type { ElectionalSearchRequest, Activity, DailyNoteResponse } from '@inceptio/shared-types';
import { translate } from '@inceptio/translations';
import type { TranslatedResponse, Locale } from '@inceptio/translations';
import {
  synthesizeDailyNote, composeDisplayable, computeMoonPhase,
  LIBRARY_VERSION, PART_OF_DAY_CUTOFFS,
} from '@inceptio/translations';
import { API_CONFIG } from '../config/api';
import { activeBundle } from '../i18n/locale';
import { toUpstreamBody } from './upstream-body';
import { emit } from './telemetry';
import tzLookup from '@photostructure/tz-lookup';
import { tzEquivalent } from './tz-aliases';
import { formatDateInTz } from './local-date';
import { dailyNoteCacheKey, readDailyNote, writeDailyNote } from './daily-note-cache';

// Discriminated error hierarchy — call sites can `instanceof` against the
// specific subclass to pick a message, instead of inspecting strings or codes.
export class ApiError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends ApiError {
  constructor(cause?: unknown) {
    super('Network unreachable', cause);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends ApiError {
  constructor() {
    super('Request timed out');
    this.name = 'TimeoutError';
  }
}

export class RateLimitError extends ApiError {
  constructor(
    public readonly resetAtUnix: number | null,
    public readonly limit: number | null = null,
    public readonly used: number | null = null,
  ) {
    super('Rate limit reached');
    this.name = 'RateLimitError';
  }
}

/**
 * Distinct from RateLimitError. Fires when the *upstream* astrology-api.io
 * account quota is exhausted (different billing period & limit than the
 * Worker's own per-device counter). The user did nothing wrong — the API
 * plan needs a top-up or a reset. Surfaced with different copy so users
 * aren't told they're the ones rate-limited.
 */
export class UpstreamQuotaError extends ApiError {
  constructor(public readonly upstreamMessage: string) {
    super(upstreamMessage);
    this.name = 'UpstreamQuotaError';
  }
}

export class SchemaMismatchError extends ApiError {
  constructor(public readonly issues: unknown) {
    super('Upstream schema mismatch');
    this.name = 'SchemaMismatchError';
  }
}

/**
 * Upstream rejected the request because the date range exceeds its 367-day
 * cap. The DatePickerScreen caps user input at 365 days, so this should be
 * unreachable in normal flows — but keep it as a defense so a misconfigured
 * draft (e.g. an older persisted draft with a >365-day range) surfaces a
 * specific message instead of falling through to the generic ServerError.
 */
export class DateRangeError extends ApiError {
  constructor(public readonly upstreamMessage: string) {
    super(upstreamMessage);
    this.name = 'DateRangeError';
  }
}

export class ServerError extends ApiError {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ServerError';
  }
}

export interface SearchResult {
  envelope: TranslatedResponse;
  cacheHit: boolean;            // always false now (upstream sets no X-Cache); kept for API stability
  rateLimitRemaining: number | null; // always null now; kept for API stability
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new TimeoutError();
    }
    throw new NetworkError(err);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * X-API-Key header when a dev key is configured (dev/test builds only —
 * API_CONFIG.apiKey is null in production). Empty object otherwise.
 */
function authHeaders(): Record<string, string> {
  return API_CONFIG.apiKey ? { 'X-API-Key': API_CONFIG.apiKey } : {};
}

export async function searchElectional(
  request: ElectionalSearchRequest,
): Promise<SearchResult> {
  const parsedRequest = ElectionalSearchRequestSchema.parse(request);
  // activeBundle() only ever returns one of the supported Locale codes (its
  // resolver is bounded to the same union), so this narrowing cast is safe.
  const locale = activeBundle() as Locale;

  const url = `${API_CONFIG.baseUrl}/electional/search`;
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(toUpstreamBody(parsedRequest)),
    },
    API_CONFIG.timeout,
  );

  if (res.status === 429) {
    // Upstream per-IP quota. The 429 body shape is unverified (Phase 0); be
    // tolerant — surface UpstreamQuotaError regardless of body contents so the
    // soft-block UX fires. (No per-device counter exists anymore.)
    const body = (await res.json().catch(() => ({}))) as { detail?: unknown; message?: string };
    throw new UpstreamQuotaError(
      typeof body.message === 'string' ? body.message : 'Upstream quota reached',
    );
  }

  if (!res.ok) {
    // 422 (bad request shape) and other 4xx/5xx. Upstream returns FastAPI
    // `{ detail: ... }` — surface as ServerError; the request builder is tested
    // to produce a valid shape, so a 422 here means a genuine input problem.
    throw new ServerError(res.status, `HTTP ${res.status}`);
  }

  const json = await res.json();
  const parseResult = ApiEnvelopeSchema.safeParse(json);
  if (!parseResult.success) {
    console.error(
      '[searchElectional] schema mismatch — zod issues:',
      JSON.stringify(parseResult.error.issues, null, 2),
    );
    throw new SchemaMismatchError(parseResult.error.issues);
  }

  // Translate locally — MUST happen before returning (displayable consumers).
  const envelope = translate(parseResult.data, parsedRequest.activity, locale, {
    onUnknown: (field, value) => emit('translate_unknown_enum', { field, value }),
  });

  return { envelope, cacheHit: false, rateLimitRemaining: null };
}

export interface HealthResult {
  status: 'healthy';
  worker_version: string;
  upstream_check: boolean;
}

export async function healthCheck(): Promise<HealthResult> {
  const url = `${API_CONFIG.baseUrl}/health`;
  const res = await fetchWithTimeout(url, { method: 'GET', headers: authHeaders() }, 5_000);
  if (!res.ok) throw new ServerError(res.status, 'Health check failed');
  return (await res.json()) as HealthResult;
}

// ─── getDailyNote — on-device synthesis ───────────────────────────────────
//
// Removed: Worker /daily-note route (remove-cloudflare migration).
// getDailyNote now calls searchElectional directly, synthesizes the daily
// note on-device using @inceptio/translations, and persists the result to
// AsyncStorage for cache reads on the same calendar day.

export interface DailyNoteResult {
  response: DailyNoteResponse;
  cacheHit: boolean;
}

export interface GetDailyNoteInput {
  lat: number;
  lng: number;
  tz?: string;
  activity: Activity;
}

function tryTzLookup(lat: number, lng: number): string | null {
  try { return tzLookup(lat, lng); } catch { return null; }
}

/**
 * Synthesize today's daily note on-device from a direct search to astrology-api.io.
 *
 * Tz authority chain (mirrors the removed Worker route):
 *   1. coordinates → tzLookup (most authoritative)
 *   2. client-supplied tz
 *   3. 'UTC' fallback
 *
 * Results are cached in AsyncStorage keyed by (lat, lng, dateIso, activity, locale)
 * so repeated calls on the same calendar day are free.
 */
export async function getDailyNote(
  input: GetDailyNoteInput,
): Promise<DailyNoteResult> {
  const { lat, lng, activity } = input;
  const locale = activeBundle() as Locale;

  // Tz authority: coordinates first, client tz, then UTC (mirrors the worker).
  const derivedTz = tryTzLookup(lat, lng);
  const effectiveTz = derivedTz ?? input.tz ?? 'UTC';
  const dateIso = formatDateInTz(new Date(), effectiveTz);

  const key = dailyNoteCacheKey({ lat, lng, dateIso, activity, locale });
  let dailyNote = await readDailyNote(key);
  const cacheHit = dailyNote !== null;

  if (!dailyNote) {
    // Prefer client tz upstream when alias-equivalent (older upstream tzdata).
    const upstreamTz =
      input.tz && derivedTz && tzEquivalent(input.tz, derivedTz) ? input.tz : effectiveTz;

    const { envelope } = await searchElectional({
      activity, lat, lng, start: dateIso, end: dateIso, timezone: upstreamTz, city: 'unknown',
    });
    const data = envelope.data as {
      top_windows?: Array<{ score: number; factors: unknown[] }>;
      excluded_ranges?: Array<{ reason_id: string; severity: 'hard_stop' | 'medium' }>;
      summary?: { no_viable_windows?: boolean };
    };
    const topWindow = data.top_windows?.[0] ?? null;
    const excludedRanges = data.excluded_ranges ?? [];
    const noViableWindows = data.summary?.no_viable_windows ?? false;

    if (!topWindow && excludedRanges.length === 0) {
      throw new ServerError(502, 'No top window and no exclusions for today');
    }
    const effectiveTopWindow = topWindow ?? { score: 0, factors: [] };

    const picked = synthesizeDailyNote({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- runtime guarded by searchElectional's Zod parse
      topWindow: effectiveTopWindow as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ditto
      excludedRangesActiveToday: excludedRanges as any,
      today_iso_date: dateIso,
      noViableWindows,
      locale,
    });
    dailyNote = composeDisplayable({
      picked, moonPhase: computeMoonPhase(dateIso), activity, locale, wasActivityFallback: false,
    });
    await writeDailyNote(key, dailyNote);
  }

  const parseResult = DailyNoteResponseSchema.safeParse({
    daily_note: dailyNote,
    saved_searches: [],
    total_saved_count: 0,
    library_version: LIBRARY_VERSION,
    part_of_day_cutoffs: PART_OF_DAY_CUTOFFS,
    cache_hit: cacheHit,
  });
  if (!parseResult.success) {
    console.error(
      '[getDailyNote] schema mismatch — zod issues:',
      JSON.stringify(parseResult.error.issues, null, 2),
    );
    throw new SchemaMismatchError(parseResult.error.issues);
  }
  return { response: parseResult.data as DailyNoteResponse, cacheHit };
}

// postAlertAck removed — Task 3.5 adds a local replacement.
