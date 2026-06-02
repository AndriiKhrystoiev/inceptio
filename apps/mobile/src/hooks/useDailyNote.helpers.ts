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

export interface ComputeEnabledArgs {
  hydrationStatus: HydrationStatus;
  activity: Activity | undefined;
}

/**
 * Determines whether the /daily-note query should fire.
 *
 * Rules (in priority order):
 *   1. If hydration hasn't resolved yet ("loading"), never fire — we don't
 *      know whether the user has a preference or not.
 *   2. If hydration resolved but no preference was found ("unset"), never fire
 *      — the Today screen will prompt the user to pick an activity first.
 *   3. If hydration resolved and an activity is set, fire only when activity
 *      is non-undefined (the type already enforces this, but the explicit
 *      !== undefined check makes the intent legible).
 *
 * @internal
 */
export function __computeEnabled(args: ComputeEnabledArgs): boolean {
  return args.hydrationStatus === 'set' && args.activity !== undefined;
}
