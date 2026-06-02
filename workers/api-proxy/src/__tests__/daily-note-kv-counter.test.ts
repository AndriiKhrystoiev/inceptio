import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the upstream search handler BEFORE importing the route so the route's
// in-process /electional/search fan-out is intercepted. Same pattern as
// daily-note-activity.test.ts and daily-note-phase-a-fallback.test.ts.
vi.mock('../routes/search', () => ({
  handleSearch: vi.fn(),
}));

import { handleDailyNote } from '../routes/daily-note';
import { handleSearch } from '../routes/search';
import { envelope } from '../translations/__tests__/fixtures';

import type { Env } from '../env';

// ─── Test helpers ───
//
// Diverges slightly from the sibling makeKV() helper: this test asserts on
// CACHE.put call args (which keys/options the counter writes), so we expose
// `get` and `put` as vi.fn() mocks while still backing them with a Map so
// the route's existing cache reads/writes behave normally. The sibling
// helpers use plain async fns and surface only the Map — fine for them
// (they assert on response shape, not on KV call args), but we need
// expect(env.CACHE.put).toHaveBeenCalledWith(...) here.

function makeKV() {
  const store = new Map<string, string>();
  const get = vi.fn(async (key: string, type?: 'json' | 'text' | 'arrayBuffer' | 'stream') => {
    const raw = store.get(key);
    if (raw === undefined) return null;
    if (type === 'json') return JSON.parse(raw);
    return raw;
  });
  const put = vi.fn(
    async (key: string, value: string, _opts?: { expirationTtl?: number }) => {
      store.set(key, value);
    },
  );
  const del = vi.fn(async (key: string) => {
    store.delete(key);
  });
  return {
    store,
    namespace: {
      get,
      put,
      delete: del,
    } as unknown as KVNamespace & {
      get: typeof get;
      put: typeof put;
      delete: typeof del;
    },
  };
}

function makeEnv() {
  const { store, namespace } = makeKV();
  const env: Env = {
    CACHE: namespace,
    UPSTREAM_BASE_URL: 'https://upstream.test',
    WORKER_VERSION: 'test',
    ASTROLOGY_API_KEY: 'k',
    ENV: 'development',
  };
  return { env, store, kv: namespace };
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

// Minimal ExecutionContext mock that awaits the waitUntil promise so KV.put
// is observable in test assertions. Production ctx.waitUntil just extends
// the Worker lifetime; in tests we need to surface the side effect
// synchronously (well, by the time the route returns) for the assertion.
function makeCtx(): ExecutionContext {
  const pending: Promise<unknown>[] = [];
  return {
    waitUntil(p: Promise<unknown>) {
      pending.push(p);
    },
    passThroughOnException() {
      // no-op for tests
    },
    // Exposed so individual tests can await pending promises before assertions.
    // Not part of the real ExecutionContext interface.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __pending: pending,
  } as unknown as ExecutionContext;
}

async function drain(ctx: ExecutionContext): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pending = (ctx as any).__pending as Promise<unknown>[];
  await Promise.all(pending);
}

// 14 days in seconds — must match COUNTER_TTL_SECONDS in daily-note.ts.
const COUNTER_TTL_SECONDS = 14 * 86400;

// ─── Tests ───

describe('Phase A KV counter — metrics:dn-total + metrics:dn-activity-missing', () => {
  beforeEach(() => {
    vi.mocked(handleSearch).mockReset();
    vi.mocked(handleSearch).mockResolvedValue(searchResponse(envelope()));
  });

  it('missing activity → increments dn-total AND dn-activity-missing for today', async () => {
    const { env } = makeEnv();
    const ctx = makeCtx();
    // Silence the Task 2.2 route-level warn so test output stays clean.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const res = await handleDailyNote(
        makeRequest('lat=50.45&lng=30.52&tz=Europe/Kyiv'),
        env,
        ctx,
      );
      await drain(ctx);

      expect(res.status).toBe(200);
      const today = new Date().toISOString().slice(0, 10);
      expect(env.CACHE.put).toHaveBeenCalledWith(
        `metrics:dn-total:${today}`,
        expect.any(String),
        expect.objectContaining({ expirationTtl: COUNTER_TTL_SECONDS }),
      );
      expect(env.CACHE.put).toHaveBeenCalledWith(
        `metrics:dn-activity-missing:${today}`,
        expect.any(String),
        expect.objectContaining({ expirationTtl: COUNTER_TTL_SECONDS }),
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('present activity → increments ONLY dn-total (not dn-activity-missing)', async () => {
    const { env } = makeEnv();
    const ctx = makeCtx();

    const res = await handleDailyNote(
      makeRequest('lat=50.45&lng=30.52&tz=Europe/Kyiv&activity=wedding'),
      env,
      ctx,
    );
    await drain(ctx);

    expect(res.status).toBe(200);
    const today = new Date().toISOString().slice(0, 10);
    expect(env.CACHE.put).toHaveBeenCalledWith(
      `metrics:dn-total:${today}`,
      expect.any(String),
      expect.objectContaining({ expirationTtl: COUNTER_TTL_SECONDS }),
    );
    // Critical negative assertion: when the client supplies a valid activity
    // we MUST NOT touch the activity-missing counter — otherwise the rolling
    // rate metric is meaningless. Iterates over actual call args (not
    // expect.not.toHaveBeenCalledWith, which is fragile with vi.fn).
    const missingCalls = vi
      .mocked(env.CACHE.put)
      .mock.calls.filter((c) => String(c[0]).startsWith('metrics:dn-activity-missing:'));
    expect(missingCalls).toHaveLength(0);
  });

  it('counter resets to 1 when KV value is corrupted (NaN guard)', async () => {
    // Regression guard for the Phase-2 NaN-guard fix. If `bumpCounter`
    // ever reads a non-numeric string from KV (e.g. an earlier corrupt
    // write left a literal 'NaN' on disk), it MUST reset to 1 rather
    // than write 'NaN' back — otherwise the counter would stay poisoned
    // for the full 14-day TTL window. We pre-populate the key with
    // 'NaN', fire a normal request, drain the best-effort waitUntil,
    // and assert the key is now '1'.
    const { env } = makeEnv();
    const ctx = makeCtx();
    const today = new Date().toISOString().slice(0, 10);
    await env.CACHE.put(`metrics:dn-total:${today}`, 'NaN');

    const res = await handleDailyNote(
      makeRequest('lat=50.45&lng=30.52&tz=Europe/Kyiv&activity=wedding'),
      env,
      ctx,
    );
    await drain(ctx);

    expect(res.status).toBe(200);
    const after = await env.CACHE.get(`metrics:dn-total:${today}`);
    expect(after).toBe('1');
  });

  it('counter increments are best-effort (KV failure does not 5xx the request)', async () => {
    const { env } = makeEnv();
    const ctx = makeCtx();
    // Make ONLY metric-key writes throw — the daily-note cache write
    // (`daily-note:...`) is still required to succeed because writeCache
    // doesn't (and shouldn't) swallow its own failures. The test pins the
    // narrower contract: a KV outage on the metric counter MUST NOT bubble
    // up and 5xx the user's daily-note request. Pass-through delegates to
    // the underlying store so the cache write still works.
    const realPut = vi.mocked(env.CACHE.put).getMockImplementation()!;
    vi.mocked(env.CACHE.put).mockImplementation(async (key, value, opts) => {
      if (String(key).startsWith('metrics:')) {
        throw new Error('KV outage');
      }
      return realPut(key, value, opts);
    });

    const res = await handleDailyNote(
      makeRequest('lat=50.45&lng=30.52&tz=Europe/Kyiv&activity=wedding'),
      env,
      ctx,
    );
    // Drain best-effort writes — they throw internally but must not surface.
    await drain(ctx);

    expect(res.status).toBe(200);
  });
});
