// Timezone date math for the usage-cap quota bucket. Intl-only — workerd ships
// full-ICU, and the library audit (2026-06-06) confirms no date library is
// warranted. ALWAYS pass an explicit `timeZone`; never rely on workerd's
// ambient TZ=UTC.

/** YYYY-MM-DD calendar date of `d` in `tz`. en-CA yields ISO order natively. */
export function formatDateInTz(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Offset of `tz` at a UTC instant, in minutes east-of-UTC (EST = -300).
 * "Format the instant as wall-clock in tz, reinterpret those parts as UTC,
 * diff against the real instant" — robust across DST. This is what
 * date-fns-tz/Temporal polyfills do internally.
 */
export function tzOffsetMinutes(utcMs: number, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const p = Object.fromEntries(
    dtf.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]),
  ) as Record<string, string | undefined>;
  // Some ICU builds emit '24' for midnight — normalize to '00'. The `?? ''`
  // satisfies noUncheckedIndexedAccess; these parts are always present at
  // runtime for the field set requested above.
  const hour = p.hour === '24' ? '00' : p.hour ?? '';
  const asUTC = Date.UTC(
    +(p.year ?? ''), +(p.month ?? '') - 1, +(p.day ?? ''),
    +hour, +(p.minute ?? ''), +(p.second ?? ''),
  );
  return Math.round((asUTC - utcMs) / 60000);
}

/**
 * Unix SECONDS of the next local midnight in `tz` after `nowMs`.
 * Reads the offset AT the candidate instant and settles once, so a
 * spring-forward/fall-back day uses the correct boundary offset.
 * Display/Retry-After only — minor drift is non-fatal.
 */
export function nextLocalMidnightUnix(nowMs: number, tz: string): number {
  const parts = formatDateInTz(new Date(nowMs), tz).split('-').map(Number);
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const naiveTomorrowUTC = Date.UTC(y, m - 1, d + 1, 0, 0, 0);
  const offset = tzOffsetMinutes(naiveTomorrowUTC, tz);
  let utc = naiveTomorrowUTC - offset * 60000;
  const offset2 = tzOffsetMinutes(utc, tz);
  if (offset2 !== offset) utc = naiveTomorrowUTC - offset2 * 60000;
  return Math.floor(utc / 1000);
}

/** Seconds from `nowSec` until the next local midnight in `tz`. */
export function secondsToNextLocalMidnight(nowSec: number, tz: string): number {
  return nextLocalMidnightUnix(nowSec * 1000, tz) - nowSec;
}

/** True if `tz` is a usable IANA zone id. */
export function isValidTz(tz: string | null | undefined): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** First valid tz among candidates, else 'UTC'. */
export function resolveBucketTz(
  ...candidates: Array<string | null | undefined>
): string {
  for (const c of candidates) if (isValidTz(c)) return c as string;
  return 'UTC';
}
