import AsyncStorage from '@react-native-async-storage/async-storage';

// Drop-in MMKV-API-shaped wrapper backed by AsyncStorage + an in-memory cache.
//
// Why: react-native-mmkv@3 uses Nitro Modules, which require a custom dev
// client / EAS build (Expo Go can't load native modules). AsyncStorage ships
// with Expo Go, so we use it as the persistent backing and keep a synchronous
// hot cache in memory so consumer code (draft-store.ts, device-id.ts) can
// still read with `storage.getString(key)` — no async/await refactor.
//
// When moving to a dev-client build later: swap this file to import MMKV
// directly. No call-site changes needed.
//
// Hydration: call `await hydrateStorage()` once at app boot before any screen
// reads from this storage. The cache is empty until then; reads return
// undefined.

const cache = new Map<string, string>();
let hydrated = false;

export async function hydrateStorage(): Promise<void> {
  if (hydrated) return;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const pairs = await AsyncStorage.multiGet(keys);
    for (const [k, v] of pairs) {
      if (v != null) cache.set(k, v);
    }
  } catch {
    // Defensive: if AsyncStorage is somehow unavailable we proceed with an
    // empty cache. The user just starts from a clean draft.
  }
  hydrated = true;
}

export const storage = {
  getString(key: string): string | undefined {
    return cache.get(key);
  },
  set(key: string, value: string): void {
    cache.set(key, value);
    // Fire-and-forget. AsyncStorage.setItem rejects on real I/O failure;
    // for a draft store / device id, swallowing is acceptable — the next
    // boot will simply not see the unsynced write.
    AsyncStorage.setItem(key, value).catch(() => {});
  },
  delete(key: string): void {
    cache.delete(key);
    AsyncStorage.removeItem(key).catch(() => {});
  },
};

export function isStorageHydrated(): boolean {
  return hydrated;
}
