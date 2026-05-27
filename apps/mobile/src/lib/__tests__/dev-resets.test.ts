// Unit tests for the dev-only reset helpers used by the Settings screen
// (Debug section). Both helpers are thin wrappers over the storage backend;
// the test covers the contract Settings relies on:
//   - clearDeviceId() removes the device_id key so getDeviceId() regenerates
//   - clearSavedMoments() removes the saved-moments list

import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory storage stub — same pattern used by location-storage.test.ts.
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

// device-id.ts also imports from 'react-native' (Platform) and
// 'expo-application'. Stub both so node can require the module.
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-application', () => ({
  getIosIdForVendorAsync: async () => 'vendor-id-stub',
  getAndroidId: () => 'android-id-stub',
}));

import { clearDeviceId, getDeviceId } from '../device-id';
import { clearSavedMoments, getSavedMoments, saveMoment } from '../draft-store';

beforeEach(() => {
  memory.clear();
});

describe('clearDeviceId', () => {
  it('clears the stored device id so the next getDeviceId() regenerates', async () => {
    // Prime the cache.
    const first = await getDeviceId();
    expect(memory.get('inceptio.device_id')).toBe(first);

    clearDeviceId();
    expect(memory.get('inceptio.device_id')).toBeUndefined();

    // Next call re-derives (vendor stub returns deterministic id).
    const second = await getDeviceId();
    expect(memory.get('inceptio.device_id')).toBe(second);
  });

  it('is a no-op when no device id was stored', () => {
    expect(memory.get('inceptio.device_id')).toBeUndefined();
    clearDeviceId();
    expect(memory.get('inceptio.device_id')).toBeUndefined();
  });
});

describe('clearSavedMoments', () => {
  const sampleMoment = {
    id: 'm1',
    activity: 'wedding' as const,
    city: 'Kyiv',
    start: '2026-06-21T11:32:00+00:00',
    end: '2026-06-21T13:08:00+00:00',
    duration_minutes: 96,
    score: 72,
    grade: 'fair',
    headline: 'A tender day for beginnings.',
    saved_at: '2026-05-27T00:00:00Z',
  };

  it('drops the entire saved-moments list', () => {
    saveMoment(sampleMoment);
    expect(getSavedMoments()).toHaveLength(1);

    clearSavedMoments();
    expect(getSavedMoments()).toEqual([]);
    expect(memory.get('inceptio.saved_moments')).toBeUndefined();
  });

  it('is a no-op when there is nothing saved', () => {
    expect(getSavedMoments()).toEqual([]);
    clearSavedMoments();
    expect(getSavedMoments()).toEqual([]);
  });
});
