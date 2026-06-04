/**
 * Pure helpers extracted from useDailyNote so they can be unit-tested in the
 * node-only Vitest environment without importing React or TanStack Query.
 *
 * The hook itself imports these and delegates to them — the behaviour is
 * identical; the split is purely for testability.
 *
 * @internal exported for testing via __computeQueryKey / __computeEnabled.
 * Do not import these from product code outside useDailyNote.ts.
 */
import type { Activity } from '@inceptio/shared-types';
import type { SavedLocation } from '../lib/location-storage';

type HydrationStatus = 'loading' | 'unset' | 'set';

export interface ComputeQueryKeyArgs {
  lat: number;
  lng: number;
  tz: string;
  todayIsoDate: string;
  activity: Activity | undefined;
}

/**
 * Builds the TanStack Query queryKey for /daily-note.
 *
 * Activity sits at index 5. TanStack Query hashes array contents and only
 * refetches when content changes, so a different activity value here
 * automatically triggers a refetch without any explicit invalidation call.
 *
 * @internal
 */
export function __computeQueryKey(
  args: ComputeQueryKeyArgs,
): readonly [string, number, number, string, string, Activity | undefined] {
  return [
    'daily-note',
    args.lat,
    args.lng,
    args.tz,
    args.todayIsoDate,
    args.activity,
  ] as const;
}

export type ComputeEnabledArgs = {
  activityHydrationStatus: HydrationStatus;
  locationHydrationStatus: HydrationStatus;
  activity: Activity | undefined;
  effectiveLocation: SavedLocation | null;
};

/**
 * Determines whether the /daily-note query should fire.
 *
 * Rules (all four gates must be green):
 *   1. activityHydrationStatus must be 'set' — we know the user's stored
 *      activity preference (or confirmed there isn't one).
 *   2. locationHydrationStatus must be 'set' — we know the user's stored
 *      location preference (or confirmed there isn't one).
 *   3. activity is non-undefined — the user has actually chosen an activity.
 *   4. effectiveLocation is non-null — there is a usable location to query
 *      against (either stored default or confirmed device location).
 *
 * Spec §4.6 + §8.4.
 *
 * @internal
 */
export function __computeEnabled(args: ComputeEnabledArgs): boolean {
  return args.activityHydrationStatus === 'set'
    && args.locationHydrationStatus === 'set'
    && args.activity !== undefined
    && args.effectiveLocation !== null;
}
