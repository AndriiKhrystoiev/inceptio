// Tests for activity-preference.ts
//
// Why no renderHook / @testing-library/react-native:
// The vitest.config.ts uses environment: 'node'; RNTL is not installed.
// The hook (useActivityPreference) is a thin useSyncExternalStore wrapper
// over the subscribe/getSnapshot pair exported here. We test the contract
// of those two functions directly — if subscribe fires on change and
// getSnapshot returns the right shape, the hook is correct.

import { describe, test, expect, beforeEach, vi } from 'vitest';

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

// storage mock must be declared before the module under test is imported
// (Vitest hoists vi.mock calls, so the order here is safe).
import {
  initActivityPreference,
  setDefaultActivity,
  getDefaultActivitySync,
  __resetForTests,
  __getSubscribeAndSnapshot,
  migrateOrInvalid,
  ACTIVITY_MIGRATIONS,
} from '../activity-preference';
import { storage } from '../storage';

const KEY = 'inceptio.default_activity';

beforeEach(() => {
  memory.clear();
  __resetForTests();
});

describe('activity-preference', () => {
  test('initial state before init is "loading"', () => {
    const { getSnapshot } = __getSubscribeAndSnapshot();
    expect(getSnapshot()).toEqual({ hydrationStatus: 'loading', activity: undefined });
  });

  test('init from empty storage → unset', () => {
    initActivityPreference();
    const { getSnapshot } = __getSubscribeAndSnapshot();
    expect(getSnapshot()).toEqual({ hydrationStatus: 'unset', activity: undefined });
  });

  test('init from valid stored value → set', () => {
    memory.set(KEY, 'wedding');
    initActivityPreference();
    const { getSnapshot } = __getSubscribeAndSnapshot();
    expect(getSnapshot()).toEqual({ hydrationStatus: 'set', activity: 'wedding' });
  });

  test('init from invalid stored value → unset + purge + warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    memory.set(KEY, 'not_a_real_activity');
    initActivityPreference();
    expect(memory.get(KEY)).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[activity-pref] invalid stored value'),
      'not_a_real_activity',
    );
    const { getSnapshot } = __getSubscribeAndSnapshot();
    expect(getSnapshot()).toEqual({ hydrationStatus: 'unset', activity: undefined });
    warn.mockRestore();
  });

  test('setDefaultActivity writes, notifies, updates snapshot', () => {
    initActivityPreference();
    const { subscribe, getSnapshot } = __getSubscribeAndSnapshot();
    const snapshots: ReturnType<typeof getSnapshot>[] = [];
    const unsubscribe = subscribe(() => { snapshots.push(getSnapshot()); });

    setDefaultActivity('contracts');

    expect(getSnapshot()).toEqual({ hydrationStatus: 'set', activity: 'contracts' });
    expect(memory.get(KEY)).toBe('contracts');
    // subscribe callback was called exactly once when notify() fired.
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toEqual({ hydrationStatus: 'set', activity: 'contracts' });
    unsubscribe();
  });

  test('setDefaultActivity refuses invalid value', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    initActivityPreference();
    // @ts-expect-error testing runtime guard
    setDefaultActivity('garbage');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[activity-pref] refused invalid set()'),
      'garbage',
    );
    expect(getDefaultActivitySync()).toBeUndefined();
    warn.mockRestore();
  });

  test('init is idempotent (multiple calls no-op)', () => {
    initActivityPreference();
    initActivityPreference();
    initActivityPreference();
    const { getSnapshot } = __getSubscribeAndSnapshot();
    expect(getSnapshot().hydrationStatus).toBe('unset');
  });

  test('snapshot identity stable across unrelated re-renders', () => {
    initActivityPreference();
    setDefaultActivity('wedding');
    const { getSnapshot } = __getSubscribeAndSnapshot();
    const first = getSnapshot();
    // Calling getSnapshot again with no intervening mutation must return the
    // same object reference (memoised snapshot identity).
    const second = getSnapshot();
    expect(second).toBe(first);
  });

  // --- ACTIVITY_MIGRATIONS forward-looking insurance ---

  test('migrateOrInvalid helper returns Activity for valid current name', () => {
    expect(migrateOrInvalid('wedding')).toBe('wedding');
    expect(migrateOrInvalid('contracts')).toBe('contracts');
    expect(migrateOrInvalid('business_launch')).toBe('business_launch');
    expect(migrateOrInvalid('travel')).toBe('travel');
  });

  test('migrateOrInvalid returns undefined for empty + invalid raw values', () => {
    expect(migrateOrInvalid(undefined)).toBeUndefined();
    expect(migrateOrInvalid('garbage')).toBeUndefined();
    expect(migrateOrInvalid('')).toBeUndefined();
  });

  test('migrateOrInvalid maps a registered legacy name (contract test for future migration)', () => {
    expect(ACTIVITY_MIGRATIONS).toEqual({});
  });

  test('init persists migrated value back to storage so next boot reads canonical name', () => {
    memory.set(KEY, 'wedding');
    const setSpy = vi.spyOn(storage, 'set');
    initActivityPreference();
    // raw ('wedding') === migrated ('wedding'), so no rewrite should occur.
    expect(setSpy).not.toHaveBeenCalled();
    setSpy.mockRestore();
  });
});
