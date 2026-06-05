// Exact-time path for the Moment Card (shown only when location is opted in,
// spec §7c-2). Derived from the ISO's own local wall-clock + offset via
// iso-local (Hermes-safe; NO IANA-timezone Intl). 12-hour clock from the
// local-as-UTC instant; tz label is the API-authoritative offset → "UTC+3"
// (DST-correct by construction — the API bakes the right offset per date).
import { parseLocalInstant, offsetLabel } from './iso-local';

export function exactClock(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC',
  }).format(parseLocalInstant(iso).localAsUtc);
}

export function tzAbbrev(iso: string): string {
  return offsetLabel(parseLocalInstant(iso).offsetMinutes);
}
