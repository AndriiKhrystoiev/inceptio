// Time helpers for the Moment Card — derived from the ISO's OWN authoritative
// local wall-clock + offset (see iso-local), with NO IANA-timezone Intl
// dependency (Hermes-safe; the offset is API-computed and DST-correct). The
// default (no-location) card shows a soft band like "Saturday afternoon" — never
// a precise tz-less clock (spec §7c-2).
//
// timeOfDayBand returns a band KEY (not a display word): the band word is i18n
// chrome rendered via the strings module (card-strings t('card.band.*')), so the
// view-model composes `weekday + t(band)`. Weekday/date names come from Intl with
// timeZone:'UTC' — the one zone every engine supports — on the local-as-UTC instant.
import { parseLocalInstant } from './iso-local';
import { activeBundle, toIntlLocale } from '../../i18n/locale';

export type Band = 'morning' | 'afternoon' | 'evening' | 'night';

export function timeOfDayBand(iso: string): Band {
  const h = parseLocalInstant(iso).localAsUtc.getUTCHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

export function weekday(iso: string): string {
  // Locale-aware day name; timeZone:'UTC' is the deliberate Hermes-safe trick on
  // the local-as-UTC instant (see file header) — do NOT introduce a device tz.
  return new Intl.DateTimeFormat(toIntlLocale(activeBundle()), { weekday: 'long', timeZone: 'UTC' })
    .format(parseLocalInstant(iso).localAsUtc);
}

export function monthDay(iso: string): string {
  return new Intl.DateTimeFormat(toIntlLocale(activeBundle()), { month: 'long', day: 'numeric', timeZone: 'UTC' })
    .format(parseLocalInstant(iso).localAsUtc);
}

export function weekdayMonthDay(iso: string): string {
  return `${weekday(iso)}, ${monthDay(iso)}`;
}
