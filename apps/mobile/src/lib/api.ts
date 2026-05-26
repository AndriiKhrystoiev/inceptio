import {
  ApiEnvelopeSchema,
  ElectionalSearchRequest,
  ElectionalSearchRequestSchema,
} from '@inceptio/shared-types';
import type { ApiEnvelope } from '@inceptio/shared-types';
import { API_CONFIG } from '../config/api';
import { getDeviceId } from './device-id';

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
  constructor(public readonly resetAtUnix: number | null) {
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
  envelope: ApiEnvelope;
  cacheHit: boolean;
  rateLimitRemaining: number | null;
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
  // Validate the request shape at the client edge so a bad input fails before
  // the network roundtrip and produces a typed error rather than a 400.
  const parsedRequest = ElectionalSearchRequestSchema.parse(request);

  const deviceId = await getDeviceId();
  const url = `${API_CONFIG.baseUrl}/electional/search`;
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
      },
      body: JSON.stringify(parsedRequest),
    },
    API_CONFIG.timeout,
  );

  const cacheHit = res.headers.get('X-Cache') === 'HIT';
  const remainingHeader = res.headers.get('X-RateLimit-Remaining');
  const rateLimitRemaining = remainingHeader ? Number(remainingHeader) : null;

  if (res.status === 429) {
    // Two distinct 429s reach the mobile boundary:
    //   1. Worker's own per-device counter (body.error === 'rate_limited').
    //   2. Upstream astrology-api.io quota exhaustion, proxied through the
    //      Worker (body.upstream.detail.error.error_code === 'RATE_LIMIT_EXCEEDED').
    // The user-facing copy is different for each — the user is at fault only
    // in case 1.
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      reset_at_unix?: number;
      upstream?: { detail?: { error?: { error_code?: string; message?: string } } };
    };
    const upstreamError = body.upstream?.detail?.error;
    if (upstreamError?.error_code === 'RATE_LIMIT_EXCEEDED') {
      throw new UpstreamQuotaError(upstreamError.message ?? 'Upstream quota exhausted');
    }
    throw new RateLimitError(body.reset_at_unix ?? null);
  }

  if (res.status === 502) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      issues?: unknown;
    };
    if (body.error === 'upstream_schema_mismatch') {
      throw new SchemaMismatchError(body.issues);
    }
    throw new ServerError(502, 'Upstream error');
  }

  if (!res.ok) {
    // The Worker forwards upstream 4xx body under `upstream.detail.error` —
    // unwrap to detect specific error codes (e.g. INVALID_DATE_RANGE).
    const body = (await res.json().catch(() => ({}))) as {
      upstream?: { detail?: { error?: { error_code?: string; message?: string } } };
    };
    const upstreamError = body.upstream?.detail?.error;
    if (upstreamError?.error_code === 'INVALID_DATE_RANGE') {
      throw new DateRangeError(upstreamError.message ?? 'Date range too long');
    }
    throw new ServerError(res.status, `HTTP ${res.status}`);
  }

  const json = await res.json();
  // Worker already validated, but we re-validate at the mobile boundary so a
  // dev-mode shape drift surfaces in the app, not in a server log far away.
  const parseResult = ApiEnvelopeSchema.safeParse(json);
  if (!parseResult.success) {
    // Print the Zod issues to the Metro console so shape drift is diagnosable
    // without UI plumbing. The user-facing screen only sees the generic
    // SchemaMismatchError; this log is the only place the path/value appears.
    console.error(
      '[searchElectional] schema mismatch — zod issues:',
      JSON.stringify(parseResult.error.issues, null, 2),
    );
    throw new SchemaMismatchError(parseResult.error.issues);
  }

  return {
    envelope: parseResult.data,
    cacheHit,
    rateLimitRemaining,
  };
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
