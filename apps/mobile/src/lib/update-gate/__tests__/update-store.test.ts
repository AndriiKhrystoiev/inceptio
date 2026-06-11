import { describe, it, expect, beforeEach, vi } from 'vitest';

// expo-application pulls in expo-modules-core → RN source the node test env
// can't parse. Stub it; none of these cases exercise getInstalledVersion().
vi.mock('expo-application', () => ({ nativeApplicationVersion: '1.0.0' }));

const memory = new Map<string, string>();
vi.mock('../../storage', () => ({
  storage: {
    getString: (k: string) => memory.get(k),
    set: (k: string, v: string) => { memory.set(k, v); },
    delete: (k: string) => { memory.delete(k); },
  },
}));

import { fetchPolicy, loadSuppression, recordSoftDismiss } from '../update-store';

const valid = {
  forceEnabled: true,
  ios: { minVersion: '1.2.0', latestVersion: '1.5.0', storeUrl: 'https://apps.apple.com/app/id1' },
};

beforeEach(() => { memory.clear(); vi.restoreAllMocks(); });

describe('fetchPolicy (fail-open on every failure path)', () => {
  it('returns the parsed policy on 200 + valid body', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(valid), { status: 200 })));
    expect(await fetchPolicy('https://api.test')).toEqual(valid);
  });
  it('returns null on non-200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 503 })));
    expect(await fetchPolicy('https://api.test')).toBeNull();
  });
  it('returns null on a network throw', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await fetchPolicy('https://api.test')).toBeNull();
  });
  it('returns null on invalid JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{not json', { status: 200 })));
    expect(await fetchPolicy('https://api.test')).toBeNull();
  });
  it('returns null on schema mismatch', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ forceEnabled: 'no' }), { status: 200 })));
    expect(await fetchPolicy('https://api.test')).toBeNull();
  });
});

describe('soft suppression storage', () => {
  it('round-trips dismiss → load', () => {
    const now = new Date('2026-06-11T00:00:00.000Z');
    recordSoftDismiss('1.5.0', now);
    expect(loadSuppression()).toEqual({ dismissedForVersion: '1.5.0', dismissedAt: now.toISOString() });
  });
  it('empty suppression before any dismiss', () => {
    expect(loadSuppression()).toEqual({ dismissedForVersion: null, dismissedAt: null });
  });
});
