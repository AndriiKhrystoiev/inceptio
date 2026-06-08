import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSearch } from '../routes/search';
import { handleDailyNote } from '../routes/daily-note';
import { quotaKey } from '../rate-limit';
import { formatDateInTz } from '../lib/local-date';
import { callUpstream } from '../upstream';
import type { Env } from '../env';

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

function makeKv() {
  const store = new Map<string, string>();
  const kv = {
    async get(k: string) { return store.get(k) ?? null; },
    async put(k: string, v: string) { store.set(k, v); },
  } as unknown as KVNamespace;
  return { kv, store };
}
function makeEnv(kv: KVNamespace): Env {
  return { CACHE: kv, UPSTREAM_BASE_URL: 'x', WORKER_VERSION: 't',
    ASTROLOGY_API_KEY: 'k', ENV: 'production', ADMIN_TOKEN: 'a' };
}
const ctx = { waitUntil() {}, passThroughOnException() {}, props: {} } as unknown as ExecutionContext;
const NOW = 1_700_000_000;
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
function countFor(store: Map<string, string>, device: string): number {
  const date = formatDateInTz(new Date(NOW * 1000), 'UTC');
  return Number(store.get(quotaKey(device, date)) ?? '0');
}

describe('must #2 — daily-note is exempt, direct search is metered', () => {
  let kv: KVNamespace, store: Map<string, string>, env: Env;
  // clearAllMocks resets call counts (NOT implementations) between tests so the
  // callUpstream assertion below is isolated to this test's fan-out.
  beforeEach(() => { vi.clearAllMocks(); ({ kv, store } = makeKv()); env = makeEnv(kv); });

  it('a direct /electional/search DOES increment the counter', async () => {
    await handleSearch(searchReq(), env, ctx, { now: NOW });
    expect(countFor(store, 'd1')).toBe(1);
  });

  it('a /daily-note request runs the fan-out but does NOT increment the counter', async () => {
    const dnReq = new Request(
      'https://w/daily-note?lat=-23.5&lng=-46.6&tz=America%2FSao_Paulo&activity=wedding',
      { method: 'GET', headers: { 'X-Device-Id': 'd1' } },
    );
    await handleDailyNote(dnReq, env, ctx);
    // NON-VACUITY GUARD: prove the search fan-out actually executed (fresh KV →
    // daily-note cache miss → fan-out → searchCore → callUpstream). Without this,
    // "no quota key" would pass vacuously if the fan-out never ran (cache hit /
    // early return). Fan-out ran AND left no quota key ⇒ conclusively exempt.
    expect(vi.mocked(callUpstream)).toHaveBeenCalledTimes(1);
    const quotaKeys = [...store.keys()].filter((k) => k.startsWith('quota:d1:'));
    expect(quotaKeys).toEqual([]);
  });
});

describe('fail-safe default — meter defaults to true', () => {
  let kv: KVNamespace, store: Map<string, string>, env: Env;
  beforeEach(() => { ({ kv, store } = makeKv()); env = makeEnv(kv); });

  it('handleSearch with NO meter option increments (default meter:true)', async () => {
    await handleSearch(searchReq(), env, ctx, { now: NOW });
    expect(countFor(store, 'd1')).toBe(1);
  });

  it('handleSearch with { meter:false } does NOT increment', async () => {
    await handleSearch(searchReq(), env, ctx, { meter: false, now: NOW });
    const quotaKeys = [...store.keys()].filter((k) => k.startsWith('quota:d1:'));
    expect(quotaKeys).toEqual([]);
  });
});
