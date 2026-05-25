import type { Env } from '../env';
import { HEALTH_CACHE_TTL_SECONDS } from '../env';
import { probeUpstreamHealth } from '../upstream';

const UPSTREAM_HEALTH_KEY = 'health:upstream';

export async function handleHealth(env: Env): Promise<Response> {
  let upstreamCheck = false;

  const cached = await env.CACHE.get(UPSTREAM_HEALTH_KEY);
  if (cached === '1' || cached === '0') {
    upstreamCheck = cached === '1';
  } else {
    upstreamCheck = await probeUpstreamHealth(env);
    await env.CACHE.put(UPSTREAM_HEALTH_KEY, upstreamCheck ? '1' : '0', {
      expirationTtl: HEALTH_CACHE_TTL_SECONDS,
    });
  }

  return Response.json({
    status: 'healthy',
    worker_version: env.WORKER_VERSION,
    upstream_check: upstreamCheck,
  });
}
