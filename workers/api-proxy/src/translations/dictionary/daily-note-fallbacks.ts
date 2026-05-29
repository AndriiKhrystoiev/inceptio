import type { DailyNoteEntry, KnownDailyNoteId } from '../types';

/**
 * Vague-variant fallbacks for daily-note entries with
 * `needs_vague_fallback: true` — see spec §3.1 and §5.
 *
 * The picker chooses the primary entry when its horizon is verifiable
 * (intraday timing exists / concrete day is <= 3 days away). When the
 * horizon FAILS to verify, the picker falls through to the matching fallback
 * here. Fallbacks share the same `dominant_factors_hint` and `quality_bucket`
 * as their primary — only the phrasing changes (concrete → vague).
 */
export const DAILY_NOTE_FALLBACKS: Partial<Record<KnownDailyNoteId, DailyNoteEntry>> = {
  // Fallback for entry 12 (`mixed-moon-void-until-noon`) when intraday
  // timing of the void cannot be computed cheaply.
  'mixed-moon-void-until-noon': {
    id: 'mixed-moon-void-until-noon-vague',
    quality_bucket: 'mixed',
    headline: 'A quieter stretch in the sky.',
    supporting_line:
      'The Moon is between aspects today — time important calls for when the sky settles.',
    horizon_class: 'vague',
    dominant_factors_hint:
      "PROVISIONAL — same trigger as primary 'mixed-moon-void-until-noon', applied when intraday timing not available",
    surface: 'daily-note',
    needs_vague_fallback: false,
  },

  // Fallback for entry 16 (`closed-mercury-retrograde`) when Mercury direct
  // station is > 3 days away — drops the "until Thursday" concrete promise.
  'closed-mercury-retrograde': {
    id: 'closed-mercury-retrograde-vague',
    quality_bucket: 'closed',
    headline: 'Mercury is sleeping.',
    supporting_line:
      'Words need extra care for now — good for re-reading and editing; hold the heavy signing for clearer days.',
    horizon_class: 'vague',
    dominant_factors_hint:
      "PROVISIONAL — same trigger as primary 'closed-mercury-retrograde', applied when Mercury direct station > 3 days away",
    surface: 'daily-note',
    needs_vague_fallback: false,
    pending_astrologer_ruling: true,
  },

  // Fallback for entry 19 (`closed-malefic-on-angle`) when the malefic does
  // NOT move off the angle by tomorrow — drops the "Tomorrow opens cleaner" promise.
  'closed-malefic-on-angle': {
    id: 'closed-malefic-on-angle-vague',
    quality_bucket: 'closed',
    headline: 'A difficult planet sits on the angles today.',
    supporting_line:
      'A charged stretch — better used for closing things than starting them. Clearer days are within reach.',
    horizon_class: 'vague',
    dominant_factors_hint:
      "PROVISIONAL — same trigger as primary 'closed-malefic-on-angle', applied when malefic remains on the angle past tomorrow",
    surface: 'daily-note',
    needs_vague_fallback: false,
  },
};
