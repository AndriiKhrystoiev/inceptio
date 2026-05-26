import { FEATURES, type Env } from './env';

const PERIOD_SECONDS = FEATURES.FREE_SEARCH_PERIOD_DAYS * 24 * 60 * 60;

/**
 * Rate limit varies by environment:
 * - production: 10 / 30 days — matches CLAUDE.md "Paywall hidden" decision.
 *   Soft-block protects astrology-api.io quota while paywall UI is disabled.
 * - development: 1000 / 30 days — comfortable headroom for mobile testing.
 *   Local Wrangler dev would otherwise hit the production limit and block
 *   feature work after ~10 searches.
 */
export const LIMITS = {
  development: 1000,
  production: 10,
} as const;

function getMaxRequests(env: Env): number {
  return LIMITS[env.ENV] ?? LIMITS.production;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  period_start_unix: number;
  reset_at_unix: number;
}

export function periodStart(nowUnix: number): number {
  return Math.floor(nowUnix / PERIOD_SECONDS) * PERIOD_SECONDS;
}

export function rateLimitKey(deviceId: string, nowUnix: number): string {
  return `ratelimit:${deviceId}:${periodStart(nowUnix)}`;
}

// Fixed-window counter, KV-backed. Approximation of "N requests per 30 days":
// in the worst case a device can burst 2N across a window boundary. Acceptable
// for an MVP soft anti-abuse limit; upgrade to Durable Objects if abuse appears.
//
// Race condition: two concurrent KV reads at count=N-1 will both write count=N.
// Not worth fixing for this risk profile.
export async function checkAndIncrement(
  env: Env,
  deviceId: string,
  nowUnix: number = Math.floor(Date.now() / 1000),
): Promise<RateLimitResult> {
  const kv = env.CACHE;
  const start = periodStart(nowUnix);
  const key = rateLimitKey(deviceId, nowUnix);
  const limit = getMaxRequests(env);
  const resetAt = start + PERIOD_SECONDS;

  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) : 0;

  if (count >= limit) {
    return {
      allowed: false,
      count,
      limit,
      period_start_unix: start,
      reset_at_unix: resetAt,
    };
  }

  const next = count + 1;
  await kv.put(key, String(next), { expirationTtl: PERIOD_SECONDS });

  return {
    allowed: true,
    count: next,
    limit,
    period_start_unix: start,
    reset_at_unix: resetAt,
  };
}
