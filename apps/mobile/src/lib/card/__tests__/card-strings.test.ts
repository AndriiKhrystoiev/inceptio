import { describe, it, expect } from 'vitest';
import { t, TIER_PHRASES, SENSITIVE_ACTIVITIES } from '../card-strings';

const FORBIDDEN = ['magic', 'destiny', 'fortune', 'stars align', 'manifest', 'energy', 'vibes', 'alignment', 'blessed'];

describe('card-strings', () => {
  it('exposes a warm phrase for every mood key', () => {
    expect(Object.keys(TIER_PHRASES).sort()).toEqual(['closed', 'good', 'mixed', 'strong']);
  });
  it('exposes a band word for every band key (band word is i18n chrome, not baked in time-of-day)', () => {
    for (const b of ['morning', 'afternoon', 'evening', 'night']) {
      expect(t(`card.band.${b}`)).toBe(b);
    }
  });
  it('never prints the word "Fair" or any forbidden word (tier phrases, generic line, AND band words)', () => {
    const bands = ['morning', 'afternoon', 'evening', 'night'].map((b) => t(`card.band.${b}`));
    const all = [...Object.values(TIER_PHRASES), t('card.genericIntent'), ...bands].join(' ').toLowerCase();
    expect(all).not.toContain('fair');
    for (const w of FORBIDDEN) expect(all).not.toContain(w);
  });
  it('t() returns the keyed string and the literal key on a miss', () => {
    expect(t('card.genericIntent')).toBe('A moment to begin');
    expect(t('card.nonexistent')).toBe('card.nonexistent');
  });
  it('marks contracts/business_launch/travel sensitive, wedding not', () => {
    expect(SENSITIVE_ACTIVITIES.has('contracts')).toBe(true);
    expect(SENSITIVE_ACTIVITIES.has('business_launch')).toBe(true);
    expect(SENSITIVE_ACTIVITIES.has('travel')).toBe(true);
    expect(SENSITIVE_ACTIVITIES.has('wedding')).toBe(false);
  });
});
