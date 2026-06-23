// Client-side moon phase for a moment. The /electional/search window carries NO
// moon_phase (only the daily-note does, server-side), so the card computes it
// locally — spec §4 ("moon phase computed locally from w.start").
//
// Previously duplicated the synodic-constant math from workers/api-proxy.
// Now delegates to @inceptio/translations#computeMoonPhase so the algorithm
// lives in exactly one place. The parity golden test
// (card/__tests__/moon-phase-parity.test.ts) locks both to the same output.
import type { MoonPhase } from '@inceptio/shared-types';
import { computeMoonPhase } from '@inceptio/translations';
import { parseLocalInstant } from './iso-local';

/** Phase for a calendar date (YYYY-MM-DD), anchored at noon UTC (tz-stable). */
export function moonPhaseForDate(isoDate: string): MoonPhase {
  return computeMoonPhase(isoDate);
}

/** Phase for a window ISO, using the moment's LOCAL date (offset-aware). */
export function moonPhaseForIso(iso: string): MoonPhase {
  const { localAsUtc } = parseLocalInstant(iso);
  const y = localAsUtc.getUTCFullYear();
  const m = String(localAsUtc.getUTCMonth() + 1).padStart(2, '0');
  const d = String(localAsUtc.getUTCDate()).padStart(2, '0');
  return computeMoonPhase(`${y}-${m}-${d}`);
}
