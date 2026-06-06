import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSearch } from '../routes/search';
import { quotaKey } from '../rate-limit';
import type { Env } from '../env';

// Stub upstream + cache so we exercise meter + searchCore without network.
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
const body = {
  activity: 'wedding', start: '2026-06-01', end: '2026-06-30',
  lat: -23.5, lng: -46.6, timezone: 'America/Sao_Paulo', city: 'São Paulo',
};
const NOW = 1_700_000_000; // 2023-11-14T22:13:20Z (Tokyo: 2023-11-15)
function req(headers: Record<string, string>) {
  return new Request('https://w/electional/search', {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}
const ctx = { waitUntil() {}, passThroughOnException() {}, props: {} } as unknown as ExecutionContext;

describe('handleSearch metering wiring', () => {
  let kv: KVNamespace, store: Map<string, string>, env: Env;
  beforeEach(() => { ({ kv, store } = makeKv()); env = makeEnv(kv); });

  it('public call requires X-Device-Id', async () => {
    const res = await handleSearch(req({}), env, ctx);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe('missing_device_id');
  });

  it('buckets by X-Timezone (device tz), not the request timezone', async () => {
    await handleSearch(req({ 'X-Device-Id': 'd1', 'X-Timezone': 'Asia/Tokyo' }), env, ctx, { now: NOW });
    // Tokyo (+9) rolls 22:13Z to the next calendar day.
    expect(store.has(quotaKey('d1', '2023-11-15'))).toBe(true);
    // and NOT the request-location (São Paulo) date or UTC date
    expect(store.has(quotaKey('d1', '2023-11-14'))).toBe(false);
  });

  it('returns 429 with additive `used` once over the limit', async () => {
    store.set(quotaKey('d1', '2023-11-15'), '5'); // Tokyo date for NOW
    const res = await handleSearch(req({ 'X-Device-Id': 'd1', 'X-Timezone': 'Asia/Tokyo' }), env, ctx, { now: NOW });
    expect(res.status).toBe(429);
    const json = (await res.json()) as { error: string; used: number; limit: number; reset_at_unix: number };
    expect(json.error).toBe('rate_limited');
    expect(json.used).toBe(5);
    expect(json.limit).toBe(5);
    expect(typeof json.reset_at_unix).toBe('number');
  });

  it('allowed search returns the translated envelope shape', async () => {
    const res = await handleSearch(req({ 'X-Device-Id': 'd9', 'X-Timezone': 'UTC' }), env, ctx, { now: NOW });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { top_windows: unknown } };
    expect(json.data).toBeDefined();
    expect(json.data.top_windows).toBeDefined();
  });

  it('with { meter:false } a missing X-Device-Id is allowed (exempt path)', async () => {
    const res = await handleSearch(req({}), env, ctx, { meter: false });
    expect(res.status).toBe(200);
  });
});
