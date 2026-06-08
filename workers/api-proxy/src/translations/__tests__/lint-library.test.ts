import { describe, expect, it } from 'vitest';
import { DAILY_NOTES } from '../dictionary/daily-notes';
import { DAILY_NOTE_FALLBACKS } from '../dictionary/daily-note-fallbacks';
import { DAILY_NOTE_VARIANT_POOLS } from '../dictionary/daily-note-variants';
import { lintPhrase } from '../daily-notes/lint';
import { KNOWN_DAILY_NOTE_IDS, localize } from '../types';

// VOICE Task 0: dictionary leaves are now `Localized` (plain string today,
// en-everywhere). These en-source structural/budget checks resolve each leaf
// to 'en' before measuring. Task T splits this into all-locale budget +
// en-only language checks; for the spine we only need en-equivalence + green.

const CHAR_LIMITS = {
  headline_max: 48,
  supporting_line_max: 140,
} as const;

describe('library lint — every entry must pass boundary tests + char limits', () => {
  describe('DAILY_NOTES (primary entries)', () => {
    it('covers all 21 KNOWN_DAILY_NOTE_IDS', () => {
      for (const id of KNOWN_DAILY_NOTE_IDS) {
        expect(DAILY_NOTES[id], `missing entry: ${id}`).toBeDefined();
      }
    });

    it.each(KNOWN_DAILY_NOTE_IDS)('entry %s: headline within 48 chars', (id) => {
      const entry = DAILY_NOTES[id];
      expect(localize(entry.headline, 'en').length).toBeLessThanOrEqual(
        CHAR_LIMITS.headline_max,
      );
    });

    it.each(KNOWN_DAILY_NOTE_IDS)(
      'entry %s: supporting_line within 140 chars',
      (id) => {
        const entry = DAILY_NOTES[id];
        expect(localize(entry.supporting_line, 'en').length).toBeLessThanOrEqual(
          CHAR_LIMITS.supporting_line_max,
        );
      },
    );

    it.each(KNOWN_DAILY_NOTE_IDS)(
      'entry %s: headline + supporting_line both lint-clean',
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

  describe('DAILY_NOTE_FALLBACKS', () => {
    const fallbackIds = Object.keys(DAILY_NOTE_FALLBACKS);

    it.each(fallbackIds)('fallback %s: lint-clean and vague', (id) => {
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

describe('DAILY_NOTE_VARIANT_POOLS lint-clean', () => {
  const pools = Object.values(DAILY_NOTE_VARIANT_POOLS).filter(
    (p): p is NonNullable<typeof p> => p !== undefined,
  );

  for (const pool of pools) {
    for (const variant of pool.variants) {
      it(`pool ${pool.primary_entry_id} variant headline "${localize(variant.headline, 'en')}" within 48 chars`, () => {
        expect(localize(variant.headline, 'en').length).toBeLessThanOrEqual(48);
      });
      it(`pool ${pool.primary_entry_id} variant supporting_line within 140 chars`, () => {
        expect(localize(variant.supporting_line, 'en').length).toBeLessThanOrEqual(140);
      });
      it(`pool ${pool.primary_entry_id} variant lint-clean`, () => {
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
