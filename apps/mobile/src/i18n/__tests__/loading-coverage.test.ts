import { describe, it, expect } from 'vitest';
import en from '../../locales/en/loading.json';
import de from '../../locales/de/loading.json';
import fr from '../../locales/fr/loading.json';
import es419 from '../../locales/es-419/loading.json';
import ptBR from '../../locales/pt-BR/loading.json';

describe('loading ns', () => {
  it('CHROME keys exist in all 5 locales', () => {
    const keys = Object.keys(en);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) {
      for (const loc of [de, fr, es419, ptBR]) {
        expect(loc).toHaveProperty(k);
      }
    }
  });

  it('declares the four progressive stage keys', () => {
    for (const k of ['stage1', 'stage2', 'stage3', 'stage4']) {
      expect(en).toHaveProperty(k);
    }
  });
});
