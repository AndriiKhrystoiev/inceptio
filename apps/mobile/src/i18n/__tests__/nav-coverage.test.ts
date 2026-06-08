import { describe, it, expect } from 'vitest';
import en from '../../locales/en/nav.json';
import de from '../../locales/de/nav.json';
import fr from '../../locales/fr/nav.json';
import es419 from '../../locales/es-419/nav.json';
import ptBR from '../../locales/pt-BR/nav.json';

describe('nav ns', () => {
  it('CHROME keys exist in all 5 locales', () => {
    const keys = Object.keys(en);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) {
      for (const loc of [de, fr, es419, ptBR]) {
        expect(loc).toHaveProperty(k);
      }
    }
  });

  it('declares the four tab labels', () => {
    for (const k of ['today', 'calendar', 'moments', 'you']) {
      expect(en).toHaveProperty(k);
    }
  });
});
