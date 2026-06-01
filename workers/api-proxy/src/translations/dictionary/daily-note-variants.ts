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

  // Added 2026-06-01 after the post-fix June batch surfaced the same
  // retention-risk pattern in mixed-bucket that closed-bucket had pre-fix:
  // 17 of 30 days fired this single entry because the picker's mixed
  // selection logic (picker.ts:pickByDominantFactor) has only 3 branches
  // and every partial-void day with non-venus/non-mercury PASS factors
  // falls through here. Selection-logic refinement is deferred to the
  // astrologer brief (BLOCKING #3 in §11.4); rotation is the immediate
  // diffusion fix.
  //
  // Astrologer pre-review NOT required: "steady but thin → small moves"
  // is uncontroversial across schools. The claim under all three siblings
  // is the same — positive enough for tending and follow-up, not strong
  // enough for new launches.
  'mixed-moon-steady-sky-thin': {
    primary_entry_id: 'mixed-moon-steady-sky-thin',
    variants: [
      {
        headline: 'A day for steady hands, not big swings.',
        supporting_line:
          "The sky is workable but thin — good for tending what's already in motion; save the bigger asks for clearer days.",
      },
      {
        headline: 'Workable, but small.',
        supporting_line:
          "The Moon is steady; the rest of the sky is quiet — good for follow-ups and finishing what's started, not for new launches.",
      },
      {
        headline: 'A measured day — small moves first.',
        supporting_line:
          'The sky carries you for tending and follow-up; hold the bigger asks for stronger days.',
      },
      // Variants 4 & 5 added 2026-06-01 after diffusion simulation showed
      // the 4-sibling pool's max-per-variant (6/30) still crossed the >4×
      // retention threshold for this entry's high firing volume (17/30).
      // Per §11.4 "Variant pool sizing — calibration rule", else-fallthrough
      // entries need pools sized to their empirical catch rate, not to the
      // abstract 4× threshold used for specific-pattern entries. Both fill
      // a distinct semantic angle while preserving the uncontroversial
      // "positive enough for tending, not strong enough for launches" claim:
      //   v4 — continuation/maintenance ("what's already in motion")
      //   v5 — light productive lift ("finishing edges")
      {
        headline: "A day for what's already in motion.",
        supporting_line:
          'The sky favors follow-through, not fresh starts — good for keeping projects on track; the bigger asks deserve clearer days.',
      },
      {
        headline: 'A day for finishing edges.',
        supporting_line:
          "The sky is right for closing out what's almost done — good for the small finishing work; bigger starts can wait for stronger days.",
      },
    ],
  },

  // Added 2026-06-01 alongside mixed-moon-steady-sky-thin for the same
  // reason: 6 firings in 30 days crossed the §11.4 IMPORTANT #9
  // retention threshold. Strong-bucket selection has 3 branches (6+ PASS,
  // venus+jupiter pair, else); the else-fallthrough is this entry, and
  // most strong days in real upstream data don't hit the two specific
  // branches.
  //
  // Astrologer pre-review NOT required: "the ruler is dignified and the
  // sky carries action well" is uncontroversial across schools. All three
  // siblings carry the same claim — bright supportive sky worth using.
  'strong-ruler-in-motion': {
    primary_entry_id: 'strong-ruler-in-motion',
    variants: [
      {
        headline: "A stretch for what you've been waiting on.",
        supporting_line:
          'The sky carries this kind of day well — good for taking the thing off the list, signing the thing, starting the thing.',
      },
      {
        headline: 'A clear day — worth using.',
        supporting_line:
          "Conditions favor action — good for the launches and decisions you've been putting off; the sky won't be like this every day.",
      },
      {
        headline: 'A day with momentum behind it.',
        supporting_line:
          "The sky is on side — good for setting things in motion, making the call, asking the thing. Use it for what's been waiting.",
      },
    ],
  },
};
