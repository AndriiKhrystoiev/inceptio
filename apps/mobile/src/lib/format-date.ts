/**
 * Format an ISO YYYY-MM-DD date as the daily-note eyebrow string,
 * e.g. "saturday, may 23".
 *
 * Source of the input: the daily-note response's `daily_note.date` field
 * (Worker-emitted ISO date in event tz per PICKER-CONTRACT §2).
 *
 * Used by:
 *   - DailyNoteBody (the eyebrow above the daily-note headline)
 *
 * Five other surfaces in the codebase format dates ad-hoc with their own
 * Intl.DateTimeFormat calls (DatePickerScreen, YourMomentsScreen,
 * MomentDetailScreen, CalendarScreen, current TodayScreen). Broader
 * consolidation is deferred to a separate codebase-hygiene pass.
 */
export function formatDailyEyebrow(dateIso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
    .format(new Date(`${dateIso}T00:00:00Z`))
    .toLowerCase();
}
