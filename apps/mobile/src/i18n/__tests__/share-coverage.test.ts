import { describe, it, expect } from 'vitest';
import en from '../../locales/en/share.json';
import de from '../../locales/de/share.json';
import fr from '../../locales/fr/share.json';
import es419 from '../../locales/es-419/share.json';
import ptBR from '../../locales/pt-BR/share.json';

describe('share ns', () => {
  it('CHROME keys exist in all 5 locales', () => {
    const keys = Object.keys(en);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) {
      for (const loc of [de, fr, es419, ptBR]) {
        expect(loc).toHaveProperty(k);
      }
    }
  });

  it('declares the share-sheet keys', () => {
    for (const k of ['showCity', 'showOccasion', 'preparing', 'prepareFailed']) {
      expect(en).toHaveProperty(k);
    }
  });
});
