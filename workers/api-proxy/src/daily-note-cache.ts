import type { Env } from './env';
import type { DailyNoteOutput } from './translations/types';
import { LIBRARY_VERSION } from './translations/types';

export interface DailyNoteCacheKey {
  lat: number;
  lng: number;
  /** Wall-clock date YYYY-MM-DD in the event location's timezone. */
  dateIso: string;
}

/**
 * Compose the KV key. LIBRARY_VERSION is part of the key per PICKER-
 * CONTRACT.md §6 so a library bump (astrologer-ruling lockstep PR) atomically
 * invalidates all cached daily notes — old keys are simply abandoned and
 * naturally expire via their TTL. No explicit eviction loop needed.
 *
 * Lat/lng round to 2 decimal places (~1.1 km granularity) so nearby
 * locations share a cache entry. Adequate for daily-note purposes; the sky
 * doesn't change meaningfully at city-block scale.
 */
export function keyOf({ lat, lng, dateIso }: DailyNoteCacheKey): string {
  const latRounded = lat.toFixed(2);
  const lngRounded = lng.toFixed(2);
  return `daily-note:${LIBRARY_VERSION}:${latRounded}:${lngRounded}:${dateIso}`;
}

/**
 * TTL = seconds until end of the named UTC day. The daily note is daily —
 * caching past midnight produces a stale read. Floor at 60s so a clock skew
 * or past-day request still has a small cache window rather than 0.
 */
export function ttlSecondsForDay(dateIso: string, nowUnix: number): number {
  const endOfDay = new Date(`${dateIso}T23:59:59Z`).getTime() / 1000;
  return Math.max(60, Math.floor(endOfDay - nowUnix));
}

export async function readCache(
  env: Env,
  key: DailyNoteCacheKey,
): Promise<DailyNoteOutput | null> {
  const raw = await env.CACHE.get(keyOf(key), 'json');
  return raw as DailyNoteOutput | null;
}

export async function writeCache(
  env: Env,
  key: DailyNoteCacheKey,
  value: DailyNoteOutput,
  nowUnix: number,
): Promise<void> {
  await env.CACHE.put(keyOf(key), JSON.stringify(value), {
    expirationTtl: ttlSecondsForDay(key.dateIso, nowUnix),
  });
}
