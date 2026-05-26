import type { FactorId } from '@inceptio/shared-types';
import type { FactorEntry } from '../types';

// First-draft Mystical Premium phrasings for the 15 verified factor IDs.
// These will go through astrologer review (per CLAUDE.md, ~2h before launch).
//
// Voice rules (CLAUDE.md): warm, dignified, poetic-but-specific. No "magic",
// "destiny", "fortune", "stars align", "vibes", "blessed", "energy" (as noun).
// Allowed patterns: "Venus brings warmth", "Mercury is sleeping",
// "The Moon is between signs", "A tender day for beginnings".

export const FACTORS: Record<FactorId, FactorEntry> = {
  venus_dignified_direct_well_aspected: {
    polarity_aware: {
      pass: {
        phrase_short: 'Venus brings warmth',
        phrase_full:
          'Venus is dignified and direct today — a steady, warm presence that favors moments built on care and connection.',
      },
      partial: {
        phrase_short: 'Venus shows up gently',
        phrase_full:
          'Venus is in good standing but not at her strongest. The warmth is there; it asks you to meet it halfway.',
      },
      fail: {
        phrase_short: 'Venus is muted',
        phrase_full:
          'Venus is quiet in the sky right now. Moments that depend on softness may want a different day.',
      },
    },
  },

  moon_waxing_increasing_light: {
    polarity_aware: {
      pass: {
        phrase_short: 'The Moon is gathering light',
        phrase_full:
          'The Moon is waxing, growing in light. The sky favors beginnings that need to build into something more.',
      },
      partial: {
        phrase_short: 'The Moon is steady, not bright',
        phrase_full:
          'The Moon is past her brightest moment but still gathering. Growth is possible; expect it to come quietly.',
      },
      fail: {
        phrase_short: 'The Moon is waning',
        phrase_full:
          'The Moon is losing light. Better suited to closings and clearings than to new beginnings.',
      },
    },
  },

  moon_applying_to_benefic: {
    polarity_aware: {
      pass: {
        phrase_short: 'The Moon is moving toward kindness',
        phrase_full:
          'The Moon is applying to a benefic — moving toward Venus or Jupiter. What begins now travels toward a friendly meeting.',
      },
      partial: {
        phrase_short: 'A friendly meeting is forming',
        phrase_full:
          'The Moon is heading toward a helpful planet, though the contact is loose. A small kindness arrives later, not immediately.',
      },
      fail: {
        phrase_short: 'No friendly meeting ahead',
        phrase_full:
          'The Moon is not moving toward a benefic. The day stands on its own without that kind of arriving help.',
      },
    },
  },

  house_ruler_dignified_well_placed: {
    polarity_aware: {
      pass: {
        phrase_short: 'The ruler of this matter is steady',
        phrase_full:
          'The planet that governs this kind of undertaking is in good standing today — sure-footed, present, capable.',
      },
      partial: {
        phrase_short: 'The ruler is present, not strong',
        phrase_full:
          'The planet that governs this kind of undertaking is around, but not at full strength. Workable; not glowing.',
      },
      fail: {
        phrase_short: 'The ruler is out of place',
        phrase_full:
          'The planet that governs this kind of undertaking is not well-placed today. The footing is unsure.',
      },
    },
  },

  asc_and_house_ruler_in_reception_or_aspect: {
    polarity_aware: {
      pass: {
        phrase_short: 'You and the matter are in conversation',
        phrase_full:
          'The planet that stands for you and the planet that stands for the matter are talking — a clean, mutual line between you and what you are about to do.',
      },
      partial: {
        phrase_short: 'A faint line between you and the matter',
        phrase_full:
          'You and the matter are linked, but at a distance. A workable connection that asks you to keep tending it.',
      },
      fail: {
        phrase_short: 'You and the matter are far apart',
        phrase_full:
          'There is no clean line today between the planet that stands for you and the one that stands for the matter. Worth waiting for a closer meeting.',
      },
    },
  },

  jupiter_angular_or_aspecting: {
    polarity_aware: {
      pass: {
        phrase_short: 'Jupiter is in view',
        phrase_full:
          'Jupiter — the planet of room to grow — is angular or aspecting today. A sky that quietly says "yes, expand."',
      },
      partial: {
        phrase_short: 'Jupiter is nearby',
        phrase_full:
          'Jupiter is in the picture but not at the center. Some room to grow, less than on a stronger Jupiter day.',
      },
      fail: {
        phrase_short: 'Jupiter is absent',
        phrase_full:
          'Jupiter is not in view today. The day works, but it does not actively widen.',
      },
    },
  },

  planetary_hour_match: {
    polarity_aware: {
      pass: {
        phrase_short: 'The hour matches the work',
        phrase_full:
          'The planetary hour for this window matches the planet that rules your activity — a small, traditional lift in tune.',
      },
      partial: {
        phrase_short: 'The hour is adjacent',
        phrase_full:
          'The planetary hour is a relative of the right planet, if not the same one. A subtle assist.',
      },
      fail: {
        phrase_short: 'The hour is unrelated',
        phrase_full:
          'The planetary hour is not tied to the work at hand. No lift, no drag — neutral.',
      },
    },
  },

  fixed_star_conjunction: {
    polarity_aware: {
      pass: {
        phrase_short: 'A favorable fixed star is on point',
        phrase_full:
          'A well-regarded fixed star sits close to one of the chart\'s angles — a particular, traditional blessing on this hour.',
      },
      partial: {
        phrase_short: 'A fixed star is close, not exact',
        phrase_full:
          'A favorable fixed star is in the neighborhood. The flavor is present without dominating the hour.',
      },
      fail: {
        phrase_short: 'No favorable fixed star is near',
        phrase_full:
          'No notable fixed star sits on point today. The hour stands on its other merits.',
      },
    },
  },

  house_free_of_malefic: {
    polarity_aware: {
      pass: {
        phrase_short: 'The room is clear',
        phrase_full:
          'The part of the sky that governs this matter is free of difficult planets right now. Less to push against.',
      },
      partial: {
        phrase_short: 'The room is mostly clear',
        phrase_full:
          'A difficult planet brushes the edges of this matter, but is not sitting in the room. Manageable, not blocking.',
      },
      fail: {
        phrase_short: 'A difficult planet is in the room',
        phrase_full:
          'Mars or Saturn sits in the part of the sky that governs this matter. Worth weighing whether to wait it out.',
      },
    },
  },

  mercury_dignified_direct_not_combust: {
    polarity_aware: {
      pass: {
        phrase_short: 'Mercury runs clear',
        phrase_full:
          'Mercury is direct, in good standing, and not hidden by the Sun. Words land, papers move, messages arrive.',
      },
      partial: {
        phrase_short: 'Mercury is workable',
        phrase_full:
          'Mercury is mostly clear but not at full strength. Communication holds up; expect to repeat yourself once or twice.',
      },
      fail: {
        phrase_short: 'Mercury is dim',
        phrase_full:
          'Mercury is either retrograde, combust, or otherwise weakened. A day for re-reading more than for signing.',
      },
    },
  },

  asc_ruler_strong: {
    polarity_aware: {
      pass: {
        phrase_short: 'You are on solid ground',
        phrase_full:
          'The planet that stands for you in this chart is strong — dignified, well-placed, in good company. The day works in your favor.',
      },
      partial: {
        phrase_short: 'You are present, not at full strength',
        phrase_full:
          'The planet that stands for you is in fair standing — not at her best, not at her worst. A workable day.',
      },
      fail: {
        phrase_short: 'You are stretched thin',
        phrase_full:
          'The planet that stands for you is out of dignity or in difficult company today. Worth conserving your push.',
      },
    },
  },

  jupiter_aspecting_mercury_or_moon: {
    polarity_aware: {
      pass: {
        phrase_short: 'Jupiter helps the messenger',
        phrase_full:
          'Jupiter is in conversation with Mercury or the Moon — a generous lift on words, news, and the people who carry them.',
      },
      partial: {
        phrase_short: 'A loose lift on the message',
        phrase_full:
          'Jupiter touches the messenger from a distance. Words and news do well, though the boost is gentle.',
      },
      fail: {
        phrase_short: 'No lift on the message',
        phrase_full:
          'Jupiter does not reach Mercury or the Moon today. Messages travel on their own merit.',
      },
    },
  },

  no_malefic_on_angle: {
    polarity_aware: {
      pass: {
        phrase_short: 'No difficult planet on point',
        phrase_full:
          'The most visible points of the chart are free of difficult planets. The shape of the day is uncluttered.',
      },
      partial: {
        phrase_short: 'A difficult planet is near point',
        phrase_full:
          'A difficult planet hovers near one of the angles without sitting on it. Some friction, not a wall.',
      },
      fail: {
        phrase_short: 'A difficult planet is on point',
        phrase_full:
          'Mars or Saturn sits on one of the chart\'s angles. Worth waiting if the choice of day is yours.',
      },
    },
  },

  part_of_fortune_in_good_house: {
    polarity_aware: {
      pass: {
        phrase_short: 'The Lot of Fortune is well-placed',
        phrase_full:
          'The Lot of Fortune — a traditional point for what comes to you — sits in a part of the sky that suits this matter.',
      },
      partial: {
        phrase_short: 'The Lot of Fortune is adjacent',
        phrase_full:
          'The Lot of Fortune is in a part of the sky that touches this matter without centering it. A small tailwind.',
      },
      fail: {
        phrase_short: 'The Lot of Fortune is elsewhere',
        phrase_full:
          'The Lot of Fortune is in a part of the sky unrelated to this matter today. No particular help from that quarter.',
      },
    },
  },

  moon_and_asc_ruler_in_good_aspect: {
    polarity_aware: {
      pass: {
        phrase_short: 'You and the Moon are aligned',
        phrase_full:
          'The Moon and the planet that stands for you are in a friendly aspect. Body and timing agree.',
      },
      partial: {
        phrase_short: 'Loose agreement with the Moon',
        phrase_full:
          'The Moon and the planet that stands for you are loosely connected. Timing is workable, not glowing.',
      },
      fail: {
        phrase_short: 'You and the Moon are out of step',
        phrase_full:
          'The Moon and the planet that stands for you are not in good aspect today. Timing fights you a little.',
      },
    },
  },
};
