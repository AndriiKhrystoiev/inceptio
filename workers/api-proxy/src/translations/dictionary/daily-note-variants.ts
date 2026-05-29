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
};
