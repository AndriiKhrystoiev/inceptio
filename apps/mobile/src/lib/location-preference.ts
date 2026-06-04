import { useSyncExternalStore } from 'react';
import { storage } from './storage';
import { initActivityPreference, __readActivityHydrationStatusSync } from './activity-preference';
import type { SavedLocation } from './location-storage';

const KEY_DEFAULT_LOCATION = 'inceptio.default_location';
const KEY_ONBOARDING_LOCATION = 'inceptio.onboarding_location_step_v1';

type HydrationStatus = 'loading' | 'unset' | 'set';
export type OnboardingLocationStatus = 'pending' | 'skipped' | 'completed';

// Module-level state. RN-only — no SSR — so reusing getSnapshot for the third
// useSyncExternalStore arg (getServerSnapshot) is harmless. Mirrors
// activity-preference.ts shape exactly (spec §4.4 / D21).
let hydrationStatus: HydrationStatus = 'loading';
let currentDefault: SavedLocation | null = null;
let onboardingStatus: OnboardingLocationStatus = 'pending';
const listeners = new Set<() => void>();

/**
 * Defensive parser for stored default_location. Validates shape (lat/lng
 * numbers, city/country/timezone strings, selected_at number) before
 * returning. Returns undefined on parse error or missing fields so the
 * caller can clear corrupt storage. Mirrors getLastLocation's validation
 * in location-storage.ts.
 */
export function parseStoredLocation(raw: string | undefined): SavedLocation | undefined {
  if (raw === undefined) return undefined;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedLocation>;
    if (
      typeof parsed.lat !== 'number' ||
      typeof parsed.lng !== 'number' ||
      typeof parsed.city !== 'string' ||
      typeof parsed.country !== 'string' ||
      typeof parsed.timezone !== 'string' ||
      typeof parsed.selected_at !== 'number'
    ) {
      return undefined;
    }
    return {
      lat: parsed.lat,
      lng: parsed.lng,
      city: parsed.city,
      country: parsed.country,
      timezone: parsed.timezone,
      selected_at: parsed.selected_at,
    };
  } catch {
    return undefined;
  }
}

/**
 * Idempotent. Called from App.js boot AFTER initActivityPreference() — but
 * defensively also calls initActivityPreference() at the top per D32 so a
 * future reorder cannot silently break D14's upgrade-path guarantee.
 * The activity init's own idempotency guard makes the call a no-op if
 * activity-init already ran.
 */
export function initLocationPreference(): void {
  // 0. Defensive: ensure activity-preference is hydrated before we read its
  //    status for the D14 upgrade-path branch below. App.js calls
  //    initActivityPreference() first; this is belt-and-suspenders against a
  //    future reorder. initActivityPreference() is idempotent. D32.
  //    Must run BEFORE the idempotency guard so repeat calls don't skip it.
  initActivityPreference();

  if (hydrationStatus !== 'loading') return;

  // 1. Default location primitive
  const rawDefault = storage.getString(KEY_DEFAULT_LOCATION);
  if (rawDefault) {
    const parsed = parseStoredLocation(rawDefault);
    if (parsed !== undefined) {
      currentDefault = parsed;
    } else {
      console.warn('[location-pref] invalid stored default, clearing:', rawDefault);
      storage.delete(KEY_DEFAULT_LOCATION);
    }
  }

  // 2. Onboarding-status primitive
  const rawStatus = storage.getString(KEY_ONBOARDING_LOCATION);
  if (rawStatus === undefined) {
    // First boot of this version. D14:
    // - existing user (activity 'set') → init 'completed' (no retroactive interceptor)
    // - fresh install (activity 'unset') → init 'pending' (interceptor fires after activity)
    const { hydrationStatus: activityStatus } = __readActivityHydrationStatusSync();
    const initStatus: OnboardingLocationStatus = activityStatus === 'set' ? 'completed' : 'pending';
    onboardingStatus = initStatus;
    storage.set(KEY_ONBOARDING_LOCATION, initStatus);
  } else if (rawStatus === 'pending' || rawStatus === 'skipped' || rawStatus === 'completed') {
    onboardingStatus = rawStatus;
  } else {
    console.warn('[location-pref] invalid onboarding status, resetting to completed:', rawStatus);
    onboardingStatus = 'completed';
    storage.set(KEY_ONBOARDING_LOCATION, 'completed');
  }

  hydrationStatus = 'set';
  notify();
}

/**
 * Same ordering as activity-preference: in-memory state updated BEFORE
 * storage.set. AsyncStorage async-flush failures are swallowed at the
 * storage-wrapper level; residual risk is documented and accepted (spec
 * EC-8 / activity-preference EC-14).
 */
export function setDefaultLocation(loc: SavedLocation): void {
  currentDefault = loc;
  storage.set(KEY_DEFAULT_LOCATION, JSON.stringify(loc));
  notify();
}

export function clearDefaultLocation(): void {
  currentDefault = null;
  storage.delete(KEY_DEFAULT_LOCATION);
  notify();
}

export function markOnboardingLocationStatus(s: OnboardingLocationStatus): void {
  onboardingStatus = s;
  storage.set(KEY_ONBOARDING_LOCATION, s);
  notify();
}

export function getDefaultLocationSync(): SavedLocation | null {
  return currentDefault;
}

type Snapshot = {
  hydrationStatus: HydrationStatus;
  defaultLocation: SavedLocation | null;
  onboardingLocationStatus: OnboardingLocationStatus;
};

let snapshot: Snapshot = {
  hydrationStatus,
  defaultLocation: currentDefault,
  onboardingLocationStatus: onboardingStatus,
};

function getSnapshot(): Snapshot {
  if (
    snapshot.hydrationStatus !== hydrationStatus ||
    snapshot.defaultLocation !== currentDefault ||
    snapshot.onboardingLocationStatus !== onboardingStatus
  ) {
    snapshot = {
      hydrationStatus,
      defaultLocation: currentDefault,
      onboardingLocationStatus: onboardingStatus,
    };
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
  getSnapshot();
  listeners.forEach((fn) => fn());
}

export function useLocationPreference(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** @internal Test-only state reset. Not exported from the barrel. */
export function __resetForTests(): void {
  hydrationStatus = 'loading';
  currentDefault = null;
  onboardingStatus = 'pending';
  listeners.clear();
  snapshot = {
    hydrationStatus,
    defaultLocation: currentDefault,
    onboardingLocationStatus: onboardingStatus,
  };
}

/**
 * @internal Test-only: exposes the subscribe/getSnapshot pair so tests can
 * verify the external-store contract without a React rendering environment.
 * Mirrors activity-preference's same export.
 */
export function __getSubscribeAndSnapshot() {
  return { subscribe, getSnapshot };
}
