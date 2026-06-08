import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Proves the activity CATALOG (labels/nouns/eyebrows) and the moment TIME labels
// route through i18next — the gap this branch closes. These strings live in
// non-JSX lib sources (lib/activities.ts getters, lib/cluster-windows.ts) that
// the no-literal JSX lint never scanned, so they previously rendered English in
// every non-en locale. Here we boot i18n, switch to a non-en bundle, and assert
// the resolved values are the localized ones (≠ the en const-map values).

// expo-localization is unparseable in the node test env (transitively pulled in
// via i18n/locale.ts). Force an empty device-locale list so activeBundle()
// resolves to 'en' before we override the language explicitly.
vi.mock('expo-localization', () => ({ getLocales: () => [] }));

// i18n/index.ts → ./polyfills imports '@formatjs/intl-locale/polyfill-force',
// whose export map doesn't resolve under vitest's node resolver. Node already
// ships Intl.PluralRules, so the polyfills are a no-op here — stub them out.
vi.mock('../polyfills', () => ({}));

import i18n, { initI18n } from '../index';
import {
  ACTIVITY_LABELS,
  ACTIVITY_NOUNS,
  ACTIVITY_EYEBROW_PHRASES,
  getActivityLabel,
  getActivityNoun,
  getActivityEyebrowPhrase,
} from '../../lib/activities';

const NON_EN = ['de', 'fr', 'es-419', 'pt-BR'] as const;

beforeAll(() => {
  initI18n();
});

afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('activity catalog routes through i18n (not the en const map)', () => {
  it('getActivityLabel/Noun/Eyebrow return NON-English for de', async () => {
    await i18n.changeLanguage('de');
    expect(getActivityLabel('travel')).not.toBe(ACTIVITY_LABELS.travel);
    expect(getActivityNoun('travel')).not.toBe(ACTIVITY_NOUNS.travel);
    expect(getActivityEyebrowPhrase('travel')).not.toBe(ACTIVITY_EYEBROW_PHRASES.travel);
    // And they resolve to the actual de bundle values.
    expect(getActivityLabel('travel')).toBe('Reise');
    expect(getActivityEyebrowPhrase('travel')).toBe('für deine Reise');
  });

  it('en still resolves to the authoritative const-map values', async () => {
    await i18n.changeLanguage('en');
    expect(getActivityLabel('travel')).toBe(ACTIVITY_LABELS.travel); // "Travel"
    expect(getActivityNoun('travel')).toBe(ACTIVITY_NOUNS.travel); // "journey"
    expect(getActivityEyebrowPhrase('travel')).toBe(ACTIVITY_EYEBROW_PHRASES.travel);
  });

  it('label/noun/eyebrow resolve per-locale (none fall back to English)', async () => {
    for (const loc of NON_EN) {
      await i18n.changeLanguage(loc);
      expect(getActivityLabel('travel'), `${loc} label`).not.toBe(ACTIVITY_LABELS.travel);
      expect(getActivityEyebrowPhrase('travel'), `${loc} eyebrow`).not.toBe(
        ACTIVITY_EYEBROW_PHRASES.travel,
      );
    }
  });
});

describe('moment time labels route through i18n', () => {
  it('time.bestAt is localized (word order) for each non-en locale', async () => {
    const expected: Record<string, string> = {
      de: 'am besten um 21:30',
      fr: 'idéalement à 21:30',
      'es-419': 'mejor a las 21:30',
      'pt-BR': 'melhor às 21:30',
    };
    for (const loc of NON_EN) {
      await i18n.changeLanguage(loc);
      expect(i18n.t('moment:time.bestAt', { time: '21:30' }), loc).toBe(expected[loc]);
    }
    await i18n.changeLanguage('en');
    expect(i18n.t('moment:time.bestAt', { time: '21:30' })).toBe('best at 21:30');
  });

  it('time.minutes pluralizes per locale', async () => {
    await i18n.changeLanguage('de');
    expect(i18n.t('moment:time.minutes', { count: 1 })).toBe('1 Minute');
    expect(i18n.t('moment:time.minutes', { count: 25 })).toBe('25 Minuten');
    // French _one covers 0 (CLDR): 0 → "0 minute", not "0 minutes".
    await i18n.changeLanguage('fr');
    expect(i18n.t('moment:time.minutes', { count: 0 })).toBe('0 minute');
    expect(i18n.t('moment:time.minutes', { count: 5 })).toBe('5 minutes');
  });
});
