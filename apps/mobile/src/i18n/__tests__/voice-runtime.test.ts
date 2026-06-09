import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';

// Runtime registration guard for the voice namespace across all 5 locales.
//
// ROOT CAUSE this test guards against: index.ts previously registered the voice
// namespace for en only. The de/fr/es-419/pt-BR voice/*.json files existed and
// were translated but were never imported or registered — so every client
// voice.* call silently fell back to English in non-en locales.
//
// This test PROVES the runtime-registered state by:
//   1. Booting i18n (initI18n),
//   2. Calling i18n.changeLanguage(locale),
//   3. Resolving a representative key in each of the 5 voice sub-namespaces,
//   4. Asserting strict equality to the value in that locale's JSON file.
//
// NOT "≠ en" (fragile — some translations are coincidentally identical, e.g.
// "Favorable" is the same word in en/fr/es-419). Instead we read the locale
// JSON directly and assert the resolved string equals that locale's own value.
//
// HOW THIS WOULD FAIL if a locale's voice weren't registered:
//   If you remove, say, the de voice block from index.ts, i18next falls back to
//   en. The de representative keys include `moment.grade.favorable` → "Günstig"
//   (de) vs "Favorable" (en). The assertion `resolved === "Günstig"` would fail
//   because i18next returns "Favorable" (en fallback). Same logic applies to
//   every other locale and sub-namespace where the translated value differs from
//   English.

vi.mock('expo-localization', () => ({ getLocales: () => [] }));
vi.mock('../polyfills', () => ({}));

import i18n, { initI18n } from '../index';

// Import each locale's voice JSON directly so we can assert equality-to-source.
// Moment
import deVoiceMoment from '../../locales/de/voice/moment.json';
import frVoiceMoment from '../../locales/fr/voice/moment.json';
import es419VoiceMoment from '../../locales/es-419/voice/moment.json';
import ptBRVoiceMoment from '../../locales/pt-BR/voice/moment.json';

// Moments (pill)
import deVoiceMoments from '../../locales/de/voice/moments.json';
import frVoiceMoments from '../../locales/fr/voice/moments.json';
import es419VoiceMoments from '../../locales/es-419/voice/moments.json';
import ptBRVoiceMoments from '../../locales/pt-BR/voice/moments.json';

// Card
import deVoiceCard from '../../locales/de/voice/card.json';
import frVoiceCard from '../../locales/fr/voice/card.json';
import es419VoiceCard from '../../locales/es-419/voice/card.json';
import ptBRVoiceCard from '../../locales/pt-BR/voice/card.json';

// Reason (nested: moon_voc.title)
import deVoiceReason from '../../locales/de/voice/reason.json';
import frVoiceReason from '../../locales/fr/voice/reason.json';
import es419VoiceReason from '../../locales/es-419/voice/reason.json';
import ptBRVoiceReason from '../../locales/pt-BR/voice/reason.json';

// Calendar (nested: legend.moonVoid)
import deVoiceCalendar from '../../locales/de/voice/calendar.json';
import frVoiceCalendar from '../../locales/fr/voice/calendar.json';
import es419VoiceCalendar from '../../locales/es-419/voice/calendar.json';
import ptBRVoiceCalendar from '../../locales/pt-BR/voice/calendar.json';

// Helper: call i18n.t with the same options the production code uses.
// keySeparator '.' is the per-call override used for all nested voice sub-paths
// (card.<mood>, reason.<id>.title, moment.grade.<tier>, calendar.legend.<key>).
function vt(ns: string, key: string): string {
  return i18n.t(key, { ns, keySeparator: '.' });
}
// No separate vtFlat needed — all lookups use keySeparator '.' since the voice
// namespace is a nested object (sub-files are top-level keys: card, reason,
// calendar, moment, moments). pill keys live at voice.moments['pill.*'], so
// the correct path is 'moments.pill.highlyFavorable' — not a flat lookup.

beforeAll(() => {
  initI18n();
});

afterEach(async () => {
  // Restore en after each test so later tests in this file start clean.
  await i18n.changeLanguage('en');
});

// ─── de ──────────────────────────────────────────────────────────────────────
describe('de voice — all 5 sub-namespaces resolve to locale JSON values', () => {
  it('moment.grade.favorable resolves to de locale value', async () => {
    await i18n.changeLanguage('de');
    const resolved = vt('voice', 'moment.grade.favorable');
    expect(resolved).toBe((deVoiceMoment.grade as Record<string, string>).favorable);
  });

  it('moments.pill.highlyFavorable resolves to de locale value', async () => {
    await i18n.changeLanguage('de');
    // pill.* lives under the 'moments' sub-file, so the correct path is
    // moments.pill.highlyFavorable (keySeparator '.').
    const resolved = vt('voice', 'moments.pill.highlyFavorable');
    const key = 'pill.highlyFavorable' as keyof typeof deVoiceMoments;
    expect(resolved).toBe(deVoiceMoments[key]);
  });

  it('card.strong resolves to de locale value', async () => {
    await i18n.changeLanguage('de');
    const resolved = vt('voice', 'card.strong');
    expect(resolved).toBe((deVoiceCard as Record<string, string>).strong);
  });

  it('reason.moon_voc.title resolves to de locale value', async () => {
    await i18n.changeLanguage('de');
    const resolved = vt('voice', 'reason.moon_voc.title');
    const expected = (deVoiceReason.moon_voc as Record<string, string>).title;
    expect(resolved).toBe(expected);
  });

  it('calendar.legend.moonVoid resolves to de locale value', async () => {
    await i18n.changeLanguage('de');
    const resolved = vt('voice', 'calendar.legend.moonVoid');
    expect(resolved).toBe(deVoiceCalendar.legend.moonVoid);
  });
});

// ─── fr ──────────────────────────────────────────────────────────────────────
describe('fr voice — all 5 sub-namespaces resolve to locale JSON values', () => {
  it('moment.grade.favorable resolves to fr locale value', async () => {
    await i18n.changeLanguage('fr');
    const resolved = vt('voice', 'moment.grade.favorable');
    expect(resolved).toBe((frVoiceMoment.grade as Record<string, string>).favorable);
  });

  it('moments.pill.highlyFavorable resolves to fr locale value', async () => {
    await i18n.changeLanguage('fr');
    const resolved = vt('voice', 'moments.pill.highlyFavorable');
    const key = 'pill.highlyFavorable' as keyof typeof frVoiceMoments;
    expect(resolved).toBe(frVoiceMoments[key]);
  });

  it('card.strong resolves to fr locale value', async () => {
    await i18n.changeLanguage('fr');
    const resolved = vt('voice', 'card.strong');
    expect(resolved).toBe((frVoiceCard as Record<string, string>).strong);
  });

  it('reason.moon_voc.title resolves to fr locale value', async () => {
    await i18n.changeLanguage('fr');
    const resolved = vt('voice', 'reason.moon_voc.title');
    const expected = (frVoiceReason.moon_voc as Record<string, string>).title;
    expect(resolved).toBe(expected);
  });

  it('calendar.legend.moonVoid resolves to fr locale value', async () => {
    await i18n.changeLanguage('fr');
    const resolved = vt('voice', 'calendar.legend.moonVoid');
    expect(resolved).toBe(frVoiceCalendar.legend.moonVoid);
  });
});

// ─── es-419 ───────────────────────────────────────────────────────────────────
describe('es-419 voice — all 5 sub-namespaces resolve to locale JSON values', () => {
  it('moment.grade.favorable resolves to es-419 locale value', async () => {
    await i18n.changeLanguage('es-419');
    const resolved = vt('voice', 'moment.grade.favorable');
    expect(resolved).toBe((es419VoiceMoment.grade as Record<string, string>).favorable);
  });

  it('moments.pill.highlyFavorable resolves to es-419 locale value', async () => {
    await i18n.changeLanguage('es-419');
    const resolved = vt('voice', 'moments.pill.highlyFavorable');
    const key = 'pill.highlyFavorable' as keyof typeof es419VoiceMoments;
    expect(resolved).toBe(es419VoiceMoments[key]);
  });

  it('card.strong resolves to es-419 locale value', async () => {
    await i18n.changeLanguage('es-419');
    const resolved = vt('voice', 'card.strong');
    expect(resolved).toBe((es419VoiceCard as Record<string, string>).strong);
  });

  it('reason.moon_voc.title resolves to es-419 locale value', async () => {
    await i18n.changeLanguage('es-419');
    const resolved = vt('voice', 'reason.moon_voc.title');
    const expected = (es419VoiceReason.moon_voc as Record<string, string>).title;
    expect(resolved).toBe(expected);
  });

  it('calendar.legend.moonVoid resolves to es-419 locale value', async () => {
    await i18n.changeLanguage('es-419');
    const resolved = vt('voice', 'calendar.legend.moonVoid');
    expect(resolved).toBe(es419VoiceCalendar.legend.moonVoid);
  });
});

// ─── pt-BR ───────────────────────────────────────────────────────────────────
describe('pt-BR voice — all 5 sub-namespaces resolve to locale JSON values', () => {
  it('moment.grade.favorable resolves to pt-BR locale value', async () => {
    await i18n.changeLanguage('pt-BR');
    const resolved = vt('voice', 'moment.grade.favorable');
    expect(resolved).toBe((ptBRVoiceMoment.grade as Record<string, string>).favorable);
  });

  it('moments.pill.highlyFavorable resolves to pt-BR locale value', async () => {
    await i18n.changeLanguage('pt-BR');
    const resolved = vt('voice', 'moments.pill.highlyFavorable');
    const key = 'pill.highlyFavorable' as keyof typeof ptBRVoiceMoments;
    expect(resolved).toBe(ptBRVoiceMoments[key]);
  });

  it('card.strong resolves to pt-BR locale value', async () => {
    await i18n.changeLanguage('pt-BR');
    const resolved = vt('voice', 'card.strong');
    expect(resolved).toBe((ptBRVoiceCard as Record<string, string>).strong);
  });

  it('reason.moon_voc.title resolves to pt-BR locale value', async () => {
    await i18n.changeLanguage('pt-BR');
    const resolved = vt('voice', 'reason.moon_voc.title');
    const expected = (ptBRVoiceReason.moon_voc as Record<string, string>).title;
    expect(resolved).toBe(expected);
  });

  it('calendar.legend.moonVoid resolves to pt-BR locale value', async () => {
    await i18n.changeLanguage('pt-BR');
    const resolved = vt('voice', 'calendar.legend.moonVoid');
    expect(resolved).toBe(ptBRVoiceCalendar.legend.moonVoid);
  });
});
