import { describe, expect, it } from 'vitest';
import {
  daysUntil,
  isHorizonWithin3Days,
  nextStationOf,
  type Planet,
} from '../daily-notes/horizon';

describe('daysUntil', () => {
  it('returns 0 when target is today', () => {
    expect(daysUntil(new Date('2026-05-28'), new Date('2026-05-28'))).toBe(0);
  });
  it('returns 3 when target is 3 days later', () => {
    expect(daysUntil(new Date('2026-05-28'), new Date('2026-05-31'))).toBe(3);
  });
  it('returns negative when target is in the past', () => {
    expect(daysUntil(new Date('2026-05-28'), new Date('2026-05-25'))).toBe(-3);
  });
});

describe('isHorizonWithin3Days', () => {
  const today = new Date('2026-05-28');
  it('returns true for 0, 1, 2, 3 days', () => {
    expect(isHorizonWithin3Days(today, new Date('2026-05-28'))).toBe(true);
    expect(isHorizonWithin3Days(today, new Date('2026-05-29'))).toBe(true);
    expect(isHorizonWithin3Days(today, new Date('2026-05-30'))).toBe(true);
    expect(isHorizonWithin3Days(today, new Date('2026-05-31'))).toBe(true);
  });
  it('returns false for 4+ days', () => {
    expect(isHorizonWithin3Days(today, new Date('2026-06-01'))).toBe(false);
    expect(isHorizonWithin3Days(today, new Date('2026-06-28'))).toBe(false);
  });
  it('returns false for past dates', () => {
    expect(isHorizonWithin3Days(today, new Date('2026-05-27'))).toBe(false);
  });
});

describe('nextStationOf', () => {
  it('returns Mercury direct-station date for a known mid-2026 retrograde', () => {
    // Mercury retrograde stations Aug 8 2026 (Rx) → Aug 31 2026 (D)
    const after = new Date('2026-08-10');
    const result = nextStationOf('mercury', 'direct', after);
    expect(result?.toISOString().startsWith('2026-08-31')).toBe(true);
  });
  it('returns null when no station of that planet/kind exists within the calendar window', () => {
    const after = new Date('2030-01-01');
    expect(nextStationOf('mercury', 'direct', after)).toBeNull();
  });
});
