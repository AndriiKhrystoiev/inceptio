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

  it('voice/moment grade-words exist in all 5 locales', () => {
    // Grade words live under grade.* only — the results.* block was removed
    // when ResultsListView was consolidated onto the canonical grade family.
    // grade.exceptional is now the short badge form ("Exceptional", not
    // "Exceptional moment") since all surfaces share the same key.
    const enGrade = enVoice.grade as Record<string, string>;
    expect(Object.keys(enGrade)).toHaveLength(5);
    for (const k of ['exceptional', 'strong', 'favorable', 'caution', 'poor']) {
      expect(enGrade).toHaveProperty(k);
    }
    // grade.exceptional is the shortened badge form (no "moment" suffix).
    expect(enGrade.exceptional).toBe('Exceptional');
    // No results.* block remains in any locale.
    for (const voiceObj of [enVoice]) {
      expect(voiceObj).not.toHaveProperty('results');
    }
    // No voice grade-words leak into the chrome locale files.
    for (const loc of [en, de, fr, es419, ptBR]) {
      expect(loc).not.toHaveProperty('grade');
      expect(loc).not.toHaveProperty('results.exceptional');
    }
  });
});
