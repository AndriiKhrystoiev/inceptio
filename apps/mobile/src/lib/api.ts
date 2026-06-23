import {
  ApiEnvelopeSchema,
  ElectionalSearchRequestSchema,
} from '@inceptio/shared-types';
import type { ElectionalSearchRequest } from '@inceptio/shared-types';
import { translate } from '@inceptio/translations';
import type { TranslatedResponse, Locale } from '@inceptio/translations';
import { API_CONFIG } from '../config/api';
import { getDeviceId } from './device-id';
import { activeBundle } from '../i18n/locale';
import { toUpstreamBody } from './upstream-body';
import { emit } from './telemetry';

/**
 * Shared per-request metadata headers for routes that still go through the
 * Worker (getDailyNote, postAlertAck). NOT used by searchElectional, which
 * now calls the public API directly.
 *
 * X-Locale carries the active i18next bundle key (e.g. `es-419`, `pt-BR`).
 */
async function requestMetaHeaders(): Promise<Record<string, string>> {
  return {
    'X-Device-Id': await getDeviceId(),
    'X-Locale': activeBundle(),
  };
}

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
      headers: { 'Content-Type': 'application/json' },
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
  const res = await fetchWithTimeout(url, { method: 'GET' }, 5_000);
  if (!res.ok) throw new ServerError(res.status, 'Health check failed');
  return (await res.json()) as HealthResult;
}

// ─── /daily-note ──────────────────────────────────────────────────────────

import { DailyNoteResponseSchema } from '@inceptio/shared-types';
import type { Activity, DailyNoteResponse } from '@inceptio/shared-types';

export interface DailyNoteResult {
  response: DailyNoteResponse;
  cacheHit: boolean;
}

export interface GetDailyNoteInput {
  lat: number;
  lng: number;
  tz: string;
  activity: Activity;
}

/**
 * GET /daily-note?lat={n}&lng={n}&tz={iana}
 *
 * Worker contract per docs/superpowers/design-handoff/daily-note/
 * PICKER-CONTRACT.md. Mobile sends lat/lng/tz; Worker derives
 * today_iso_date server-side and returns the full DailyNoteResponseShape
 * (daily_note + saved_searches + total_saved_count + library_version +
 * part_of_day_cutoffs).
 *
 * Errors map to the existing discriminated hierarchy:
 *   - 429 rate-limited → RateLimitError (DEFENSIVE ONLY: /daily-note's internal
 *     fan-out is metered:false, so the Worker's per-device cap is never
 *     triggered here. Retained in case metering is ever re-enabled on this route.)
 *   - 429 upstream quota → UpstreamQuotaError
 *   - 502 → ServerError(502, ...)
 *   - Zod parse failure → SchemaMismatchError
 */
export async function getDailyNote(
  input: GetDailyNoteInput,
): Promise<DailyNoteResult> {
  const url = `${API_CONFIG.baseUrl}/daily-note?lat=${input.lat}&lng=${input.lng}&tz=${encodeURIComponent(input.tz)}&activity=${input.activity}`;

  const res = await fetchWithTimeout(
    url,
    {
      method: 'GET',
      // O2: locale-only. tz stays a query param; no X-Timezone header here.
      headers: await requestMetaHeaders(),
    },
    API_CONFIG.timeout,
  );

  if (res.status === 429) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      reset_at_unix?: number;
      limit?: number;
      used?: number;
      upstream?: { detail?: { error?: { error_code?: string; message?: string } } };
    };
    const upstreamError = body.upstream?.detail?.error;
    if (upstreamError?.error_code === 'RATE_LIMIT_EXCEEDED') {
      throw new UpstreamQuotaError(upstreamError.message ?? 'Upstream quota exhausted');
    }
    throw new RateLimitError(body.reset_at_unix ?? null, body.limit ?? null, body.used ?? null);
  }

  if (!res.ok) {
    throw new ServerError(res.status, `HTTP ${res.status}`);
  }

  const json = await res.json();
  const parseResult = DailyNoteResponseSchema.safeParse(json);
  if (!parseResult.success) {
    console.error(
      '[getDailyNote] schema mismatch — zod issues:',
      JSON.stringify(parseResult.error.issues, null, 2),
    );
    throw new SchemaMismatchError(parseResult.error.issues);
  }

  return {
    response: parseResult.data,
    cacheHit: parseResult.data.cache_hit ?? false,
  };
}

/**
 * POST /daily-note/alert-ack
 *
 * Fire-and-forget acknowledgement of a new-window alert. KV.put is
 * idempotent — calling this twice with the same alert_id is a no-op.
 *
 * Currently unwired in MVP: NewWindowCard (scaffold/) doesn't render,
 * so no caller invokes this. Function exists as API surface contract
 * so a future SavedSearch wire-in plugs in mechanically. Smoke test in
 * src/lib/__tests__/post-alert-ack.test.ts guards against silent drift
 * (renamed fields, swapped headers) before the caller arrives.
 *
 * Future timing decision (pinned in design memo §6):
 *   When NewWindowCard wires in, ack on USER INTERACTION (tap card to
 *   navigate or tap to dismiss). NOT on render. NOT on viewport
 *   visibility. Render-ack treats scroll-past as a dismissal — wrong.
 */
export async function postAlertAck(alertId: string): Promise<void> {
  const deviceId = await getDeviceId();
  const url = `${API_CONFIG.baseUrl}/daily-note/alert-ack`;
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, alert_id: alertId }),
    },
    API_CONFIG.timeout,
  );
  if (!res.ok) {
    throw new ServerError(res.status, `Alert ack failed: HTTP ${res.status}`);
  }
}
