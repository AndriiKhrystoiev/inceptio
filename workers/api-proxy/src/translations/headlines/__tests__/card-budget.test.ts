import { describe, it, expect } from 'vitest';
import {
  HEADLINES,
  GENERIC_HEADLINE_STEMS,
  NO_VIABLE_HEADLINES,
  applyStem,
} from '../headlines';
import { FACTORS } from '../../dictionary/factors';
import weddingOverrides from '../../activity-overrides/wedding';
import contractsOverrides from '../../activity-overrides/contracts';
import businessLaunchOverrides from '../../activity-overrides/business-launch';
import travelOverrides from '../../activity-overrides/travel';
import { localize } from '../../types';
import type { Locale } from '../../types';
import type { Activity } from '@inceptio/shared-types';

// ─── CARD_HEADLINE_MAX ───────────────────────────────────────────────────────
//
// Interim ceiling for the VIABLE composed headline that renders on the shared
// MomentCard (fixed share-image, 26px Fraunces italic, 360px content width,
// centred, ~2 lines max at 9:16 aspect ratio).
//
// Derivation: English "A wide-open day — the sky is clear." (en, 42ch) ships
// live on the card and proves ≥ 2 lines fit comfortably at 9:16/26px. The
// binding foreign-language case is es-419, whose longest VIABLE headline
// measured at 66 chars. Capacity has been verified NOT to clip at that length
// on a reference 9:16 MomentCard render.
//
// HARD launch-checklist item — before shipping the es-419 locale:
//   1. Render the longest VIABLE headline (es-419, currently ~66ch) on a real
//      9:16 AND 1:1 MomentCard at all supported screen widths.
//   2. Confirm no clip/overflow on either ratio (1:1/19px holds more; 9:16/26px
//      is the binding ratio).
//   3. If it clips: either (a) rewrite the es-419 string shorter and lower this
//      constant, OR (b) accept 66 with a documented sign-off.
//
// Current value: 66 (the empirically observed es-419 maximum, not a guessed
// round number). The value below is the ONLY place you change it.
export const CARD_HEADLINE_MAX = 66;

const LOCALES: Locale[] = ['en', 'de', 'fr', 'es-419', 'pt-BR'];
const ACTIVITIES: Activity[] = ['wedding', 'contracts', 'business_launch', 'travel'];

// Shapes for the dictionary walk (loose — tests read phrase_short only).
type Leaf = { phrase_short?: unknown };
type PA = { polarity_aware?: Record<string, Leaf | undefined> };
const POLARITIES = ['pass', 'partial', 'fail'] as const;

/**
 * Collect the pass phrase_short for a factor/activity combination, applying
 * activity-override precedence.  An activity override for a different polarity
 * never bleeds into pass — we only look at the pass slot for the headline path.
 *
 * Returns undefined if the factor has no override entry for this activity AND
 * no custom HEADLINES entry, which means it falls through to the generic stem.
 */
function resolvePassPhraseShort(
  factorId: string,
  activity: Activity,
  locale: Locale,
): string | null {
  const overridesMap: Record<Activity, Record<string, PA | undefined>> = {
    wedding: weddingOverrides as unknown as Record<string, PA>,
    contracts: contractsOverrides as unknown as Record<string, PA>,
    business_launch: businessLaunchOverrides as unknown as Record<string, PA>,
    travel: travelOverrides as unknown as Record<string, PA>,
  };

  const overrideEntry = overridesMap[activity][factorId];
  const overridePass = overrideEntry?.polarity_aware?.['pass'];
  if (overridePass?.phrase_short != null) {
    return localize(overridePass.phrase_short as Parameters<typeof localize>[0], locale) as string;
  }

  const baseEntry = (FACTORS as unknown as Record<string, PA | undefined>)[factorId];
  const basePass = baseEntry?.polarity_aware?.['pass'];
  if (basePass?.phrase_short != null) {
    return localize(basePass.phrase_short as Parameters<typeof localize>[0], locale) as string;
  }

  return null;
}

// ─── 1. CARD-BOUND: VIABLE composed headlines (noViableWindows:false) ────────
//
// These render on the MomentCard share image.  ONLY HEADLINES + generic-stem
// paths are included here — NO_VIABLE_HEADLINES are screen-soft (§4 split).
describe('CARD-BOUND viable composed headlines ≤ CARD_HEADLINE_MAX for all 5 locales', () => {
  for (const locale of LOCALES) {
    describe(`locale: ${locale}`, () => {
      // 1a. Custom HEADLINES entries (per-activity, per-factor, pass only).
      // These are used verbatim by the synthesizer when a custom entry exists.
      for (const activity of ACTIVITIES) {
        const activityHeadlines = HEADLINES[activity];
        if (!activityHeadlines) continue;

        for (const [factorId, statusMap] of Object.entries(activityHeadlines)) {
          if (!statusMap) continue;
          const passEntry = (statusMap as Record<string, unknown>)['pass'];
          if (!passEntry) continue;

          const text = localize(passEntry as Parameters<typeof localize>[0], locale) as string;

          it(`HEADLINES[${activity}][${factorId}][pass] — "${text}"`, () => {
            expect(
              text.length,
              `CARD headline too long (${text.length} > ${CARD_HEADLINE_MAX})\n` +
                `  locale=${locale} activity=${activity} factor=${factorId}\n` +
                `  text="${text}"`,
            ).toBeLessThanOrEqual(CARD_HEADLINE_MAX);
          });
        }
      }

      // 1b. Generic-stem path: GENERIC_HEADLINE_STEMS[activity] applied to the
      // pass phrase_short of every factor that does NOT have a custom HEADLINES
      // entry for that activity.
      //
      // Override-awareness: if the factor has a per-activity phrase_short
      // override, use that (it is what the synthesizer actually resolves) rather
      // than the base FACTORS lead.
      for (const activity of ACTIVITIES) {
        const stem = localize(GENERIC_HEADLINE_STEMS[activity], locale);

        for (const factorId of Object.keys(FACTORS)) {
          // Skip factors that have a custom HEADLINES entry for this activity —
          // they don't reach the generic-stem path.
          const hasCustomHeadline =
            HEADLINES[activity] &&
            (HEADLINES[activity] as Record<string, unknown>)[factorId] != null;
          if (hasCustomHeadline) continue;

          const lead = resolvePassPhraseShort(factorId, activity, locale);
          if (lead == null) continue;

          const composed = applyStem(stem, lead, locale);

          it(`GENERIC stem[${activity}] × ${factorId} — "${composed}"`, () => {
            expect(
              composed.length,
              `CARD headline (generic stem) too long (${composed.length} > ${CARD_HEADLINE_MAX})\n` +
                `  locale=${locale} activity=${activity} factor=${factorId}\n` +
                `  stem="${stem}" lead="${lead}"\n` +
                `  composed="${composed}"`,
            ).toBeLessThanOrEqual(CARD_HEADLINE_MAX);
          });
        }
      }
    });
  }
});

// ─── 2. SCREEN-SOFT: NO_VIABLE_HEADLINES all-locale budget ──────────────────
//
// These appear on the "No Viable Windows" screen (not on a card).  A generous
// ceiling of 80 chars catches egregious growth while allowing natural wrapping.
// The fr max is currently ~75 — safely below.
const NO_VIABLE_SCREEN_MAX = 80;

describe('SCREEN-SOFT no-viable headlines ≤ 80 for all 5 locales', () => {
  for (const locale of LOCALES) {
    for (const activity of ACTIVITIES) {
      const text = localize(NO_VIABLE_HEADLINES[activity], locale);

      it(`NO_VIABLE_HEADLINES[${activity}] ${locale} — "${text}"`, () => {
        expect(
          text.length,
          `NO_VIABLE headline too long (${text.length} > ${NO_VIABLE_SCREEN_MAX})\n` +
            `  locale=${locale} activity=${activity}\n` +
            `  text="${text}"`,
        ).toBeLessThanOrEqual(NO_VIABLE_SCREEN_MAX);
      });
    }
  }
});

// ─── 3. Per-locale max report (aids the launch-checklist render verification) ─
//
// A single summary test that computes and names the binding case (longest VIABLE
// headline) across all locales.  It does NOT enforce a tighter bound than
// CARD_HEADLINE_MAX above — its purpose is to make the binding locale/string
// visible in test output so the launch-checklist render can target it directly.
describe('per-locale VIABLE max (binding case for render verification)', () => {
  it('reports the longest VIABLE headline per locale and names the es-419 binding case', () => {
    const report: Array<{ locale: Locale; length: number; text: string; source: string }> = [];

    for (const locale of LOCALES) {
      let longest = { length: 0, text: '', source: '' };

      // Custom HEADLINES entries
      for (const activity of ACTIVITIES) {
        const activityHeadlines = HEADLINES[activity];
        if (!activityHeadlines) continue;
        for (const [factorId, statusMap] of Object.entries(activityHeadlines)) {
          if (!statusMap) continue;
          const passEntry = (statusMap as Record<string, unknown>)['pass'];
          if (!passEntry) continue;
          const text = localize(passEntry as Parameters<typeof localize>[0], locale) as string;
          if (text.length > longest.length) {
            longest = { length: text.length, text, source: `HEADLINES[${activity}][${factorId}][pass]` };
          }
        }
      }

      // Generic-stem path
      for (const activity of ACTIVITIES) {
        const stem = localize(GENERIC_HEADLINE_STEMS[activity], locale);
        for (const factorId of Object.keys(FACTORS)) {
          const hasCustomHeadline =
            HEADLINES[activity] &&
            (HEADLINES[activity] as Record<string, unknown>)[factorId] != null;
          if (hasCustomHeadline) continue;
          const lead = resolvePassPhraseShort(factorId, activity, locale);
          if (lead == null) continue;
          const composed = applyStem(stem, lead, locale);
          if (composed.length > longest.length) {
            longest = { length: composed.length, text: composed, source: `GENERIC stem[${activity}] × ${factorId}` };
          }
        }
      }

      report.push({ locale, ...longest });
    }

    // All must be within budget (redundant with the per-item tests above, but
    // surfaces the full table in one assertion failure rather than many).
    for (const row of report) {
      expect(
        row.length,
        `Locale ${row.locale} VIABLE max (${row.length}) exceeds CARD_HEADLINE_MAX (${CARD_HEADLINE_MAX})\n` +
          `  "${row.text}"\n  from ${row.source}`,
      ).toBeLessThanOrEqual(CARD_HEADLINE_MAX);
    }

    // The es-419 binding case: confirm it is the longest (or co-longest) locale,
    // as expected from the dictionary state at the time this was written.
    const es419Row = report.find((r) => r.locale === 'es-419');
    const maxLen = Math.max(...report.map((r) => r.length));
    expect(
      es419Row?.length,
      `Expected es-419 to be the longest (or co-longest) locale at ${maxLen}ch.\n` +
        `Actual es-419 max: ${es419Row?.length}ch ("${es419Row?.text}").\n` +
        `If another locale is now longer, update the comment in card-budget.test.ts ` +
        `and the CARD_HEADLINE_MAX if required.`,
    ).toBeGreaterThanOrEqual(maxLen - 2); // ±2ch tolerance for co-longest cases
  });
});
