import { describe, it, expect } from 'vitest';
import { timeOfDayBand, weekday, monthDay, weekdayMonthDay } from '../time-of-day';

// 2026-06-20 is a Saturday. 15:24 local (+03:00) = afternoon. The helpers read
// the ISO's OWN wall-clock — no device tz, no IANA lookup.
const ISO = '2026-06-20T15:24:00+03:00';

describe('time-of-day', () => {
  it('buckets the local wall-clock hour into a band (from the ISO offset, not device tz)', () => {
    expect(timeOfDayBand(ISO)).toBe('afternoon');
    expect(timeOfDayBand('2026-06-20T07:00:00+03:00')).toBe('morning');
    expect(timeOfDayBand('2026-06-20T20:00:00+03:00')).toBe('evening');
    expect(timeOfDayBand('2026-06-20T02:00:00+03:00')).toBe('night');
  });
  it('weekday reads "Saturday" from the local wall-clock (band word comes from strings)', () => {
    expect(weekday(ISO)).toBe('Saturday');
  });
  it('monthDay reads "June 20"', () => {
    expect(monthDay(ISO)).toBe('June 20');
  });
  it('weekdayMonthDay reads "Saturday, June 20"', () => {
    expect(weekdayMonthDay(ISO)).toBe('Saturday, June 20');
  });
  it('reads each ISO in ITS OWN local time — no cross-zone conversion', () => {
    // 13:00 at +03:00 and 13:00 at -05:00 are different instants but both read
    // as 1 PM local → afternoon. A device/UTC-based impl would diverge here.
    expect(timeOfDayBand('2026-06-20T13:00:00-05:00')).toBe('afternoon');
    // Late local time must keep the local DATE (the 20th), not roll to UTC's 21st.
    expect(weekday('2026-06-20T23:30:00-05:00')).toBe('Saturday');
  });
});
