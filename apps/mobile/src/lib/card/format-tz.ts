// Exact-time path for the Moment Card (shown only when location is opted in,
// spec §7c-2). Derived from the ISO's own local wall-clock + offset via
// iso-local (Hermes-safe; NO IANA-timezone Intl). 12-hour clock from the
// local-as-UTC instant; tz label is the API-authoritative offset → "UTC+3"
// (DST-correct by construction — the API bakes the right offset per date).
import { parseLocalInstant, offsetLabel } from './iso-local';
import { activeBundle, toIntlLocale } from '../../i18n/locale';

export function exactClock(iso: string): string {
  // Locale decides 12h vs 24h — drop explicit hour12 (de/fr/es-419/pt-BR render
  // 24h; en keeps its 12h default). timeZone:'UTC' is the deliberate Hermes-safe
  // trick on the local-as-UTC instant (see file header) — do NOT change it.
  return new Intl.DateTimeFormat(toIntlLocale(activeBundle()), {
    hour: 'numeric', minute: '2-digit', timeZone: 'UTC',
  }).format(parseLocalInstant(iso).localAsUtc);
}

export function tzAbbrev(iso: string): string {
  return offsetLabel(parseLocalInstant(iso).offsetMinutes);
}
