// Parse an API window ISO into the LOCAL wall-clock instant + its offset,
// consuming the authoritative signal the API already baked into the string
// (local-at-location time + DST-correct offset). NO IANA timezone lookup — so
// it is correct on any JS engine, including Hermes (which has unreliable
// arbitrary-timeZone Intl support). The only Intl used downstream is the
// universally-supported timeZone:'UTC'.
//
// Fallback: a bare-UTC ("...Z") or offset-less string is treated as UTC
// (offset 0) — the honest default when the API gives no zone. The current
// /electional/search `start`/`end` carry offsets; the `_utc` form was an older
// design-audit field. Schema is permissively z.string(), so we never assume.

export interface LocalInstant {
  /** A Date whose getUTC* fields equal the LOCAL wall-clock at the moment's location. */
  localAsUtc: Date;
  /** Minutes east of UTC encoded in the ISO (e.g. +180 for "+03:00"); 0 when absent. */
  offsetMinutes: number;
}

// Matches a trailing numeric offset like "+03:00", "-0530", "+05:45".
const OFFSET_RE = /([+-])(\d{2}):?(\d{2})$/;
// Strips a trailing "Z" or numeric offset so the wall-clock part can be read as UTC.
const ZONE_SUFFIX_RE = /(Z|[+-]\d{2}:?\d{2})$/;

export function parseLocalInstant(iso: string): LocalInstant {
  const m = iso.match(OFFSET_RE);
  let offsetMinutes = 0;
  if (m) {
    const sign = m[1] === '-' ? -1 : 1;
    offsetMinutes = sign * (Number(m[2]) * 60 + Number(m[3]));
  }
  // Treat the wall-clock portion as if it were UTC, so getUTC* reads local time.
  const localPart = iso.replace(ZONE_SUFFIX_RE, '');
  return { localAsUtc: new Date(`${localPart}Z`), offsetMinutes };
}

/** Format the offset as a compact tz label: "UTC+3", "UTC-4:30", or "UTC" (offset 0). */
export function offsetLabel(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'UTC';
  const sign = offsetMinutes > 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const h = Math.floor(abs / 60);
  const min = abs % 60;
  return `UTC${sign}${h}${min ? `:${String(min).padStart(2, '0')}` : ''}`;
}
