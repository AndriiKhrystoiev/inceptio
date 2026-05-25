import { ElectionalSearchRequestSchema } from '@inceptio/shared-types';
import type { Env } from '../env';
import { computeCacheKey, readCache, writeCache } from '../cache';
import { checkAndIncrement } from '../rate-limit';
import { callUpstream, UpstreamError } from '../upstream';

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

  const rl = await checkAndIncrement(env.CACHE, deviceId);
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
    await writeCache(env.CACHE, cacheKey, upstream);
    return Response.json(upstream, {
      headers: {
        'X-Cache': 'MISS',
        'X-RateLimit-Limit': String(rl.limit),
        'X-RateLimit-Remaining': String(rl.limit - rl.count),
      },
    });
  } catch (err) {
    if (err instanceof UpstreamError) {
      return Response.json(
        { error: 'upstream_error', message: err.message, status: err.status },
        { status: err.status >= 500 ? 502 : err.status },
      );
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
