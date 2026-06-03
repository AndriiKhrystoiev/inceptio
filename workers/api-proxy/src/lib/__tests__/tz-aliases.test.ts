import { describe, it, expect } from 'vitest';
import { canonicalIanaName, tzEquivalent } from '../tz-aliases';

describe('canonicalIanaName', () => {
  it('maps Europe/Kiev (legacy) to Europe/Kyiv (canonical)', () => {
    expect(canonicalIanaName('Europe/Kiev')).toBe('Europe/Kyiv');
  });

  it('maps Asia/Calcutta (legacy) to Asia/Kolkata (canonical)', () => {
    expect(canonicalIanaName('Asia/Calcutta')).toBe('Asia/Kolkata');
  });

  it('maps Asia/Saigon (legacy) to Asia/Ho_Chi_Minh (canonical)', () => {
    expect(canonicalIanaName('Asia/Saigon')).toBe('Asia/Ho_Chi_Minh');
  });

  it('returns canonical name unchanged when already canonical', () => {
    expect(canonicalIanaName('Europe/Kyiv')).toBe('Europe/Kyiv');
    expect(canonicalIanaName('Asia/Tokyo')).toBe('Asia/Tokyo');
  });

  it('returns input unchanged for unknown / non-IANA strings', () => {
    expect(canonicalIanaName('Etc/Bogus')).toBe('Etc/Bogus');
    expect(canonicalIanaName('not-a-zone')).toBe('not-a-zone');
  });
});

describe('tzEquivalent', () => {
  it('is true for the same exact string', () => {
    expect(tzEquivalent('Asia/Tokyo', 'Asia/Tokyo')).toBe(true);
  });

  it('is true when both arguments are null', () => {
    expect(tzEquivalent(null, null)).toBe(true);
  });

  it('is false when exactly one argument is null', () => {
    expect(tzEquivalent('Europe/Kyiv', null)).toBe(false);
    expect(tzEquivalent(null, 'Europe/Kyiv')).toBe(false);
  });

  it('is true for legacy/canonical alias pairs in either direction', () => {
    expect(tzEquivalent('Europe/Kiev', 'Europe/Kyiv')).toBe(true);
    expect(tzEquivalent('Europe/Kyiv', 'Europe/Kiev')).toBe(true);
    expect(tzEquivalent('Asia/Calcutta', 'Asia/Kolkata')).toBe(true);
    expect(tzEquivalent('Asia/Kolkata', 'Asia/Calcutta')).toBe(true);
  });

  it('is false for genuinely different zones', () => {
    expect(tzEquivalent('Europe/Kyiv', 'Europe/Berlin')).toBe(false);
    expect(tzEquivalent('Asia/Tokyo', 'America/New_York')).toBe(false);
  });
});
