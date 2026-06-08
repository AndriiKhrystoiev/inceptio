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
//
// Localized (VOICE spec §8): these are the ONLY guaranteed-rendered strings on
// an upstream enum-drift event (a recurring occurrence), so a non-en user must
// not see English on every drift. en-filled-everywhere here; D-tasks fill the
// non-en values. Resolved via `localize(.., locale)` at the call site.
// EXPORTED so voice-leaf-coverage asserts these are Localized (all 5 locales) —
// they are user-facing on upstream enum-drift (unknown reason_id / factor_id),
// the guaranteed-rendered surface the permissive policy exists to soften.
export const FALLBACK_REASON_PHRASE: Localized = {
  en: 'The sky asks for stillness here.',
  de: 'Der Himmel bittet hier um Stille.',
  fr: 'Le ciel demande du calme ici.',
  'es-419': 'El cielo pide quietud aquí.',
  'pt-BR': 'O céu pede quietude aqui.',
};
export const FALLBACK_FACTOR_PHRASING: {
  phrase_short: Localized;
  phrase_full: Localized;
} = {
  phrase_short: {
    en: 'A subtle influence',
    de: 'Ein feiner Einfluss',
    fr: 'Une influence subtile',
    'es-419': 'Una influencia sutil',
    'pt-BR': 'Uma influência sutil',
  },
  phrase_full: {
    en: 'The sky brings a subtle influence to this moment.',
    de: 'Der Himmel bringt diesem Moment einen feinen Einfluss.',
    fr: 'Le ciel apporte une influence subtile à ce moment.',
    'es-419': 'El cielo aporta una influencia sutil a este momento.',
    'pt-BR': 'O céu traz uma influência sutil a este momento.',
  },
};

// Inline hour-band tags moved off the function body into a localized constant
// (VOICE spec §5.2). en-filled for now; D-tasks fill the non-en values.
// EXPORTED for voice-leaf-coverage. Renders as the card tagline → user-facing.
export const CONTEXTUAL_TAGS: {
  default: Localized;
  morning: Localized;
  afternoon: Localized;
  evening: Localized;
  late_night: Localized;
} = {
  default: {
    en: 'A window worth looking at',
    de: 'Ein Fenster, das einen Blick wert ist',
    fr: 'Une fenêtre qui mérite un regard',
    'es-419': 'Una ventana que vale la pena mirar',
    'pt-BR': 'Uma janela que vale a pena olhar',
  },
  morning: {
    en: 'A morning moment',
    de: 'Ein Moment am Morgen',
    fr: 'Un moment du matin',
    'es-419': 'Un momento de la mañana',
    'pt-BR': 'Um momento da manhã',
  },
  afternoon: {
    en: 'An afternoon moment',
    de: 'Ein Moment am Nachmittag',
    fr: "Un moment de l'après-midi",
    'es-419': 'Un momento de la tarde',
    'pt-BR': 'Um momento da tarde',
  },
  evening: {
    en: 'An evening moment',
    de: 'Ein Moment am Abend',
    fr: 'Un moment du soir',
    'es-419': 'Un momento al atardecer',
    'pt-BR': 'Um momento ao entardecer',
  },
  late_night: {
    en: 'A late-night moment',
    de: 'Ein Moment in der späten Nacht',
    fr: 'Un moment de fin de soirée',
    'es-419': 'Un momento de la noche',
    'pt-BR': 'Um momento tarde da noite',
  },
};
import weddingOverrides from './activity-overrides/wedding';
import contractsOverrides from './activity-overrides/contracts';
import businessLaunchOverrides from './activity-overrides/business-launch';
import travelOverrides from './activity-overrides/travel';
import { synthesizeHeadline, compareFactors } from './headlines/synthesizer';
import { localize } from './types';
import type {
  ActivityOverrides,
  DisplayableExcludedRange,
  DisplayableFactor,
  DisplayableSummary,
  DisplayableWindow,
  FactorPhrasing,
  Locale,
  Localized,
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
  locale: Locale,
): { phrase_short: string; phrase_full: string } {
  // NOTE: returns RESOLVED strings (localize'd to `locale`), not raw `Localized`
  // leaves — the dictionary `FactorPhrasing` is now locale-keyed, but this
  // function's job is to resolve it for the displayable output.
  const entry = FACTORS[factorId as FactorId];
  if (!entry) {
    // Permissive policy: upstream has added new factor_ids without notice
    // (e.g. mid-2026). Log so the unknown id surfaces for later inclusion,
    // then return a neutral phrasing so the response is still shippable.
    console.warn('[translate] unknown factor_id from upstream:', factorId);
    return {
      phrase_short: localize(FALLBACK_FACTOR_PHRASING.phrase_short, locale),
      phrase_full: localize(FALLBACK_FACTOR_PHRASING.phrase_full, locale),
    };
  }
  const base = entry.polarity_aware;
  const override = ACTIVITY_OVERRIDES[activity][factorId as FactorId]?.polarity_aware;

  // Merge stays locale-AGNOSTIC: the leaf fields may be plain strings (today)
  // or `Localized` Records (after D-factors migrates); the deep-merge
  // preserves whichever shape, and `localize` resolves it once at the end.
  const basePhrasing = {
    ...base.pass,
    ...(base[status] ?? {}),
  } as { phrase_short: Localized; phrase_full: Localized };

  // Only this status's override — never fall back to override.pass.
  const overridePhrasing = (override?.[status] ?? {}) as Partial<{
    phrase_short: Localized;
    phrase_full: Localized;
  }>;

  const merged = {
    ...basePhrasing,
    ...overridePhrasing,
  };

  return {
    phrase_short: localize(merged.phrase_short, locale),
    phrase_full: localize(merged.phrase_full, locale),
  };
}

export function translateExcludedReason(reasonId: string, locale: Locale): string {
  const entry = EXCLUDED_REASONS[reasonId as ReasonId];
  if (!entry) {
    // Permissive policy: see translateFactor() above.
    console.warn('[translate] unknown reason_id from upstream:', reasonId);
    return localize(FALLBACK_REASON_PHRASE, locale);
  }
  return localize(entry.phrase as Localized, locale);
}

function translateExcluded(range: ExcludedRange, locale: Locale): DisplayableExcludedRange {
  return {
    reason_id: range.reason_id,
    phrase: translateExcludedReason(range.reason_id, locale),
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

function contextualTag(window: Window, locale: Locale): string {
  if (!window.start) return localize(CONTEXTUAL_TAGS.default, locale);
  const hour = localHourFromIso(window.start);
  if (hour == null) return localize(CONTEXTUAL_TAGS.default, locale);
  if (hour < 11) return localize(CONTEXTUAL_TAGS.morning, locale);
  if (hour < 17) return localize(CONTEXTUAL_TAGS.afternoon, locale);
  if (hour < 21) return localize(CONTEXTUAL_TAGS.evening, locale);
  return localize(CONTEXTUAL_TAGS.late_night, locale);
}

function pickTagline(
  thisFactors: DisplayableFactor[],
  allFactor0Ids: string[],
  window: Window,
  locale: Locale,
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
  return { phrase_short: contextualTag(window, locale) };
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
  locale: Locale,
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
    locale,
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
          const phrasing = translateFactor(f.factor_id, f.status, activity, locale);
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
          locale,
        });
        const tagline = pickTagline(factors, allFactor0Ids, w, locale);
        return {
          ...w,
          displayable: { headline, factors, tagline },
        };
      }),
      excluded_ranges: data.excluded_ranges.map((r) => ({
        ...r,
        displayable: translateExcluded(r, locale),
      })),
    },
  };
}
