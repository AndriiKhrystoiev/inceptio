import { describe, it, expect } from 'vitest';
import en from '../../locales/en/moment.json';
import de from '../../locales/de/moment.json';
import fr from '../../locales/fr/moment.json';
import es419 from '../../locales/es-419/moment.json';
import ptBR from '../../locales/pt-BR/moment.json';
import enVoice from '../../locales/en/voice/moment.json';

describe('moment ns', () => {
  it('CHROME keys exist in all 5 locales', () => {
    const keys = Object.keys(en);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) {
      for (const loc of [de, fr, es419, ptBR]) {
        expect(loc).toHaveProperty(k);
      }
    }
  });

  it('declares the core chrome keys', () => {
    for (const k of [
      'scoreCaption',
      'whyThis',
      'seeTechnical',
      'technicalTitle',
      'backToSummary',
      'addToCalendar',
      'reading',
    ]) {
      expect(en).toHaveProperty(k);
    }
  });

  it('voice/moment grade-words exist in en only', () => {
    // Grade words live under grade.* (MomentDetail) and results.* (list view).
    const grade = enVoice.grade as Record<string, string>;
    const results = enVoice.results as Record<string, string>;
    expect(Object.keys(grade).length).toBeGreaterThan(0);
    expect(Object.keys(results).length).toBeGreaterThan(0);
    for (const k of ['exceptional', 'strong', 'favorable', 'caution', 'poor']) {
      expect(grade).toHaveProperty(k);
    }
    // No voice grade-words leak into the chrome locale files.
    for (const loc of [en, de, fr, es419, ptBR]) {
      expect(loc).not.toHaveProperty('grade');
      expect(loc).not.toHaveProperty('results.exceptional');
    }
  });
});
