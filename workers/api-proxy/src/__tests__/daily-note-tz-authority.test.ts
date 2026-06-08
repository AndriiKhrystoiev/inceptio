import { describe, it, expect, vi } from 'vitest';

// Stub the upstream search call so handleDailyNote returns synchronously.
// The tz authority behavior under test runs BEFORE this stub fires, so the
// stubbed response shape doesn't matter beyond being parseable.
// Must be hoisted above the route import (Vitest hoists vi.mock automatically).
// Each call gets a fresh Response — a single Response instance becomes unusable
// after .json() is called once (body stream consumed), so using mockResolvedValue
// with a static instance would fail on the 2nd+ test. Factory via mockImplementation
// creates a new Response per call.
vi.mock('../routes/search', () => ({
  handleSearch: vi.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          data: {
            top_windows: [{ score: 65, factors: [] }],
            excluded_ranges: [],
            summary: { no_viable_windows: false },
          },
        }),
        { headers: { 'content-type': 'application/json' } },
      ),
    ),
  ),
}));

import { handleDailyNote } from '../routes/daily-note';
import { COUNTER_TTL_SECONDS } from '../lib/kv-counter';

import type { Env } from '../env';

// ─── Test helpers ───
//
// Mirrors daily-note-kv-counter.test.ts exactly: vi.fn()-wrapped get/put/delete
// backed by a Map so both cache reads/writes AND call-arg assertions work.
// The plain-async-fn shape from daily-note-activity.test.ts cannot be used
// here because we need expect(env.CACHE.put).toHaveBeenCalledWith(...)
// to assert on the mismatch counter write.

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
    ADMIN_TOKEN: 'test-admin-token',
  };
  return { env, store, kv: namespace };
}

function makeRequest(qs: string, deviceId: string | null = 'test-device'): Request {
  const headers: Record<string, string> = {};
  if (deviceId !== null) headers['X-Device-Id'] = deviceId;
  return new Request(`https://w.test/daily-note?${qs}`, { headers });
}

// Awaitable ctx that surfaces waitUntil side-effects (counter writes, etc.)
// before assertions. The route's default NOOP_CTX would void promises — we
// need to drain them here. Pattern taken from daily-note-kv-counter.test.ts.
function makeCtx(): ExecutionContext {
  const pending: Promise<unknown>[] = [];
  return {
    waitUntil(p: Promise<unknown>) {
      pending.push(p);
    },
    passThroughOnException() {},
    props: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __pending: pending,
  } as unknown as ExecutionContext;
}

async function drain(ctx: ExecutionContext): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pending = (ctx as any).__pending as Promise<unknown>[];
  await Promise.all(pending);
}

// ─── Tests ───

describe('Worker tz authority', () => {
  // Test 1 — the core mismatch case.
  // Tokyo lat/lng but Berlin tz supplied: the Worker should derive Asia/Tokyo
  // from coordinates, detect the mismatch, emit a structured warn, and bump
  // the KV mismatch counter for the observability dashboard.
  it('warns + bumps counter when client tz mismatches lat/lng (Tokyo coords, Berlin tz)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { env } = makeEnv();
    const ctx = makeCtx();

    const res = await handleDailyNote(
      makeRequest('lat=35.68&lng=139.69&tz=Europe/Berlin&activity=wedding'),
      env,
      ctx,
    );
    await drain(ctx);

    expect(res.status).toBe(200);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[daily-note] tz_lat_lng_mismatch:'),
      expect.objectContaining({ got: 'Europe/Berlin', expected: 'Asia/Tokyo' }),
    );
    const today = new Date().toISOString().slice(0, 10);
    expect(env.CACHE.put).toHaveBeenCalledWith(
      `metrics:dn-tz-mismatch:${today}`,
      expect.any(String),
      expect.objectContaining({ expirationTtl: COUNTER_TTL_SECONDS }),
    );

    warn.mockRestore();
  });

  // Test 2 — no spurious warn when client tz matches derived tz.
  // Tokyo coords + Tokyo tz: no mismatch, no warn, no counter bump.
  it('does NOT warn when client tz matches lat/lng', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { env } = makeEnv();
    const ctx = makeCtx();

    const res = await handleDailyNote(
      makeRequest('lat=35.68&lng=139.69&tz=Asia/Tokyo&activity=wedding'),
      env,
      ctx,
    );
    await drain(ctx);

    expect(res.status).toBe(200);
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining('tz_lat_lng_mismatch'),
      expect.anything(),
    );

    warn.mockRestore();
  });

  // Test 3 — when tz is omitted entirely the route already defaults to UTC;
  // there is no "client supplied" tz to mismatch against, so no warn should
  // fire. Guards against accidentally triggering the mismatch path on legacy
  // clients that don't send a tz param.
  it('does NOT warn when client omitted tz query param entirely', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { env } = makeEnv();
    const ctx = makeCtx();

    const res = await handleDailyNote(
      makeRequest('lat=35.68&lng=139.69&activity=wedding'),
      env,
      ctx,
    );
    await drain(ctx);

    expect(res.status).toBe(200);
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining('tz_lat_lng_mismatch'),
      expect.anything(),
    );

    warn.mockRestore();
  });

  // Test 4 — invalid coords (lat=91, lng=0) that make @photostructure/tz-lookup
  // throw 'invalid coordinates'. The wrapper must return null and the Worker must
  // fall back to the client-supplied tz gracefully without warning about a
  // mismatch — the derivation simply failed. The critical assertion is that the
  // request succeeds (no 500).
  it('falls back to client tz when tzLookup throws (invalid out-of-range coords)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { env } = makeEnv();
    const ctx = makeCtx();

    const res = await handleDailyNote(
      makeRequest('lat=91&lng=0&tz=Europe/Berlin&activity=wedding'),
      env,
      ctx,
    );
    await drain(ctx);

    expect(res.status).toBe(200);
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining('tz_lat_lng_mismatch'),
      expect.anything(),
    );

    warn.mockRestore();
  });
});

describe('Worker tz authority — alias-equivalent zones', () => {
  it('does NOT warn when clientTz is a legacy alias of derivedTz (Kiev vs Kyiv)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { env } = makeEnv();
    const ctx = makeCtx();
    // Kharkiv coords (49.83, 36.38) → tz-lookup returns canonical 'Europe/Kyiv'.
    // Client sent the legacy 'Europe/Kiev' (pre-tzdata-2022b name). Same zone.
    const res = await handleDailyNote(
      makeRequest('lat=49.83&lng=36.38&tz=Europe/Kiev&activity=wedding'),
      env,
      ctx,
    );
    // drain so the dn-total waitUntil completes BEFORE we assert it was bumped —
    // proves the request reached the observability path (i.e. this isn't a
    // trivial pass from an early 4xx/5xx).
    await drain(ctx);

    expect(res.status).toBe(200);
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining('tz_lat_lng_mismatch'),
      expect.anything(),
    );
    // Counter must NOT have been bumped — no metrics:dn-tz-mismatch:* put.
    const tzMismatchPuts = vi
      .mocked(env.CACHE.put)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mock.calls.filter((call: any[]) => typeof call[0] === 'string' && call[0].startsWith('metrics:dn-tz-mismatch:'));
    expect(tzMismatchPuts).toHaveLength(0);
    // BUT dn-total must have been bumped — proves the request reached the
    // observability path and the no-tz-mismatch is a real signal, not an
    // accident of an early-return short-circuit.
    const today = new Date().toISOString().slice(0, 10);
    expect(env.CACHE.put).toHaveBeenCalledWith(
      `metrics:dn-total:${today}`,
      expect.any(String),
      expect.objectContaining({ expirationTtl: COUNTER_TTL_SECONDS }),
    );
    warn.mockRestore();
  });

  it('still warns for a GENUINE cross-location mismatch (Tokyo coords + Berlin tz)', async () => {
    // Sanity guard: the alias-aware fix must not silence real cross-location errors.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { env } = makeEnv();
    const ctx = makeCtx();
    const res = await handleDailyNote(
      makeRequest('lat=35.68&lng=139.69&tz=Europe/Berlin&activity=wedding'),
      env,
      ctx,
    );
    // drain so the dn-tz-mismatch waitUntil counter write completes BEFORE
    // we assert it. Without this the test silently regresses if someone
    // wraps the bumpCounter call in a condition that doesn't fire — the
    // warn would still appear (synchronous) but the counter would not.
    await drain(ctx);

    expect(res.status).toBe(200);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[daily-note] tz_lat_lng_mismatch:'),
      expect.objectContaining({ got: 'Europe/Berlin', expected: 'Asia/Tokyo' }),
    );
    const today = new Date().toISOString().slice(0, 10);
    expect(env.CACHE.put).toHaveBeenCalledWith(
      `metrics:dn-tz-mismatch:${today}`,
      expect.any(String),
      expect.objectContaining({ expirationTtl: COUNTER_TTL_SECONDS }),
    );
    warn.mockRestore();
  });
});
