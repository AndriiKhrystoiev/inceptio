import type { ActivityOverrides } from '../types';

// Travel tone — safe passage, smooth communication, doors that open. The Moon
// (as the body that crosses the sky) and Mercury (as the messenger) take the
// lead; Jupiter is the patron of long journeys.
const travel: ActivityOverrides = {
  moon_applying_to_benefic: {
    polarity_aware: {
      pass: {
        phrase_short: 'The Moon travels toward kindness',
        phrase_full:
          'The Moon is moving toward Venus or Jupiter. What is set in motion now arrives at a friendly door.',
      },
    },
  },

  mercury_dignified_direct_not_combust: {
    polarity_aware: {
      pass: {
        phrase_short: 'Mercury moves easily',
        phrase_full:
          'Mercury is direct and well-placed today — schedules hold, messages arrive, the small mechanics of travel cooperate.',
      },
      fail: {
        phrase_short: 'Mercury is dim',
        phrase_full:
          'Mercury is retrograde or otherwise weakened. Build slack into the schedule; double-check the booking.',
      },
    },
  },

  jupiter_angular_or_aspecting: {
    polarity_aware: {
      pass: {
        phrase_short: 'Jupiter opens the road',
        phrase_full:
          'Jupiter — the traditional patron of journeys — is angular or aspecting. A sky that favors going further than planned.',
      },
    },
  },
};

export default travel;
