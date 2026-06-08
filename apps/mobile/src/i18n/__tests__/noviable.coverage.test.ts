import { describe, it, expect } from 'vitest';

import en from '../../locales/en/noviable.json';
import de from '../../locales/de/noviable.json';
import fr from '../../locales/fr/noviable.json';
import es419 from '../../locales/es-419/noviable.json';
import ptBR from '../../locales/pt-BR/noviable.json';

describe('noviable ns coverage', () => {
  it('has CHROME keys present in all 5 locales', () => {
    const keys = Object.keys(en);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) {
      for (const loc of [de, fr, es419, ptBR]) {
        expect(loc).toHaveProperty(k);
      }
    }
  });
});
