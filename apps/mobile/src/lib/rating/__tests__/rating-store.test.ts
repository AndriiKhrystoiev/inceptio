import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mirror the activity-preference.test.ts pattern: an in-memory Map standing in
// for storage.ts's synchronous cache. Path resolves to src/lib/storage.
const memory = new Map<string, string>();
vi.mock('../../storage', () => ({
  storage: {
    getString: (k: string) => memory.get(k),
    set: (k: string, v: string) => { memory.set(k, v); },
    delete: (k: string) => { memory.delete(k); },
  },
}));

import {
  localDayKey, pruneAttempts, loadHistory, isFirstEverSave,
  recordActiveDay, recordSuccessfulSearch, recordFrustration,
  recordFirstSaveDone, recordAttempt, resetRatingState,
  oncePerKey, searchKeyOf, __resetRatingDedupeForTests,
} from '../rating-store';

const NOW = new Date('2026-06-09T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

beforeEach(() => { memory.clear(); __resetRatingDedupeForTests(); });

describe('rating-store', () => {
  it('localDayKey: device-local YYYY-MM-DD', () => {
    expect(localDayKey(new Date(2026, 5, 9))).toBe('2026-06-09'); // local components → stable
  });

  it('pruneAttempts: drops entries older than the 365d window', () => {
    const kept = pruneAttempts([daysAgo(10), daysAgo(400)], NOW);
    expect(kept).toEqual([daysAgo(10)]);
  });

  it('recordActiveDay: increments once per NEW local day only', () => {
    recordActiveDay(new Date(2026, 5, 8));
    recordActiveDay(new Date(2026, 5, 8)); // same day → no-op
    recordActiveDay(new Date(2026, 5, 9)); // new day → +1
    expect(loadHistory(NOW).distinctDayCount).toBe(2);
  });

  it('recordSuccessfulSearch / recordFrustration / first-save reflected in history', () => {
    recordSuccessfulSearch();
    recordSuccessfulSearch();
    recordFrustration(NOW);
    expect(loadHistory(NOW).successfulSearches).toBe(2);
    expect(loadHistory(NOW).lastFrustrationAt).toBe(NOW.toISOString());
  });

  it('isFirstEverSave: true until recorded, false after', () => {
    expect(isFirstEverSave()).toBe(true);
    recordFirstSaveDone();
    expect(isFirstEverSave()).toBe(false);
  });

  it('recordAttempt: sets lastAttemptAt, appends, and prunes >365d', () => {
    memory.set('rating.attemptsInWindow', JSON.stringify([daysAgo(400)]));
    recordAttempt(NOW);
    const h = loadHistory(NOW);
    expect(h.lastAttemptAt).toBe(NOW.toISOString());
    expect(h.attemptsInWindow).toEqual([NOW.toISOString()]); // old entry pruned
  });

  it('oncePerKey: dedupes consecutive identical keys, allows new ones', () => {
    expect(oncePerKey('b', 'k1')).toBe(true);
    expect(oncePerKey('b', 'k1')).toBe(false);
    expect(oncePerKey('b', 'k2')).toBe(true);
  });

  it('searchKeyOf: deterministic from request identity', () => {
    const r = { activity: 'wedding', start: '2026-06-09', end: '2026-07-09', lat: 50.4, lng: 30.5 };
    expect(searchKeyOf(r)).toBe(searchKeyOf({ ...r }));
  });

  it('resetRatingState: clears all rating.* keys', () => {
    recordSuccessfulSearch();
    recordFirstSaveDone();
    resetRatingState();
    expect(loadHistory(NOW).successfulSearches).toBe(0);
    expect(isFirstEverSave()).toBe(true);
  });
});
