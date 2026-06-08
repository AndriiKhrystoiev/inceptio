import { describe, it, expect } from 'vitest';
import en from '../../locales/en/daterange.json';
import de from '../../locales/de/daterange.json';
import fr from '../../locales/fr/daterange.json';
import es419 from '../../locales/es-419/daterange.json';
import ptBR from '../../locales/pt-BR/daterange.json';

describe('daterange ns CHROME coverage', () => {
  it('every en key exists in all 5 locales', () => {
    const enKeys = Object.keys(en);
    expect(enKeys.length).toBeGreaterThan(0);
    for (const k of enKeys) {
      for (const loc of [de, fr, es419, ptBR]) {
        expect(loc).toHaveProperty(k);
      }
    }
  });
});
