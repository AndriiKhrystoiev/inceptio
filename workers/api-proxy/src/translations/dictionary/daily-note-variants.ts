import type { DailyNoteVariantPool, KnownDailyNoteId } from '../types';

/**
 * Sibling variants for long-running excluded-reason entries. The picker
 * rotates among `[primary] ++ variants` using a date-seeded deterministic
 * hash so the same UTC date always shows the same variant for the same
 * location.
 *
 * Variants stay within the same voice and same astrological claim — only
 * the phrasing rotates. Astrologer review (§11.4) should confirm each
 * variant is faithful to the primary's meaning.
 */
export const DAILY_NOTE_VARIANT_POOLS: Partial<
  Record<KnownDailyNoteId, DailyNoteVariantPool>
> = {
  'closed-mercury-retrograde': {
    primary_entry_id: 'closed-mercury-retrograde',
    variants: [
      {
        headline: 'Mercury is walking back.',
        supporting_line:
          'A stretch for revisiting and re-reading — good for editing and double-checking; hold the heavy signing for clearer days.',
      },
      {
        headline: 'A week of careful words.',
        supporting_line:
          'Mercury is reversed — good for going over what already exists; hold off on new agreements for now.',
      },
    ],
  },

  'closed-venus-retrograde': {
    primary_entry_id: 'closed-venus-retrograde',
    variants: [
      {
        headline: 'Venus is looking back.',
        supporting_line:
          'A long quiet stretch for matters of the heart — good for revisiting what was started; new commitments can wait.',
      },
      {
        headline: 'A stretch for tending, not promising.',
        supporting_line:
          'Venus is in review — good for honouring what already exists; hold the new vows for later.',
      },
    ],
  },

  // Added 2026-06-01 after the June empirical batch showed moon_voc
  // firing 19 days/month (pre-fix) with zero phrasing variation. After
  // the no_viable_windows classification fix, day-dominating moon_voc
  // still fires ~10 days/month — rotation is MVP-blocking.
  //
  // Astrologer pre-review NOT required: Moon void of course is
  // uncontroversial across traditional schools (Lilly, Bonatti, Brennan
  // all converge). Unlike Mercury/Venus rx where school differences
  // matter, the meaning of "Moon between signs" is stable. The pool
  // sticks to "between signs / between aspects / between-time"
  // phrasings — the same astrological claim, three voices.
  'closed-moon-voc': {
    primary_entry_id: 'closed-moon-voc',
    variants: [
      {
        headline: 'The Moon is wandering between signs.',
        supporting_line:
          "Today's beginnings are slow to take root — gentle for closing tabs and tying loose ends; bigger starts can wait.",
      },
      {
        headline: 'A quiet day in the Moon’s between-time.',
        supporting_line:
          'New things begun now drift — good for sorting and tending; the sky opens again soon.',
      },
      {
        headline: 'The Moon is between aspects today.',
        supporting_line:
          "A day where beginnings feel weightless — better used for finishing what's already in motion. Clearer days are close.",
      },
    ],
  },

  // Eclipse windows hit 2-3x/year for 7-14 days each. Without rotation,
  // the same headline would dominate the daily note for a stretch most
  // likely to feel ominous to users — variant rotation softens that
  // without contradicting tradition's "wait this out" reading.
  //
  // Astrologer pre-review NOT required: eclipse-as-stillness-prompt is
  // uncontroversial across Hellenistic, medieval, and modern schools.
  'closed-eclipse-window': {
    primary_entry_id: 'closed-eclipse-window',
    variants: [
      {
        headline: 'A stretch held by an eclipse.',
        supporting_line:
          'Not a season for new starts — a time for waiting things out. Clearer days come soon after.',
      },
      {
        headline: 'The sky is hushed by an eclipse.',
        supporting_line:
          'Hold the big decisions through this window — what passes through eclipse light rarely settles cleanly. Better days are within reach.',
      },
      {
        headline: 'An eclipse stretch — stillness over starting.',
        supporting_line:
          'A week the sky asks you to wait. Hold off on launches and signings; what waits through eclipse usually starts more cleanly after.',
      },
    ],
  },
};
