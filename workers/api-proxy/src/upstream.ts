import {
  ApiEnvelope,
  ApiEnvelopeSchema,
  ElectionalSearchRequest,
} from '@inceptio/shared-types';
import type { Env } from './env';

// Cold-cache upstream calls take up to 42s per CLAUDE.md. Worker default fetch
// timeout is generous; this is a guardrail so the search route never blocks
// indefinitely on a runaway upstream.
const UPSTREAM_TIMEOUT_MS = 60_000;

export class UpstreamError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly upstreamBody?: string,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

// Translate flat worker request → nested upstream request shape.
// The upstream wants date_range as { start_date, end_date } objects of {year,month,day}
// and location as { year, month, day, hour, minute, city, country_code OR coords }.
// For an electional search the chart reference time is the start of the window;
// we use noon local on the start date as a stable default.
function toUpstreamBody(req: ElectionalSearchRequest): Record<string, unknown> {
  const start = parseDateParts(req.start);
  const end = parseDateParts(req.end);

  return {
    activity: req.activity,
    date_range: {
      start_date: start,
      end_date: end,
    },
    location: {
      year: start.year,
      month: start.month,
      day: start.day,
      hour: 12,
      minute: 0,
      latitude: req.lat,
      longitude: req.lng,
      timezone: req.timezone,
      city: req.city,
    },
    top_n_windows: 10,
  };
}

function parseDateParts(s: string): { year: number; month: number; day: number } {
  // Accept YYYY-MM-DD or full ISO datetime; take the date portion only.
  const datePart = s.slice(0, 10);
  const [y, m, d] = datePart.split('-');
  if (!y || !m || !d) {
    throw new Error(`Invalid date string: ${s}`);
  }
  return { year: parseInt(y, 10), month: parseInt(m, 10), day: parseInt(d, 10) };
}

export async function callUpstream(
  env: Env,
  req: ElectionalSearchRequest,
): Promise<ApiEnvelope> {
  const url = `${env.UPSTREAM_BASE_URL}/electional/search`;
  const body = toUpstreamBody(req);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': env.ASTROLOGY_API_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new UpstreamError('upstream timeout', 504);
    }
    throw new UpstreamError(
      `upstream fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      502,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new UpstreamError(`upstream ${res.status}`, res.status, text);
  }

  const json = await res.json();
  // Throw the raw ZodError on schema mismatch; the search route's catch block
  // logs `error.issues` for line-by-line diagnostics. Wrapping it in
  // UpstreamError would hide the structured issues.
  return ApiEnvelopeSchema.parse(json);
}

export async function probeUpstreamHealth(env: Env): Promise<boolean> {
  const url = `${env.UPSTREAM_BASE_URL}/health`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5_000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'X-API-Key': env.ASTROLOGY_API_KEY },
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}
