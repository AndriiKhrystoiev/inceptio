import type { ActivityOverrides } from '../types';

// Wedding tone — emphasize tenderness, mutual care, the steady arrival of warmth.
// Venus is the headline planet of this activity; Moon-related factors tilt toward
// "steadiness for what you are promising," not "growth."
const wedding: ActivityOverrides = {
  venus_dignified_direct_well_aspected: {
    polarity_aware: {
      pass: {
        phrase_short: 'Venus brings tenderness',
        phrase_full:
          'Venus is dignified and direct today — a steady, tender presence in the sky. The hour favors promises made with care.',
      },
    },
  },

  moon_waxing_increasing_light: {
    polarity_aware: {
      pass: {
        phrase_short: 'The Moon is gathering',
        phrase_full:
          'The Moon is waxing toward fullness. A sky that holds steady for promises meant to grow together over time.',
      },
    },
  },

  moon_and_asc_ruler_in_good_aspect: {
    polarity_aware: {
      pass: {
        phrase_short: 'You and the Moon are in step',
        phrase_full:
          'The Moon and the planet that stands for you agree — body, feeling, and the hour itself in quiet accord.',
      },
    },
  },
};

export default wedding;
