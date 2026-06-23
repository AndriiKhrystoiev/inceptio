import type { MoonPhase } from '../types';

/**
 * Backend moon-phase computation — see PICKER-CONTRACT.md §2 (supersedes the
 * CLAUDE.md note that moon phase is mobile-computed).
 *
 * Counts the number of synodic months elapsed since a known new-moon anchor,
 * then maps the fractional part of the cycle to one of 8 phases.
 *
 * Reference: Jan 6, 2000 at 18:14 UTC was a new moon (a standard anchor used
 * in many phase-calculation libraries). Synodic month length = 29.530588853
 * mean solar days. Approximation accuracy is ~few hours over a few decades —
 * adequate for day-granularity phase reporting (we surface one of 8 buckets,
 * not exact illumination percentage).
 *
 * Input is the wall-clock date in event tz; we anchor at noon UTC of that
 * date to keep the answer stable across all timezones (moon phase moves
 * slowly enough that "noon UTC of this YYYY-MM-DD" is a good single value).
 */
const NEW_MOON_ANCHOR_UNIX_S = 947181240; // 2000-01-06T18:14:00Z
const SYNODIC_MONTH_DAYS = 29.530588853;

const PHASES: MoonPhase[] = [
  'new',
  'waxing-crescent',
  'first-quarter',
  'waxing-gibbous',
  'full',
  'waning-gibbous',
  'last-quarter',
  'waning-crescent',
];

export function computeMoonPhase(today_iso_date: string): MoonPhase {
  const tUnixS = new Date(`${today_iso_date}T12:00:00Z`).getTime() / 1000;
  const daysSinceAnchor = (tUnixS - NEW_MOON_ANCHOR_UNIX_S) / 86400;
  // Normalise into [0, SYNODIC_MONTH_DAYS) — handles dates before the anchor too.
  const cyclePos =
    ((daysSinceAnchor % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) %
    SYNODIC_MONTH_DAYS;
  // Centre each phase on its canonical moment (not its leading edge), shifting
  // the bucket boundaries forward by half a segment. This makes the calendar
  // date CONTAINING the anchor moment map to 'new' even when our noon-UTC
  // sample lands just before the actual 18:14-UTC new-moon instant — which is
  // the astronomically correct behaviour: at noon on 2000-01-06 the moon was
  // a sliver of waning-crescent, but the DAY belongs to the new-moon bucket
  // because the principal phase is named for the day it occurs on.
  const HALF_SEGMENT_DAYS = SYNODIC_MONTH_DAYS / 16;
  const centredPos = cyclePos + HALF_SEGMENT_DAYS;
  const segment = Math.floor((centredPos / SYNODIC_MONTH_DAYS) * 8);
  // segment % 8 handles the wrap when centredPos pushes past one full cycle
  return PHASES[segment % 8]!;
}
