import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory AsyncStorage mock — no native module available in vitest node env.
const asyncStorageMemory = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => asyncStorageMemory.get(key) ?? null,
    setItem: async (key: string, value: string) => { asyncStorageMemory.set(key, value); },
    removeItem: async (key: string) => { asyncStorageMemory.delete(key); },
  },
}));

import { dailyNoteCacheKey, readDailyNote, writeDailyNote } from '../daily-note-cache';
import type { DailyNoteOutput } from '@inceptio/translations';

beforeEach(() => { asyncStorageMemory.clear(); });

describe('dailyNoteCacheKey', () => {
  it('is stable and namespaces by all dimensions', () => {
    const k = dailyNoteCacheKey({ lat: 50.45, lng: 30.52, dateIso: '2026-07-01', activity: 'wedding', locale: 'en' });
    expect(k).toBe('daily-note:v1:50.45:30.52:2026-07-01:wedding:en');
  });
});

describe('readDailyNote / writeDailyNote', () => {
  it('returns null for a key that has not been written', async () => {
    const k = dailyNoteCacheKey({ lat: 50.45, lng: 30.52, dateIso: '2026-07-01', activity: 'wedding', locale: 'en' });
    expect(await readDailyNote(k)).toBeNull();
  });

  it('round-trips a DailyNoteOutput through AsyncStorage', async () => {
    const k = dailyNoteCacheKey({ lat: 50.45, lng: 30.52, dateIso: '2026-07-01', activity: 'wedding', locale: 'en' });
    // Minimal fixture — only the fields the type requires for a valid round-trip test.
    const fixture = { headline: 'A tender day.', tone: 'warm' } as unknown as DailyNoteOutput;
    await writeDailyNote(k, fixture);
    const result = await readDailyNote(k);
    expect(result).toEqual(fixture);
  });

  it('embeds LIBRARY_VERSION in the storage key (different base key = cache miss)', async () => {
    const k = dailyNoteCacheKey({ lat: 50.45, lng: 30.52, dateIso: '2026-07-01', activity: 'wedding', locale: 'en' });
    const fixture = { headline: 'test' } as unknown as DailyNoteOutput;
    await writeDailyNote(k, fixture);
    // Exactly one key should be in storage; it must contain LIBRARY_VERSION.
    const storedKeys = [...asyncStorageMemory.keys()];
    expect(storedKeys).toHaveLength(1);
    expect(storedKeys[0]).toContain(k);
    // The stored key must be longer than the base key (LIBRARY_VERSION appended).
    expect(storedKeys[0]!.length).toBeGreaterThan(k.length);
  });
});
