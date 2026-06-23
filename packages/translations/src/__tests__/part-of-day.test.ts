import { describe, expect, it } from 'vitest';
import { PART_OF_DAY_CUTOFFS } from '../dictionary/part-of-day';

describe('PART_OF_DAY_CUTOFFS', () => {
  it('cutoffs are ascending hours within [0, 24)', () => {
    const { morning_end_hour, afternoon_end_hour, evening_end_hour } = PART_OF_DAY_CUTOFFS;
    expect(morning_end_hour).toBeGreaterThan(0);
    expect(afternoon_end_hour).toBeGreaterThan(morning_end_hour);
    expect(evening_end_hour).toBeGreaterThan(afternoon_end_hour);
    expect(evening_end_hour).toBeLessThanOrEqual(24);
  });

  it('cutoffs are integers (no half-hour slop)', () => {
    const { morning_end_hour, afternoon_end_hour, evening_end_hour } = PART_OF_DAY_CUTOFFS;
    expect(Number.isInteger(morning_end_hour)).toBe(true);
    expect(Number.isInteger(afternoon_end_hour)).toBe(true);
    expect(Number.isInteger(evening_end_hour)).toBe(true);
  });
});
