import { useSyncExternalStore } from 'react';
import { storage } from './storage';
import { ActivitySchema, type Activity } from '@inceptio/shared-types';

const KEY_DEFAULT_ACTIVITY = 'inceptio.default_activity';

type HydrationStatus = 'loading' | 'unset' | 'set';

// Module-level state. RN-only — no SSR — so reusing getSnapshot for the third
// useSyncExternalStore arg (getServerSnapshot) is harmless.
let hydrationStatus: HydrationStatus = 'loading';
let current: Activity | undefined = undefined;
const listeners = new Set<() => void>();

/**
 * Forward-looking migration map. Empty for MVP because the 4 current
 * activities have no historical renames. When an activity is renamed in a
 * future release (e.g. v1.4 adds surgery → legal-advice rename), add the old
 * stored name here as a key mapping to the new canonical Activity enum value.
 * Existing installs with the old stored value will then migrate transparently
 * on next boot — initActivityPreference persists the migrated value back so
 * subsequent boots read the canonical name directly.
 *
 * Exported for the migrateOrInvalid contract test in Task 1.1.
 */
export const ACTIVITY_MIGRATIONS: Record<string, Activity> = {};

/**
 * Resolve a raw stored string to a current Activity. Tries the live schema
 * first, then the migration map. Returns undefined for empty / unknown values.
 */
export function migrateOrInvalid(raw: string | undefined): Activity | undefined {
  if (raw === undefined || raw === '') return undefined;
  const parsed = ActivitySchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  const migrated = ACTIVITY_MIGRATIONS[raw];
  if (migrated !== undefined) return migrated;
  return undefined;
}

/** Called once during app boot, after storage.hydrate() resolves. Idempotent. */
export function initActivityPreference(): void {
  if (hydrationStatus !== 'loading') return;
  const raw = storage.getString(KEY_DEFAULT_ACTIVITY);
  const migrated = migrateOrInvalid(raw);
  if (migrated !== undefined) {
    current = migrated;
    hydrationStatus = 'set';
    if (raw !== migrated) storage.set(KEY_DEFAULT_ACTIVITY, migrated);
  } else {
    if (raw !== undefined) {
      console.warn('[activity-pref] invalid stored value, resetting to unset:', raw);
      storage.delete(KEY_DEFAULT_ACTIVITY);
    }
    current = undefined;
    hydrationStatus = 'unset';
  }
  notify();
}

/**
 * Update the user's default activity preference.
 *
 * Ordering: in-memory state (current + hydrationStatus + snapshot) is updated
 * BEFORE storage.set. This is acceptable because storage.set is sync-cache +
 * async-flush — see lib/storage.ts. AsyncStorage I/O failures are swallowed
 * at the storage-wrapper level and cannot be detected here synchronously.
 *
 * Residual risk (accepted, see spec EC-14): if AsyncStorage's async flush
 * fails (e.g. disk full, sandbox crash mid-write), the in-memory cache is
 * ahead of disk. The current session reads the new value correctly. On cold
 * boot, the unsynced write is lost and the user reverts to either the
 * previously-stored explicit preference or the first-launch picker. This is
 * unpreventable synchronously given the storage shape; documented rather than
 * worked around.
 */
export function setDefaultActivity(activity: Activity): void {
  const parsed = ActivitySchema.safeParse(activity);
  if (!parsed.success) {
    console.warn('[activity-pref] refused invalid set():', activity);
    return;
  }
  current = parsed.data;
  hydrationStatus = 'set';
  storage.set(KEY_DEFAULT_ACTIVITY, parsed.data);
  notify();
}

export function getDefaultActivitySync(): Activity | undefined {
  return current;
}

/**
 * Sync read of the activity hydration status. Used by FirstLaunchActivityPicker
 * to route its "next" screen through resolveLandingScreen once setDefaultActivity
 * has flipped the status to 'set'. Returns the in-memory status; does NOT
 * re-read storage. Public twin of __readActivityHydrationStatusSync (which
 * stays internal for location-preference's upgrade-path branch).
 */
export function getActivityHydrationStatusSync(): HydrationStatus {
  return hydrationStatus;
}

type Snapshot = { hydrationStatus: HydrationStatus; activity: Activity | undefined };

let snapshot: Snapshot = { hydrationStatus, activity: current };
function getSnapshot(): Snapshot {
  if (snapshot.hydrationStatus !== hydrationStatus || snapshot.activity !== current) {
    snapshot = { hydrationStatus, activity: current };
  }
  return snapshot;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notify(): void {
  // Recompute snapshot reference BEFORE notifying so React sees the new identity.
  getSnapshot();
  listeners.forEach((fn) => fn());
}

export function useActivityPreference(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** @internal Test-only state reset. Not exported from the barrel. */
export function __resetForTests(): void {
  hydrationStatus = 'loading';
  current = undefined;
  listeners.clear();
  snapshot = { hydrationStatus, activity: current };
}

/**
 * @internal Test-only: exposes the subscribe/getSnapshot pair so tests can
 * verify the external-store contract without a React rendering environment.
 * Not exported from the barrel.
 */
export function __getSubscribeAndSnapshot() {
  return { subscribe, getSnapshot };
}

/**
 * @internal Sync read of the hydration status without triggering a
 * subscription. Used by location-preference.ts initLocationPreference()
 * to decide the upgrade-path branch (D14) — fresh install vs existing
 * user with activity already 'set'. Returns the in-memory hydrationStatus;
 * does NOT re-read storage (initActivityPreference does that). D28.
 */
export function __readActivityHydrationStatusSync(): { hydrationStatus: HydrationStatus } {
  return { hydrationStatus };
}
