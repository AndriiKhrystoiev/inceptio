import type { Activity } from '@inceptio/shared-types';
import type { HeadlineOverrides, Localized, Locale } from '../types';

// VOICE phase, Task 0 (MECHANISM + SHAPE only — the per-locale VALUES are
// D-headlines' job). Every user-facing leaf here is now a `Record<Locale,
// string>` en-filled-everywhere; D-headlines fills de/fr/es-419/pt-BR after
// Task 0 commits. `enAll(s)` builds the en-filled shape so the conversion is a
// mechanical wrap and the en string lives in exactly one place per leaf.
function enAll(s: string): Record<Locale, string> {
  return { en: s, de: s, fr: s, 'es-419': s, 'pt-BR': s };
}

// Sentence-style top-of-screen headlines. Sparse on purpose — only the
// (activity, factor, status) tuples where a custom line carries more meaning
// than the generic stem.
//
// Anything not listed here falls through to GENERIC_HEADLINE_STEMS, which
// wraps the factor's phrase_short in a calm activity-shaped frame.
export const HEADLINES: HeadlineOverrides = {
  wedding: {
    venus_dignified_direct_well_aspected: {
      pass: enAll('A tender day for beginnings.'),
    },
    moon_waxing_increasing_light: {
      pass: enAll('A day that holds its shape.'),
    },
    moon_and_asc_ruler_in_good_aspect: {
      pass: enAll('A day in quiet accord.'),
    },
  },

  contracts: {
    mercury_dignified_direct_not_combust: {
      pass: enAll('A clear day for plain words.'),
    },
    venus_dignified_direct_well_aspected: {
      pass: enAll('A day for good-faith dealing.'),
    },
  },

  business_launch: {
    jupiter_angular_or_aspecting: {
      pass: enAll('A day with room to grow.'),
    },
    asc_ruler_strong: {
      pass: enAll('A day of steady ground.'),
    },
  },

  travel: {
    moon_applying_to_benefic: {
      pass: enAll('A day for an easy departure.'),
    },
    jupiter_angular_or_aspecting: {
      pass: enAll('A day for going further.'),
    },
    mercury_dignified_direct_not_combust: {
      pass: enAll('A day for smooth passage.'),
    },
  },
};

// Generic activity-shaped stems. Each stem is a per-locale TEMPLATE carrying a
// `{lead}` interpolation slot (the factor's phrase_short, already localized).
//
// MECHANISM CHANGE (VOICE spec §5.1): `lowerFirst` is GONE. The old English
// stem lowercased the lead's first letter mid-sentence; that corrupts German
// (nouns stay capitalized) — the same class as the date-lowercase bug. A
// locale-authored template owns its own casing and frame, so the lead is
// substituted VERBATIM. The non-en templates are D-headlines' job; en-filled
// here. NOTE: the en templates preserve the prior wording but NO LONGER
// lowercase the lead — the lead now renders with its natural casing (e.g.
// "A tender day — Venus brings warmth." rather than "...venus brings warmth.").
export const GENERIC_HEADLINE_STEMS: Record<Activity, Localized> = {
  wedding: enAll('A tender day — {lead}.'),
  contracts: enAll('A steady day — {lead}.'),
  business_launch: enAll('A clear day — {lead}.'),
  travel: enAll('An open day — {lead}.'),
};

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * Apply a localized stem template to a (localized) lead, substituting `{lead}`.
 *
 * LEAD CASING is LOCALE-AWARE (VOICE spec §5.1, same class as the date-casing
 * `casedForBundle` fix). The lead is a shared factor `phrase_short`, authored
 * standalone-capitalized (it renders capitalized on cards / factor rows). Mid-
 * sentence after the stem frame ("A tender day — {lead}.") it must read
 * naturally:
 *   - en / fr / es-419 / pt-BR → lowercase the lead's first letter
 *     ("A tender day — venus brings warmth.") — restores the prior EN reading.
 *   - de → PRESERVE as authored. German mid-sentence casing is word-type-
 *     dependent (noun capitalized, article lowercase), so the German D-task
 *     authors each lead's correct embedded form; the runtime must NOT blanket-
 *     lowercase (that would corrupt German nouns — the old `lowerFirst` bug).
 */
export function applyStem(
  template: string,
  lead: string,
  locale: Locale,
): string {
  const cased = locale === 'de' ? lead : lowerFirst(lead);
  return template.replace('{lead}', cased);
}

// Used when summary.no_viable_windows is true. Range-agnostic phrasing —
// a 7-day, 30-day, and 6-month search all read sensibly.
export const NO_VIABLE_HEADLINES: Record<Activity, Localized> = {
  wedding: enAll('These days ask for patience — the sky is between rooms.'),
  contracts: enAll('A quieter stretch for paper. Better moments are nearby.'),
  business_launch: enAll('The sky is gathering — not the window for a launch.'),
  travel: enAll('The roads are waiting for a softer stretch.'),
};
