import { describe, it, expect, beforeAll, vi } from 'vitest';

// Runtime-resolution guard for the new chrome strings across all 5 locales.
// Proves they actually RESOLVE at runtime (boot i18n → changeLanguage → t()),
// not merely exist in JSON — the registration-gap lesson. settings/common are
// already-registered namespaces, so this should pass; it locks that in.
vi.mock('expo-localization', () => ({ getLocales: () => [] }));
vi.mock('../polyfills', () => ({}));

import i18n, { initI18n } from '../index';
import enSettings from '../../locales/en/settings.json';
import deSettings from '../../locales/de/settings.json';
import frSettings from '../../locales/fr/settings.json';
import es419Settings from '../../locales/es-419/settings.json';
import ptBRSettings from '../../locales/pt-BR/settings.json';
import enCommon from '../../locales/en/common.json';
import deCommon from '../../locales/de/common.json';
import frCommon from '../../locales/fr/common.json';
import es419Common from '../../locales/es-419/common.json';
import ptBRCommon from '../../locales/pt-BR/common.json';

const SETTINGS: Record<string, Record<string, string>> = {
  en: enSettings, de: deSettings, fr: frSettings, 'es-419': es419Settings, 'pt-BR': ptBRSettings,
};
const COMMON: Record<string, Record<string, string>> = {
  en: enCommon, de: deCommon, fr: frCommon, 'es-419': es419Common, 'pt-BR': ptBRCommon,
};
const LOCALES = ['en', 'de', 'fr', 'es-419', 'pt-BR'] as const;

beforeAll(() => { initI18n(); });

describe('support.* + common:copied resolve at runtime in all 5 locales', () => {
  for (const loc of LOCALES) {
    it(`resolves in ${loc} (equals that locale's JSON source)`, async () => {
      await i18n.changeLanguage(loc);
      expect(i18n.t('support.title', { ns: 'settings' })).toBe(SETTINGS[loc]['support.title']);
      expect(i18n.t('support.feedback', { ns: 'settings' })).toBe(SETTINGS[loc]['support.feedback']);
      expect(i18n.t('support.rate', { ns: 'settings' })).toBe(SETTINGS[loc]['support.rate']);
      expect(i18n.t('copied', { ns: 'common' })).toBe(COMMON[loc]['copied']);
    });
  }
});
