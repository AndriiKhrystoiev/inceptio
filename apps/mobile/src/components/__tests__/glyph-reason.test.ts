import { describe, it, expect, beforeAll, vi } from 'vitest';

// Glyph.js is an RN/SVG component — per the repo's test boundary (vitest.config
// comment) component/native sources are exercised on-device, not in node. This
// test verifies the DATA path Glyph.FRIENDLY_REASON depends on: that the blocker
// copy resolves from the en-only `voice:reason` namespace via the exact lookup
// Glyph performs — i18n.t('reason.<id>.<part>', { ns: 'voice', keySeparator: '.' }).

// Device locale is irrelevant — we drive the bundle via init lng below.
vi.mock('expo-localization', () => ({ getLocales: () => [] }));
// i18n/index.ts → ./polyfills imports '@formatjs/intl-locale/polyfill-force',
// whose subpath is unresolvable under the Vite test resolver; node already ships
// Intl.PluralRules, so the polyfills are a no-op here — stub them out.
vi.mock('../../i18n/polyfills', () => ({}));

import i18n, { initI18n } from '../../i18n';
import en_reason from '../../locales/en/voice/reason.json';

// The 11 blocker reasons rendered in the Calendar blocked-day sheet. This list
// mirrors Glyph.FRIENDLY_REASON's keys.
const REASON_IDS = [
  'moon_voc',
  'moon_via_combusta',
  'mercury_retrograde',
  'mercury_combust',
  'venus_retrograde',
  'mars_retrograde',
  'jupiter_retrograde',
  'saturn_retrograde',
  'eclipse_window',
  'fixed_star_on_angle',
  'malefic_on_angle',
] as const;

// The exact lookup Glyph.FRIENDLY_REASON uses.
const friendly = (id: string) => ({
  title: i18n.t(`reason.${id}.title`, { ns: 'voice', keySeparator: '.' }),
  body: i18n.t(`reason.${id}.body`, { ns: 'voice', keySeparator: '.' }),
});

beforeAll(() => {
  initI18n();
});

describe('voice:reason lookups', () => {
  it('resolves a non-empty {title, body} for all 11 blocker reasons', () => {
    for (const id of REASON_IDS) {
      const { title, body } = friendly(id);
      expect(typeof title).toBe('string');
      expect(title.length).toBeGreaterThan(0);
      // a miss returns the literal key path — assert we never get that back
      expect(title).not.toContain(`reason.${id}`);
      expect(typeof body).toBe('string');
      expect(body.length).toBeGreaterThan(0);
      expect(body).not.toContain(`reason.${id}`);
    }
  });

  it('resolves the canonical en copy (not the bare key)', () => {
    expect(friendly('moon_voc').title).toBe('The Moon is between signs');
    expect(friendly('malefic_on_angle').title).toBe('A difficult planet rises today');
  });

  it('matches the en voice/reason.json source of truth', () => {
    for (const id of REASON_IDS) {
      expect(friendly(id).title).toBe((en_reason as any)[id].title);
      expect(friendly(id).body).toBe((en_reason as any)[id].body);
    }
  });
});

describe('voice/reason.json is en-only', () => {
  it('has no de/fr/es-419/pt-BR counterpart files', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const localesDir = path.resolve(__dirname, '../../locales');
    for (const loc of ['de', 'fr', 'es-419', 'pt-BR']) {
      const p = path.join(localesDir, loc, 'voice', 'reason.json');
      expect(fs.existsSync(p)).toBe(false);
    }
  });

  it('covers all 11 reasons in the en voice file', () => {
    for (const id of REASON_IDS) {
      expect(en_reason).toHaveProperty(id);
    }
  });
});
