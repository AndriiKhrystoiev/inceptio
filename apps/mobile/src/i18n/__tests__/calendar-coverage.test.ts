import { describe, it, expect } from 'vitest';
import en from '../../locales/en/calendar.json';
import de from '../../locales/de/calendar.json';
import fr from '../../locales/fr/calendar.json';
import es419 from '../../locales/es-419/calendar.json';
import ptBR from '../../locales/pt-BR/calendar.json';
import enVoice from '../../locales/en/voice/calendar.json';

describe('calendar ns', () => {
  it('CHROME keys exist in all 5 locales', () => {
    const keys = Object.keys(en);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) {
      for (const loc of [de, fr, es419, ptBR]) {
        expect(loc).toHaveProperty(k);
      }
    }
  });

  it('declares the legend + toggle chrome keys', () => {
    for (const k of [
      'legend.outsideRange',
      'legend.cells',
      'toggle.list',
      'toggle.calendar',
    ]) {
      expect(en).toHaveProperty(k);
    }
  });

  it('voice/calendar legend lines exist in en only', () => {
    const voiceKeys = Object.keys(enVoice);
    expect(voiceKeys.length).toBeGreaterThan(0);
    for (const k of voiceKeys) {
      for (const loc of [de, fr, es419, ptBR]) {
        expect(loc).not.toHaveProperty(k);
      }
    }
  });

  it('declares matching header plural variants in every locale', () => {
    for (const base of ['header.few', 'header.many']) {
      for (const loc of [en, de, fr, es419, ptBR]) {
        expect(loc).toHaveProperty(`${base}_one`);
        expect(loc).toHaveProperty(`${base}_other`);
      }
    }
  });

  it('nests voice legend lines so a keySeparator-"." lookup traverses them', () => {
    // The voice ns nests each sub-file under its name (voice.calendar =
    // calendar.json); the screen reads them with a per-call keySeparator '.'.
    expect(enVoice).toHaveProperty('legend.moonVoid');
    expect(enVoice).toHaveProperty('legend.malefic');
  });
});
