import { describe, it, expect } from 'vitest';
import { canonicalIanaName, tzEquivalent } from '../tz-aliases';

describe('canonicalIanaName', () => {
  it('maps a legacy zone to its canonical name', () => {
    expect(canonicalIanaName('Europe/Kiev')).toBe('Europe/Kyiv');
    expect(canonicalIanaName('Asia/Calcutta')).toBe('Asia/Kolkata');
    expect(canonicalIanaName('US/Pacific')).toBe('America/Los_Angeles');
  });
  it('returns an already-canonical or unknown name unchanged', () => {
    expect(canonicalIanaName('Europe/Kyiv')).toBe('Europe/Kyiv');
    expect(canonicalIanaName('Not/AZone')).toBe('Not/AZone');
  });
});

describe('tzEquivalent', () => {
  it('treats two nulls as equivalent', () => {
    expect(tzEquivalent(null, null)).toBe(true);
  });
  it('treats one null vs a real zone as not equivalent', () => {
    expect(tzEquivalent(null, 'Europe/Kyiv')).toBe(false);
    expect(tzEquivalent('Europe/Kyiv', null)).toBe(false);
  });
  it('matches a legacy alias against its canonical form', () => {
    expect(tzEquivalent('Europe/Kiev', 'Europe/Kyiv')).toBe(true);
  });
  it('returns false for genuinely different zones', () => {
    expect(tzEquivalent('Europe/Kyiv', 'America/New_York')).toBe(false);
  });
});
