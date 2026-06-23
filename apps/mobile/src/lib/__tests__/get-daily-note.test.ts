import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// In-memory AsyncStorage mock — same pattern as daily-note-cache.test.ts.
const asyncStorageMemory = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => asyncStorageMemory.get(key) ?? null,
    setItem: async (key: string, value: string) => { asyncStorageMemory.set(key, value); },
    removeItem: async (key: string) => { asyncStorageMemory.delete(key); },
  },
}));

// Native-module stubs required by transitive imports.
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-localization', () => ({ getLocales: () => [] }));
vi.mock('../device-id', () => ({
  getDeviceId: vi.fn(async () => 'test-device-id'),
}));

import { getDailyNote } from '../api';

// Read fixture via fs — same pattern as search-electional.test.ts.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const searchFixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/api-public/search-200.json'), 'utf-8'),
) as Record<string, unknown>;

beforeEach(() => {
  asyncStorageMemory.clear();
  vi.restoreAllMocks();
});

describe('getDailyNote (local synthesis)', () => {
  it('synthesizes a daily note from a search result', async () => {
    // Mock fetch to return the real fixture — the REAL searchElectional runs,
    // so this is an integration test of the full synthesis path.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(searchFixture), { status: 200 }),
    );

    const res = await getDailyNote({
      lat: 50.45, lng: 30.52, tz: 'Europe/Kyiv', activity: 'wedding',
    });

    // The fixture has no_viable_windows: true with 10 caution windows —
    // synthesis must handle the no-viable path without throwing.
    expect(res.response.daily_note).toBeTruthy();
    expect(res.response.library_version).toBeDefined();
    expect(res.response.saved_searches).toEqual([]);
    expect(res.response.total_saved_count).toBe(0);
  });
});
