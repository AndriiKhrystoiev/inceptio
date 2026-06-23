import { describe, it, expect } from 'vitest';
import { formatDateInTz } from '../local-date';
import { tzEquivalent } from '../tz-aliases';

describe('formatDateInTz', () => {
  it('renders the wall-clock date in the given tz', () => {
    // 2026-07-01T23:30Z is already 2026-07-02 in Kyiv (UTC+3)
    expect(formatDateInTz(new Date('2026-07-01T23:30:00Z'), 'Europe/Kyiv')).toBe('2026-07-02');
  });
});

describe('tzEquivalent', () => {
  it('treats Kyiv and its alias as equivalent', () => {
    expect(tzEquivalent('Europe/Kyiv', 'Europe/Kiev')).toBe(true);
  });
  it('treats distinct zones as not equivalent', () => {
    expect(tzEquivalent('Europe/Kyiv', 'America/New_York')).toBe(false);
  });
});
