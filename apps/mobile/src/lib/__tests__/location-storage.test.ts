import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storage } from '../storage';

// In-memory stand-in for the synchronous storage wrapper. We mock the module
// path so the unit under test resolves to this implementation instead of
// pulling in AsyncStorage + React Native.
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

import {
  saveLocation,
  getLastLocation,
  clearLocation,
  deviceTimezone,
  pickToSavedLocation,
  migrateLocationTimezones_v1,
} from '../location-storage';

beforeEach(() => {
  memory.clear();
});

describe('location-storage roundtrip', () => {
  const kyiv = {
    lat: 50.4501,
    lng: 30.5234,
    city: 'Kyiv',
    country: 'Ukraine',
    timezone: 'Europe/Kyiv',
    selected_at: 1_716_000_000,
  };

  it('returns null when no location has been saved', () => {
    expect(getLastLocation()).toBeNull();
  });

  it('persists and reads back the full SavedLocation shape', () => {
    saveLocation(kyiv);
    expect(getLastLocation()).toEqual(kyiv);
  });

  it('overwrites the prior pick on a second save', () => {
    saveLocation(kyiv);
    const tokyo = {
      lat: 35.6762,
      lng: 139.6503,
      city: 'Tokyo',
      country: 'Japan',
      timezone: 'Asia/Tokyo',
      selected_at: 1_716_001_000,
    };
    saveLocation(tokyo);
    expect(getLastLocation()).toEqual(tokyo);
  });

  it('hydrates missing fields from a legacy (pre-Phase 4) value', () => {
    // An older build might have stored {lat, lng, timezone, city}. Reading
    // that should still produce a valid SavedLocation with defaulted fields.
    memory.set(
      'inceptio.last_location',
      JSON.stringify({
        lat: 51.5074,
        lng: -0.1278,
        timezone: 'Europe/London',
        city: 'London',
      }),
    );
    const out = getLastLocation();
    expect(out).not.toBeNull();
    expect(out!.city).toBe('London');
    expect(out!.timezone).toBe('Europe/London');
    expect(out!.country).toBe('');
    expect(out!.selected_at).toBe(0);
  });

  it('returns null on malformed JSON', () => {
    memory.set('inceptio.last_location', 'not-json');
    expect(getLastLocation()).toBeNull();
  });

  it('returns null when the stored value is missing required fields', () => {
    memory.set('inceptio.last_location', JSON.stringify({ city: 'Paris' }));
    expect(getLastLocation()).toBeNull();
  });

  it('clearLocation removes the persisted pick', () => {
    saveLocation(kyiv);
    expect(getLastLocation()).not.toBeNull();
    clearLocation();
    expect(getLastLocation()).toBeNull();
  });
});

describe('deviceTimezone', () => {
  it('returns a non-empty IANA-shaped string in normal environments', () => {
    const tz = deviceTimezone();
    expect(typeof tz).toBe('string');
    expect(tz.length).toBeGreaterThan(0);
    // Looks like an IANA zone or "UTC"
    expect(tz).toMatch(/^[A-Za-z/_+\-0-9]+$/);
  });
});

// --- pickToSavedLocation — tz derivation (Phase 1 / Task 1.1) ---
// These tests assert that pickToSavedLocation derives the timezone from
// lat/lng via @photostructure/tz-lookup, NOT from deviceTimezone() (which
// returns the test-runner's local tz, not the picked location's tz).
//
// They fail in Task 1.1's red phase because the current body uses
// deviceTimezone(); Task 1.2 swaps to tzLookup-derived. Polar fallback
// case asserts only that timezone is a non-empty string so it passes
// either before OR after the body swap — its job is regression coverage
// against accidental return-of-undefined in the wrapper.

describe('pickToSavedLocation — tz derivation', () => {
  it('derives Asia/Tokyo from Tokyo coordinates (35.68, 139.69)', () => {
    const result = pickToSavedLocation({
      place_id: 1,
      lat: 35.68,
      lng: 139.69,
      display_name: 'Tokyo, Japan',
      city: 'Tokyo',
      country: 'Japan',
    });
    expect(result.timezone).toBe('Asia/Tokyo');
  });

  it('derives America/New_York from NYC coordinates (40.71, -74.01)', () => {
    const result = pickToSavedLocation({
      place_id: 2,
      lat: 40.71,
      lng: -74.01,
      display_name: 'New York, USA',
      city: 'New York',
      country: 'USA',
    });
    expect(result.timezone).toBe('America/New_York');
  });

  it('returns a non-empty IANA-shaped string for extreme polar coords (regression guard)', () => {
    // South Pole — @photostructure/tz-lookup may resolve OR throw. Either
    // way, our wrapper guarantees a non-empty string falls through (the
    // tryTzLookup wrapper in Task 1.2 catches throws and falls back to
    // deviceTimezone). This test PASSES today (deviceTimezone is non-empty)
    // and continues to pass after Task 1.2 — its job is to catch a future
    // regression where the wrapper silently returns '' or undefined.
    const result = pickToSavedLocation({
      place_id: 3,
      lat: -89.99,
      lng: 0,
      display_name: 'South Pole',
      city: 'South Pole',
      country: 'Antarctica',
    });
    expect(typeof result.timezone).toBe('string');
    expect(result.timezone.length).toBeGreaterThan(0);
  });
});

// --- migrateLocationTimezones_v1 (Phase 2 / Task 2.1) ---

describe('migrateLocationTimezones_v1', () => {
  beforeEach(() => {
    storage.delete('inceptio.tz_migration_v1');
    storage.delete('inceptio.last_location');
  });

  it('rewrites tz when legacy entry has deviceTimezone but coords belong to a different zone', () => {
    storage.set('inceptio.last_location', JSON.stringify({
      lat: 35.68, lng: 139.69, city: 'Tokyo', country: 'Japan',
      timezone: 'Europe/Berlin', // legacy deviceTimezone value (user was in Berlin)
      selected_at: 1234567890,
    }));
    migrateLocationTimezones_v1();
    const after = JSON.parse(storage.getString('inceptio.last_location')!);
    expect(after.timezone).toBe('Asia/Tokyo');
    expect(storage.getString('inceptio.tz_migration_v1')).toBe('done');
  });

  it('no-op rewrite when entry tz already matches lat/lng', () => {
    storage.set('inceptio.last_location', JSON.stringify({
      lat: 35.68, lng: 139.69, city: 'Tokyo', country: 'Japan',
      timezone: 'Asia/Tokyo', // already correct
      selected_at: 1234567890,
    }));
    const setSpy = vi.spyOn(storage, 'set');
    migrateLocationTimezones_v1();
    // Only the migration flag should have been set, not last_location
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledWith('inceptio.tz_migration_v1', 'done');
    setSpy.mockRestore();
  });

  it('idempotent — second call is no-op', () => {
    storage.set('inceptio.tz_migration_v1', 'done');
    storage.set('inceptio.last_location', JSON.stringify({
      lat: 35.68, lng: 139.69, city: 'Tokyo', country: 'Japan',
      timezone: 'Europe/Berlin', // would normally be rewritten
      selected_at: 1234567890,
    }));
    const setSpy = vi.spyOn(storage, 'set');
    migrateLocationTimezones_v1();
    expect(setSpy).not.toHaveBeenCalled();
    setSpy.mockRestore();
  });

  it('no-op when last_location absent (fresh install)', () => {
    const setSpy = vi.spyOn(storage, 'set');
    migrateLocationTimezones_v1();
    expect(setSpy).toHaveBeenCalledWith('inceptio.tz_migration_v1', 'done');
    expect(storage.getString('inceptio.last_location')).toBeUndefined();
    setSpy.mockRestore();
  });

  it('survives corrupt JSON without throwing', () => {
    storage.set('inceptio.last_location', '{not valid json');
    expect(() => migrateLocationTimezones_v1()).not.toThrow();
    expect(storage.getString('inceptio.tz_migration_v1')).toBe('done');
  });
});
