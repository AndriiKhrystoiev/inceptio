import type { ActivityOverrides } from '../types';

// Business-launch tone — clear footing, room to grow, things that hold their
// shape under load. Jupiter and the rising-sign ruler are central.
const businessLaunch: ActivityOverrides = {
  jupiter_angular_or_aspecting: {
    polarity_aware: {
      pass: {
        phrase_short: 'Jupiter gives the launch room',
        phrase_full:
          'Jupiter is angular today — the planet of room to grow sits in view. A sky that supports something built to scale.',
      },
    },
  },

  asc_ruler_strong: {
    polarity_aware: {
      pass: {
        phrase_short: 'Your ground is steady',
        phrase_full:
          'The planet that stands for you and your venture is strong today — sure-footed, well-placed, in good company.',
      },
      partial: {
        phrase_short: 'Your ground is workable',
        phrase_full:
          'The planet that stands for the venture is in fair standing — not flying, not stumbling. A day for steady choices.',
      },
    },
  },

  moon_waxing_increasing_light: {
    polarity_aware: {
      pass: {
        phrase_short: 'The Moon is growing',
        phrase_full:
          'The Moon is waxing toward fullness. The sky favors a beginning that needs to compound over time.',
      },
    },
  },

  venus_dignified_direct_well_aspected: {
    polarity_aware: {
      pass: {
        phrase_short: 'Venus brings reception',
        phrase_full:
          'Venus is dignified and direct — the venture meets a warm reception, the kind that turns into early supporters.',
      },
    },
  },
};

export default businessLaunch;
