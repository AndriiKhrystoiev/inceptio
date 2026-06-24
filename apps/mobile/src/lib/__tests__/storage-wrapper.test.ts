import { describe, it, expect, beforeEach, vi } from 'vitest';

// storage.ts holds module-level state (cache Map + hydrated flag). Re-import
// fresh per test so hydration state does not leak across tests.
async function freshStorage() {
  vi.resetModules();
  return import('../storage');
}

describe('storage wrapper', () => {
  beforeEach(() => vi.clearAllMocks());

  it('round-trips a value through the in-memory cache', async () => {
    const { storage } = await freshStorage();
    storage.set('k', 'v');
    expect(storage.getString('k')).toBe('v');
  });

  it('delete removes a value', async () => {
    const { storage } = await freshStorage();
    storage.set('k', 'v');
    storage.delete('k');
    expect(storage.getString('k')).toBeUndefined();
  });

  it('isStorageHydrated is false until hydrateStorage runs, then true', async () => {
    const { hydrateStorage, isStorageHydrated } = await freshStorage();
    expect(isStorageHydrated()).toBe(false);
    await hydrateStorage();
    expect(isStorageHydrated()).toBe(true);
  });

  it('hydrateStorage loads persisted AsyncStorage pairs into the cache', async () => {
    // NOTE (per brief): vi.resetModules() resets the mock module too, so the
    // in-memory Map inside the AsyncStorage mock is recreated on each
    // freshStorage() call. Seeding must happen via an AsyncStorage import that
    // resolves to the SAME module instance as the freshStorage() import —
    // i.e. import AsyncStorage AFTER freshStorage() so both share the same
    // post-reset module registry.
    const { storage, hydrateStorage } = await freshStorage();
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem('seed', 'fromdisk');
    await hydrateStorage();
    expect(storage.getString('seed')).toBe('fromdisk');
  });

  it('hydrateStorage is idempotent (second call is a no-op)', async () => {
    const { hydrateStorage, isStorageHydrated } = await freshStorage();
    await hydrateStorage();
    await hydrateStorage();
    expect(isStorageHydrated()).toBe(true);
  });
});
