import { describe, it, expect } from 'vitest';
import type { ElectionalSearchRequest } from '@inceptio/shared-types';
import { computeCacheKey, stableStringify } from '../cache';

const baseRequest: ElectionalSearchRequest = {
  activity: 'wedding',
  start: '2026-06-01',
  end: '2026-06-30',
  lat: 50.4501,
  lng: 30.5234,
  timezone: 'Europe/Kyiv',
  city: 'Kyiv',
};

describe('stableStringify', () => {
  it('produces identical output regardless of key order', () => {
    const a = { z: 1, a: 2, m: { y: 3, b: 4 } };
    const b = { m: { b: 4, y: 3 }, a: 2, z: 1 };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it('preserves array order', () => {
    expect(stableStringify([3, 1, 2])).toBe('[3,1,2]');
  });

  it('handles primitives and null', () => {
    expect(stableStringify(null)).toBe('null');
    expect(stableStringify('x')).toBe('"x"');
    expect(stableStringify(42)).toBe('42');
  });
});

describe('computeCacheKey', () => {
  it('is deterministic for the same input', async () => {
    const k1 = await computeCacheKey(baseRequest);
    const k2 = await computeCacheKey(baseRequest);
    expect(k1).toBe(k2);
  });

  it('is order-insensitive for object keys', async () => {
    const reordered: ElectionalSearchRequest = {
      city: 'Kyiv',
      timezone: 'Europe/Kyiv',
      lng: 30.5234,
      lat: 50.4501,
      end: '2026-06-30',
      start: '2026-06-01',
      activity: 'wedding',
    };
    expect(await computeCacheKey(baseRequest)).toBe(
      await computeCacheKey(reordered),
    );
  });

  it('changes when any field changes', async () => {
    const k1 = await computeCacheKey(baseRequest);
    const k2 = await computeCacheKey({ ...baseRequest, activity: 'travel' });
    const k3 = await computeCacheKey({ ...baseRequest, lat: 50.45 });
    expect(k1).not.toBe(k2);
    expect(k1).not.toBe(k3);
    expect(k2).not.toBe(k3);
  });

  it('produces a versioned, prefixed sha256 hex key', async () => {
    const k = await computeCacheKey(baseRequest);
    // search:v1:t{TRANSLATIONS_VERSION}:{sha256}
    expect(k).toMatch(/^search:v1:t\d+:[0-9a-f]{64}$/);
  });
});
