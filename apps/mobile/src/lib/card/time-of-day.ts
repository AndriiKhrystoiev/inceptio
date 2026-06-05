// Location-tz-aware time helpers for the Moment Card. The default (no-location)
// card shows a soft time-of-day band — "Saturday afternoon" — never a precise
// tz-less clock (spec §7c-2). Wall-clock is computed in the location zone.
//
// timeOfDayBand returns a band KEY (not a display word): the band word is i18n
// chrome and is rendered via the strings module (card-strings t('card.band.*')),
// so the view-model composes `weekday + t(band)`. Weekday/date come from Intl
// (locale param deferred). Per-locale band naturalness is deferred l10n content.
export type Band = 'morning' | 'afternoon' | 'evening' | 'night';

function hourIn(iso: string, timeZone: string): number {
  const h = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', hour12: false, timeZone,
  }).format(new Date(iso));
  return Number(h) % 24; // Intl can return "24" for midnight in some engines
}

export function timeOfDayBand(iso: string, timeZone: string): Band {
  const h = hourIn(iso, timeZone);
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

export function weekday(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone }).format(new Date(iso));
}

export function monthDay(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone }).format(new Date(iso));
}

export function weekdayMonthDay(iso: string, timeZone: string): string {
  return `${weekday(iso, timeZone)}, ${monthDay(iso, timeZone)}`;
}
