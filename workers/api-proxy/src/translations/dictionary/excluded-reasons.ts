import type { ReasonId } from '@inceptio/shared-types';
import type { ReasonEntry } from '../types';

// Phrasings are LOCKED — sourced verbatim from CLAUDE.md
// "Verified excluded range reason IDs". Do not paraphrase. The astrologer
// review (per CLAUDE.md, ~2h before launch) has already touched these.
//
// "Mercury is sleeping" in particular is a project-wide locked phrase.
export const EXCLUDED_REASONS: Record<ReasonId, ReasonEntry> = {
  moon_voc: {
    phrase:
      "The Moon is between signs — efforts begun now don't take root the way they do on other days.",
  },
  mercury_retrograde: {
    phrase:
      'Mercury is sleeping — communication needs extra care this week.',
  },
  // TODO(astrologer-review): phrase below is a draft for mercury_combust
  // (added by upstream mid-2026 — Mercury within ~8° of Sun, hidden/weakened,
  // distinct from retrograde). Confirm or refine in the next astrologer pass.
  mercury_combust: {
    phrase:
      "Mercury is hidden by the Sun's light — words don't carry far this stretch.",
  },
  venus_retrograde: {
    phrase: 'Venus is resting — not a season for new commitments.',
  },
  // TODO(astrologer-review): draft phrasing for mars_retrograde (added by
  // upstream mid-2026 — action and initiative delayed; classical "review,
  // don't begin"). Confirm or refine in the next astrologer pass.
  mars_retrograde: {
    phrase:
      "Mars is hesitating — bold moves don't carry the same force right now.",
  },
  // TODO(astrologer-review): draft phrasing for jupiter_retrograde (added
  // by upstream mid-2026 — expansion and growth turning inward; refine in
  // the next astrologer pass).
  jupiter_retrograde: {
    phrase:
      'Jupiter is turning inward — growth needs patience this stretch.',
  },
  saturn_retrograde: {
    phrase: 'Saturn is turning inward — foundations need patience.',
  },
  eclipse_window: {
    phrase:
      'An eclipse window — the sky asks for stillness, not new beginnings.',
  },
  moon_via_combusta: {
    phrase:
      'The Moon walks the via combusta — a charged stretch worth waiting out.',
  },
  malefic_on_angle: {
    phrase: 'A difficult planet is on the angles — better to wait.',
  },
  fixed_star_on_angle: {
    phrase:
      'A fixed star rests on the angles — a powerful but particular moment.',
  },
};
