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
 * Defensive parser for stored default_location. Returns the parsed
 * SavedLocation if shape-valid, else undefined. Implementation lands in
 * Phase 1 / Task 1.2.
 */
export function parseStoredLocation(_raw: string | undefined): SavedLocation | undefined {
  throw new Error('not yet implemented — Phase 1 / Task 1.2');
}

/**
 * Idempotent. Called from App.js boot AFTER initActivityPreference() — but
 * defensively also calls initActivityPreference() at the top below per D32 so a
 * future reorder cannot silently break D14's upgrade-path guarantee.
 * Implementation lands in Phase 1 / Task 1.2.
 */
export function initLocationPreference(): void {
  throw new Error('not yet implemented — Phase 1 / Task 1.2');
}

export function setDefaultLocation(_loc: SavedLocation): void {
  throw new Error('not yet implemented — Phase 1 / Task 1.2');
}

export function clearDefaultLocation(): void {
  throw new Error('not yet implemented — Phase 1 / Task 1.2');
}

export function markOnboardingLocationStatus(_s: OnboardingLocationStatus): void {
  throw new Error('not yet implemented — Phase 1 / Task 1.2');
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
