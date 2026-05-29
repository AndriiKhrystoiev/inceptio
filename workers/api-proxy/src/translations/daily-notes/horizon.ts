export type Planet = 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';
export type StationKind = 'retrograde' | 'direct';

interface Station {
  planet: Planet;
  kind: StationKind;
  date: string; // ISO yyyy-mm-dd
}

/**
 * Planetary stations for 2026-2027 used by horizon verification.
 *
 * Source: any reputable ephemeris. These dates are approximations rounded to
 * the day — the picker needs day-level precision, not the exact UTC second.
 *
 * MAINTENANCE: refresh annually before each year ends. Until then, when the
 * calendar window is exhausted, horizon verification returns null and the
 * picker falls through to vague variants — that is the safe failure mode.
 */
const STATIONS: Station[] = [
  // 2026
  { planet: 'mercury', kind: 'retrograde', date: '2026-04-09' },
  { planet: 'mercury', kind: 'direct',     date: '2026-05-02' },
  { planet: 'mercury', kind: 'retrograde', date: '2026-08-08' },
  { planet: 'mercury', kind: 'direct',     date: '2026-08-31' },
  { planet: 'mercury', kind: 'retrograde', date: '2026-11-25' },
  { planet: 'mercury', kind: 'direct',     date: '2026-12-15' },
  { planet: 'venus',   kind: 'retrograde', date: '2026-10-03' },
  { planet: 'venus',   kind: 'direct',     date: '2026-11-13' },
  { planet: 'mars',    kind: 'retrograde', date: '2027-01-10' },
  { planet: 'jupiter', kind: 'retrograde', date: '2026-11-03' },
  { planet: 'saturn',  kind: 'retrograde', date: '2026-05-13' },
  { planet: 'saturn',  kind: 'direct',     date: '2026-09-29' },
  // 2027 — extend as needed
];

/**
 * Calendar-day distance between `from` and `to`. Positive when `to` is later.
 * Normalises both to UTC midnight before subtracting so DST / timezone shifts
 * don't introduce off-by-one errors.
 */
export function daysUntil(from: Date, to: Date): number {
  const ms = 24 * 60 * 60 * 1000;
  const fromUtc = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
  );
  const toUtc = Date.UTC(
    to.getUTCFullYear(),
    to.getUTCMonth(),
    to.getUTCDate(),
  );
  return Math.round((toUtc - fromUtc) / ms);
}

/**
 * The 3-day rule's core check — see spec §5. Returns true when `target` is
 * 0..3 days after `today` (inclusive of today and 3 days out).
 */
export function isHorizonWithin3Days(today: Date, target: Date): boolean {
  const diff = daysUntil(today, target);
  return diff >= 0 && diff <= 3;
}

/**
 * Find the next station of the given planet + kind strictly after `after`.
 * Returns null when no such station exists in the calendar window — caller
 * must then fall through to a vague-variant entry.
 */
export function nextStationOf(
  planet: Planet,
  kind: StationKind,
  after: Date,
): Date | null {
  for (const station of STATIONS) {
    if (station.planet !== planet || station.kind !== kind) continue;
    const stationDate = new Date(`${station.date}T00:00:00Z`);
    if (stationDate.getTime() > after.getTime()) return stationDate;
  }
  return null;
}
