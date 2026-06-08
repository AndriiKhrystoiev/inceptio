import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSearch } from '../routes/search';
import { quotaKey } from '../rate-limit';
import { formatDateInTz } from '../lib/local-date';

vi.mock('../upstream', () => ({
  callUpstream: vi.fn(async () => ({ ok: true })),
  UpstreamError: class extends Error {},
}));
vi.mock('../cache', () => ({
  computeCacheKey: vi.fn(async () => 'ck'),
  readCache: vi.fn(async () => null),
  writeCache: vi.fn(async () => undefined),
}));
vi.mock('../translations', () => ({
  translate: vi.fn(() => ({ data: { top_windows: [], excluded_ranges: [], summary: {} } })),
}));

// ctx that collects waitUntil promises so KV side-effects are observable.
function makeCtx() {
  const pending: Array<Promise<unknown>> = [];
  const ctx = {
    waitUntil(p: Promise<unknown>) { pending.push(p); },
    passThroughOnException() {}, props: {},
  } as unknown as ExecutionContext;
  return { ctx, drain: () => Promise.all(pending) };
}
function makeKv() {
  const store = new Map<string, string>();
  const kv = {
    async get(k: string) { return store.get(k) ?? null; },
    async put(k: string, v: string) { store.set(k, v); },
  } as unknown as KVNamespace;
  return { kv, store };
}
function makeEnv(kv: KVNamespace) {
  return { CACHE: kv, UPSTREAM_BASE_URL: 'x', WORKER_VERSION: 't',
    ASTROLOGY_API_KEY: 'k', ENV: 'production' as const, ADMIN_TOKEN: 'a' };
}
const NOW = 1_700_000_000;
// utcDate is pinned to NOW so the quota-key seed and the metric-key derivation
// share the same injected clock. Changing either side to real Date.now() would
// reintroduce a UTC-midnight flake.
const utcDate = formatDateInTz(new Date(NOW * 1000), 'UTC'); // 2023-11-14
const body = {
  activity: 'wedding', start: '2026-06-01', end: '2026-06-30',
  lat: -23.5, lng: -46.6, timezone: 'America/Sao_Paulo', city: 'São Paulo',
};
function searchReq() {
  return new Request('https://w/electional/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Device-Id': 'd1', 'X-Timezone': 'UTC' },
    body: JSON.stringify(body),
  });
}

describe('search telemetry (UTC-dated, aggregate-only)', () => {
  let kv: KVNamespace, store: Map<string, string>;
  beforeEach(() => { ({ kv, store } = makeKv()); });

  it('an allowed search bumps metered + reach:{N}, never capped', async () => {
    const { ctx, drain } = makeCtx();
    await handleSearch(searchReq(), makeEnv(kv), ctx, { now: NOW });
    await drain();
    expect(store.get(`metrics:search-metered:${utcDate}`)).toBe('1');
    expect(store.get(`metrics:search-reach:${utcDate}:1`)).toBe('1');
    expect(store.get(`metrics:search-capped:${utcDate}`)).toBeUndefined();
  });

  it('a capped search bumps metered + capped, never reach', async () => {
    store.set(quotaKey('d1', utcDate), '5'); // device tz = UTC here
    const { ctx, drain } = makeCtx();
    const res = await handleSearch(searchReq(), makeEnv(kv), ctx, { now: NOW });
    await drain();
    expect(res.status).toBe(429);
    expect(store.get(`metrics:search-metered:${utcDate}`)).toBe('1');
    expect(store.get(`metrics:search-capped:${utcDate}`)).toBe('1');
    const reachKeys = [...store.keys()].filter((k) => k.startsWith('metrics:search-reach:'));
    expect(reachKeys).toEqual([]);
  });

  it('no metric key contains the deviceId', async () => {
    const { ctx, drain } = makeCtx();
    await handleSearch(searchReq(), makeEnv(kv), ctx, { now: NOW });
    await drain();
    const metricKeys = [...store.keys()].filter((k) => k.startsWith('metrics:'));
    expect(metricKeys.every((k) => !k.includes('d1'))).toBe(true);
  });

  it('missing X-Device-Id returns 400 and writes no metric keys', async () => {
    const { ctx, drain } = makeCtx();
    const noIdReq = new Request('https://w/electional/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' }, // no X-Device-Id
      body: JSON.stringify(body),
    });
    const res = await handleSearch(noIdReq, makeEnv(kv), ctx, { now: NOW });
    await drain();
    expect(res.status).toBe(400);
    const metricKeys = [...store.keys()].filter((k) => k.startsWith('metrics:'));
    expect(metricKeys).toEqual([]);
  });

  it('does not meter or emit telemetry when meter:false', async () => {
    const { ctx, drain } = makeCtx();
    await handleSearch(searchReq(), makeEnv(kv), ctx, { meter: false, now: NOW });
    await drain();
    const metricKeys = [...store.keys()].filter((k) => k.startsWith('metrics:'));
    expect(metricKeys).toEqual([]);
  });
});
