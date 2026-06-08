import { describe, it, expect, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import i18n from 'i18next';

// i18n/index.ts -> ./polyfills imports '@formatjs/intl-locale/polyfill-force',
// whose export map doesn't resolve under vitest's node resolver. Node already
// ships Intl.PluralRules, so the polyfills are a no-op here — stub them out.
vi.mock('../../../i18n/polyfills', () => ({}));
// i18n/locale.ts pulls expo-localization transitively; force empty device list
// so activeBundle() resolves to 'en' (the authoritative bundle asserted here).
vi.mock('expo-localization', () => ({ getLocales: () => [] }));

import { initI18n } from '../../../i18n';
import { t, tierPhrase, TIER_PHRASES, SENSITIVE_ACTIVITIES } from '../card-strings';

const FORBIDDEN = ['magic', 'destiny', 'fortune', 'stars align', 'manifest', 'energy', 'vibes', 'alignment', 'blessed'];

// Init must run before the first t() call or every branch returns the literal key.
initI18n();

describe('card-strings (i18next-backed)', () => {
  it('exposes a warm phrase for every mood key', () => {
    expect(Object.keys(TIER_PHRASES).sort()).toEqual(['closed', 'good', 'mixed', 'strong']);
  });

  it('resolves chrome strings through i18next (card ns)', () => {
    expect(t('card.genericIntent')).toBe('A moment to begin');
    expect(t('card.watermark')).toBe('Inceptio');
  });

  it('exposes a band word for every band key (band word is i18n chrome, not baked in time-of-day)', () => {
    for (const b of ['morning', 'afternoon', 'evening', 'night']) {
      expect(t(`card.band.${b}`)).toBe(b);
    }
  });

  it('t() returns the literal key on a miss', () => {
    expect(t('card.nonexistent')).toBe('card.nonexistent');
  });

  it('tierPhrase resolves the warm phrase from the en-only voice ns', () => {
    expect(tierPhrase('good')).toBe('A tender moment');
    expect(tierPhrase('strong')).toBe('A radiant moment');
    expect(tierPhrase('mixed')).toBe('A delicate moment');
    expect(tierPhrase('closed')).toBe('A quiet moment');
  });

  it('TIER_PHRASES values agree with tierPhrase() for every mood', () => {
    for (const mood of ['strong', 'good', 'mixed', 'closed'] as const) {
      expect(TIER_PHRASES[mood]).toBe(tierPhrase(mood));
    }
  });

  it('never prints the word "Fair" or any forbidden word (tier phrases, generic line, AND band words)', () => {
    const bands = ['morning', 'afternoon', 'evening', 'night'].map((b) => t(`card.band.${b}`));
    const all = [...Object.values(TIER_PHRASES), t('card.genericIntent'), ...bands].join(' ').toLowerCase();
    expect(all).not.toContain('fair');
    for (const w of FORBIDDEN) expect(all).not.toContain(w);
  });

  it('marks contracts/business_launch/travel sensitive, wedding not', () => {
    expect(SENSITIVE_ACTIVITIES.has('contracts')).toBe(true);
    expect(SENSITIVE_ACTIVITIES.has('business_launch')).toBe(true);
    expect(SENSITIVE_ACTIVITIES.has('travel')).toBe(true);
    expect(SENSITIVE_ACTIVITIES.has('wedding')).toBe(false);
  });

  it('the voice card sub-file exists in en only — on disk and in the i18n store', () => {
    // vitest runs from apps/mobile (cwd); locales live under src/locales.
    const localeFile = (loc: string) => resolve('src/locales', loc, 'voice/card.json');
    expect(existsSync(localeFile('en'))).toBe(true);
    for (const loc of ['de', 'fr', 'es-419', 'pt-BR']) {
      expect(existsSync(localeFile(loc))).toBe(false);
      // and the loaded bundle carries no voice namespace for the non-en locales
      expect(i18n.hasResourceBundle(loc, 'voice')).toBe(false);
    }
    expect(i18n.hasResourceBundle('en', 'voice')).toBe(true);
  });
});
