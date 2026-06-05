import { describe, it, expect } from 'vitest';
import { timeOfDayBand, weekdayBand, monthDay, weekdayMonthDay } from '../time-of-day';

// 2026-06-20 is a Saturday. 15:24 in Europe/Kyiv (+03:00) = afternoon.
const ISO = '2026-06-20T15:24:00+03:00';
const TZ = 'Europe/Kyiv';

describe('time-of-day', () => {
  it('buckets the location wall-clock hour into a band', () => {
    expect(timeOfDayBand(ISO, TZ)).toBe('afternoon');
    expect(timeOfDayBand('2026-06-20T07:00:00+03:00', TZ)).toBe('morning');
    expect(timeOfDayBand('2026-06-20T20:00:00+03:00', TZ)).toBe('evening');
    expect(timeOfDayBand('2026-06-20T02:00:00+03:00', TZ)).toBe('night');
  });
  it('weekdayBand reads "Saturday afternoon"', () => {
    expect(weekdayBand(ISO, TZ)).toBe('Saturday afternoon');
  });
  it('monthDay reads "June 20"', () => {
    expect(monthDay(ISO, TZ)).toBe('June 20');
  });
  it('weekdayMonthDay reads "Saturday, June 20"', () => {
    expect(weekdayMonthDay(ISO, TZ)).toBe('Saturday, June 20');
  });
});
