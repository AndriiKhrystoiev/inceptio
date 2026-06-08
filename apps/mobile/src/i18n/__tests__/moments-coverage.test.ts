import { describe, it, expect } from 'vitest';
import en from '../../locales/en/moments.json';
import de from '../../locales/de/moments.json';
import fr from '../../locales/fr/moments.json';
import es419 from '../../locales/es-419/moments.json';
import ptBR from '../../locales/pt-BR/moments.json';
import enVoice from '../../locales/en/voice/moments.json';

// keySeparator:false — keys are flat literal strings (dots allowed inside a key).
// Use own-property checks, not toHaveProperty (which would treat dots as paths).
const has = (obj: object, k: string) => Object.prototype.hasOwnProperty.call(obj, k);

describe('moments ns', () => {
  it('CHROME keys exist in all 5 locales', () => {
    const keys = Object.keys(en);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) {
      for (const loc of [de, fr, es419, ptBR]) {
        expect(has(loc, k)).toBe(true);
      }
    }
  });

  it('declares the core chrome keys', () => {
    for (const k of [
      'headerTitle',
      'title',
      'emptyTitle',
      'emptyBody',
      'emptyCta',
      'passed',
      'section.upcoming',
      'section.past',
    ]) {
      expect(has(en, k)).toBe(true);
    }
  });

  it('VOICE status pills exist in en only', () => {
    for (const k of ['pill.highlyFavorable', 'pill.favorable', 'pill.moderate']) {
      expect(has(enVoice, k)).toBe(true);
    }
    for (const loc of [de, fr, es419, ptBR]) {
      for (const k of Object.keys(enVoice)) {
        expect(has(loc, k)).toBe(false);
      }
    }
  });
});
