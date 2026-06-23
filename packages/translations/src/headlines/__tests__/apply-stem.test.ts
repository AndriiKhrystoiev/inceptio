import { describe, it, expect } from 'vitest';
import { applyStem, LEAD_PROPER_NOUNS } from '../headlines';
import { FACTORS } from '../../dictionary/factors';
import weddingOverrides from '../../activity-overrides/wedding';
import contractsOverrides from '../../activity-overrides/contracts';
import businessLaunchOverrides from '../../activity-overrides/business-launch';
import travelOverrides from '../../activity-overrides/travel';
import { localize } from '../../types';
import type { Locale } from '../../types';

// VOICE Task 0 + proper-noun guard (spec §5.1, the casedForBundle class).
// The lead is a shared factor phrase_short, authored standalone-capitalized.
// Embedded mid-sentence after the stem frame it must read naturally:
//   en/fr/es-419/pt-BR → lowercase the first letter, UNLESS the lead begins
//     with a planet/luminary proper noun (stays capitalized).
//   de                 → PRESERVE (German nouns stay capitalized).
describe('applyStem — locale-aware lead casing', () => {
  const template = 'An open day — {lead}.';

  it.each(['en', 'fr', 'es-419', 'pt-BR'] as const)(
    'lowercases a common/article-initial lead for %s',
    (locale: Locale) => {
      expect(applyStem(template, 'The room is clear', locale)).toBe(
        'An open day — the room is clear.',
      );
    },
  );

  it('preserves the lead verbatim for de (no blanket-lowercase of German nouns)', () => {
    expect(applyStem(template, 'Venus bringt Wärme', 'de')).toBe('An open day — Venus bringt Wärme.');
    expect(applyStem(template, 'Der Himmel ist klar', 'de')).toBe('An open day — Der Himmel ist klar.');
  });

  it('keeps a bare proper-noun lead CAPITALIZED for en/fr/es-419/pt-BR', () => {
    expect(applyStem(template, 'Venus brings warmth', 'en')).toBe('An open day — Venus brings warmth.');
    expect(applyStem(template, 'Vénus apporte de la chaleur', 'fr')).toBe('An open day — Vénus apporte de la chaleur.');
    expect(applyStem(template, 'Mercurio corre claro', 'es-419')).toBe('An open day — Mercurio corre claro.');
    expect(applyStem(template, 'Júpiter ajuda o mensageiro', 'pt-BR')).toBe('An open day — Júpiter ajuda o mensageiro.');
  });

  it('matches the proper noun by first TOKEN (possessive / hyphen prefix)', () => {
    expect(applyStem('X — {lead}.', "Venus's hour holds", 'en')).toBe("X — Venus's hour holds.");
  });

  it('handles an empty lead without throwing', () => {
    expect(applyStem(template, '', 'en')).toBe('An open day — .');
  });
});

// Self-verifying coverage: enumerate EVERY factor/override lead; any lead whose
// first token is a planet/luminary proper noun MUST (a) be in LEAD_PROPER_NOUNS
// for its locale and (b) survive applyStem with its capital intact. A future
// bare-proper-noun lead added without updating the guard set fails here loudly.
describe('proper-noun guard completeness vs the real leads', () => {
  const LOCALES: Locale[] = ['en', 'fr', 'es-419', 'pt-BR'];
  // Reference set used ONLY to DETECT proper-noun-initial leads (broader than the
  // guard set on purpose — if a lead starts with one of these but is NOT in the
  // guard, that's the failure we want to surface).
  const REFERENCE_PLANETS: Record<string, ReadonlySet<string>> = {
    en: new Set(['Venus', 'Mercury', 'Jupiter', 'Mars', 'Saturn', 'Moon', 'Sun']),
    fr: new Set(['Vénus', 'Mercure', 'Jupiter', 'Mars', 'Saturne', 'Lune', 'Soleil']),
    'es-419': new Set(['Venus', 'Mercurio', 'Júpiter', 'Marte', 'Saturno', 'Luna', 'Sol']),
    'pt-BR': new Set(['Vênus', 'Mercúrio', 'Júpiter', 'Marte', 'Saturno', 'Lua', 'Sol']),
  };
  const overrides = [weddingOverrides, contractsOverrides, businessLaunchOverrides, travelOverrides];
  const firstToken = (s: string) => s.split(/[\s'’-]/, 1)[0] ?? '';

  // Loose shapes for the dict walk (the test only reads phrase_short leaves).
  type Leaf = { phrase_short?: unknown };
  type PA = { polarity_aware?: Record<string, Leaf | undefined> };
  const POLARITIES = ['pass', 'partial', 'fail'] as const;

  const collectLeads = (locale: Locale): string[] => {
    const out: string[] = [];
    const add = (ps: unknown) => {
      if (ps == null) return;
      const s = localize(ps as Parameters<typeof localize>[0], locale) as unknown;
      if (typeof s === 'string' && s.length) out.push(s);
    };
    const walk = (byId: Record<string, PA | undefined>) => {
      for (const id of Object.keys(byId)) {
        const pa = byId[id]?.polarity_aware;
        if (!pa) continue;
        for (const st of POLARITIES) add(pa[st]?.phrase_short);
      }
    };
    walk(FACTORS as unknown as Record<string, PA>);
    for (const ov of overrides) walk(ov as unknown as Record<string, PA>);
    return out;
  };

  it.each(['en', 'fr', 'es-419', 'pt-BR'] as const)(
    'every proper-noun-initial lead is guarded AND stays capitalized for %s',
    (locale: Locale) => {
      const properLeads = collectLeads(locale).filter((l) => REFERENCE_PLANETS[locale]!.has(firstToken(l)));
      // sanity: this locale actually has some (catches a broken enumeration)
      expect(properLeads.length).toBeGreaterThan(0);
      for (const lead of properLeads) {
        // guard set covers it
        expect(LEAD_PROPER_NOUNS[locale].has(firstToken(lead))).toBe(true);
        // and applyStem keeps the capital
        expect(applyStem('A day — {lead}.', lead, locale)).toBe(`A day — ${lead}.`);
      }
    },
  );
});
