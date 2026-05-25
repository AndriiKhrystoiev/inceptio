import { FEATURES } from './env';

const PERIOD_SECONDS = FEATURES.FREE_SEARCH_PERIOD_DAYS * 24 * 60 * 60;

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

// Fixed-window counter, KV-backed. Approximation of "10 requests per 30 days":
// in the worst case a device can burst 20 across a window boundary. Acceptable
// for an MVP soft anti-abuse limit; upgrade to Durable Objects if abuse appears.
//
// Race condition: two concurrent KV reads at count=9 will both write count=10.
// Not worth fixing for this risk profile.
export async function checkAndIncrement(
  kv: KVNamespace,
  deviceId: string,
  nowUnix: number = Math.floor(Date.now() / 1000),
): Promise<RateLimitResult> {
  const start = periodStart(nowUnix);
  const key = rateLimitKey(deviceId, nowUnix);
  const limit = FEATURES.MAX_FREE_SEARCHES;
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
