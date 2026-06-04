import { useState } from 'react';
import { useLocationPreference } from '../lib/location-preference';
import { getLastLocation, type SavedLocation } from '../lib/location-storage';

/**
 * Composes the effective location used for daily-note + display.
 *
 * Precedence:
 *   default_location  →  lastSeed (mount-frozen mirror of last_location)  →  null
 *
 * The lastSeed is FROZEN at mount via lazy useState init. Per-search edits
 * to `last_location` do NOT poison Today's display by leaking back through
 * useEffectiveLocation. Only explicit `default_location` mutations propagate
 * reactively (via the useSyncExternalStore subscription inside
 * useLocationPreference). Spec §4.5 + D11.
 *
 * Returns null when neither default nor lastSeed is present. Callers (the
 * daily-note hook + TodayScreen empty-state guard) decide what to do with
 * null — typically: gate the query, render empty-state.
 *
 * IMPORTANT: do NOT use this hook inside the per-search flow. Per-search
 * intentionally treats each pick as fresh (the picker writes last_location
 * but reads nothing). D20.
 */
export function useEffectiveLocation(): SavedLocation | null {
  const { defaultLocation } = useLocationPreference();
  const [lastSeed] = useState(() => getLastLocation());
  return defaultLocation ?? lastSeed ?? null;
}
