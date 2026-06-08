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
import { activeBundle, toIntlLocale } from '../i18n/locale';

/**
 * Locale-aware lowercasing for weekday/month-bearing display strings. German
 * capitalizes weekday and month nouns ("Montag, 8. Juni" — NOT "montag,
 * 8. juni"), so de keeps Intl's casing as-is. en (a design choice) and
 * fr/es-419/pt-BR conventionally lowercase the eyebrow. Resolves the active
 * bundle at call time so a locale switch is honored.
 */
export function casedForBundle(s: string): string {
  return activeBundle() === 'de' ? s : s.toLowerCase();
}

export function formatDailyEyebrow(dateIso: string): string {
  // Locale resolves at call time so a locale change is honored. es-419/pt-BR
  // map to es/pt before reaching Intl (Hermes/ICU has no M49 `419` data).
  return casedForBundle(
    new Intl.DateTimeFormat(toIntlLocale(activeBundle()), {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${dateIso}T00:00:00Z`)),
  );
}
