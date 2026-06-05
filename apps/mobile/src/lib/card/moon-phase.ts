// Client-side moon phase for a moment. The /electional/search window carries NO
// moon_phase (only the daily-note does, server-side), so the card computes it
// locally — spec §4 ("moon phase computed locally from w.start").
//
// MIRRORS the backend algorithm verbatim — workers/api-proxy/src/translations/
// daily-notes/moon-phase.ts (PICKER-CONTRACT §2): synodic-month count from a
// known new-moon anchor, phase buckets centred on their canonical moment. Kept
// as a small client port (mobile-only branch) rather than a shared-types move to
// avoid touching the worker package; the golden test locks the values so the two
// can't silently drift. If the anchor/segment logic ever changes, update both.
import type { MoonPhase } from '@inceptio/shared-types';
import { parseLocalInstant } from './iso-local';

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

/** Phase for a calendar date (YYYY-MM-DD), anchored at noon UTC (tz-stable). */
export function moonPhaseForDate(isoDate: string): MoonPhase {
  const tUnixS = new Date(`${isoDate}T12:00:00Z`).getTime() / 1000;
  const daysSinceAnchor = (tUnixS - NEW_MOON_ANCHOR_UNIX_S) / 86400;
  const cyclePos =
    ((daysSinceAnchor % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
  // Centre each phase on its canonical moment (shift bucket edges by half a
  // segment) — see the worker's note on why the anchor DAY maps to 'new'.
  const HALF_SEGMENT_DAYS = SYNODIC_MONTH_DAYS / 16;
  const segment = Math.floor(((cyclePos + HALF_SEGMENT_DAYS) / SYNODIC_MONTH_DAYS) * 8);
  return PHASES[segment % 8]!;
}

/** Phase for a window ISO, using the moment's LOCAL date (offset-aware). */
export function moonPhaseForIso(iso: string): MoonPhase {
  const { localAsUtc } = parseLocalInstant(iso);
  const y = localAsUtc.getUTCFullYear();
  const m = String(localAsUtc.getUTCMonth() + 1).padStart(2, '0');
  const d = String(localAsUtc.getUTCDate()).padStart(2, '0');
  return moonPhaseForDate(`${y}-${m}-${d}`);
}
