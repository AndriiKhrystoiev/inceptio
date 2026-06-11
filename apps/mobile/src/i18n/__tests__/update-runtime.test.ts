import { describe, it, expect, beforeAll, vi } from 'vitest';

// Runtime-resolution guard for the `update` namespace across all 5 locales.
// Proves the keys actually RESOLVE at runtime (boot i18n → changeLanguage → t()),
// not merely exist in JSON. This is the gap the coverage test cannot see: the app
// is configured with keySeparator:false, so keys MUST be FLAT dotted strings
// ("force.title"), NOT nested objects — a nested file passes coverage (flatten
// compares paths) but t('force.title') returns the raw key at runtime. This test
// fails loudly if the update.json files ever revert to nested shape.
vi.mock('expo-localization', () => ({ getLocales: () => [] }));
vi.mock('../polyfills', () => ({}));

import i18n, { initI18n } from '../index';
import enUpdate from '../../locales/en/update.json';
import deUpdate from '../../locales/de/update.json';
import frUpdate from '../../locales/fr/update.json';
import es419Update from '../../locales/es-419/update.json';
import ptBRUpdate from '../../locales/pt-BR/update.json';

const UPDATE: Record<string, Record<string, string>> = {
  en: enUpdate, de: deUpdate, fr: frUpdate, 'es-419': es419Update, 'pt-BR': ptBRUpdate,
};
const LOCALES = ['en', 'de', 'fr', 'es-419', 'pt-BR'] as const;
const KEYS = [
  'force.title', 'force.body', 'force.action', 'force.actionHint',
  'force.retry', 'force.retryOffline', 'force.openFailed',
  'soft.message', 'soft.action', 'soft.dismiss',
] as const;

beforeAll(() => { initI18n(); });

describe('update.* resolves at runtime in all 5 locales (keySeparator:false)', () => {
  for (const loc of LOCALES) {
    it(`resolves every key in ${loc} (never returns the raw key)`, async () => {
      await i18n.changeLanguage(loc);
      for (const key of KEYS) {
        const resolved = i18n.t(key, { ns: 'update' });
        // The raw-key-return symptom from the screenshot bug:
        expect(resolved, `${loc}:update:${key} returned the raw key`).not.toBe(key);
        // And it equals that locale's flat JSON source:
        expect(resolved).toBe(UPDATE[loc][key]);
      }
    });
  }

  it('non-en differs from en (guards silent en fallthrough)', async () => {
    await i18n.changeLanguage('de');
    expect(i18n.t('force.title', { ns: 'update' })).not.toBe(UPDATE['en']['force.title']);
  });
});
