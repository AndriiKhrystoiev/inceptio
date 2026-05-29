import { DailyNoteResponseSchema } from '@inceptio/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the upstream search handler BEFORE importing the route. Tests below
// use vi.mocked() to control what each test scenario returns.
vi.mock('../routes/search', () => ({
  handleSearch: vi.fn(),
}));

import { handleDailyNote } from '../routes/daily-note';
import { handleSearch } from '../routes/search';
import { LIBRARY_VERSION } from '../translations/types';
import {
  envelope,
  excludedRange,
  factor,
  window_,
} from '../translations/__tests__/fixtures';

import type { Env } from '../env';

// ─── Test helpers ───

/** Tiny in-memory KV stub. Sufficient for the route's get/put surface. */
function makeKV() {
  const store = new Map<string, string>();
  return {
    store,
    namespace: {
      async get(key: string, type?: 'json' | 'text' | 'arrayBuffer' | 'stream') {
        const raw = store.get(key);
        if (raw === undefined) return null;
        if (type === 'json') return JSON.parse(raw);
        return raw;
      },
      async put(key: string, value: string, _opts?: { expirationTtl?: number }) {
        store.set(key, value);
      },
      async delete(key: string) {
        store.delete(key);
      },
    } as unknown as KVNamespace,
  };
}

function makeEnv(): { env: Env; store: Map<string, string> } {
  const { store, namespace } = makeKV();
  return {
    store,
    env: {
      CACHE: namespace,
      UPSTREAM_BASE_URL: 'https://upstream.test',
      WORKER_VERSION: 'test',
      ASTROLOGY_API_KEY: 'k',
      ENV: 'development',
    },
  };
}

/** Wrap a translated-envelope-shape object as a JSON Response. */
function searchResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function makeRequest(qs: string): Request {
  return new Request(`https://w.test/daily-note?${qs}`);
}

// ─── Tests ───

describe('handleDailyNote — error envelopes', () => {
  beforeEach(() => {
    vi.mocked(handleSearch).mockReset();
  });

  it('returns 400 when lat is missing', async () => {
    const { env } = makeEnv();
    const res = await handleDailyNote(makeRequest('lng=30.52&tz=UTC'), env);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('bad_request');
  });

  it('returns 400 when lng is missing', async () => {
    const { env } = makeEnv();
    const res = await handleDailyNote(makeRequest('lat=50.45&tz=UTC'), env);
    expect(res.status).toBe(400);
  });

  it('returns 400 when lat is non-numeric', async () => {
    const { env } = makeEnv();
    const res = await handleDailyNote(makeRequest('lat=xx&lng=30.52&tz=UTC'), env);
    expect(res.status).toBe(400);
  });

  it('returns 502 when upstream /electional/search fails', async () => {
    const { env } = makeEnv();
    vi.mocked(handleSearch).mockResolvedValue(
      new Response('upstream broke', { status: 500 }),
    );
    const res = await handleDailyNote(makeRequest('lat=50.45&lng=30.52&tz=UTC'), env);
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('upstream_failure');
  });

  it('returns 502 when upstream returns no top window', async () => {
    const { env } = makeEnv();
    vi.mocked(handleSearch).mockResolvedValue(
      searchResponse(envelope({ top_windows: [] })),
    );
    const res = await handleDailyNote(makeRequest('lat=50.45&lng=30.52&tz=UTC'), env);
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('no_top_window');
  });
});

describe('handleDailyNote — full response shape parses against DailyNoteResponseSchema', () => {
  beforeEach(() => {
    vi.mocked(handleSearch).mockReset();
  });

  it('cache miss: returns 200, runs picker, response parses cleanly', async () => {
    const { env } = makeEnv();
    vi.mocked(handleSearch).mockResolvedValue(searchResponse(envelope()));

    const res = await handleDailyNote(makeRequest('lat=50.45&lng=30.52&tz=UTC'), env);
    expect(res.status).toBe(200);
    const body = await res.json();

    const parsed = DailyNoteResponseSchema.safeParse(body);
    if (!parsed.success) {
      // eslint-disable-next-line no-console
      console.error('Zod failure:', parsed.error.issues);
    }
    expect(parsed.success).toBe(true);

    expect(parsed.success && parsed.data.library_version).toBe(LIBRARY_VERSION);
    expect(parsed.success && parsed.data.saved_searches).toEqual([]);
    expect(parsed.success && parsed.data.total_saved_count).toBe(0);

    expect((body as { cache_hit: boolean }).cache_hit).toBe(false);
    expect(vi.mocked(handleSearch)).toHaveBeenCalledTimes(1);
  });

  it('cache hit on second call with same inputs: same daily_note, picker not re-invoked', async () => {
    const { env } = makeEnv();
    vi.mocked(handleSearch).mockResolvedValue(searchResponse(envelope()));

    const first = await handleDailyNote(makeRequest('lat=50.45&lng=30.52&tz=UTC'), env);
    const firstBody = (await first.json()) as { cache_hit: boolean; daily_note: { headline: string } };
    expect(firstBody.cache_hit).toBe(false);

    const second = await handleDailyNote(makeRequest('lat=50.45&lng=30.52&tz=UTC'), env);
    const secondBody = (await second.json()) as { cache_hit: boolean; daily_note: { headline: string } };
    expect(secondBody.cache_hit).toBe(true);
    expect(secondBody.daily_note.headline).toBe(firstBody.daily_note.headline);

    // Only the first call should have invoked the upstream search.
    expect(vi.mocked(handleSearch)).toHaveBeenCalledTimes(1);
  });

  it('different (lat, lng) → different cache entries, picker invoked again', async () => {
    const { env } = makeEnv();
    // mockImplementation produces a fresh Response on each call — the
    // shared-resolved-value pattern fails on the second call because the
    // first call consumed the Response body via .json().
    vi.mocked(handleSearch).mockImplementation(async () => searchResponse(envelope()));

    await handleDailyNote(makeRequest('lat=50.45&lng=30.52&tz=UTC'), env);
    await handleDailyNote(makeRequest('lat=40.71&lng=-74.00&tz=UTC'), env);

    expect(vi.mocked(handleSearch)).toHaveBeenCalledTimes(2);
  });

  it('envelope fields present at top level: library_version, part_of_day_cutoffs', async () => {
    const { env } = makeEnv();
    vi.mocked(handleSearch).mockResolvedValue(searchResponse(envelope()));
    const res = await handleDailyNote(makeRequest('lat=50.45&lng=30.52&tz=UTC'), env);
    const body = (await res.json()) as {
      library_version: string;
      part_of_day_cutoffs: { morning_end_hour: number; afternoon_end_hour: number; evening_end_hour: number };
    };
    expect(body.library_version).toBe(LIBRARY_VERSION);
    expect(body.part_of_day_cutoffs.morning_end_hour).toBeGreaterThan(0);
    expect(body.part_of_day_cutoffs.afternoon_end_hour).toBeGreaterThan(body.part_of_day_cutoffs.morning_end_hour);
    expect(body.part_of_day_cutoffs.evening_end_hour).toBeGreaterThan(body.part_of_day_cutoffs.afternoon_end_hour);
  });
});

describe('handleDailyNote — daily-note quality buckets surfaced as mood', () => {
  beforeEach(() => {
    vi.mocked(handleSearch).mockReset();
  });

  it('strong bucket: score >= 75 with many PASS factors → mood: "strong"', async () => {
    const { env } = makeEnv();
    vi.mocked(handleSearch).mockResolvedValue(
      searchResponse(
        envelope({
          top_windows: [
            window_({
              score: 85,
              grade: 'strong',
              factors: [
                factor({ factor_id: 'venus_dignified_direct_well_aspected', status: 'pass', weight_class: 'high' }),
                factor({ factor_id: 'jupiter_angular_or_aspecting',         status: 'pass', weight_class: 'high' }),
                factor({ factor_id: 'mercury_dignified_direct_not_combust', status: 'pass', weight_class: 'medium' }),
                factor({ factor_id: 'moon_waxing_increasing_light',         status: 'pass', weight_class: 'medium' }),
                factor({ factor_id: 'no_malefic_on_angle',                  status: 'pass', weight_class: 'medium' }),
                factor({ factor_id: 'house_free_of_malefic',                status: 'pass', weight_class: 'low' }),
              ],
            }),
          ],
          excluded_ranges: [],
        }),
      ),
    );

    const res = await handleDailyNote(makeRequest('lat=50.45&lng=30.52&tz=UTC'), env);
    const body = (await res.json()) as { daily_note: { mood: string; entry_id: string; exclusion_reason?: string } };
    expect(body.daily_note.mood).toBe('strong');
    expect(body.daily_note.entry_id).toBe('strong-sky-is-clear');
    expect(body.daily_note.exclusion_reason).toBeUndefined();
  });

  it('good bucket: Venus-led top window → mood: "good", picks venus entry', async () => {
    const { env } = makeEnv();
    vi.mocked(handleSearch).mockResolvedValue(
      searchResponse(
        envelope({
          top_windows: [
            window_({
              score: 68,
              grade: 'fair',
              factors: [
                factor({
                  factor_id: 'venus_dignified_direct_well_aspected',
                  status: 'pass',
                  weight_class: 'high',
                  contribution: 18,
                }),
              ],
            }),
          ],
          excluded_ranges: [],
        }),
      ),
    );
    const res = await handleDailyNote(makeRequest('lat=50.45&lng=30.52&tz=UTC'), env);
    const body = (await res.json()) as { daily_note: { mood: string; entry_id: string } };
    expect(body.daily_note.mood).toBe('good');
    expect(body.daily_note.entry_id).toBe('good-venus-warm');
  });

  it('mixed bucket: score in 40..59 → mood: "mixed"', async () => {
    const { env } = makeEnv();
    vi.mocked(handleSearch).mockResolvedValue(
      searchResponse(
        envelope({
          top_windows: [
            window_({
              score: 50,
              grade: 'caution',
              factors: [
                factor({ factor_id: 'mercury_dignified_direct_not_combust', status: 'pass', weight_class: 'medium', contribution: 8 }),
              ],
            }),
          ],
          excluded_ranges: [],
        }),
      ),
    );
    const res = await handleDailyNote(makeRequest('lat=50.45&lng=30.52&tz=UTC'), env);
    const body = (await res.json()) as { daily_note: { mood: string } };
    expect(body.daily_note.mood).toBe('mixed');
  });

  it('closed bucket: Venus retrograde exclusion → mood: "closed", exclusion_reason set', async () => {
    const { env } = makeEnv();
    vi.mocked(handleSearch).mockResolvedValue(
      searchResponse(
        envelope({
          top_windows: [window_({ score: 60, grade: 'fair' })],
          excluded_ranges: [excludedRange({ reason_id: 'venus_retrograde' })],
        }),
      ),
    );
    const res = await handleDailyNote(makeRequest('lat=50.45&lng=30.52&tz=UTC'), env);
    const body = (await res.json()) as { daily_note: { mood: string; entry_id: string; exclusion_reason?: string } };
    expect(body.daily_note.mood).toBe('closed');
    expect(body.daily_note.entry_id).toBe('closed-venus-retrograde');
    expect(body.daily_note.exclusion_reason).toBe('venus_retrograde');
  });
});

describe('handleDailyNote — LIBRARY_VERSION-keyed atomic cache invalidation', () => {
  beforeEach(() => {
    vi.mocked(handleSearch).mockReset();
  });

  it('cache entries from a prior LIBRARY_VERSION are not hit; next fetch runs picker fresh', async () => {
    const { env, store } = makeEnv();

    // Seed the cache directly with an entry under a SIMULATED OLD LIBRARY_VERSION
    // key — the format matches keyOf() but uses a deliberately stale version
    // prefix. Per the contract §6 mechanism, the route's keyOf() embeds the
    // CURRENT LIBRARY_VERSION, so this stale entry can never be hit.
    const stalePrefix = 'daily-note:stale-version-from-before-an-astrologer-ruling';
    store.set(
      `${stalePrefix}:50.45:30.52:2026-05-29`,
      JSON.stringify({
        mood: 'good',
        moon_phase: 'full',
        date: '2026-05-29',
        headline: 'STALE_HEADLINE_THAT_MUST_NOT_LEAK',
        supporting: 'STALE_SUPPORTING_THAT_MUST_NOT_LEAK',
        entry_id: 'stale-entry-id',
        used_fallback: false,
      }),
    );

    // Mock upstream to return a fresh response under the current library version.
    vi.mocked(handleSearch).mockResolvedValue(searchResponse(envelope()));

    const res = await handleDailyNote(makeRequest('lat=50.45&lng=30.52&tz=UTC'), env);
    const body = (await res.json()) as {
      cache_hit: boolean;
      daily_note: { headline: string; supporting: string };
    };

    expect(body.cache_hit).toBe(false);
    expect(body.daily_note.headline).not.toBe('STALE_HEADLINE_THAT_MUST_NOT_LEAK');
    expect(body.daily_note.supporting).not.toBe('STALE_SUPPORTING_THAT_MUST_NOT_LEAK');
    // The stale entry remains untouched in the store (TTL handles it); we don't
    // explicitly evict.
    expect(store.has(`${stalePrefix}:50.45:30.52:2026-05-29`)).toBe(true);
    // Picker was invoked (cache miss against the current LIBRARY_VERSION key).
    expect(vi.mocked(handleSearch)).toHaveBeenCalledTimes(1);
  });

  it('after a fresh write, the same-version key hits cache; the stale-version key does not', async () => {
    const { env, store } = makeEnv();

    vi.mocked(handleSearch).mockResolvedValue(searchResponse(envelope()));
    await handleDailyNote(makeRequest('lat=50.45&lng=30.52&tz=UTC'), env);

    // After Task 17, the live cache key prefix includes the current LIBRARY_VERSION.
    const liveKey = Array.from(store.keys()).find((k) =>
      k.startsWith(`daily-note:${LIBRARY_VERSION}:50.45:30.52:`),
    );
    expect(liveKey).toBeDefined();

    // A key with any other version prefix would not match — confirm by adding
    // one and observing it doesn't suppress the cache_hit on the live key.
    store.set(
      `daily-note:other-version-12345:50.45:30.52:2026-05-29`,
      JSON.stringify({ headline: 'OTHER_VERSION_LEAK' }),
    );

    const second = await handleDailyNote(makeRequest('lat=50.45&lng=30.52&tz=UTC'), env);
    const body = (await second.json()) as { cache_hit: boolean; daily_note: { headline: string } };
    expect(body.cache_hit).toBe(true);
    expect(body.daily_note.headline).not.toBe('OTHER_VERSION_LEAK');
  });
});
