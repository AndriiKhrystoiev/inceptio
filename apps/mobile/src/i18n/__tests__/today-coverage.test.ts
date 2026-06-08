import { describe, it, expect } from 'vitest';
import en from '../../locales/en/today.json';
import de from '../../locales/de/today.json';
import fr from '../../locales/fr/today.json';
import es419 from '../../locales/es-419/today.json';
import ptBR from '../../locales/pt-BR/today.json';

describe('today ns CHROME coverage', () => {
  it('has at least the extracted chrome keys in en', () => {
    for (const k of ['findMomentCta', 'looking', 'emptyHeadline', 'emptySupporting', 'emptyCta']) {
      expect(en).toHaveProperty(k);
    }
  });

  it('every en key exists in all 5 locales', () => {
    for (const k of Object.keys(en)) {
      for (const loc of [de, fr, es419, ptBR]) {
        expect(loc).toHaveProperty(k);
      }
    }
  });
});
