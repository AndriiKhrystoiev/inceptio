import { type Env, TIERS, resolveTier } from './env';
import { formatDateInTz, nextLocalMidnightUnix, secondsToNextLocalMidnight } from './lib/local-date';

// Generous local-dev ceiling so `wrangler dev` / mobile testing isn't blocked
// after a few searches. Production uses the tier limit; an unknown ENV
// fails safe to the production ceiling.
const DEV_LIMIT = 1000;
const KV_MIN_TTL_SECONDS = 60; // Workers KV rejects expirationTtl < 60.

export interface MeterResult {
  allowed: boolean;
  count: number;
  limit: number;
  used: number;        // allowed: post-increment count; blocked: the current
                       // stored count (for "X of N" copy). Equals `count`.
  reset_at_unix: number;
}

export function quotaKey(deviceId: string, localDate: string): string {
  return `quota:${deviceId}:${localDate}`;
}

function resolveLimit(env: Env, deviceId: string): number {
  if (env.ENV === 'development') return DEV_LIMIT;
  // production OR unknown ENV → production tier ceiling (fail-safe).
  return TIERS[resolveTier(env, deviceId)].limit;
}

/**
 * Fixed-window-per-local-day counter, KV-backed. The window is one calendar
 * day in `bucketTz` (the user's device tz, resolved by the caller). Non-atomic
 * read-modify-write — worst case a device bursts ~2x PER concurrently-stale KV
 * PoP during the <=~60s propagation window (NOT a hard global 2x). Acceptable
 * for a cost-shaping soft cap; Durable Objects is the seam for hard enforcement.
 *
 * `now` is injectable (default Date.now) — the ONLY deterministic path for the
 * date/DST/TTL tests, since vitest fake timers don't drive KV/Intl-tz.
 *
 * @param now Unix SECONDS (not ms; default floor(Date.now()/1000)). Injectable
 *   for deterministic date/DST/TTL tests — do not pass Date.now() raw.
 */
export async function meterSearch(
  env: Env,
  deviceId: string,
  bucketTz: string,
  now: number = Math.floor(Date.now() / 1000),
): Promise<MeterResult> {
  const kv = env.CACHE;
  const localDate = formatDateInTz(new Date(now * 1000), bucketTz);
  const key = quotaKey(deviceId, localDate);
  const limit = resolveLimit(env, deviceId);
  const resetAt = nextLocalMidnightUnix(now * 1000, bucketTz);

  const current = await kv.get(key);
  const parsed = current !== null ? Number(current) : 0;
  // Floor at 0: treat non-finite OR negative stored values as 0 so a corrupt /
  // tampered KV entry can't slip past the `count >= limit` check (Number.isFinite
  // alone would let a negative value through and grant extra searches).
  const count = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;

  if (count >= limit) {
    return { allowed: false, count, limit, used: count, reset_at_unix: resetAt };
  }

  const next = count + 1;
  // + 60s grace so the key doesn't expire the instant local midnight ticks;
  // the value is always >= 60 because of this buffer, so the Math.max(60, …)
  // floor is belt-and-suspenders against KV's hard 60s minimum.
  const ttl = Math.max(
    KV_MIN_TTL_SECONDS,
    secondsToNextLocalMidnight(now, bucketTz) + 60,
  );
  await kv.put(key, String(next), { expirationTtl: ttl });
  return { allowed: true, count: next, limit, used: next, reset_at_unix: resetAt };
}
