import { describe, it, expect, vi, beforeEach } from 'vitest';

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
