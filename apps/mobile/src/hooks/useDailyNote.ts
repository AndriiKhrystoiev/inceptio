import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { getDailyNote, type DailyNoteResult } from '../lib/api';
import { getLastLocation } from '../lib/location-storage';
import { storage } from '../lib/storage';
import { useActivityPreference } from '../lib/activity-preference';
import { __computeQueryKey, __computeEnabled } from './useDailyNote.helpers';

const FALLBACK_LOCATION = {
  lat: 50.4501,
  lng: 30.5234,
  timezone: 'Europe/Kyiv',
} as const;

const KEY_LIBRARY_VERSION = 'inceptio.daily_note_library_version';

/**
 * Build today_iso_date as the local-calendar date in the event location's tz.
 * Uses Intl.DateTimeFormat with `en-CA` because that locale produces
 * YYYY-MM-DD natively (no manual padding needed) and Hermes ships full ICU
 * in RN 0.83 / Expo SDK 55.
 */
function isoTodayInTz(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}

/**
 * The Today screen's data source per design memo Layer 1.
 *
 * Hook shape mirrors useElectionalSearch.ts (queryKey + queryFn + enabled).
 * Cache policy DIVERGES from query-client.ts defaults: staleTime is
 * Infinity (queryKey embeds todayIsoDate, so day rollover triggers a fresh
 * fetch automatically — no spontaneous refetches within a day) and gcTime
 * is 24h (release memory by the next day at latest).
 *
 * Activity reactivity:
 *   useActivityPreference() subscribes to the activity external store via
 *   useSyncExternalStore. When setDefaultActivity() fires, the hook
 *   re-renders with a new `activity` value. __computeQueryKey places activity
 *   at position 5 of the queryKey array. TanStack Query detects the content
 *   change via deep equality and issues a fresh fetch automatically — no
 *   explicit invalidateQueries call needed.
 *
 *   The query is gated by __computeEnabled: it does not fire while the store
 *   is hydrating ("loading") or when no preference has been set ("unset").
 *   The Today screen should handle those states with its own loading/prompt UI.
 *
 * Library-version invalidation (PICKER-CONTRACT §6, design memo §3):
 *   On every successful fetch, compare response.library_version against
 *   the persisted marker. On mismatch, store the new value and
 *   invalidateQueries(['daily-note']) — silent, no UI surface.
 *   Astrology changes quietly.
 *
 * queryKey is NOT wrapped in useMemo — a missing dep (e.g. forgetting
 * `activity`) would silently lock the key to a stale value. TanStack Query
 * hashes array contents and only refetches on actual content change, so
 * unmemoized array literals are correct usage here.
 */
export function useDailyNote(): UseQueryResult<DailyNoteResult, Error> {
  const queryClient = useQueryClient();
  const { hydrationStatus, activity } = useActivityPreference();

  const { lat, lng, tz } = useMemo(() => {
    const loc = getLastLocation();
    if (loc) return { lat: round2(loc.lat), lng: round2(loc.lng), tz: loc.timezone };
    return {
      lat: round2(FALLBACK_LOCATION.lat),
      lng: round2(FALLBACK_LOCATION.lng),
      tz: FALLBACK_LOCATION.timezone,
    };
  }, []);

  const todayIsoDate = useMemo(() => isoTodayInTz(tz), [tz]);

  const query = useQuery<DailyNoteResult, Error>({
    queryKey: __computeQueryKey({ lat, lng, tz, todayIsoDate, activity }),
    queryFn: () => getDailyNote({ lat, lng, tz, activity: activity! }),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: __computeEnabled({ hydrationStatus, activity }),
  });

  // Silent library-version invalidation. Runs after every successful fetch.
  useEffect(() => {
    if (!query.data) return;
    const incoming = query.data.response.library_version;
    const lastSeen = storage.getString(KEY_LIBRARY_VERSION);
    if (lastSeen !== incoming) {
      storage.set(KEY_LIBRARY_VERSION, incoming);
      queryClient.invalidateQueries({ queryKey: ['daily-note'] });
    }
  }, [query.data, queryClient]);

  return query;
}
