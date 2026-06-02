import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the upstream search handler BEFORE importing the route so the route's
// in-process /electional/search fan-out is intercepted. Same pattern as
// daily-note-activity.test.ts and daily-note-route.test.ts.
vi.mock('../routes/search', () => ({
  handleSearch: vi.fn(),
}));

import { handleDailyNote } from '../routes/daily-note';
import { handleSearch } from '../routes/search';
import { envelope, excludedRange } from '../translations/__tests__/fixtures';

import type { Env } from '../env';

// ─── Test helpers (mirrors daily-note-activity.test.ts) ───

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

function searchResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function makeRequest(qs: string, deviceId: string | null = 'test-device'): Request {
  const headers: Record<string, string> = {};
  if (deviceId !== null) headers['X-Device-Id'] = deviceId;
  return new Request(`https://w.test/daily-note?${qs}`, { headers });
}

// ─── Phase A end-to-end test ───
//
// Goal: prove the FULL Phase A activity-fallback chain works end-to-end.
//
// A request arrives at /daily-note WITHOUT ?activity=. The route should:
//   1. Log `[daily-note] activity missing, defaulting to business_launch`
//      (Task 2.2's route-level warn).
//   2. Substitute `business_launch` as the activity for the upstream fan-out.
//   3. Drive the picker (via a forced moon_voc + no_viable_windows upstream
//      response) to select the asymmetric `closed-moon-voc` entry.
//   4. Have the composer log
//      `[daily-note] severity-hint composed with fallback activity` with
//      `fallback_activity: 'business_launch'` (Task 2.4's composer warn).
//   5. Render the `business_launch` × `moon_voc` severity_hint in the
//      response payload (voice spec §12.4 — "For a launch, the announcement
//      made today tends to land softly or get reshuffled later...").
//
// Both warns must fire; status must be 200; severity_hint must be present.
// This is the single integration point that proves Tasks 2.2 + 2.4 wired
// correctly — the unit tests for each task cover their layer in isolation.

describe('Phase A fallback — end-to-end', () => {
  beforeEach(() => {
    vi.mocked(handleSearch).mockReset();
  });

  it('missing activity + asymmetric (moon_voc) entry → both warns fire + severity_hint composed', async () => {
    const { env } = makeEnv();

    // Force the picker into the closed-moon-voc branch:
    //   - top_windows: []                       (no viable elections)
    //   - excluded_ranges: [moon_voc]           (named exclusion)
    //   - summary.no_viable_windows: true       (authoritative closed signal)
    // Per quality-bucket.ts, this yields bucket='closed'; per picker.ts
    // REASON_TO_ENTRY, moon_voc maps to entry_id='closed-moon-voc' — which
    // composer.ts ENTRY_TO_CONDITION maps to SeverityCondition='moon_voc'.
    vi.mocked(handleSearch).mockResolvedValue(
      searchResponse(
        envelope({
          top_windows: [],
          excluded_ranges: [excludedRange({ reason_id: 'moon_voc' })],
          summary: {
            total_candidates_evaluated: 168,
            viable_windows_count: 0,
            excluded_ranges_count: 1,
            best_score: 0,
            best_grade: 'poor',
            no_viable_windows: true,
            quality_advisory: null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- partial summary; runtime guarded by handleSearch's Zod parse
          } as any,
        }),
      ),
    );

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      // NOTE: deliberately NO `activity=` query param. Triggers the
      // Phase A route-level fallback to business_launch.
      const res = await handleDailyNote(
        makeRequest('lat=50.45&lng=30.52&tz=Europe/Kyiv'),
        env,
      );

      expect(res.status).toBe(200);

      // (1) Route-level warn — Task 2.2.
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          '[daily-note] activity missing, defaulting to business_launch',
        ),
      );

      // (2) Composer-level warn — Task 2.4. Asserts the object payload too:
      // the diagnostic only fires when BOTH (a) an asymmetric condition
      // matched AND (b) wasActivityFallback was true. The fallback_activity
      // field pins the fallback choice so a future change to a different
      // default (or no default) trips this assertion loudly.
      expect(warn).toHaveBeenCalledWith(
        '[daily-note] severity-hint composed with fallback activity:',
        expect.objectContaining({
          condition: 'moon_voc',
          fallback_activity: 'business_launch',
        }),
      );

      // (3) Response carries the business_launch × moon_voc severity_hint.
      // The substring 'reshuffled' is unique to the business_launch entry
      // (voice spec §12.4) — using it as the assertion pins the activity-
      // specific dictionary lookup, not just "any hint was rendered".
      const body = (await res.json()) as {
        daily_note: {
          entry_id: string;
          mood: string;
          severity_hint?: string;
        };
      };
      expect(body.daily_note.entry_id).toBe('closed-moon-voc');
      expect(body.daily_note.mood).toBe('closed');
      expect(body.daily_note.severity_hint).toBeDefined();
      expect(body.daily_note.severity_hint).toMatch(/reshuffled/i);
    } finally {
      warn.mockRestore();
    }
  });
});
