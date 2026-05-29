import type { PartOfDayCutoffs } from '../types';

/**
 * Backend-owned part-of-day cutoffs — see PICKER-CONTRACT.md §3.
 *
 * The Worker endpoint ships these in the daily-note response; the mobile
 * client applies them when rendering "this morning / afternoon / evening".
 *
 * MUST stay in lockstep with the moment-detail surface's `phrase_short`
 * part-of-day rendering. If you change these, the moment-detail rendering
 * must change too — same window can't read "afternoon" on the daily note
 * and "morning" on moment-detail.
 *
 * Hours are 0-23 in the event location's timezone. Bands:
 *   morning   = [0, morning_end_hour)
 *   afternoon = [morning_end_hour, afternoon_end_hour)
 *   evening   = [afternoon_end_hour, evening_end_hour)
 *   night     = [evening_end_hour, 24)
 *
 * Bump `LIBRARY_VERSION` in `types.ts` in the SAME PR as any change here —
 * see PICKER-CONTRACT.md §6 atomic cache invalidation.
 */
export const PART_OF_DAY_CUTOFFS: PartOfDayCutoffs = {
  morning_end_hour: 12,   // morning = 00:00..11:59
  afternoon_end_hour: 17, // afternoon = 12:00..16:59
  evening_end_hour: 21,   // evening = 17:00..20:59; night = 21:00..23:59
};
