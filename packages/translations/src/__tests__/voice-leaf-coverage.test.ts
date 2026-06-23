import { describe, it, expect } from 'vitest';
import { FACTORS } from '../dictionary/factors';
import { EXCLUDED_REASONS } from '../dictionary/excluded-reasons';
import { KNOWN_DAILY_NOTE_IDS } from '../types';
import { DAILY_NOTES } from '../dictionary/daily-notes';
import { DAILY_NOTE_FALLBACKS } from '../dictionary/daily-note-fallbacks';
import { DAILY_NOTE_VARIANT_POOLS } from '../dictionary/daily-note-variants';
import { SEVERITY_HINTS } from '../dictionary/severity-hints';
import { HEADLINES, GENERIC_HEADLINE_STEMS, NO_VIABLE_HEADLINES } from '../headlines/headlines';
import weddingOverrides from '../activity-overrides/wedding';
import contractsOverrides from '../activity-overrides/contracts';
import businessLaunchOverrides from '../activity-overrides/business-launch';
import travelOverrides from '../activity-overrides/travel';
import {
  FALLBACK_REASON_PHRASE,
  FALLBACK_FACTOR_PHRASING,
  CONTEXTUAL_TAGS,
} from '../translate';
import type { Locale } from '../types';
import type { Activity } from '@inceptio/shared-types';

// ─── Deferred named set ───────────────────────────────────────────────────────
//
// These two sources are NOT translated in the VOICE phase — they are dead
// scaffolding for the unbuilt saved-search fan-out. The coverage enumeration
// below MUST exclude them so the missing-locale check does not false-fire.
//
// "translate when the saved-search fan-out ships" (see spec §7).
const VOICE_DEFERRED = ['status-lines', 'empty-state'] as const;

// ─── Task 5: deferred-set guard ───────────────────────────────────────────────
describe('deferred named set — VOICE_DEFERRED', () => {
  it('contains exactly two entries ("status-lines" and "empty-state"), cannot silently grow', () => {
    // Length-1 assertion: changing VOICE_DEFERRED without updating this test
    // is a deliberate code-review gate.
    expect(VOICE_DEFERRED).toHaveLength(2);
    expect(VOICE_DEFERRED).toContain('status-lines');
    expect(VOICE_DEFERRED).toContain('empty-state');
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALL_LOCALES: Locale[] = ['en', 'de', 'fr', 'es-419', 'pt-BR'];

type LocaleRecord = Record<Locale, string>;

/**
 * Returns true if the leaf is a `Localized` Record (has 'en' as an own key).
 * A bare string (or any non-Record) returns false.
 * This is the CRITICAL check for Task T §3(b): it catches the FactorPhrasing-gap
 * class where a leaf is accidentally a plain string and silently ships only
 * English regardless of locale.
 */
function isLocalizedRecord(leaf: unknown): leaf is LocaleRecord {
  return (
    leaf !== null &&
    typeof leaf === 'object' &&
    'en' in (leaf as object)
  );
}

/**
 * Assert that a leaf is a Localized Record AND has non-empty values for all
 * 5 locale keys.  Provides a clear failure message naming the source.
 */
function assertLocalizedLeaf(leaf: unknown, source: string): void {
  // (b) CRITICAL: the leaf MUST be a Localized Record, not a bare string.
  // A bare string silently ships English for every locale — the FactorPhrasing gap class.
  expect(
    isLocalizedRecord(leaf),
    `LEAF IS NOT LOCALIZED (plain string / wrong type) at: ${source}\n` +
      `  type: ${typeof leaf}, value: ${JSON.stringify(leaf)}\n` +
      `  Fix: convert to { en: '...', de: '...', fr: '...', 'es-419': '...', 'pt-BR': '...' }`,
  ).toBe(true);

  if (!isLocalizedRecord(leaf)) return; // type narrowed after the assertion

  // (a) All 5 locale keys must be present and non-empty.
  for (const locale of ALL_LOCALES) {
    const value = (leaf as Record<string, unknown>)[locale];
    expect(
      typeof value === 'string' && value.length > 0,
      `Missing or empty locale '${locale}' at: ${source}\n` +
        `  got: ${JSON.stringify(value)}`,
    ).toBe(true);
  }
}

// ─── Shapes for the dict walk ─────────────────────────────────────────────────

type PhraseLeaf = { phrase_short?: unknown; phrase_full?: unknown };
type PolarityAware = { polarity_aware?: Record<string, PhraseLeaf | undefined> };
const POLARITIES = ['pass', 'partial', 'fail'] as const;

// ─── Task 3a+b: leaf coverage ─────────────────────────────────────────────────

describe('server voice-leaf coverage — every user-facing leaf is Localized (Record) with all 5 locales', () => {
  // ── 1. FACTORS phrase_short + phrase_full (base + activity overrides) ──────

  describe('FACTORS — base dictionary', () => {
    for (const [factorId, entry] of Object.entries(FACTORS)) {
      const pa = (entry as PolarityAware).polarity_aware;
      if (!pa) continue;
      for (const status of POLARITIES) {
        const phrasing = pa[status];
        if (!phrasing) continue;
        it(`FACTORS[${factorId}][${status}].phrase_short`, () => {
          assertLocalizedLeaf(phrasing.phrase_short, `FACTORS[${factorId}][${status}].phrase_short`);
        });
        it(`FACTORS[${factorId}][${status}].phrase_full`, () => {
          assertLocalizedLeaf(phrasing.phrase_full, `FACTORS[${factorId}][${status}].phrase_full`);
        });
      }
    }
  });

  describe('activity-overrides — wedding', () => {
    for (const [factorId, entry] of Object.entries(weddingOverrides)) {
      const pa = (entry as PolarityAware).polarity_aware;
      if (!pa) continue;
      for (const status of POLARITIES) {
        const phrasing = pa[status];
        if (!phrasing) continue;
        if (phrasing.phrase_short != null) {
          it(`wedding-override[${factorId}][${status}].phrase_short`, () => {
            assertLocalizedLeaf(phrasing.phrase_short, `wedding-override[${factorId}][${status}].phrase_short`);
          });
        }
        if (phrasing.phrase_full != null) {
          it(`wedding-override[${factorId}][${status}].phrase_full`, () => {
            assertLocalizedLeaf(phrasing.phrase_full, `wedding-override[${factorId}][${status}].phrase_full`);
          });
        }
      }
    }
  });

  describe('activity-overrides — contracts', () => {
    for (const [factorId, entry] of Object.entries(contractsOverrides)) {
      const pa = (entry as PolarityAware).polarity_aware;
      if (!pa) continue;
      for (const status of POLARITIES) {
        const phrasing = pa[status];
        if (!phrasing) continue;
        if (phrasing.phrase_short != null) {
          it(`contracts-override[${factorId}][${status}].phrase_short`, () => {
            assertLocalizedLeaf(phrasing.phrase_short, `contracts-override[${factorId}][${status}].phrase_short`);
          });
        }
        if (phrasing.phrase_full != null) {
          it(`contracts-override[${factorId}][${status}].phrase_full`, () => {
            assertLocalizedLeaf(phrasing.phrase_full, `contracts-override[${factorId}][${status}].phrase_full`);
          });
        }
      }
    }
  });

  describe('activity-overrides — business-launch', () => {
    for (const [factorId, entry] of Object.entries(businessLaunchOverrides)) {
      const pa = (entry as PolarityAware).polarity_aware;
      if (!pa) continue;
      for (const status of POLARITIES) {
        const phrasing = pa[status];
        if (!phrasing) continue;
        if (phrasing.phrase_short != null) {
          it(`business-launch-override[${factorId}][${status}].phrase_short`, () => {
            assertLocalizedLeaf(phrasing.phrase_short, `business-launch-override[${factorId}][${status}].phrase_short`);
          });
        }
        if (phrasing.phrase_full != null) {
          it(`business-launch-override[${factorId}][${status}].phrase_full`, () => {
            assertLocalizedLeaf(phrasing.phrase_full, `business-launch-override[${factorId}][${status}].phrase_full`);
          });
        }
      }
    }
  });

  describe('activity-overrides — travel', () => {
    for (const [factorId, entry] of Object.entries(travelOverrides)) {
      const pa = (entry as PolarityAware).polarity_aware;
      if (!pa) continue;
      for (const status of POLARITIES) {
        const phrasing = pa[status];
        if (!phrasing) continue;
        if (phrasing.phrase_short != null) {
          it(`travel-override[${factorId}][${status}].phrase_short`, () => {
            assertLocalizedLeaf(phrasing.phrase_short, `travel-override[${factorId}][${status}].phrase_short`);
          });
        }
        if (phrasing.phrase_full != null) {
          it(`travel-override[${factorId}][${status}].phrase_full`, () => {
            assertLocalizedLeaf(phrasing.phrase_full, `travel-override[${factorId}][${status}].phrase_full`);
          });
        }
      }
    }
  });

  // ── 2. EXCLUDED_REASONS phrase ──────────────────────────────────────────────

  describe('EXCLUDED_REASONS — phrase leaves', () => {
    for (const [reasonId, entry] of Object.entries(EXCLUDED_REASONS)) {
      it(`EXCLUDED_REASONS[${reasonId}].phrase`, () => {
        assertLocalizedLeaf(entry.phrase, `EXCLUDED_REASONS[${reasonId}].phrase`);
      });
    }
  });

  // ── 3. DAILY_NOTES headline + supporting_line ──────────────────────────────

  describe('DAILY_NOTES — headline + supporting_line leaves', () => {
    for (const id of KNOWN_DAILY_NOTE_IDS) {
      const entry = DAILY_NOTES[id];
      it(`DAILY_NOTES[${id}].headline`, () => {
        assertLocalizedLeaf(entry.headline, `DAILY_NOTES[${id}].headline`);
      });
      it(`DAILY_NOTES[${id}].supporting_line`, () => {
        assertLocalizedLeaf(entry.supporting_line, `DAILY_NOTES[${id}].supporting_line`);
      });
    }
  });

  // ── 4. DAILY_NOTE_FALLBACKS ────────────────────────────────────────────────

  describe('DAILY_NOTE_FALLBACKS — headline + supporting_line leaves', () => {
    for (const [id, entry] of Object.entries(DAILY_NOTE_FALLBACKS)) {
      if (!entry) continue;
      it(`DAILY_NOTE_FALLBACKS[${id}].headline`, () => {
        assertLocalizedLeaf(entry.headline, `DAILY_NOTE_FALLBACKS[${id}].headline`);
      });
      it(`DAILY_NOTE_FALLBACKS[${id}].supporting_line`, () => {
        assertLocalizedLeaf(entry.supporting_line, `DAILY_NOTE_FALLBACKS[${id}].supporting_line`);
      });
    }
  });

  // ── 5. DAILY_NOTE_VARIANT_POOLS ────────────────────────────────────────────

  describe('DAILY_NOTE_VARIANT_POOLS — variant headline + supporting_line leaves', () => {
    for (const [primaryId, pool] of Object.entries(DAILY_NOTE_VARIANT_POOLS)) {
      if (!pool) continue;
      pool.variants.forEach((variant, idx) => {
        it(`VARIANT_POOLS[${primaryId}][${idx}].headline`, () => {
          assertLocalizedLeaf(variant.headline, `VARIANT_POOLS[${primaryId}][${idx}].headline`);
        });
        it(`VARIANT_POOLS[${primaryId}][${idx}].supporting_line`, () => {
          assertLocalizedLeaf(variant.supporting_line, `VARIANT_POOLS[${primaryId}][${idx}].supporting_line`);
        });
      });
    }
  });

  // ── 6. SEVERITY_HINTS text leaves ──────────────────────────────────────────

  describe('SEVERITY_HINTS — text leaves', () => {
    const ACTIVITIES: Activity[] = ['wedding', 'contracts', 'business_launch', 'travel'];
    const CONDITIONS = ['mercury_retrograde', 'venus_retrograde', 'moon_voc', 'moon_voc_intraday'] as const;
    for (const condition of CONDITIONS) {
      for (const activity of ACTIVITIES) {
        const entry = SEVERITY_HINTS[condition]?.[activity];
        if (!entry) continue;
        it(`SEVERITY_HINTS[${condition}][${activity}].text`, () => {
          assertLocalizedLeaf(entry.text, `SEVERITY_HINTS[${condition}][${activity}].text`);
        });
      }
    }
  });

  // ── 7. HEADLINES / NO_VIABLE_HEADLINES / GENERIC_HEADLINE_STEMS ────────────

  describe('HEADLINES — per-activity per-factor per-status leaves', () => {
    const ACTIVITIES_WITH_HEADLINES: Activity[] = ['wedding', 'contracts', 'business_launch', 'travel'];
    for (const activity of ACTIVITIES_WITH_HEADLINES) {
      const activityHeadlines = HEADLINES[activity];
      if (!activityHeadlines) continue;
      for (const [factorId, statusMap] of Object.entries(activityHeadlines)) {
        if (!statusMap) continue;
        for (const [status, leaf] of Object.entries(statusMap)) {
          if (leaf == null) continue;
          it(`HEADLINES[${activity}][${factorId}][${status}]`, () => {
            assertLocalizedLeaf(leaf, `HEADLINES[${activity}][${factorId}][${status}]`);
          });
        }
      }
    }
  });

  describe('NO_VIABLE_HEADLINES — per-activity leaves', () => {
    const ACTIVITIES_LIST: Activity[] = ['wedding', 'contracts', 'business_launch', 'travel'];
    for (const activity of ACTIVITIES_LIST) {
      it(`NO_VIABLE_HEADLINES[${activity}]`, () => {
        assertLocalizedLeaf(NO_VIABLE_HEADLINES[activity], `NO_VIABLE_HEADLINES[${activity}]`);
      });
    }
  });

  describe('GENERIC_HEADLINE_STEMS — per-activity template leaves', () => {
    const ACTIVITIES_LIST: Activity[] = ['wedding', 'contracts', 'business_launch', 'travel'];
    for (const activity of ACTIVITIES_LIST) {
      it(`GENERIC_HEADLINE_STEMS[${activity}]`, () => {
        assertLocalizedLeaf(GENERIC_HEADLINE_STEMS[activity], `GENERIC_HEADLINE_STEMS[${activity}]`);
      });
    }
  });

  // ── 8. translate.ts — FALLBACK_REASON_PHRASE + FALLBACK_FACTOR_PHRASING + CONTEXTUAL_TAGS ──
  //
  // These are imported directly from translate.ts (they are now exported).
  // All three are Localized Records — they are the ONLY strings rendered on
  // upstream enum-drift events, so a non-en user must never see English fallback.
  //
  // Previously tested via behavioral proxy only (translateFactor / translateExcludedReason
  // called with an unknown id). Now directly asserted as Localized Records with all 5
  // locale keys present and non-empty, closing the "behavioral proxy only" gap.

  describe('translate.ts — FALLBACK_REASON_PHRASE (Localized, all 5 locales)', () => {
    it('FALLBACK_REASON_PHRASE is a Localized Record with all 5 locales', () => {
      assertLocalizedLeaf(FALLBACK_REASON_PHRASE, 'FALLBACK_REASON_PHRASE');
    });
  });

  describe('translate.ts — FALLBACK_FACTOR_PHRASING (phrase_short + phrase_full, all 5 locales)', () => {
    it('FALLBACK_FACTOR_PHRASING.phrase_short is a Localized Record with all 5 locales', () => {
      assertLocalizedLeaf(FALLBACK_FACTOR_PHRASING.phrase_short, 'FALLBACK_FACTOR_PHRASING.phrase_short');
    });
    it('FALLBACK_FACTOR_PHRASING.phrase_full is a Localized Record with all 5 locales', () => {
      assertLocalizedLeaf(FALLBACK_FACTOR_PHRASING.phrase_full, 'FALLBACK_FACTOR_PHRASING.phrase_full');
    });
  });

  describe('translate.ts — CONTEXTUAL_TAGS (default/morning/afternoon/evening/late_night, all 5 locales)', () => {
    it('CONTEXTUAL_TAGS.default is a Localized Record with all 5 locales', () => {
      assertLocalizedLeaf(CONTEXTUAL_TAGS.default, 'CONTEXTUAL_TAGS.default');
    });
    it('CONTEXTUAL_TAGS.morning is a Localized Record with all 5 locales', () => {
      assertLocalizedLeaf(CONTEXTUAL_TAGS.morning, 'CONTEXTUAL_TAGS.morning');
    });
    it('CONTEXTUAL_TAGS.afternoon is a Localized Record with all 5 locales', () => {
      assertLocalizedLeaf(CONTEXTUAL_TAGS.afternoon, 'CONTEXTUAL_TAGS.afternoon');
    });
    it('CONTEXTUAL_TAGS.evening is a Localized Record with all 5 locales', () => {
      assertLocalizedLeaf(CONTEXTUAL_TAGS.evening, 'CONTEXTUAL_TAGS.evening');
    });
    it('CONTEXTUAL_TAGS.late_night is a Localized Record with all 5 locales', () => {
      assertLocalizedLeaf(CONTEXTUAL_TAGS.late_night, 'CONTEXTUAL_TAGS.late_night');
    });
  });
});

// ─── Task 3b sanity: a plain string WOULD fail the isLocalizedRecord check ───
describe('isLocalizedRecord guard — self-test (a bare string MUST fail)', () => {
  it('a plain string is detected as non-Localized (would fail the leaf check)', () => {
    const bareString = 'This is a plain English string — it is NOT Localized';
    expect(isLocalizedRecord(bareString)).toBe(false);
  });

  it('a proper Localized Record with all 5 locales passes', () => {
    const localized = {
      en: 'Hello',
      de: 'Hallo',
      fr: 'Bonjour',
      'es-419': 'Hola',
      'pt-BR': 'Olá',
    };
    expect(isLocalizedRecord(localized)).toBe(true);
  });

  it('a Record missing a locale is still detected by the all-locales check', () => {
    const incomplete = {
      en: 'Hello',
      de: 'Hallo',
      fr: 'Bonjour',
      // es-419 and pt-BR missing
    };
    // isLocalizedRecord passes (has 'en') but the assertLocalizedLeaf would fail
    // on the missing locales. Document this via a direct check:
    expect(isLocalizedRecord(incomplete)).toBe(true); // has 'en', so shape OK
    const value = (incomplete as Record<string, unknown>)['es-419'];
    expect(typeof value === 'string' && (value as string).length > 0).toBe(false);
  });
});
