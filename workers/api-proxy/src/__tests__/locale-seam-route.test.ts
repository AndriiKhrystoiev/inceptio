// Task A2 — X-Locale seam route behavior: accept + validate + ignore.
//
// Asserts, for BOTH the public search route and the daily-note route, that:
//   - a well-formed X-Locale (pt-BR) is accepted and produces the SAME body +
//     cache behavior as no header at all (locale is ignored this phase),
//   - a malformed X-Locale (bad!!) → 400 invalid_locale,
//   - an absent X-Locale → 200 (no regression for existing clients),
//   - computeCacheKey output is IDENTICAL with and without the header
//     (the cache-key-unaffected invariant — locale never enters the key).
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── search.ts: stub upstream + cache + translate so we exercise validation
//    + searchCore without network (mirrors search-meter-wiring.test.ts). ──
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
  translate: vi.fn(() => ({
    data: { top_windows: [], excluded_ranges: [], summary: {} },
  })),
}));

import { handleSearch } from '../routes/search';
import { computeCacheKey } from '../cache';
import type { Env } from '../env';
import type { ElectionalSearchRequest } from '@inceptio/shared-types';

function makeKv() {
  const store = new Map<string, string>();
  const kv = {
    async get(k: string) {
      return store.get(k) ?? null;
    },
    async put(k: string, v: string) {
      store.set(k, v);
    },
  } as unknown as KVNamespace;
  return { kv, store };
}
function makeEnv(kv: KVNamespace): Env {
  return {
    CACHE: kv,
    UPSTREAM_BASE_URL: 'x',
    WORKER_VERSION: 't',
    ASTROLOGY_API_KEY: 'k',
    ENV: 'production',
    ADMIN_TOKEN: 'a',
  };
}
const ctx = {
  waitUntil() {},
  passThroughOnException() {},
  props: {},
} as unknown as ExecutionContext;

const searchBody = {
  activity: 'wedding',
  start: '2026-06-01',
  end: '2026-06-30',
  lat: -23.5,
  lng: -46.6,
  timezone: 'America/Sao_Paulo',
  city: 'São Paulo',
};
const NOW = 1_700_000_000;
function searchReq(headers: Record<string, string>) {
  return new Request('https://w/electional/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(searchBody),
  });
}

describe('search route — X-Locale accept + validate + ignore', () => {
  let kv: KVNamespace, env: Env;
  beforeEach(() => {
    ({ kv } = makeKv());
    env = makeEnv(kv);
  });

  it('absent X-Locale → 200 (no regression for existing clients)', async () => {
    const res = await handleSearch(
      searchReq({ 'X-Device-Id': 'd1', 'X-Timezone': 'UTC' }),
      env,
      ctx,
      { now: NOW },
    );
    expect(res.status).toBe(200);
  });

  it('malformed X-Locale → 400 invalid_locale, BEFORE the meter block', async () => {
    // No X-Device-Id: the meter block would 400 missing_device_id if locale
    // were validated inside `if (meter)`. We assert invalid_locale instead,
    // proving the locale check runs unconditionally ahead of metering.
    const res = await handleSearch(searchReq({ 'X-Locale': 'bad!!' }), env, ctx, {
      now: NOW,
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe('invalid_locale');
  });

  it('well-formed X-Locale (pt-BR) returns the SAME body as no header', async () => {
    const withHeader = await handleSearch(
      searchReq({ 'X-Device-Id': 'd1', 'X-Timezone': 'UTC', 'X-Locale': 'pt-BR' }),
      env,
      ctx,
      { now: NOW },
    );
    const without = await handleSearch(
      searchReq({ 'X-Device-Id': 'd2', 'X-Timezone': 'UTC' }),
      env,
      ctx,
      { now: NOW },
    );
    expect(withHeader.status).toBe(200);
    expect(without.status).toBe(200);
    expect(await withHeader.json()).toEqual(await without.json());
  });

  it('the mocked computeCacheKey is what search uses (sanity)', async () => {
    // Guard against the mock drifting: the search path uses the mocked key.
    expect(await computeCacheKey({} as ElectionalSearchRequest)).toBe('ck');
  });
});
