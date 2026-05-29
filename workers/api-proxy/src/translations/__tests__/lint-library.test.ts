import { describe, expect, it } from 'vitest';
import { DAILY_NOTES } from '../dictionary/daily-notes';
import { DAILY_NOTE_FALLBACKS } from '../dictionary/daily-note-fallbacks';
import { lintPhrase } from '../daily-notes/lint';
import { KNOWN_DAILY_NOTE_IDS } from '../types';

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
      expect(entry.headline.length).toBeLessThanOrEqual(CHAR_LIMITS.headline_max);
    });

    it.each(KNOWN_DAILY_NOTE_IDS)(
      'entry %s: supporting_line within 140 chars',
      (id) => {
        const entry = DAILY_NOTES[id];
        expect(entry.supporting_line.length).toBeLessThanOrEqual(
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
          phrase: entry.headline,
          today_offset_days: null,
        });
        expect(headlineResult.reasons).toEqual([]);
        const supportingResult = lintPhrase({
          surface: 'daily-note',
          phrase: entry.supporting_line,
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
        phrase: entry.headline,
        today_offset_days: null,
      });
      expect(headlineResult.reasons).toEqual([]);
      const supportingResult = lintPhrase({
        surface: 'daily-note',
        phrase: entry.supporting_line,
        today_offset_days: null,
      });
      expect(supportingResult.reasons).toEqual([]);
    });
  });
});
