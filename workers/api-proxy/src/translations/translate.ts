import type {
  Activity,
  ApiEnvelope,
  ExcludedRange,
  Factor,
  FactorId,
  FactorStatus,
  ReasonId,
  Summary,
  Window,
} from '@inceptio/shared-types';
import { FACTORS } from './dictionary/factors';
import { EXCLUDED_REASONS } from './dictionary/excluded-reasons';

// Generic fallback phrasings used when upstream emits a reason/factor we
// don't have a translation for yet. Keeps the response shippable while
// surfacing the unknown id via console.warn so we can add it deliberately.
const FALLBACK_REASON_PHRASE = 'The sky asks for stillness here.';
const FALLBACK_FACTOR_PHRASING: FactorPhrasing = {
  phrase_short: 'A subtle influence',
  phrase_full: 'The sky brings a subtle influence to this moment.',
};
import weddingOverrides from './activity-overrides/wedding';
import contractsOverrides from './activity-overrides/contracts';
import businessLaunchOverrides from './activity-overrides/business-launch';
import travelOverrides from './activity-overrides/travel';
import { synthesizeHeadline, compareFactors } from './headlines/synthesizer';
import type {
  ActivityOverrides,
  DisplayableExcludedRange,
  DisplayableFactor,
  DisplayableSummary,
  DisplayableWindow,
  FactorPhrasing,
} from './types';

const ACTIVITY_OVERRIDES: Record<Activity, ActivityOverrides> = {
  wedding: weddingOverrides,
  contracts: contractsOverrides,
  business_launch: businessLaunchOverrides,
  travel: travelOverrides,
};

/**
 * Look up the friendly phrasing for a (factor_id, status, activity) triple.
 *
 * Resolution order, status-locked (activity overrides for a different status
 * never bleed into this one):
 *   1. activity_overrides[factor_id].polarity_aware[status] — per-field merge
 *   2. FACTORS[factor_id].polarity_aware[status]            — base entry for this status
 *   3. FACTORS[factor_id].polarity_aware.pass               — final fallback when base lacks this status
 *
 * Within a level, individual fields (phrase_short / phrase_full) deep-merge,
 * so an override can change just the short form and inherit the long.
 */
export function translateFactor(
  factorId: string,
  status: FactorStatus,
  activity: Activity,
): FactorPhrasing {
  const entry = FACTORS[factorId as FactorId];
  if (!entry) {
    // Permissive policy: upstream has added new factor_ids without notice
    // (e.g. mid-2026). Log so the unknown id surfaces for later inclusion,
    // then return a neutral phrasing so the response is still shippable.
    console.warn('[translate] unknown factor_id from upstream:', factorId);
    return FALLBACK_FACTOR_PHRASING;
  }
  const base = entry.polarity_aware;
  const override = ACTIVITY_OVERRIDES[activity][factorId as FactorId]?.polarity_aware;

  const basePhrasing: FactorPhrasing = {
    ...base.pass,
    ...(base[status] ?? {}),
  };

  // Only this status's override — never fall back to override.pass.
  const overridePhrasing: Partial<FactorPhrasing> = override?.[status] ?? {};

  return {
    ...basePhrasing,
    ...overridePhrasing,
  };
}

export function translateExcludedReason(reasonId: string): string {
  const entry = EXCLUDED_REASONS[reasonId as ReasonId];
  if (!entry) {
    // Permissive policy: see translateFactor() above.
    console.warn('[translate] unknown reason_id from upstream:', reasonId);
    return FALLBACK_REASON_PHRASE;
  }
  return entry.phrase;
}

function translateExcluded(range: ExcludedRange): DisplayableExcludedRange {
  return {
    reason_id: range.reason_id,
    phrase: translateExcludedReason(range.reason_id),
  };
}

// ---------------------------------------------------------------------------
// Tagline picker — produces a per-window phrase distinct from siblings.
//
// Background: when a search produces clustered windows (e.g. a Venus-led
// wedding week), every window's strongest factor is the same Venus entry.
// Reading `factors[0].phrase_short` on the ListView results in 10 cards
// saying "Venus brings tenderness" verbatim. Per the spec, we pick the
// highest-priority factor in this window whose id is NOT a dominant
// position-0 across the result set. Falls back to a time-of-day tag when
// every factor of the window is itself dominant.
// ---------------------------------------------------------------------------

const SHARED_THRESHOLD = 0.6;

// Parse the local hour directly from the ISO string. The hour digits in
// an offset-bearing timestamp ("2026-08-20T21:30:00+03:00") already
// represent local-at-location time — the +03:00 tail describes the zone.
// Using `new Date(...).getHours()` would re-shift to the Worker's runtime
// timezone (UTC on Cloudflare), so a Kyiv 21:00 reads 18:00 there.
function localHourFromIso(s: string): number | null {
  const match = s.match(/T(\d{2}):/);
  if (!match || !match[1]) return null;
  return parseInt(match[1], 10);
}

function contextualTag(window: Window): string {
  if (!window.start) return 'A window worth looking at';
  const hour = localHourFromIso(window.start);
  if (hour == null) return 'A window worth looking at';
  if (hour < 11) return 'A morning moment';
  if (hour < 17) return 'An afternoon moment';
  if (hour < 21) return 'An evening moment';
  return 'A late-night moment';
}

function pickTagline(
  thisFactors: DisplayableFactor[],
  allFactor0Ids: string[],
  window: Window,
): { factor_id?: string; phrase_short: string; phrase_full?: string } {
  const total = allFactor0Ids.length;

  // Single-window response: diversification is meaningless. Use the strongest
  // factor directly.
  if (total <= 1 && thisFactors[0]) {
    return {
      factor_id: thisFactors[0].factor_id,
      phrase_short: thisFactors[0].phrase_short,
      phrase_full: thisFactors[0].phrase_full,
    };
  }

  for (const candidate of thisFactors) {
    const sharedAtZero = allFactor0Ids.filter((id) => id === candidate.factor_id).length;
    if (sharedAtZero / total < SHARED_THRESHOLD) {
      return {
        factor_id: candidate.factor_id,
        phrase_short: candidate.phrase_short,
        phrase_full: candidate.phrase_full,
      };
    }
  }

  // Every factor in this window appears as a dominant factor[0] across the
  // result set. Astrology is genuinely homogeneous — use time-of-day.
  return { phrase_short: contextualTag(window) };
}

/**
 * What the Worker returns to mobile: the full upstream envelope with three
 * `displayable` enrichments inside `data`:
 *   - response.data.summary.displayable.headline       (L1 read)
 *   - response.data.top_windows[i].displayable          (L2 read; L3 reads raw factors)
 *   - response.data.excluded_ranges[i].displayable      (L1/L2 read for soften phrase)
 *
 * The envelope's `success`, `metadata`, `warnings`, `pagination` are preserved
 * untouched. Raw factor data (factor_id, observation, details, contribution,
 * etc.) also stays in place so the L3 Technical view can render verbatim.
 */
export type TranslatedResponse = ApiEnvelope & {
  data: ApiEnvelope['data'] & {
    summary: Summary & { displayable: DisplayableSummary };
    top_windows: Array<Window & { displayable: DisplayableWindow }>;
    excluded_ranges: Array<ExcludedRange & { displayable: DisplayableExcludedRange }>;
  };
};

/**
 * Main entry. Pure function: takes a validated envelope + the user's chosen
 * activity, returns the envelope with displayable annotations inside `data`.
 *
 * Determinism: same inputs → same outputs. Cache-safe.
 */
export function translate(
  envelope: ApiEnvelope,
  activity: Activity,
): TranslatedResponse {
  const { data } = envelope;

  // L1 headline. When no_viable_windows is true, synthesizer short-circuits to
  // the per-activity stock headline and never reads factors.
  const summaryHeadline = synthesizeHeadline({
    topWindow:
      data.top_windows[0] ??
      ({ factors: [] as Factor[] } as unknown as Window),
    activity,
    noViableWindows: data.summary.no_viable_windows,
  });

  // Pre-compute each window's ranked factors and the factor[0].factor_id
  // across the whole result set. `pickTagline()` reads the second array to
  // decide whether each window's top factor is too widely shared.
  const rankedPerWindow = data.top_windows.map((w) =>
    [...w.factors].sort(compareFactors),
  );
  const allFactor0Ids = rankedPerWindow.map((r) => r[0]?.factor_id ?? '');

  return {
    ...envelope,
    data: {
      ...data,
      summary: {
        ...data.summary,
        displayable: { headline: summaryHeadline },
      },
      top_windows: data.top_windows.map((w, i) => {
        const ranked = rankedPerWindow[i] ?? [];
        const factors: DisplayableFactor[] = ranked.map((f) => {
          const phrasing = translateFactor(f.factor_id, f.status, activity);
          return {
            factor_id: f.factor_id,
            status: f.status,
            phrase_short: phrasing.phrase_short,
            phrase_full: phrasing.phrase_full,
          };
        });
        const headline = synthesizeHeadline({
          topWindow: w,
          activity,
          noViableWindows: false,
        });
        const tagline = pickTagline(factors, allFactor0Ids, w);
        return {
          ...w,
          displayable: { headline, factors, tagline },
        };
      }),
      excluded_ranges: data.excluded_ranges.map((r) => ({
        ...r,
        displayable: translateExcluded(r),
      })),
    },
  };
}
