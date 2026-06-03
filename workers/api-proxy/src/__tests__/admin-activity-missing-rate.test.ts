import { describe, it, expect } from 'vitest';

import { handleActivityMissingRate } from '../routes/admin';

import type { Env } from '../env';

// ─── Test helpers ───
//
// Mirrors the makeKV pattern in daily-note-activity.test.ts: a Map-backed
// in-memory KV namespace so reads/writes round-trip naturally. The admin
// route only ever calls `kv.get`, so the put implementation is only used
// by the test setup itself when seeding day-counter values.

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

function makeAdminEnv(): { env: Env; store: Map<string, string> } {
  const { store, namespace } = makeKV();
  return {
    store,
    env: {
      CACHE: namespace,
      UPSTREAM_BASE_URL: 'https://upstream.test',
      WORKER_VERSION: 'test',
      ASTROLOGY_API_KEY: 'k',
      ENV: 'development',
      ADMIN_TOKEN: 'test-secret-token',
    },
  };
}

function makeReq(token?: string): Request {
  const headers = new Headers();
  if (token !== undefined) headers.set('x-admin-token', token);
  return new Request('https://w.test/admin/activity-missing-rate', {
    method: 'GET',
    headers,
  });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Tests ───

type DayRow = {
  date: string;
  total: number;
  missing: number;
  tz_mismatch: number;
  missing_ratio: number;
  tz_mismatch_ratio: number;
};

describe('GET /admin/activity-missing-rate', () => {
  it('401 when x-admin-token header is missing', async () => {
    const { env } = makeAdminEnv();
    const res = await handleActivityMissingRate(makeReq(), env);
    expect(res.status).toBe(401);
    expect(await res.text()).toBe('unauthorized');
  });

  it('401 when x-admin-token does not match secret', async () => {
    const { env } = makeAdminEnv();
    const res = await handleActivityMissingRate(makeReq('wrong-token'), env);
    expect(res.status).toBe(401);
  });

  it('200 with valid token + empty KV → 14 days of zeros', async () => {
    const { env } = makeAdminEnv();
    const res = await handleActivityMissingRate(makeReq('test-secret-token'), env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { days: DayRow[] };
    expect(body.days).toHaveLength(14);
    body.days.forEach((d) => {
      expect(d.total).toBe(0);
      expect(d.missing).toBe(0);
      expect(d.tz_mismatch).toBe(0);
      expect(d.missing_ratio).toBe(0);
      expect(d.tz_mismatch_ratio).toBe(0);
      expect(d.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('200 with populated KV → computes ratio correctly per day', async () => {
    const { env } = makeAdminEnv();
    const today = todayIso();
    await env.CACHE.put(`metrics:dn-total:${today}`, '1000');
    await env.CACHE.put(`metrics:dn-activity-missing:${today}`, '3');

    const res = await handleActivityMissingRate(makeReq('test-secret-token'), env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { days: DayRow[] };
    const todayEntry = body.days.find((d) => d.date === today);
    expect(todayEntry).toBeDefined();
    expect(todayEntry!.total).toBe(1000);
    expect(todayEntry!.missing).toBe(3);
    expect(todayEntry!.missing_ratio).toBe(0.003);
  });

  it('200 with corrupted KV value → treats as 0 (NaN guard)', async () => {
    // Regression guard: matches the bumpCounter NaN guard on the
    // write side. A legacy corrupt key MUST be coerced to 0 here,
    // not surfaced as NaN in the JSON body (which would JSON.stringify
    // to `null` and quietly break operator math).
    const { env } = makeAdminEnv();
    const today = todayIso();
    await env.CACHE.put(`metrics:dn-total:${today}`, 'NaN');

    const res = await handleActivityMissingRate(makeReq('test-secret-token'), env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { days: DayRow[] };
    const todayEntry = body.days.find((d) => d.date === today);
    expect(todayEntry!.total).toBe(0);
    expect(todayEntry!.missing_ratio).toBe(0);
  });

  it('days are returned newest first (today at index 0)', async () => {
    const { env } = makeAdminEnv();
    const res = await handleActivityMissingRate(makeReq('test-secret-token'), env);
    const body = (await res.json()) as { days: DayRow[] };
    expect(body.days[0]?.date).toBe(todayIso());
    // And the last entry is 13 days ago — gives a 14-day window
    // matching the COUNTER_TTL_SECONDS rolling-window contract.
    const thirteenDaysAgo = new Date();
    thirteenDaysAgo.setUTCDate(thirteenDaysAgo.getUTCDate() - 13);
    expect(body.days[13]?.date).toBe(thirteenDaysAgo.toISOString().slice(0, 10));
  });

  it('surfaces tz_mismatch counter alongside missing counter', async () => {
    const { env } = makeAdminEnv();
    const today = todayIso();
    await env.CACHE.put(`metrics:dn-total:${today}`, '1000');
    await env.CACHE.put(`metrics:dn-activity-missing:${today}`, '3');
    await env.CACHE.put(`metrics:dn-tz-mismatch:${today}`, '12');
    const res = await handleActivityMissingRate(makeReq('test-secret-token'), env);
    const body = (await res.json()) as { days: DayRow[] };
    const todayEntry = body.days.find((d) => d.date === today);
    expect(todayEntry!.total).toBe(1000);
    expect(todayEntry!.missing).toBe(3);
    expect(todayEntry!.tz_mismatch).toBe(12);
    expect(todayEntry!.missing_ratio).toBeCloseTo(0.003, 6);
    expect(todayEntry!.tz_mismatch_ratio).toBeCloseTo(0.012, 6);
  });
});
