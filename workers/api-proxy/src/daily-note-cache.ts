import type { Activity } from '@inceptio/shared-types';
import type { Env } from './env';
import type { DailyNoteOutput, Locale } from './translations/types';
import { LIBRARY_VERSION } from './translations/types';

export interface DailyNoteCacheKey {
  lat: number;
  lng: number;
  /** Wall-clock date YYYY-MM-DD in the event location's timezone. */
  dateIso: string;
  /**
   * Activity dimension (Phase A — feature/activity-preference, Task 2.3).
   * Without this, two requests on the same lat/lng/date but different
   * activities (e.g. wedding vs travel) would share a cache entry — wrong
   * response. Embedding activity in the key namespaces entries per activity
   * and naturally produces a fresh miss when the same device upgrades from
   * the legacy fallback (`business_launch`) to a specific activity.
   */
  activity: Activity;
  /**
   * Request locale (VOICE phase). LOAD-BEARING: the daily-note copy is now
   * composed in the request locale, so two requests differing only in locale
   * produce different `headline`/`supporting`/`severity_hint` and MUST NOT
   * share a cache entry. Appended as the final key segment (see keyOf).
   */
  locale: Locale;
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
 *
 * Activity then locale are the trailing segments so it reads naturally and so
 * existing log tooling that grep'd on the date prefix still matches the
 * leading portion. Locale is last (VOICE phase) — appended so an en-only
 * historical reader still prefix-matches the activity portion.
 */
export function keyOf({ lat, lng, dateIso, activity, locale }: DailyNoteCacheKey): string {
  const latRounded = lat.toFixed(2);
  const lngRounded = lng.toFixed(2);
  return `daily-note:${LIBRARY_VERSION}:${latRounded}:${lngRounded}:${dateIso}:${activity}:${locale}`;
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
