import { describe, expect, it } from 'vitest';
import { keyOf, ttlSecondsForDay } from '../daily-note-cache';
import { LIBRARY_VERSION } from '../translations/types';

// `activity` became a required dimension of the cache key in Task 2.3
// (feature/activity-preference Phase A). Tests below default to
// `business_launch` — the historical fallback — so the assertions remain
// focused on the dimension under test (LIBRARY_VERSION, lat/lng rounding,
// date). Cross-activity distinctness is covered separately in
// daily-note-cache-key.test.ts.
const A: 'business_launch' = 'business_launch';

describe('keyOf', () => {
  it('includes LIBRARY_VERSION so library bumps invalidate cached entries atomically', () => {
    const key = keyOf({ lat: 50.4501, lng: 30.5234, dateIso: '2026-05-29', activity: A, locale: 'en' });
    expect(key).toContain(LIBRARY_VERSION);
    expect(key.startsWith(`daily-note:${LIBRARY_VERSION}:`)).toBe(true);
  });

  it('rounds lat/lng to 2 decimal places (~1.1 km granularity) so nearby locations share a cache entry', () => {
    const k1 = keyOf({ lat: 50.4501234, lng: 30.5234567, dateIso: '2026-05-29', activity: A, locale: 'en' });
    const k2 = keyOf({ lat: 50.4499999, lng: 30.5234001, dateIso: '2026-05-29', activity: A, locale: 'en' });
    expect(k1).toBe(k2);
  });

  it('different dates produce different keys', () => {
    const k1 = keyOf({ lat: 50.45, lng: 30.52, dateIso: '2026-05-29', activity: A, locale: 'en' });
    const k2 = keyOf({ lat: 50.45, lng: 30.52, dateIso: '2026-05-30', activity: A, locale: 'en' });
    expect(k1).not.toBe(k2);
  });
});

describe('ttlSecondsForDay', () => {
  it('returns seconds until end of day for the given dateIso', () => {
    // dateIso end-of-day is 23:59:59 UTC; from noon UTC same day = ~12h
    const noonUnix = new Date('2026-05-29T12:00:00Z').getTime() / 1000;
    const ttl = ttlSecondsForDay('2026-05-29', noonUnix);
    expect(ttl).toBeGreaterThan(11 * 3600);
    expect(ttl).toBeLessThan(13 * 3600);
  });

  it('floors at 60 seconds (never returns 0 or negative)', () => {
    // Far past dateIso: end-of-day is well in the past
    const ttl = ttlSecondsForDay('2024-01-01', new Date('2026-05-29T12:00:00Z').getTime() / 1000);
    expect(ttl).toBe(60);
  });
});
