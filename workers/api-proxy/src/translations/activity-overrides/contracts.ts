import type { ActivityOverrides } from '../types';

// Contracts tone — clarity, good faith, words that hold. Mercury is the headline
// planet; Venus reads as good faith between parties, not warmth.
const contracts: ActivityOverrides = {
  mercury_dignified_direct_not_combust: {
    polarity_aware: {
      pass: {
        phrase_short: 'Mercury runs clear',
        phrase_full:
          'Mercury is direct and well-placed today. The hour favors plain words, signed names, and agreements that mean what they say.',
      },
      partial: {
        phrase_short: 'Mercury holds up',
        phrase_full:
          'Mercury is workable but not at full strength. Read twice; sign once; clarify the small print.',
      },
      fail: {
        phrase_short: 'Mercury is dim',
        phrase_full:
          'Mercury is retrograde, hidden, or otherwise weakened. A day for reviewing terms, not committing to them.',
      },
    },
  },

  venus_dignified_direct_well_aspected: {
    polarity_aware: {
      pass: {
        phrase_short: 'Good faith holds',
        phrase_full:
          'Venus is dignified and direct — a sky that favors agreements made in good faith and kept that way.',
      },
      partial: {
        phrase_short: 'Goodwill is present',
        phrase_full:
          'Venus is around but not at her brightest. The good faith is workable; expect to ask for it explicitly.',
      },
    },
  },

  jupiter_aspecting_mercury_or_moon: {
    polarity_aware: {
      pass: {
        phrase_short: 'Jupiter widens the terms',
        phrase_full:
          'Jupiter is in conversation with Mercury — generous language, room to negotiate, terms that read fairly to both sides.',
      },
    },
  },
};

export default contracts;
