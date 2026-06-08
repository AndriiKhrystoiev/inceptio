import { describe, it, expect } from 'vitest';
import { isValidLocale, resolveLocale } from '../locale';

describe('isValidLocale', () => {
  it('accepts well-formed BCP-47 tokens', () => {
    expect(isValidLocale('pt-BR')).toBe(true);
    expect(isValidLocale('es-419')).toBe(true);
    expect(isValidLocale('de')).toBe(true);
    expect(isValidLocale('fr')).toBe(true);
    expect(isValidLocale('zh-Hant-HK')).toBe(true); // script + region subtags
  });

  it('treats an absent header as valid (unset)', () => {
    expect(isValidLocale(null)).toBe(true);
    expect(isValidLocale(undefined)).toBe(true);
  });

  it('rejects garbage', () => {
    expect(isValidLocale('not a locale!!')).toBe(false);
    expect(isValidLocale('a'.repeat(40))).toBe(false); // over the length cap
    expect(isValidLocale('')).toBe(false);
    expect(isValidLocale('-de')).toBe(false); // leading separator
    expect(isValidLocale('de-')).toBe(false); // trailing separator
    expect(isValidLocale('e')).toBe(false); // primary subtag too short
  });
});

describe('resolveLocale', () => {
  it('returns supported non-en locales verbatim', () => {
    expect(resolveLocale('de')).toBe('de');
    expect(resolveLocale('fr')).toBe('fr');
    expect(resolveLocale('es-419')).toBe('es-419');
    expect(resolveLocale('pt-BR')).toBe('pt-BR');
  });

  it('maps an absent header (null) to en', () => {
    expect(resolveLocale(null)).toBe('en');
  });

  it('maps en and well-formed-but-unsupported tags to en (no silently-English-branch risk)', () => {
    expect(resolveLocale('en')).toBe('en');
    expect(resolveLocale('ja')).toBe('en');
    expect(resolveLocale('zh-Hant-HK')).toBe('en');
    expect(resolveLocale('es-ES')).toBe('en'); // peninsular Spanish is not the es-419 bundle
  });
});
