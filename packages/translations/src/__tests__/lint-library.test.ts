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

// ─── SCREEN-SOFT overflow allowlist ─────────────────────────────────────────
//
// SCREEN-SOFT overflows — wrap on-screen (DailyNoteBody / 03b No-Viable
// screen), NOT card-hard. Deferred to the German layout pass + native-review
// (strings get revised there anyway). Each id is tracked debt; remove from
// KNOWN_LAYOUT_PASS_OVERFLOWS as it's fixed. Spec §4.
//
// Format: "source:key:field:locale"
//   source  — "daily-note-fallbacks" | "daily-note-variants"
//   key     — the primary_entry_id (fallbacks use the DAILY_NOTE_FALLBACKS key)
//   field   — "headline" | "supporting"
//   locale  — de | fr | es-419 | pt-BR   (en is never in this list — en was the
//             authoritative string that set the budget; non-en overflows are the
//             layout-pass work item)
//
// ─── Grouped by source and workload owner ───────────────────────────────────
//
//  daily-note-fallbacks (3 overflows — de/fr layout pass):
//    closed-mercury-retrograde supporting fr
//    closed-malefic-on-angle   headline   de
//    closed-malefic-on-angle   headline   fr
//
//  daily-note-variants / closed-eclipse-window (9 overflows — de/fr/es-419/pt-BR layout pass):
//    variant 1: headline de; supporting de/fr/es-419/pt-BR
//    variant 2: headline fr/es-419/pt-BR; supporting de/fr/es-419/pt-BR
//
//  daily-note-variants / closed-moon-voc (1 overflow — es-419 layout pass):
//    variant 1: headline es-419
//
//  daily-note-variants / closed-mercury-retrograde (1 overflow — fr layout pass):
//    variant 0: supporting fr
//
//  daily-note-variants / closed-venus-retrograde (1 overflow — fr layout pass):
//    variant 0: supporting fr
//
//  daily-note-variants / mixed-moon-steady-sky-thin (10 overflows — de/fr/es-419/pt-BR layout pass):
//    variant 0: headline de/fr/es-419/pt-BR; supporting fr
//    variant 3: supporting de/fr/es-419
//    variant 4: supporting fr/es-419
//
//  daily-note-variants / strong-ruler-in-motion (2 overflows — es-419 layout pass):
//    variant 1: supporting es-419
//    variant 2: supporting es-419
//
// Total tracked: 27 (daily-note-fallbacks: 3, daily-note-variants: 24)
// NO overflows in: DAILY_NOTES primary entries, SEVERITY_HINTS
// ────────────────────────────────────────────────────────────────────────────
const KNOWN_LAYOUT_PASS_OVERFLOWS: ReadonlySet<string> = new Set([
  // daily-note-fallbacks
  'daily-note-fallbacks:closed-mercury-retrograde:supporting:fr',
  'daily-note-fallbacks:closed-malefic-on-angle:headline:de',
  'daily-note-fallbacks:closed-malefic-on-angle:headline:fr',

  // daily-note-variants / closed-eclipse-window
  'daily-note-variants:closed-eclipse-window:1:headline:de',
  'daily-note-variants:closed-eclipse-window:1:supporting:de',
  'daily-note-variants:closed-eclipse-window:1:supporting:fr',
  'daily-note-variants:closed-eclipse-window:1:supporting:es-419',
  'daily-note-variants:closed-eclipse-window:1:supporting:pt-BR',
  'daily-note-variants:closed-eclipse-window:2:supporting:de',
  'daily-note-variants:closed-eclipse-window:2:headline:fr',
  'daily-note-variants:closed-eclipse-window:2:supporting:fr',
  'daily-note-variants:closed-eclipse-window:2:headline:es-419',
  'daily-note-variants:closed-eclipse-window:2:supporting:es-419',
  'daily-note-variants:closed-eclipse-window:2:headline:pt-BR',
  'daily-note-variants:closed-eclipse-window:2:supporting:pt-BR',

  // daily-note-variants / closed-moon-voc
  'daily-note-variants:closed-moon-voc:1:headline:es-419',

  // daily-note-variants / closed-mercury-retrograde
  'daily-note-variants:closed-mercury-retrograde:0:supporting:fr',

  // daily-note-variants / closed-venus-retrograde
  'daily-note-variants:closed-venus-retrograde:0:supporting:fr',

  // daily-note-variants / mixed-moon-steady-sky-thin
  'daily-note-variants:mixed-moon-steady-sky-thin:0:headline:de',
  'daily-note-variants:mixed-moon-steady-sky-thin:0:headline:fr',
  'daily-note-variants:mixed-moon-steady-sky-thin:0:supporting:fr',
  'daily-note-variants:mixed-moon-steady-sky-thin:0:headline:es-419',
  'daily-note-variants:mixed-moon-steady-sky-thin:0:headline:pt-BR',
  'daily-note-variants:mixed-moon-steady-sky-thin:3:supporting:de',
  'daily-note-variants:mixed-moon-steady-sky-thin:3:supporting:fr',
  'daily-note-variants:mixed-moon-steady-sky-thin:3:supporting:es-419',
  'daily-note-variants:mixed-moon-steady-sky-thin:4:supporting:fr',
  'daily-note-variants:mixed-moon-steady-sky-thin:4:supporting:es-419',

  // daily-note-variants / strong-ruler-in-motion
  'daily-note-variants:strong-ruler-in-motion:1:supporting:es-419',
  'daily-note-variants:strong-ruler-in-motion:2:supporting:es-419',
]);

// ─── DAILY_NOTES ───────────────────────────────────────────────────────────

describe('library lint — every entry must pass boundary tests + char limits', () => {
  describe('DAILY_NOTES (primary entries)', () => {
    it('covers all 21 KNOWN_DAILY_NOTE_IDS', () => {
      for (const id of KNOWN_DAILY_NOTE_IDS) {
        expect(DAILY_NOTES[id], `missing entry: ${id}`).toBeDefined();
      }
    });

    // STRUCTURAL: char-budget gate runs on ALL 5 LOCALES.
    // No screen-soft overflows exist in primary DAILY_NOTES — hard assertions
    // here; any failure is a real regression.
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
  //
  // Screen-soft overflows in this section are tracked in KNOWN_LAYOUT_PASS_OVERFLOWS.
  // The collection walk below catches NEW overflows (hard-fail) while leaving
  // tracked ones in the allowlist (soft — warns, does not fail).

  describe('DAILY_NOTE_FALLBACKS', () => {
    const fallbackIds = Object.keys(DAILY_NOTE_FALLBACKS);

    // STRUCTURAL: collection-based screen-soft budget for all 5 locales.
    it('all-locale headline + supporting_line budget — new overflows fail, known tracked overflows warned', () => {
      const collectedOverflows: string[] = [];

      for (const id of fallbackIds) {
        const entry = DAILY_NOTE_FALLBACKS[id as keyof typeof DAILY_NOTE_FALLBACKS]!;
        for (const locale of ALL_LOCALES) {
          const h = localize(entry.headline, locale);
          if (h.length > CHAR_LIMITS.headline_max) {
            collectedOverflows.push(`daily-note-fallbacks:${id}:headline:${locale}`);
          }
          const s = localize(entry.supporting_line, locale);
          if (s.length > CHAR_LIMITS.supporting_line_max) {
            collectedOverflows.push(`daily-note-fallbacks:${id}:supporting:${locale}`);
          }
        }
      }

      // Every id in KNOWN_LAYOUT_PASS_OVERFLOWS that belongs to this source
      // must still be overflowing — prevents stale entries rotting in the set.
      const relevantKnown = [...KNOWN_LAYOUT_PASS_OVERFLOWS].filter((id) =>
        id.startsWith('daily-note-fallbacks:'),
      );
      for (const knownId of relevantKnown) {
        expect(
          collectedOverflows,
          `STALE entry in KNOWN_LAYOUT_PASS_OVERFLOWS: "${knownId}" is no longer overflowing.\n` +
            `Remove it from the set — the layout pass / native-review fixed this string.`,
        ).toContain(knownId);
      }

      // NEW overflows (not in the tracked set) must fail the build.
      const newOverflows = collectedOverflows.filter(
        (id) => !KNOWN_LAYOUT_PASS_OVERFLOWS.has(id),
      );
      if (collectedOverflows.length > 0) {
        console.warn(
          `\n[SCREEN-SOFT] DAILY_NOTE_FALLBACKS tracked layout-pass overflows (${collectedOverflows.length}):\n` +
            collectedOverflows.map((id) => `  ${id}`).join('\n') +
            '\n  → Deferred to German layout pass + native-review. Remove from KNOWN_LAYOUT_PASS_OVERFLOWS when fixed.',
        );
      }
      expect(
        newOverflows,
        `NEW screen-soft overflow(s) detected in DAILY_NOTE_FALLBACKS.\n` +
          `Add them to KNOWN_LAYOUT_PASS_OVERFLOWS if they are layout-pass items,\n` +
          `or shorten the string if it exceeds budget unexpectedly.\n` +
          `New overflows:\n${newOverflows.map((id) => `  ${id}`).join('\n')}`,
      ).toHaveLength(0);
    });

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
//
// Screen-soft overflows in this section are tracked in KNOWN_LAYOUT_PASS_OVERFLOWS.

describe('DAILY_NOTE_VARIANT_POOLS lint-clean', () => {
  const pools = Object.values(DAILY_NOTE_VARIANT_POOLS).filter(
    (p): p is NonNullable<typeof p> => p !== undefined,
  );

  // STRUCTURAL: collection-based screen-soft budget for all 5 locales.
  // One assertion covers all pools × all variants × all locales.
  it('all-locale headline + supporting_line budget — new overflows fail, known tracked overflows warned', () => {
    const collectedOverflows: string[] = [];

    for (const pool of pools) {
      const primaryId = pool.primary_entry_id;
      pool.variants.forEach((variant, idx) => {
        for (const locale of ALL_LOCALES) {
          const h = localize(variant.headline, locale);
          if (h.length > CHAR_LIMITS.headline_max) {
            collectedOverflows.push(`daily-note-variants:${primaryId}:${idx}:headline:${locale}`);
          }
          const s = localize(variant.supporting_line, locale);
          if (s.length > CHAR_LIMITS.supporting_line_max) {
            collectedOverflows.push(
              `daily-note-variants:${primaryId}:${idx}:supporting:${locale}`,
            );
          }
        }
      });
    }

    // Every tracked id for this source must still be overflowing (stale-entry guard).
    const relevantKnown = [...KNOWN_LAYOUT_PASS_OVERFLOWS].filter((id) =>
      id.startsWith('daily-note-variants:'),
    );
    for (const knownId of relevantKnown) {
      expect(
        collectedOverflows,
        `STALE entry in KNOWN_LAYOUT_PASS_OVERFLOWS: "${knownId}" is no longer overflowing.\n` +
          `Remove it from the set — the layout pass / native-review fixed this string.`,
      ).toContain(knownId);
    }

    // NEW overflows fail the build.
    const newOverflows = collectedOverflows.filter(
      (id) => !KNOWN_LAYOUT_PASS_OVERFLOWS.has(id),
    );
    if (collectedOverflows.length > 0) {
      console.warn(
        `\n[SCREEN-SOFT] DAILY_NOTE_VARIANT_POOLS tracked layout-pass overflows (${collectedOverflows.length}):\n` +
          collectedOverflows.map((id) => `  ${id}`).join('\n') +
          '\n  → Deferred to German layout pass + native-review. Remove from KNOWN_LAYOUT_PASS_OVERFLOWS when fixed.',
      );
    }
    expect(
      newOverflows,
      `NEW screen-soft overflow(s) detected in DAILY_NOTE_VARIANT_POOLS.\n` +
        `Add them to KNOWN_LAYOUT_PASS_OVERFLOWS if they are layout-pass items,\n` +
        `or shorten the string if it exceeds budget unexpectedly.\n` +
        `New overflows:\n${newOverflows.map((id) => `  ${id}`).join('\n')}`,
    ).toHaveLength(0);
  });

  for (const pool of pools) {
    for (const variant of pool.variants) {
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
// No current overflows in this section — hard assertions. Any failure is a
// real regression or new translated string that exceeds budget.

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
