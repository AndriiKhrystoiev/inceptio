import { describe, expect, it } from 'vitest';
import { formatDailyEyebrow } from '../format-date';

describe('formatDailyEyebrow', () => {
  it('formats an ISO date as lowercase "weekday, mon day"', () => {
    // 2026-05-23 was a Saturday in en-US calendar
    expect(formatDailyEyebrow('2026-05-23')).toBe('saturday, may 23');
  });

  it('uses short month name', () => {
    // 2026-09-04 was a Friday
    expect(formatDailyEyebrow('2026-09-04')).toBe('friday, sep 4');
  });

  it('does not pad single-digit days', () => {
    // 2026-01-01 was a Thursday
    expect(formatDailyEyebrow('2026-01-01')).toBe('thursday, jan 1');
  });
});
