import { describe, it, expect } from 'vitest';

import en from '../../locales/en/paywall.json';
import de from '../../locales/de/paywall.json';
import fr from '../../locales/fr/paywall.json';
import es419 from '../../locales/es-419/paywall.json';
import ptBR from '../../locales/pt-BR/paywall.json';

describe('paywall ns coverage', () => {
  const en_keys = Object.keys(en);

  it('has a non-empty en key table', () => {
    expect(en_keys.length).toBeGreaterThan(0);
  });

  it('CHROME keys exist in all 5 locales', () => {
    for (const k of en_keys) {
      for (const loc of [de, fr, es419, ptBR] as Record<string, string>[]) {
        expect(loc).toHaveProperty(k);
      }
    }
  });
});
