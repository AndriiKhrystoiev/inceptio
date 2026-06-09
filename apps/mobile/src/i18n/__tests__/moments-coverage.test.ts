import { describe, it, expect } from 'vitest';
import en from '../../locales/en/moments.json';
import de from '../../locales/de/moments.json';
import fr from '../../locales/fr/moments.json';
import es419 from '../../locales/es-419/moments.json';
import ptBR from '../../locales/pt-BR/moments.json';
import enVoice from '../../locales/en/voice/moments.json';
import deVoice from '../../locales/de/voice/moments.json';
import frVoice from '../../locales/fr/voice/moments.json';
import es419Voice from '../../locales/es-419/voice/moments.json';
import ptBRVoice from '../../locales/pt-BR/voice/moments.json';

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

  it('VOICE pill.moderate exists in all 5 locales (post-VOICE); shared tiers moved to canonical grade', () => {
    // pill.moderate is the only pill-specific voice key — the shared
    // highly/favorable tiers now REFERENCE voice:moment.grade.* (de-duplicated),
    // so they must NOT live in voice/moments anymore.
    for (const v of [enVoice, deVoice, frVoice, es419Voice, ptBRVoice]) {
      expect(has(v, 'pill.moderate')).toBe(true);
      expect(has(v, 'pill.highlyFavorable')).toBe(false);
      expect(has(v, 'pill.favorable')).toBe(false);
    }
  });
});
