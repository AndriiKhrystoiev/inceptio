import type { Activity } from '@inceptio/shared-types';
import type { HeadlineOverrides } from '../types';

// Sentence-style top-of-screen headlines. Sparse on purpose — only the
// (activity, factor, status) tuples where a custom line carries more meaning
// than the generic stem.
//
// Anything not listed here falls through to GENERIC_HEADLINE_STEMS, which
// wraps the factor's phrase_short in a calm activity-shaped frame.
export const HEADLINES: HeadlineOverrides = {
  wedding: {
    venus_dignified_direct_well_aspected: {
      pass: 'A tender day for beginnings.',
    },
    moon_waxing_increasing_light: {
      pass: 'A day that holds its shape.',
    },
    moon_and_asc_ruler_in_good_aspect: {
      pass: 'A day in quiet accord.',
    },
  },

  contracts: {
    mercury_dignified_direct_not_combust: {
      pass: 'A clear day for plain words.',
    },
    venus_dignified_direct_well_aspected: {
      pass: 'A day for good-faith dealing.',
    },
  },

  business_launch: {
    jupiter_angular_or_aspecting: {
      pass: 'A day with room to grow.',
    },
    asc_ruler_strong: {
      pass: 'A day of steady ground.',
    },
  },

  travel: {
    moon_applying_to_benefic: {
      pass: 'A day for an easy departure.',
    },
    jupiter_angular_or_aspecting: {
      pass: 'A day for going further.',
    },
    mercury_dignified_direct_not_combust: {
      pass: 'A day for smooth passage.',
    },
  },
};

// Generic activity-shaped stems. Receives the factor's phrase_short and wraps
// it in a sentence frame. Used whenever HEADLINES doesn't cover the lead.
export const GENERIC_HEADLINE_STEMS: Record<Activity, (lead: string) => string> = {
  wedding: (lead) => `A tender day — ${lowerFirst(lead)}.`,
  contracts: (lead) => `A steady day — ${lowerFirst(lead)}.`,
  business_launch: (lead) => `A clear day — ${lowerFirst(lead)}.`,
  travel: (lead) => `An open day — ${lowerFirst(lead)}.`,
};

// Used when summary.no_viable_windows is true. Range-agnostic phrasing —
// a 7-day, 30-day, and 6-month search all read sensibly.
export const NO_VIABLE_HEADLINES: Record<Activity, string> = {
  wedding: 'These days ask for patience — the sky is between rooms.',
  contracts: 'A quieter stretch for paper. Better moments are nearby.',
  business_launch: 'The sky is gathering — not the window for a launch.',
  travel: 'The roads are waiting for a softer stretch.',
};

function lowerFirst(s: string): string {
  return s.length === 0 ? s : s[0]!.toLowerCase() + s.slice(1);
}
