import { describe, it, expect } from 'vitest';
import { isValidLocale } from '../locale';

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
