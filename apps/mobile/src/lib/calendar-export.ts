import * as Calendar from 'expo-calendar';

// Loose window shape — accepts both real top_windows entries and the synthetic
// objects CalendarScreen builds from heatmap cells without a top_windows match.
interface WindowForCalendar {
  start?: string;
  end?: string;
  duration_minutes?: number | null;
  displayable?: {
    headline?: string;
    factors?: Array<{ phrase_short: string }>;
  };
  _synthetic?: boolean;
}

export type CalendarResult =
  | { ok: true }
  | { ok: false; reason: 'permission' | 'no_calendar' | 'invalid_window' | 'unknown'; message: string };

const DEFAULT_DURATION_MS = 30 * 60 * 1000;

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Open the system permission dialog (first time only), pick the user's
 * default writable calendar, and create an event for the given window.
 * Returns a discriminated result so the caller can show appropriate toast
 * copy without re-checking error types.
 */
export async function addWindowToCalendar(
  window: WindowForCalendar,
  activity: string,
  city: string,
): Promise<CalendarResult> {
  if (!window.start) {
    return { ok: false, reason: 'invalid_window', message: 'No start time for this moment.' };
  }

  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    return {
      ok: false,
      reason: 'permission',
      message: 'Calendar access denied. Enable it in Settings.',
    };
  }

  // EntityTypes.EVENT is iOS-specific; on Android the arg is ignored.
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  // Prefer a writable calendar that isn't the "Other" iCloud bucket; fall back
  // to any writable one. If nothing is writable (rare on iOS, possible on a
  // freshly-restored device), bail with a clear message.
  const writable = calendars.filter((c) => c.allowsModifications);
  const preferred = writable.find((c) => c.source?.name !== 'Other') ?? writable[0];
  if (!preferred) {
    return {
      ok: false,
      reason: 'no_calendar',
      message: 'No writable calendar found on this device.',
    };
  }

  const startDate = new Date(window.start);
  // Synthetic windows arrive with end === start. Give them a 30-min default
  // so the calendar shows a sensible block, not a zero-duration tick.
  const endDate =
    window.end && window.end !== window.start
      ? new Date(window.end)
      : new Date(startDate.getTime() + DEFAULT_DURATION_MS);

  const headline = window.displayable?.headline ?? `An ${activity.replace('_', ' ')} moment`;
  const factorNotes = (window.displayable?.factors ?? [])
    .map((f) => `• ${f.phrase_short}`)
    .join('\n');
  const notes = factorNotes ? `${headline}\n\n${factorNotes}` : headline;

  try {
    await Calendar.createEventAsync(preferred.id, {
      title: `${capitalize(activity.replace('_', ' '))} — ${headline}`,
      startDate,
      endDate,
      location: city || undefined,
      notes,
      alarms: [{ relativeOffset: -60 }], // 1 hour before
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: 'unknown',
      message: err instanceof Error ? err.message : 'Could not add the event.',
    };
  }
}
