import { describe, it, expect } from 'vitest';
import en from '../../locales/en/onboarding.json';
import de from '../../locales/de/onboarding.json';
import fr from '../../locales/fr/onboarding.json';
import es419 from '../../locales/es-419/onboarding.json';
import ptBR from '../../locales/pt-BR/onboarding.json';

// Exactly one CHROME key may legitimately equal its en value across non-en
// locales: onboarding:subhead is 4.3-framing-sensitive and translated LAST
// (see A4 launch checklist). A named single-key exception, NOT a pattern.
const EN_EQ_ALLOWED = new Set(['subhead']);

describe('onboarding ns', () => {
  it('CHROME keys exist in all 5 locales', () => {
    const keys = Object.keys(en);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) {
      for (const loc of [de, fr, es419, ptBR]) {
        expect(loc).toHaveProperty(k);
      }
    }
  });

  it('declares the onboarding + first-launch chrome keys', () => {
    for (const k of ['headline', 'subhead', 'cta', 'noAccount', 'welcome', 'prompt', 'changeHint']) {
      expect(en).toHaveProperty(k);
    }
  });

  it('every non-en value is genuinely translated except onboarding:subhead', () => {
    const enMap = en as Record<string, string>;
    for (const k of Object.keys(enMap)) {
      if (EN_EQ_ALLOWED.has(k)) continue;
      for (const loc of [de, fr, es419, ptBR]) {
        expect((loc as Record<string, string>)[k]).not.toBe(enMap[k]);
      }
    }
  });

  it('onboarding:subhead temporarily holds the en string in every non-en locale', () => {
    const enSub = (en as Record<string, string>).subhead;
    for (const loc of [de, fr, es419, ptBR]) {
      expect((loc as Record<string, string>).subhead).toBe(enSub);
    }
  });
});
