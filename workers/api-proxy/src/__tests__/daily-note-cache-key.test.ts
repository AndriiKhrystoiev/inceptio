import { describe, expect, it } from 'vitest';
import { keyOf } from '../daily-note-cache';

// Task 2.3 — the cache key must include `activity` to prevent cross-activity
// cache poisoning. Without this dimension, a wedding request and a travel
// request on the same lat/lng/date would share an entry — wrong response.
//
// The function is named `keyOf` (established convention in
// daily-note-cache.test.ts); the plan's suggested `buildDailyNoteCacheKey`
// is not the name actually used in this codebase.
describe('daily-note cache key includes activity', () => {
  it('key embeds activity then locale as the trailing segments', () => {
    const key = keyOf({
      lat: 50.45,
      lng: 30.52,
      dateIso: '2026-06-02',
      activity: 'wedding',
      locale: 'en',
    });
    // VOICE Task 0: locale is now the FINAL segment, appended after activity.
    expect(key.endsWith(':wedding:en')).toBe(true);
  });

  it('keys for different activities are distinct', () => {
    const base = { lat: 50.45, lng: 30.52, dateIso: '2026-06-02', locale: 'en' } as const;
    const a = keyOf({ ...base, activity: 'wedding' });
    const b = keyOf({ ...base, activity: 'travel' });
    expect(a).not.toBe(b);
  });

  // VOICE Task 0 — strong-form cross-locale-poisoning guard. Two requests
  // differing ONLY in locale MUST produce different keys.
  it('keys for different locales are distinct (cross-locale-poisoning boundary)', () => {
    const base = { lat: 50.45, lng: 30.52, dateIso: '2026-06-02', activity: 'wedding' } as const;
    const en = keyOf({ ...base, locale: 'en' });
    const de = keyOf({ ...base, locale: 'de' });
    expect(en).not.toBe(de);
  });
});
