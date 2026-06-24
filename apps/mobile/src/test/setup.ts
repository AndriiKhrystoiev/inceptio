// Global, per-file-overridable mock fallbacks for the node test environment.
//
// vitest runs in `environment: 'node'`, so files importing AsyncStorage,
// expo-* native modules, react-native, or the `__DEV__` global cannot be
// imported unmocked. These are FALLBACKS: any test file's own `vi.mock(...)`
// still wins (file-scoped hoisted mocks override setupFiles). This file must
// NOT assign `global.fetch` — three tests manage fetch themselves and a
// permanent assignment corrupts their restore semantics.
import { vi } from 'vitest';

// React Native's `__DEV__` global — referenced bare (not `typeof`-guarded) in
// some files (e.g. lib/rating/store-review.ts). Define it so those imports
// don't ReferenceError. Tests that need the dev branch set it to true locally.
(globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;

// In-memory AsyncStorage — superset of every per-file stub (adds getAllKeys +
// multiGet, needed by storage.ts hydrateStorage()).
vi.mock('@react-native-async-storage/async-storage', () => {
  const mem = new Map<string, string>();
  return {
    default: {
      getItem: async (k: string) => mem.get(k) ?? null,
      setItem: async (k: string, v: string) => { mem.set(k, v); },
      removeItem: async (k: string) => { mem.delete(k); },
      getAllKeys: async () => [...mem.keys()],
      multiGet: async (keys: string[]) => keys.map((k) => [k, mem.get(k) ?? null] as [string, string | null]),
      clear: async () => { mem.clear(); },
    },
  };
});

// react-native — superset of the per-file `{ Platform: { OS: 'ios' } }` stubs.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '17.0', select: (o: Record<string, unknown>) => o.ios ?? o.default },
  Linking: { canOpenURL: vi.fn(async () => true), openURL: vi.fn(async () => undefined) },
  AppState: { currentState: 'active', addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
  NativeModules: {},
}));

vi.mock('expo-application', () => ({
  getIosIdForVendorAsync: vi.fn(async () => 'ios-vendor-id'),
  getAndroidId: vi.fn(() => 'android-id'),
}));

vi.mock('expo-calendar', () => ({
  EntityTypes: { EVENT: 'event' },
  requestCalendarPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
  getCalendarsAsync: vi.fn(async () => [
    { id: 'cal-1', allowsModifications: true, source: { name: 'iCloud' } },
  ]),
  createEventAsync: vi.fn(async () => 'event-id'),
}));

vi.mock('expo-clipboard', () => ({
  setStringAsync: vi.fn(async () => undefined),
}));

vi.mock('expo-constants', () => ({
  default: { expoConfig: { version: '1.0.0' } },
}));

vi.mock('expo-store-review', () => ({
  isAvailableAsync: vi.fn(async () => true),
  requestReview: vi.fn(async () => undefined),
  storeUrl: vi.fn(() => null),
}));

vi.mock('expo-localization', () => ({
  getLocales: vi.fn(() => [{ languageTag: 'en', languageCode: 'en' }]),
}));
