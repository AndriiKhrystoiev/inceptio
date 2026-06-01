// End-to-end test for /daily-note that exercises the REAL handleSearch path.
//
// Unlike daily-note-route.test.ts (which mocks handleSearch entirely via
// vi.mock('../routes/search', ...)), this file mocks at the upstream
// boundary — callUpstream — so the route's full pipeline runs against real
// code: internal Request construction, ElectionalSearchRequestSchema Zod
// validation in handleSearch, translate(), cache write, response composition.
//
// Why this exists. daily-note-route.test.ts's handleSearch mock masked a real
// defect in the route's internal fan-out body: it used latitude/longitude/
// date_from/date_to instead of the schema-required lat/lng/start/end (also
// missing city). The mock returned a canned envelope regardless of what
// searchBody contained, so the schema mismatch never surfaced — the route
// silently 502'd on every live call. This file is the regression guard:
// future field-shape drift in the internal search body fails LOUDLY here
// because handleSearch's real Zod parse runs.

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the upstream module BEFORE importing the route. The route → handleSearch
// → callUpstream chain runs real except for the final HTTP boundary.
vi.mock('../upstream', () => ({
  callUpstream: vi.fn(),
  UpstreamError: class UpstreamError extends Error {
    constructor(message: string, public readonly status: number) {
      super(message);
    }
  },
}));

import { handleDailyNote } from '../routes/daily-note';
import { callUpstream } from '../upstream';
import { envelope } from '../translations/__tests__/fixtures';
import type { Env } from '../env';

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
      ASTROLOGY_API_KEY: 'test-key',
      ENV: 'development',
    },
  };
}

describe('handleDailyNote — e2e against real handleSearch (regression guard)', () => {
  beforeEach(() => {
    vi.mocked(callUpstream).mockReset();
  });

  it('returns 200 with valid DailyNoteResponseShape when upstream provides a real envelope', async () => {
    vi.mocked(callUpstream).mockResolvedValue(envelope());

    const { env } = makeEnv();
    const req = new Request('https://w/daily-note?lat=50.45&lng=30.52&tz=Europe%2FKyiv', {
      headers: { 'X-Device-Id': 'test-device' },
    });
    const res = await handleDailyNote(req, env);

    // The assertion that catches the field-name bug. A 502 here means
    // handleSearch's Zod parse rejected the internal request body.
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      daily_note: { mood: string; headline: string; moon_phase: string };
      saved_searches: unknown[];
      library_version: string;
      part_of_day_cutoffs: unknown;
    };

    expect(body.daily_note).toBeDefined();
    expect(body.daily_note.mood).toMatch(/^(strong|good|mixed|closed)$/);
    expect(body.daily_note.headline.length).toBeGreaterThan(0);
    expect(body.daily_note.moon_phase).toBeDefined();
    expect(body.saved_searches).toEqual([]);
    expect(body.library_version).toBeDefined();
    expect(body.part_of_day_cutoffs).toBeDefined();
  });

  it('calls callUpstream with a correctly-shaped ElectionalSearchRequest (lat/lng/start/end/city/timezone/activity)', async () => {
    vi.mocked(callUpstream).mockResolvedValue(envelope());

    const { env } = makeEnv();
    const req = new Request('https://w/daily-note?lat=50.45&lng=30.52&tz=Europe%2FKyiv', {
      headers: { 'X-Device-Id': 'test-device' },
    });
    await handleDailyNote(req, env);

    expect(vi.mocked(callUpstream)).toHaveBeenCalledTimes(1);
    const [, calledReq] = vi.mocked(callUpstream).mock.calls[0]!;

    // The whole point of this test class: verify the internal request body
    // has the schema-required field NAMES, not the original wrong ones.
    expect(calledReq).toMatchObject({
      activity: 'business_launch',
      lat: expect.any(Number),
      lng: expect.any(Number),
      start: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      end: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      timezone: 'Europe/Kyiv',
      city: expect.any(String),
    });

    // Forbidden old field names from the pre-patch draft. These MUST be
    // absent from any future regression too.
    expect(calledReq).not.toHaveProperty('latitude');
    expect(calledReq).not.toHaveProperty('longitude');
    expect(calledReq).not.toHaveProperty('date_from');
    expect(calledReq).not.toHaveProperty('date_to');
  });

  it('cache miss persists DailyNoteOutput so a second call hits cache without re-invoking upstream', async () => {
    vi.mocked(callUpstream).mockResolvedValue(envelope());

    const { env } = makeEnv();
    const req = new Request('https://w/daily-note?lat=50.45&lng=30.52&tz=Europe%2FKyiv', {
      headers: { 'X-Device-Id': 'test-device' },
    });

    const first = await handleDailyNote(req, env);
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as { cache_hit?: boolean };
    expect(firstBody.cache_hit).toBe(false);

    const second = await handleDailyNote(req, env);
    expect(second.status).toBe(200);
    const secondBody = (await second.json()) as { cache_hit?: boolean };
    expect(secondBody.cache_hit).toBe(true);

    // Only the first call invoked the upstream — the cache served the second.
    expect(vi.mocked(callUpstream)).toHaveBeenCalledTimes(1);
  });
});
