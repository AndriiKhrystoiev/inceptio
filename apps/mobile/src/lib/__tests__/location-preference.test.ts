// Tests for location-preference.ts (spec §4.8/§4.9/§4.10 + §9.1).
// Mirrors apps/mobile/src/lib/__tests__/activity-preference.test.ts shape.
// Uses it() per the newer Phase 1+2 convention.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const memory = new Map<string, string>();

vi.mock('../storage', () => ({
  storage: {
    getString(key: string) {
      return memory.get(key);
    },
    set(key: string, value: string) {
      memory.set(key, value);
    },
    delete(key: string) {
      memory.delete(key);
    },
  },
}));

// activity-preference is mocked so location-preference's defensive
// initActivityPreference() call (D32) is observable + the
// __readActivityHydrationStatusSync read can be controlled by tests.
let mockActivityStatus: 'loading' | 'unset' | 'set' = 'loading';
const initActivitySpy = vi.fn(() => {
  mockActivityStatus = mockActivityStatus === 'loading' ? 'unset' : mockActivityStatus;
});

vi.mock('../activity-preference', () => ({
  initActivityPreference: () => initActivitySpy(),
  __readActivityHydrationStatusSync: () => ({ hydrationStatus: mockActivityStatus }),
}));

import {
  initLocationPreference,
  setDefaultLocation,
  clearDefaultLocation,
  markOnboardingLocationStatus,
  getDefaultLocationSync,
  parseStoredLocation,
  __resetForTests,
  __getSubscribeAndSnapshot,
} from '../location-preference';

const KEY_DEFAULT = 'inceptio.default_location';
const KEY_ONBOARDING = 'inceptio.onboarding_location_step_v1';

const SAMPLE_LOC = {
  lat: 35.68,
  lng: 139.69,
  city: 'Tokyo',
  country: 'Japan',
  timezone: 'Asia/Tokyo',
  selected_at: 1234567890,
};

beforeEach(() => {
  memory.clear();
  __resetForTests();
  mockActivityStatus = 'loading';
  initActivitySpy.mockClear();
});

describe('location-preference', () => {
  describe('parseStoredLocation', () => {
    it('returns parsed SavedLocation for valid JSON', () => {
      const raw = JSON.stringify(SAMPLE_LOC);
      expect(parseStoredLocation(raw)).toEqual(SAMPLE_LOC);
    });

    it('returns undefined for missing required fields', () => {
      const raw = JSON.stringify({ lat: 35.68 }); // missing lng, city, etc.
      expect(parseStoredLocation(raw)).toBeUndefined();
    });

    it('returns undefined for corrupt JSON', () => {
      expect(parseStoredLocation('{not json')).toBeUndefined();
    });

    it('returns undefined for undefined input', () => {
      expect(parseStoredLocation(undefined)).toBeUndefined();
    });
  });

  describe('initLocationPreference — fresh install', () => {
    it('with empty storage + activity unset → hydration set, default null, status pending', () => {
      mockActivityStatus = 'loading'; // initActivity will move it to 'unset'
      initLocationPreference();
      expect(initActivitySpy).toHaveBeenCalledTimes(1); // D32 defensive call
      const { getSnapshot } = __getSubscribeAndSnapshot();
      expect(getSnapshot()).toEqual({
        hydrationStatus: 'set',
        defaultLocation: null,
        onboardingLocationStatus: 'pending',
      });
      expect(memory.get(KEY_ONBOARDING)).toBe('pending');
    });

    it('with empty storage + activity already set (upgrade scenario) → status completed', () => {
      mockActivityStatus = 'set'; // simulate existing user with activity already chosen
      initLocationPreference();
      const { getSnapshot } = __getSubscribeAndSnapshot();
      expect(getSnapshot()).toEqual({
        hydrationStatus: 'set',
        defaultLocation: null,
        onboardingLocationStatus: 'completed',
      });
      expect(memory.get(KEY_ONBOARDING)).toBe('completed');
    });
  });

  describe('initLocationPreference — stored values', () => {
    it('parses valid default_location JSON', () => {
      memory.set(KEY_DEFAULT, JSON.stringify(SAMPLE_LOC));
      memory.set(KEY_ONBOARDING, 'completed');
      mockActivityStatus = 'set';
      initLocationPreference();
      expect(getDefaultLocationSync()).toEqual(SAMPLE_LOC);
    });

    it('clears corrupt default_location JSON + warns + leaves defaultLocation null', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      memory.set(KEY_DEFAULT, '{not json');
      mockActivityStatus = 'set';
      initLocationPreference();
      expect(memory.get(KEY_DEFAULT)).toBeUndefined();
      expect(getDefaultLocationSync()).toBeNull();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('[location-pref] invalid stored default'),
        expect.any(String),
      );
      warn.mockRestore();
    });

    it('honors stored valid onboarding status', () => {
      memory.set(KEY_ONBOARDING, 'skipped');
      mockActivityStatus = 'set';
      initLocationPreference();
      const { getSnapshot } = __getSubscribeAndSnapshot();
      expect(getSnapshot().onboardingLocationStatus).toBe('skipped');
    });

    it('resets invalid onboarding status string to completed + warns', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      memory.set(KEY_ONBOARDING, 'garbage');
      mockActivityStatus = 'set';
      initLocationPreference();
      expect(memory.get(KEY_ONBOARDING)).toBe('completed');
      const { getSnapshot } = __getSubscribeAndSnapshot();
      expect(getSnapshot().onboardingLocationStatus).toBe('completed');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('[location-pref] invalid onboarding status'),
        'garbage',
      );
      warn.mockRestore();
    });
  });

  describe('initLocationPreference — idempotency', () => {
    it('second call after set is a no-op', () => {
      mockActivityStatus = 'set';
      initLocationPreference();
      initLocationPreference();
      initLocationPreference();
      // initActivityPreference defensive call ran 3 times (each guarded
      // internally by activity's own idempotency); location-preference's
      // own guard prevents the body from running twice.
      expect(initActivitySpy).toHaveBeenCalledTimes(3);
      const { getSnapshot } = __getSubscribeAndSnapshot();
      expect(getSnapshot().hydrationStatus).toBe('set');
    });
  });

  describe('setters', () => {
    beforeEach(() => {
      mockActivityStatus = 'set';
      initLocationPreference();
    });

    it('setDefaultLocation updates in-memory + storage + notifies', () => {
      const { subscribe, getSnapshot } = __getSubscribeAndSnapshot();
      const snapshots: ReturnType<typeof getSnapshot>[] = [];
      const unsubscribe = subscribe(() => { snapshots.push(getSnapshot()); });

      setDefaultLocation(SAMPLE_LOC);

      expect(getSnapshot().defaultLocation).toEqual(SAMPLE_LOC);
      expect(memory.get(KEY_DEFAULT)).toBe(JSON.stringify(SAMPLE_LOC));
      expect(snapshots).toHaveLength(1);
      unsubscribe();
    });

    it('clearDefaultLocation clears in-memory + storage + notifies', () => {
      setDefaultLocation(SAMPLE_LOC);
      const { subscribe, getSnapshot } = __getSubscribeAndSnapshot();
      const snapshots: ReturnType<typeof getSnapshot>[] = [];
      const unsubscribe = subscribe(() => { snapshots.push(getSnapshot()); });

      clearDefaultLocation();

      expect(getSnapshot().defaultLocation).toBeNull();
      expect(memory.get(KEY_DEFAULT)).toBeUndefined();
      expect(snapshots).toHaveLength(1);
      unsubscribe();
    });

    it('markOnboardingLocationStatus updates flag + notifies', () => {
      const { subscribe, getSnapshot } = __getSubscribeAndSnapshot();
      const snapshots: ReturnType<typeof getSnapshot>[] = [];
      const unsubscribe = subscribe(() => { snapshots.push(getSnapshot()); });

      markOnboardingLocationStatus('skipped');

      expect(getSnapshot().onboardingLocationStatus).toBe('skipped');
      expect(memory.get(KEY_ONBOARDING)).toBe('skipped');
      expect(snapshots).toHaveLength(1);
      unsubscribe();
    });
  });

  describe('snapshot identity', () => {
    it('returns the same object reference across unrelated re-renders', () => {
      mockActivityStatus = 'set';
      initLocationPreference();
      setDefaultLocation(SAMPLE_LOC);
      const { getSnapshot } = __getSubscribeAndSnapshot();
      const first = getSnapshot();
      const second = getSnapshot();
      expect(second).toBe(first);
    });
  });
});
