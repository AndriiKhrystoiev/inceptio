import { describe, it, expect } from 'vitest';
import { parseLocalInstant, offsetLabel } from '../iso-local';

describe('parseLocalInstant', () => {
  it('reads the local wall-clock from a positive-offset ISO', () => {
    const { localAsUtc, offsetMinutes } = parseLocalInstant('2026-06-20T15:24:00+03:00');
    expect(localAsUtc.getUTCHours()).toBe(15);
    expect(localAsUtc.getUTCMinutes()).toBe(24);
    expect(localAsUtc.getUTCFullYear()).toBe(2026);
    expect(localAsUtc.getUTCDate()).toBe(20);
    expect(offsetMinutes).toBe(180);
  });

  it('handles a negative offset', () => {
    expect(parseLocalInstant('2026-01-15T09:00:00-05:00').offsetMinutes).toBe(-300);
  });

  it('handles a half-hour offset', () => {
    expect(parseLocalInstant('2026-06-20T15:24:00+05:30').offsetMinutes).toBe(330);
  });

  it('FALLBACK: bare-UTC ("...Z") → offset 0, wall-clock as UTC', () => {
    const { localAsUtc, offsetMinutes } = parseLocalInstant('2026-06-21T11:32:00Z');
    expect(offsetMinutes).toBe(0);
    expect(localAsUtc.getUTCHours()).toBe(11);
  });

  it('FALLBACK: offset-less string → offset 0, wall-clock as UTC', () => {
    const { localAsUtc, offsetMinutes } = parseLocalInstant('2026-06-21T11:32:00');
    expect(offsetMinutes).toBe(0);
    expect(localAsUtc.getUTCHours()).toBe(11);
  });
});

describe('offsetLabel', () => {
  it('formats whole-hour offsets', () => {
    expect(offsetLabel(180)).toBe('UTC+3');
    expect(offsetLabel(-300)).toBe('UTC-5');
  });
  it('formats half-hour offsets', () => {
    expect(offsetLabel(330)).toBe('UTC+5:30');
    expect(offsetLabel(-270)).toBe('UTC-4:30');
  });
  it('labels zero offset as UTC', () => {
    expect(offsetLabel(0)).toBe('UTC');
  });
});
