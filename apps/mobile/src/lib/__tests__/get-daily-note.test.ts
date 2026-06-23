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

import { getDailyNote, ServerError } from '../api';

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

  it('serves the second call from AsyncStorage cache (fetch called once)', async () => {
    // Each getDailyNote call gets fresh vi.restoreAllMocks in beforeEach,
    // but within this test we want a persistent spy across two calls.
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(searchFixture), { status: 200 }),
    );

    const input = { lat: 50.45, lng: 30.52, tz: 'Europe/Kyiv', activity: 'wedding' } as const;

    const first = await getDailyNote(input);
    // Second call — formatDateInTz collapses to the same calendar day within a
    // test run, so the cache key matches and fetch is NOT called again.
    const second = await getDailyNote(input);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(second.cacheHit).toBe(true);
    // Both calls must produce valid daily notes.
    expect(first.response.daily_note).toBeTruthy();
    expect(second.response.daily_note).toBeTruthy();
  });

  it('throws ServerError when the envelope contains no windows and no exclusions', async () => {
    // Build a minimal valid ApiEnvelopeSchema body with an empty data payload
    // (top_windows: [], excluded_ranges: [], no_viable_windows: true).
    // Mirrors the metadata block from search-200.json so MetadataSchema passes.
    const emptyEnvelope = {
      success: true,
      data: {
        activity: 'wedding',
        house_system: 'P',
        search_window: {},
        summary: {
          total_candidates_evaluated: 0,
          viable_windows_count: 0,
          excluded_ranges_count: 0,
          best_score: 0,
          best_grade: 'poor',
          no_viable_windows: true,
          quality_advisory: null,
        },
        heatmap: [],
        top_windows: [],
        excluded_ranges: [],
      },
      metadata: {
        timestamp: '2026-06-23T11:18:33.754796Z',
        calculation_time_ms: 100,
        api_version: '3.2.0',
        endpoint: 'electional.search',
        request_id: 'req_test_502',
        cache_hit: false,
        cache_age_seconds: null,
        credits_used: 5,
        server_location: null,
        calculation_method: null,
      },
      warnings: null,
      pagination: null,
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(emptyEnvelope), { status: 200 }),
    );

    await expect(
      getDailyNote({ lat: 50.45, lng: 30.52, tz: 'Europe/Kyiv', activity: 'wedding' }),
    ).rejects.toBeInstanceOf(ServerError);
  });
});
