import { useMemo } from 'react';
import type { Activity } from '@inceptio/shared-types';
import { useElectionalSearch } from './useElectionalSearch';
import { getLastActivity } from '../lib/draft-store';
import { getLastLocation } from '../lib/location-storage';

// Default location when the user hasn't picked one yet. Kyiv is the testbed
// city used throughout the API audit and is a reasonable demo default for
// the v1 launch geography.
const FALLBACK_LOCATION = {
  lat: 50.4501,
  lng: 30.5234,
  timezone: 'Europe/Kyiv',
  city: 'Kyiv',
} as const;

const FALLBACK_ACTIVITY: Activity = 'wedding';

function isoToday(): string {
  // Local-calendar date so the today-search lines up with what the user sees
  // on the wall clock, not UTC.
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * The Today screen's data source: a single-day electional search for the
 * user's last-chosen activity (or wedding as fallback), at their last-known
 * location (or Kyiv as fallback). Reuses the same React Query cache as a
 * full-range search overlap if the day happens to fall inside one.
 */
export function useTodayMoment() {
  const request = useMemo(() => {
    const today = isoToday();
    const lastLoc = getLastLocation();
    const loc = lastLoc ?? FALLBACK_LOCATION;
    const activity = getLastActivity() ?? FALLBACK_ACTIVITY;
    return {
      activity,
      start: today,
      end: today,
      lat: loc.lat,
      lng: loc.lng,
      timezone: loc.timezone,
      city: loc.city,
    };
  }, []);

  const query = useElectionalSearch(request);
  return { ...query, request };
}
