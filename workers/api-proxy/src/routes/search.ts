import { z } from 'zod';
import { ElectionalSearchRequestSchema } from '@inceptio/shared-types';
import type { Env } from '../env';
import { computeCacheKey, readCache, writeCache } from '../cache';
import { checkAndIncrement } from '../rate-limit';
import { callUpstream, UpstreamError } from '../upstream';
import { translate } from '../translations';

export async function handleSearch(
  req: Request,
  env: Env,
): Promise<Response> {
  const deviceId = req.headers.get('X-Device-Id');
  if (!deviceId) {
    return Response.json(
      { error: 'missing_device_id', message: 'X-Device-Id header required' },
      { status: 400 },
    );
  }

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
      {
        error: 'validation_failed',
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }
  const searchRequest = parsed.data;

  const rl = await checkAndIncrement(env, deviceId);
  if (!rl.allowed) {
    return Response.json(
      {
        error: 'rate_limited',
        message:
          'Free tier limit reached. Try again after the period resets.',
        limit: rl.limit,
        reset_at_unix: rl.reset_at_unix,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rl.reset_at_unix - Math.floor(Date.now() / 1000)),
          'X-RateLimit-Limit': String(rl.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rl.reset_at_unix),
        },
      },
    );
  }

  const cacheKey = await computeCacheKey(searchRequest);
  const cached = await readCache<unknown>(env.CACHE, cacheKey);
  if (cached) {
    return Response.json(cached, {
      headers: {
        'X-Cache': 'HIT',
        'X-RateLimit-Limit': String(rl.limit),
        'X-RateLimit-Remaining': String(rl.limit - rl.count),
      },
    });
  }

  try {
    const upstream = await callUpstream(env, searchRequest);
    const translated = translate(upstream, searchRequest.activity);
    // Cache the translated response. Cache key is already versioned by
    // TRANSLATIONS_VERSION (see cache.ts), so dictionary updates invalidate
    // stale entries naturally.
    await writeCache(env.CACHE, cacheKey, translated);
    return Response.json(translated, {
      headers: {
        'X-Cache': 'MISS',
        'X-RateLimit-Limit': String(rl.limit),
        'X-RateLimit-Remaining': String(rl.limit - rl.count),
      },
    });
  } catch (err) {
    // ZodError thrown from inside callUpstream() means upstream response did
    // not match our schema. Log issues in full so we can see exactly which
    // fields the API returned that we did not anticipate.
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
      // For 4xx, forward the upstream's structured error body so the mobile
      // app can show a specific message (e.g. INVALID_DATE_RANGE) instead of
      // a generic 'Something went wrong'. The upstream body is JSON shaped as
      // `{ detail: { success: false, error: { error_code, message, ... }}}`.
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
    // Unknown error — most likely a bug in translate() or cache write. Log
    // the full error so the wrangler dev console shows the stack.
    console.error('[search] unexpected error:', err);
    if (err instanceof Error && err.stack) {
      console.error('[search] stack:', err.stack);
    }
    return Response.json(
      {
        error: 'internal_error',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
