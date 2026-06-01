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
import { envelope, excludedRange } from '../translations/__tests__/fixtures';
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

  it('no-viable-windows day (e.g. Moon void) returns 200 with closed-bucket entry, NOT 502', async () => {
    // Real upstream response when today is a Moon void-of-course day:
    // top_windows: [], excluded_ranges: [moon_voc], no_viable_windows: true.
    // The 2026-06-01 Kyiv response that surfaced the original bug had this
    // exact shape — see Image 3 in the user's diagnostic. The picker's
    // branch 1 ("closed by exclusion") fires on the reason_id; the route
    // must synthesize a placeholder topWindow so the picker can run.
    //
    // The translations/fixtures `noViableResponse` is named misleadingly —
    // it actually ships one caution-graded window. We construct the real
    // moon-void shape inline.
    vi.mocked(callUpstream).mockResolvedValue(
      envelope({
        top_windows: [],
        excluded_ranges: [excludedRange({ reason_id: 'moon_voc' })],
      }),
    );

    const { env } = makeEnv();
    const req = new Request('https://w/daily-note?lat=50.45&lng=30.52&tz=Europe%2FKyiv', {
      headers: { 'X-Device-Id': 'test-device' },
    });
    const res = await handleDailyNote(req, env);

    // The assertion that catches the no-top-window-but-exclusions bug.
    // A 502 here means the route bailed instead of letting the picker take
    // the closed-bucket path.
    expect(res.status).toBe(200);

    const body = (await res.json()) as { daily_note: { mood: string; entry_id: string; exclusion_reason?: string } };
    expect(body.daily_note.mood).toBe('closed');
    expect(body.daily_note.exclusion_reason).toBe('moon_voc');
    expect(body.daily_note.entry_id).toBe('closed-moon-voc');
  });

  it('genuine no-data case (no top window AND no exclusions) still returns 502', async () => {
    // Edge: upstream returns a response with no top_windows and no
    // excluded_ranges. Nothing for the picker to work with — 502 is
    // correct.
    vi.mocked(callUpstream).mockResolvedValue(
      envelope({ top_windows: [], excluded_ranges: [], summary: {
        total_candidates_evaluated: 0,
        viable_windows_count: 0,
        excluded_ranges_count: 0,
        best_score: 0,
        best_grade: 'poor',
        no_viable_windows: true,
        quality_advisory: null,
      } as any })
    );

    const { env } = makeEnv();
    const req = new Request('https://w/daily-note?lat=50.45&lng=30.52&tz=Europe%2FKyiv', {
      headers: { 'X-Device-Id': 'test-device' },
    });
    const res = await handleDailyNote(req, env);

    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('no_top_window');
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

  // ─── Dev/demo date override ───
  // Lets developers and demo recorders see strong/good/mixed/closed days
  // without waiting for them to occur. Gated on env.ENV !== 'production'.

  it('dev env + ?date= override: response.daily_note.date matches the override', async () => {
    vi.mocked(callUpstream).mockResolvedValue(envelope());

    const { env } = makeEnv(); // ENV: 'development'
    const req = new Request(
      'https://w/daily-note?lat=50.45&lng=30.52&tz=Europe%2FKyiv&date=2026-08-15',
      { headers: { 'X-Device-Id': 'test-device' } },
    );
    const res = await handleDailyNote(req, env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { daily_note: { date: string } };
    expect(body.daily_note.date).toBe('2026-08-15');
  });

  it('production env + ?date= override: override is SILENTLY ignored, response uses computed today', async () => {
    vi.mocked(callUpstream).mockResolvedValue(envelope());

    const { env } = makeEnv();
    env.ENV = 'production'; // production never honors the override
    const req = new Request(
      'https://w/daily-note?lat=50.45&lng=30.52&tz=Europe%2FKyiv&date=1999-01-01',
      { headers: { 'X-Device-Id': 'test-device' } },
    );
    const res = await handleDailyNote(req, env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { daily_note: { date: string } };
    // 1999-01-01 is clearly not today; whatever the response date is, it
    // must NOT be the override value — production computed-today wins.
    expect(body.daily_note.date).not.toBe('1999-01-01');
    expect(body.daily_note.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('dev env + malformed ?date= override: returns 400 with format error', async () => {
    // No upstream mock needed — the route fails fast on format validation.
    const { env } = makeEnv();
    const req = new Request(
      'https://w/daily-note?lat=50.45&lng=30.52&tz=Europe%2FKyiv&date=not-a-date',
      { headers: { 'X-Device-Id': 'test-device' } },
    );
    const res = await handleDailyNote(req, env);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('bad_request');
    expect(body.message).toMatch(/YYYY-MM-DD/);
  });
});
