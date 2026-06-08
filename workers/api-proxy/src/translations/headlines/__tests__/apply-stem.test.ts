import { describe, it, expect } from 'vitest';
import { applyStem } from '../headlines';
import type { Locale } from '../../types';

// VOICE Task 0 — locale-aware lead casing (spec §5.1, the casedForBundle class).
// The lead is a shared factor phrase_short, authored standalone-capitalized.
// Mid-sentence after the stem frame it must read naturally:
//   en/fr/es-419/pt-BR → lowercase the lead's first letter
//   de                 → PRESERVE (German nouns stay capitalized; the German
//                        D-task authors each lead's correct embedded form)
describe('applyStem — locale-aware lead casing', () => {
  const template = 'An open day — {lead}.';
  const lead = 'The room is clear';

  it.each(['en', 'fr', 'es-419', 'pt-BR'] as const)(
    'lowercases the lead first letter for %s (mid-sentence convention)',
    (locale: Locale) => {
      expect(applyStem(template, lead, locale)).toBe('An open day — the room is clear.');
    },
  );

  it('preserves the lead verbatim for de (no blanket-lowercase of German nouns)', () => {
    expect(applyStem(template, 'Venus bringt Wärme', 'de')).toBe(
      'An open day — Venus bringt Wärme.',
    );
    // A capitalized German noun lead is NOT lowercased.
    expect(applyStem(template, 'Der Himmel ist klar', 'de')).toBe(
      'An open day — Der Himmel ist klar.',
    );
  });

  it('handles an empty lead without throwing', () => {
    expect(applyStem(template, '', 'en')).toBe('An open day — .');
  });
});
