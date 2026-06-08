import { z } from 'zod';
import { ElectionalSearchRequestSchema } from '@inceptio/shared-types';
import type { ElectionalSearchRequest } from '@inceptio/shared-types';
import type { Env } from '../env';
import { computeCacheKey, readCache, writeCache } from '../cache';
import { meterSearch, type MeterResult } from '../rate-limit';
import { resolveBucketTz } from '../lib/local-date';
import { callUpstream, UpstreamError } from '../upstream';
import { translate } from '../translations';
import { bumpCounter } from '../lib/kv-counter';
import { isValidLocale, resolveLocale } from '../lib/locale';
import type { Locale } from '../translations/types';

// No-op ExecutionContext default so callers/tests that omit `ctx` don't crash.
// Public + daily-note both pass a real ctx in production.
const NOOP_CTX: ExecutionContext = {
  waitUntil() {},
  passThroughOnException() {},
  props: {},
};

/**
 * Single reachable search entry. `meter` defaults to TRUE — fail toward
 * protection: a caller must consciously pass `{ meter: false }` to be exempt.
 * The public POST /electional/search route meters; daily-note's internal
 * fan-out opts out. The cache→upstream→translate work lives in the private
 * `searchCore` below (no exported unmetered surface).
 *
 * `opts.now` is an optional injectable Unix-seconds clock for deterministic
 * tests; production omits it and meterSearch falls back to the real clock.
 */
export async function handleSearch(
  req: Request,
  env: Env,
  ctx: ExecutionContext = NOOP_CTX,
  opts: { meter?: boolean; now?: number } = {},
): Promise<Response> {
  const { meter = true, now } = opts;

  // Parse + validate BEFORE metering so invalid requests never burn quota.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: 'invalid_json', message: 'request body must be JSON' },
      { status: 400 },
    );
  }

  const parsed = ElectionalSearchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'validation_failed', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const searchRequest = parsed.data;

  // Validate X-Locale UNCONDITIONALLY, before metering. Deliberately NOT inside
  // the `if (meter)` block and NOT gated on X-Device-Id: an absent locale is
  // valid (unset), so this never regresses existing clients that send no
  // locale header; a malformed one is a 400 regardless of metering.
  if (!isValidLocale(req.headers.get('X-Locale'))) {
    return Response.json(
      { error: 'invalid_locale', message: 'X-Locale header is malformed' },
      { status: 400 },
    );
  }

  // VOICE phase: resolve the (shape-valid) X-Locale to a supported Locale ONCE
  // here and thread the non-optional result through searchCore → both the
  // cache key (cross-locale-poisoning boundary) and translate(). Absent or
  // well-formed-but-unsupported → 'en'.
  const locale: Locale = resolveLocale(req.headers.get('X-Locale'));

  let rl: MeterResult | null = null;
  if (meter) {
    const deviceId = req.headers.get('X-Device-Id');
    if (!deviceId) {
      return Response.json(
        { error: 'missing_device_id', message: 'X-Device-Id header required' },
        { status: 400 },
      );
    }
    // Bucket the daily quota by the USER's tz (device), not the searched
    // location's tz. Header → search-location tz → UTC, first valid wins.
    const bucketTz = resolveBucketTz(
      req.headers.get('X-Timezone'),
      searchRequest.timezone,
    );
    rl = await meterSearch(env, deviceId, bucketTz, now);
    const nowSec = now ?? Math.floor(Date.now() / 1000);

    // Aggregate-only telemetry — UTC-dated so /admin/cap-metrics's 14-day UTC
    // window aligns (the quota bucket is device-tz; the metric date is UTC by
    // design). NEVER put deviceId in a metric key. Best-effort via waitUntil:
    // a metric write must never affect the response.
    const utcDate = new Date(nowSec * 1000).toISOString().slice(0, 10);
    ctx.waitUntil(bumpCounter(env.CACHE, `metrics:search-metered:${utcDate}`));
    if (rl.allowed) {
      ctx.waitUntil(bumpCounter(env.CACHE, `metrics:search-reach:${utcDate}:${rl.used}`));
    } else {
      ctx.waitUntil(bumpCounter(env.CACHE, `metrics:search-capped:${utcDate}`));
    }

    if (!rl.allowed) {
      const retryAfter = rl.reset_at_unix - nowSec;
      return Response.json(
        {
          error: 'rate_limited',
          message: 'Daily search limit reached. Resets at local midnight.',
          limit: rl.limit,
          used: rl.used,
          reset_at_unix: rl.reset_at_unix,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(0, retryAfter)),
            'X-RateLimit-Limit': String(rl.limit),
            // Intentionally 0: this request was blocked. The success path
            // computes remaining as `limit - used` in searchCore.
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rl.reset_at_unix),
          },
        },
      );
    }
  }

  return searchCore(searchRequest, env, rl, locale);
}

/**
 * PRIVATE — not exported. The unmetered search core. There is no external call
 * surface, so no caller can accidentally bypass metering: the only way in is
 * through `handleSearch` (which meters unless `meter:false`).
 * Returns the translated v3 envelope `{ data: { top_windows, excluded_ranges,
 * summary }, ... }` byte-identically to the pre-refactor handler.
 */
async function searchCore(
  searchRequest: ElectionalSearchRequest,
  env: Env,
  rl: MeterResult | null,
  locale: Locale,
): Promise<Response> {
  const rlHeaders: Record<string, string> = rl
    ? {
        'X-RateLimit-Limit': String(rl.limit),
        'X-RateLimit-Remaining': String(rl.limit - rl.used),
      }
    : {};

  const cacheKey = await computeCacheKey(searchRequest, locale);
  const cached = await readCache<unknown>(env.CACHE, cacheKey);
  if (cached) {
    return Response.json(cached, { headers: { 'X-Cache': 'HIT', ...rlHeaders } });
  }

  try {
    const upstream = await callUpstream(env, searchRequest);
    const translated = translate(upstream, searchRequest.activity, locale);
    await writeCache(env.CACHE, cacheKey, translated);
    return Response.json(translated, { headers: { 'X-Cache': 'MISS', ...rlHeaders } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error('[search] upstream response failed schema validation');
      console.error('[search] zod issues:', JSON.stringify(err.issues, null, 2));
      return Response.json(
        {
          error: 'upstream_schema_mismatch',
          message: 'upstream response did not match expected schema',
          issues: err.issues,
        },
        { status: 502 },
      );
    }
    if (err instanceof UpstreamError) {
      console.error('[search] upstream error:', err.status, err.message);
      let upstreamPayload: unknown;
      if (err.upstreamBody) {
        try { upstreamPayload = JSON.parse(err.upstreamBody); } catch { /* keep undefined */ }
      }
      return Response.json(
        {
          error: 'upstream_error',
          message: err.message,
          status: err.status,
          upstream: upstreamPayload,
        },
        { status: err.status >= 500 ? 502 : err.status },
      );
    }
    console.error('[search] unexpected error:', err);
    if (err instanceof Error && err.stack) console.error('[search] stack:', err.stack);
    return Response.json(
      { error: 'internal_error', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
