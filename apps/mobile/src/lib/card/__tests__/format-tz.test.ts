import { describe, it, expect } from 'vitest';
import { exactClock, tzAbbrev } from '../format-tz';

const ISO = '2026-06-20T15:24:00+03:00';

describe('format-tz', () => {
  it('formats a 12-hour clock from the ISO local wall-clock', () => {
    expect(exactClock(ISO)).toBe('3:24 PM');
    expect(exactClock('2026-06-20T00:05:00+03:00')).toBe('12:05 AM');
  });
  it('is DST-AWARE by construction — tz label is the ISO offset, which differs across DST', () => {
    expect(tzAbbrev('2026-06-20T15:24:00+03:00')).toBe('UTC+3'); // summer
    expect(tzAbbrev('2026-01-15T12:00:00+02:00')).toBe('UTC+2'); // winter
  });
  it('FALLBACK: bare-UTC / offset-less ISO → "UTC"', () => {
    expect(tzAbbrev('2026-06-21T11:32:00Z')).toBe('UTC');
    expect(exactClock('2026-06-21T11:32:00Z')).toBe('11:32 AM');
  });
});
