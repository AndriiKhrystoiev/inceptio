import { describe, expect, it, vi } from 'vitest';

// expo-localization is a native module whose source is unparseable in the node
// test env (same escape hatch as react-native mocks elsewhere). These tests pass
// device locales explicitly, so getLocales() is never invoked here.
vi.mock('expo-localization', () => ({ getLocales: () => [] }));

import { resolveLocale, toIntlLocale } from '../locale';

const dev = (tags: string[]) => tags.map((languageTag) => ({
  languageTag,
  languageCode: languageTag.split('-')[0],
  regionCode: languageTag.split('-')[1] ?? null,
}));

describe('resolveLocale', () => {
  it('maps any Spanish device to es-419', () => {
    expect(resolveLocale(dev(['es-MX']))).toBe('es-419');
    expect(resolveLocale(dev(['es-AR']))).toBe('es-419');
    expect(resolveLocale(dev(['es-ES']))).toBe('es-419');
    expect(resolveLocale(dev(['es-419']))).toBe('es-419'); // iOS reports this directly
  });
  it('maps any Portuguese device to pt-BR', () => {
    expect(resolveLocale(dev(['pt-PT']))).toBe('pt-BR');
    expect(resolveLocale(dev(['pt-BR']))).toBe('pt-BR');
  });
  it('strips de/fr to primary', () => {
    expect(resolveLocale(dev(['de-AT']))).toBe('de');
    expect(resolveLocale(dev(['fr']))).toBe('fr');
  });
  it('falls back to en for unsupported, respecting preference order', () => {
    expect(resolveLocale(dev(['it-IT', 'fr-FR']))).toBe('fr'); // first supported wins
    expect(resolveLocale(dev(['ja']))).toBe('en');
    expect(resolveLocale([])).toBe('en');
  });
});

describe('toIntlLocale', () => {
  it('maps variant bundle keys to Intl-valid locales', () => {
    expect(toIntlLocale('es-419')).toBe('es');
    expect(toIntlLocale('pt-BR')).toBe('pt');
    expect(toIntlLocale('de')).toBe('de');
    expect(toIntlLocale('en')).toBe('en');
  });
});
