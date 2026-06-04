import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { getDailyNote, type DailyNoteResult } from '../lib/api';
import { storage } from '../lib/storage';
import { useActivityPreference } from '../lib/activity-preference';
import { useLocationPreference } from '../lib/location-preference';
import { useEffectiveLocation } from './useEffectiveLocation';
import { __computeQueryKey, __computeEnabled } from './useDailyNote.helpers';

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
 * Today screen's data source.
 *
 * Location reads via useEffectiveLocation (default ?? mount-frozen lastSeed ?? null).
 * The Kyiv FALLBACK_LOCATION + empty-deps useMemo from prior versions are
 * RETIRED — the query is gated by __computeEnabled when effectiveLocation
 * is null, and TodayScreen renders EmptyStateHero in that path (D27).
 * Spec §4.6.
 *
 * Activity reactivity unchanged: useActivityPreference subscribes via
 * useSyncExternalStore; setDefaultActivity triggers a refetch through
 * queryKey content change.
 *
 * Cache policy: staleTime is Infinity (queryKey embeds todayIsoDate, so day
 * rollover triggers a fresh fetch automatically — no spontaneous refetches
 * within a day) and gcTime is 24h (release memory by the next day at latest).
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
  const { hydrationStatus: activityHydrationStatus, activity } = useActivityPreference();
  const { hydrationStatus: locationHydrationStatus } = useLocationPreference();
  const effectiveLocation = useEffectiveLocation();

  // Sentinel values are NEVER sent — __computeEnabled gates the query when
  // effectiveLocation is null. They exist so the query-key types stay
  // consistent during the disabled window.
  const lat = effectiveLocation !== null ? round2(effectiveLocation.lat) : 0;
  const lng = effectiveLocation !== null ? round2(effectiveLocation.lng) : 0;
  const tz  = effectiveLocation !== null ? effectiveLocation.timezone : 'UTC';

  const todayIsoDate = useMemo(() => isoTodayInTz(tz), [tz]);

  const query = useQuery<DailyNoteResult, Error>({
    queryKey: __computeQueryKey({ lat, lng, tz, todayIsoDate, activity }),
    queryFn: () => getDailyNote({ lat, lng, tz, activity: activity! }),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: __computeEnabled({
      activityHydrationStatus,
      locationHydrationStatus,
      activity,
      effectiveLocation,
    }),
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
