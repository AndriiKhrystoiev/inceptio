import { describe, expect, it } from 'vitest';
import { DAILY_NOTES } from '../dictionary/daily-notes';
import { DAILY_NOTE_FALLBACKS } from '../dictionary/daily-note-fallbacks';
import { DAILY_NOTE_VARIANT_POOLS } from '../dictionary/daily-note-variants';
import { lintPhrase } from '../daily-notes/lint';
import { KNOWN_DAILY_NOTE_IDS, localize } from '../types';
import type { Locale } from '../types';

// VOICE Task T: lint split.
//
// ─── SPLIT (spec §4 / §9) ──────────────────────────────────────────────────
//
//  LANGUAGE-CONTENT checks (forbidden-word list, forbidden-horizon, English
//  `.includes()`, the 3-day rule) run on the EN VALUE ONLY.  These checks are
//  authored against English idiom/rules and are meaningless (and produce false
//  positives) on translated copy.  Running them on de/fr/es-419/pt-BR would
//  flag "la magie" as "magic", or a German date-reference as a horizon
//  violation — false positives, not real bugs.
//
//  STRUCTURAL + CHAR-BUDGET checks run on ALL 5 LOCALES.  These are the layout
//  gate: if a translated headline is longer than the budget it WILL overflow the
//  screen on some devices.  Scoping them to en-only would let a German headline
//  that's 2× as long slip through unchecked.
//
// The `lintPhrase` function combines both content-check and structural-check
// results in its `.reasons` array.  Content checks (forbidden-word, horizon
// class, 3-day rule) are gated by the content of the phrase itself — they only
// fire on English idiom.  So: all-locale budget checks use char-length only
// (measured independently below); en-only lintPhrase calls capture the content
// checks.
//
// HISTORICAL NOTE: before this split, all checks ran on the `en` value (
// `localize(entry.headline, 'en')`).  Expanding `localize` to non-en without
// splitting would apply English lint rules to translated copy — wrong.  This
// split is the correct fix.

const CHAR_LIMITS = {
  headline_max: 48,
  supporting_line_max: 140,
} as const;

const ALL_LOCALES: Locale[] = ['en', 'de', 'fr', 'es-419', 'pt-BR'];

// ─── DAILY_NOTES ───────────────────────────────────────────────────────────

describe('library lint — every entry must pass boundary tests + char limits', () => {
  describe('DAILY_NOTES (primary entries)', () => {
    it('covers all 21 KNOWN_DAILY_NOTE_IDS', () => {
      for (const id of KNOWN_DAILY_NOTE_IDS) {
        expect(DAILY_NOTES[id], `missing entry: ${id}`).toBeDefined();
      }
    });

    // STRUCTURAL: char-budget gate runs on ALL 5 LOCALES.
    for (const locale of ALL_LOCALES) {
      it.each(KNOWN_DAILY_NOTE_IDS)(
        `[${locale}] entry %s: headline within ${CHAR_LIMITS.headline_max} chars`,
        (id) => {
          const entry = DAILY_NOTES[id];
          expect(localize(entry.headline, locale).length).toBeLessThanOrEqual(
            CHAR_LIMITS.headline_max,
          );
        },
      );

      it.each(KNOWN_DAILY_NOTE_IDS)(
        `[${locale}] entry %s: supporting_line within ${CHAR_LIMITS.supporting_line_max} chars`,
        (id) => {
          const entry = DAILY_NOTES[id];
          expect(localize(entry.supporting_line, locale).length).toBeLessThanOrEqual(
            CHAR_LIMITS.supporting_line_max,
          );
        },
      );
    }

    // LANGUAGE-CONTENT: lint (forbidden-word, horizon, 3-day rule) runs on EN ONLY.
    it.each(KNOWN_DAILY_NOTE_IDS)(
      '[en-only] entry %s: headline + supporting_line both lint-clean',
      (id) => {
        const entry = DAILY_NOTES[id];
        // For named-day check we pass today_offset_days: 2 (within rule) since
        // the dictionary entries are templates the renderer fills with the
        // current day; the dictionary phrasings themselves don't reference
        // specific days. Concrete-class entries with day names get their
        // horizon verified at render time, not lint time.
        const headlineResult = lintPhrase({
          surface: 'daily-note',
          phrase: localize(entry.headline, 'en'),
          today_offset_days: null,
        });
        expect(headlineResult.reasons).toEqual([]);
        const supportingResult = lintPhrase({
          surface: 'daily-note',
          phrase: localize(entry.supporting_line, 'en'),
          today_offset_days: 2,
        });
        expect(supportingResult.reasons).toEqual([]);
      },
    );

    it('every entry with needs_vague_fallback: true has a fallback in DAILY_NOTE_FALLBACKS', () => {
      for (const id of KNOWN_DAILY_NOTE_IDS) {
        const entry = DAILY_NOTES[id];
        if (entry.needs_vague_fallback) {
          expect(
            DAILY_NOTE_FALLBACKS[id],
            `entry ${id} declares needs_vague_fallback but has no fallback`,
          ).toBeDefined();
        }
      }
    });
  });

  // ─── DAILY_NOTE_FALLBACKS ────────────────────────────────────────────────

  describe('DAILY_NOTE_FALLBACKS', () => {
    const fallbackIds = Object.keys(DAILY_NOTE_FALLBACKS);

    // STRUCTURAL: char-budget for all 5 locales.
    for (const locale of ALL_LOCALES) {
      it.each(fallbackIds)(
        `[${locale}] fallback %s: headline within ${CHAR_LIMITS.headline_max} chars`,
        (id) => {
          const entry = DAILY_NOTE_FALLBACKS[id as keyof typeof DAILY_NOTE_FALLBACKS]!;
          expect(localize(entry.headline, locale).length).toBeLessThanOrEqual(
            CHAR_LIMITS.headline_max,
          );
        },
      );

      it.each(fallbackIds)(
        `[${locale}] fallback %s: supporting_line within ${CHAR_LIMITS.supporting_line_max} chars`,
        (id) => {
          const entry = DAILY_NOTE_FALLBACKS[id as keyof typeof DAILY_NOTE_FALLBACKS]!;
          expect(localize(entry.supporting_line, locale).length).toBeLessThanOrEqual(
            CHAR_LIMITS.supporting_line_max,
          );
        },
      );
    }

    // LANGUAGE-CONTENT: lint on EN ONLY.
    it.each(fallbackIds)('[en-only] fallback %s: lint-clean and vague', (id) => {
      const entry = DAILY_NOTE_FALLBACKS[id as keyof typeof DAILY_NOTE_FALLBACKS]!;
      expect(entry.horizon_class).toBe('vague');
      const headlineResult = lintPhrase({
        surface: 'daily-note',
        phrase: localize(entry.headline, 'en'),
        today_offset_days: null,
      });
      expect(headlineResult.reasons).toEqual([]);
      const supportingResult = lintPhrase({
        surface: 'daily-note',
        phrase: localize(entry.supporting_line, 'en'),
        today_offset_days: null,
      });
      expect(supportingResult.reasons).toEqual([]);
    });
  });
});

// ─── DAILY_NOTE_VARIANT_POOLS ───────────────────────────────────────────────

describe('DAILY_NOTE_VARIANT_POOLS lint-clean', () => {
  const pools = Object.values(DAILY_NOTE_VARIANT_POOLS).filter(
    (p): p is NonNullable<typeof p> => p !== undefined,
  );

  for (const pool of pools) {
    for (const variant of pool.variants) {
      // STRUCTURAL: char-budget for all 5 locales.
      for (const locale of ALL_LOCALES) {
        it(`[${locale}] pool ${pool.primary_entry_id} variant headline "${localize(variant.headline, locale)}" within ${CHAR_LIMITS.headline_max} chars`, () => {
          expect(localize(variant.headline, locale).length).toBeLessThanOrEqual(CHAR_LIMITS.headline_max);
        });
        it(`[${locale}] pool ${pool.primary_entry_id} variant supporting_line within ${CHAR_LIMITS.supporting_line_max} chars`, () => {
          expect(localize(variant.supporting_line, locale).length).toBeLessThanOrEqual(CHAR_LIMITS.supporting_line_max);
        });
      }

      // LANGUAGE-CONTENT: lint-clean check on EN ONLY.
      it(`[en-only] pool ${pool.primary_entry_id} variant lint-clean`, () => {
        const headlineResult = lintPhrase({
          surface: 'daily-note',
          phrase: localize(variant.headline, 'en'),
          today_offset_days: null,
        });
        expect(headlineResult.reasons).toEqual([]);
        const supportingResult = lintPhrase({
          surface: 'daily-note',
          phrase: localize(variant.supporting_line, 'en'),
          today_offset_days: null,
        });
        expect(supportingResult.reasons).toEqual([]);
      });
    }
  }
});

// ─── SEVERITY HINTS — all-locale screen-soft budget ────────────────────────
//
// severity_hint ≤ 150 chars (screen-soft, spec §4). Run on ALL 5 LOCALES
// (structural gate — scoping to en-only would miss a long German translation).

import { SEVERITY_HINTS } from '../dictionary/severity-hints';

const SEVERITY_BUDGET = 150 as const;

describe('SEVERITY_HINTS char-budget — all 5 locales ≤ 150 chars', () => {
  const CONDITIONS = [
    'mercury_retrograde',
    'venus_retrograde',
    'moon_voc',
    'moon_voc_intraday',
  ] as const;
  const ACTIVITIES = ['wedding', 'contracts', 'business_launch', 'travel'] as const;

  for (const locale of ALL_LOCALES) {
    for (const condition of CONDITIONS) {
      for (const activity of ACTIVITIES) {
        const entry = SEVERITY_HINTS[condition]?.[activity];
        if (!entry) continue;
        it(`[${locale}] SEVERITY_HINTS[${condition}][${activity}] ≤ ${SEVERITY_BUDGET} chars`, () => {
          const text = localize(entry.text, locale);
          expect(
            text.length,
            `severity_hint too long (${text.length} > ${SEVERITY_BUDGET})\n` +
              `  locale=${locale} condition=${condition} activity=${activity}\n` +
              `  text="${text}"`,
          ).toBeLessThanOrEqual(SEVERITY_BUDGET);
        });
      }
    }
  }
});
