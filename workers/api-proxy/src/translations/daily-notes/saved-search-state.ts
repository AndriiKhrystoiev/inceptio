import type { Activity, Window } from '@inceptio/shared-types';
import type { SavedSearchState, SavedSearchStatusOutput } from '../types';

/** Minimal shape of a saved search the picker needs to know about. */
export interface SavedSearchSeed {
  id: string;
  activity: Activity;
  /** ISO date YYYY-MM-DD in event tz. */
  date_from: string;
  /** ISO date YYYY-MM-DD in event tz. */
  date_to: string;
}

export interface DeriveInput {
  saved: SavedSearchSeed;
  /** Current top window from the latest API result, or null if none qualified. */
  topWindow: Window | null;
  /** Previously surfaced top window's score — for `is_stronger` detection. */
  previousTopScore: number | null;
  /** Alert ids the client has acked. Acked alerts collapse back to pre-window. */
  acknowledgedAlertIds: string[];
  /** Wall-clock date in event tz; same contract as the picker (see picker.ts). */
  today_iso_date: string;
}

/**
 * Derive the saved-search lifecycle state per PICKER-CONTRACT.md §1.
 *
 * Evaluation order (mutually exclusive):
 *   1. No top window in range → `none-yet`
 *   2. window_end < now → `passed`
 *   3. window_start <= now <= window_end → `in-window`
 *   4. previousTopScore !== null AND topWindow.score > previousTopScore AND alert not acked → `new-window`
 *   5. Else → `pre-window`
 *
 * `priority` is a sort key the ordering layer uses to fill the bounded 3-stack.
 * Lower numbers = higher visual priority (see ordering rule below).
 */
export function deriveSavedSearchStatus(input: DeriveInput): SavedSearchStatusOutput {
  const { saved, topWindow, previousTopScore, acknowledgedAlertIds, today_iso_date } = input;

  if (!topWindow) {
    return {
      id: saved.id,
      activity: saved.activity,
      state: 'none-yet',
      window_start: null,
      window_end: null,
      searched_through: saved.date_to,
      priority: bandPriority('none-yet'),
    };
  }

  // Day-granularity state classification via date-string comparison.
  //
  // The window's `start`/`end` are tz-aware ISO timestamps in the event
  // location's zone (PICKER-CONTRACT.md §4). For day-granularity state
  // classification we compare the local DATE parts (YYYY-MM-DD prefix) of
  // start/end against `today_iso_date`, which is also a local-date string
  // in the event tz. This avoids the UTC-vs-event-tz alignment problem of a
  // millisecond comparison: at 03:00 local time in +03:00, UTC midnight is
  // 03:00 *of the same wall-clock day*, which silently fails the in-window
  // check for a 10:00–14:00 local window.
  //
  // ISO 8601 with offset (`2026-06-05T10:00:00+03:00`) puts the LOCAL date
  // in the first 10 chars; the offset only affects the instant, not the
  // YYYY-MM-DD prefix. Lexicographic ordering of "YYYY-MM-DD" matches date
  // ordering, so `<`/`<=` on these strings is the correct day comparison.
  //
  // Intraday refinement (minute-precision in-window / about-to-close) is
  // the client's job per contract §3 "in/out-of-window self-check"; the
  // backend `state` is authoritative at day granularity.
  const startDate = topWindow.start.slice(0, 10);
  const endDate = topWindow.end.slice(0, 10);

  // Branch 2: passed (window's end-date is strictly before today)
  if (endDate < today_iso_date) {
    return {
      id: saved.id,
      activity: saved.activity,
      state: 'passed',
      window_start: topWindow.start,
      window_end: topWindow.end,
      priority: bandPriority('passed'),
    };
  }

  // Branch 3: in-window (today falls within the window's [start, end] dates)
  if (startDate <= today_iso_date && today_iso_date <= endDate) {
    return {
      id: saved.id,
      activity: saved.activity,
      state: 'in-window',
      window_start: topWindow.start,
      window_end: topWindow.end,
      priority: bandPriority('in-window'),
    };
  }

  // Branches 4-5: future window — either new-window (stronger + not acked) or pre-window.
  if (previousTopScore !== null && topWindow.score > previousTopScore) {
    const alertId = `alert:${saved.id}:${topWindow.start}`;
    if (!acknowledgedAlertIds.includes(alertId)) {
      return {
        id: saved.id,
        activity: saved.activity,
        state: 'new-window',
        window_start: topWindow.start,
        window_end: topWindow.end,
        is_stronger: true,
        new_score: topWindow.score,
        prior_best_score: previousTopScore,
        alert_id: alertId,
        acknowledged: false,
        priority: bandPriority('new-window'),
      };
    }
  }

  return {
    id: saved.id,
    activity: saved.activity,
    state: 'pre-window',
    window_start: topWindow.start,
    window_end: topWindow.end,
    priority: bandPriority('pre-window'),
  };
}

/**
 * Priority bands per spec §6.4 + the 2026-05-29 amendment slotting `none-yet`
 * between pre-window and passed. Lower = higher priority.
 */
function bandPriority(state: SavedSearchState): number {
  switch (state) {
    case 'in-window':  return 0;
    case 'new-window': return 1_000_000;
    case 'pre-window': return 2_000_000;
    case 'none-yet':   return 3_000_000;
    case 'passed':     return 4_000_000;
  }
}
