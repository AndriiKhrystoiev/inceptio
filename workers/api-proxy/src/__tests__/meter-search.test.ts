import { describe, it, expect, beforeEach } from 'vitest';
import { meterSearch, quotaKey } from '../rate-limit';
import { TIERS } from '../env';
import type { Env } from '../env';
import { formatDateInTz } from '../lib/local-date';

function makeKv() {
  const store = new Map<string, string>();
  const puts: Array<{ key: string; value: string; ttl?: number }> = [];
  const kv = {
    async get(key: string) { return store.get(key) ?? null; },
    async put(key: string, value: string, opts?: { expirationTtl?: number }) {
      store.set(key, value);
      puts.push({ key, value, ttl: opts?.expirationTtl });
    },
  } as unknown as KVNamespace;
  return { kv, store, puts };
}

function makeEnv(envName: Env['ENV'], kv: KVNamespace): Env {
  return {
    CACHE: kv, UPSTREAM_BASE_URL: 'x', WORKER_VERSION: 't',
    ASTROLOGY_API_KEY: 'k', ENV: envName, ADMIN_TOKEN: 'a',
  };
}

const PROD_LIMIT = TIERS.free.limit;
const now = 1_700_000_000; // 2023-11-14T22:13:20Z

describe('quotaKey', () => {
  it('is namespaced by device and local date', () => {
    expect(quotaKey('dev-1', '2026-06-06')).toBe('quota:dev-1:2026-06-06');
  });
});

describe('meterSearch (production / free tier)', () => {
  let kv: KVNamespace, store: Map<string, string>, env: Env;
  beforeEach(() => { ({ kv, store } = makeKv()); env = makeEnv('production', kv); });

  it('allows up to the limit and increments', async () => {
    for (let i = 1; i <= PROD_LIMIT; i++) {
      const r = await meterSearch(env, 'd1', 'UTC', now);
      expect(r.allowed).toBe(true);
      expect(r.count).toBe(i);
      expect(r.used).toBe(i);
      expect(r.limit).toBe(PROD_LIMIT);
    }
  });

  it('blocks the request after the limit (no further increment)', async () => {
    for (let i = 0; i < PROD_LIMIT; i++) await meterSearch(env, 'd1', 'UTC', now);
    const r = await meterSearch(env, 'd1', 'UTC', now);
    expect(r.allowed).toBe(false);
    expect(r.used).toBe(PROD_LIMIT);
    expect(r.reset_at_unix).toBeGreaterThan(now);
  });

  it('buckets by DEVICE tz (Tokyo rolls the date forward)', async () => {
    await meterSearch(env, 'd1', 'Asia/Tokyo', now);
    const expectedDate = formatDateInTz(new Date(now * 1000), 'Asia/Tokyo'); // 2023-11-15
    expect(store.has(quotaKey('d1', expectedDate))).toBe(true);
  });

  it('isolates devices', async () => {
    for (let i = 0; i < PROD_LIMIT; i++) await meterSearch(env, 'd1', 'UTC', now);
    const r = await meterSearch(env, 'd2', 'UTC', now);
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(1);
  });

  it('resets in a new local day (different date bucket)', async () => {
    for (let i = 0; i < PROD_LIMIT; i++) await meterSearch(env, 'd1', 'UTC', now);
    const tomorrow = now + 86400;
    const r = await meterSearch(env, 'd1', 'UTC', tomorrow);
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(1);
  });

  it('TTL = seconds-to-next-local-midnight + 60s grace buffer', async () => {
    const { kv: kv2, puts } = makeKv();
    const env2 = makeEnv('production', kv2);
    const near = 1_700_006_370; // 2023-11-14T23:59:30Z → 30s to UTC midnight
    await meterSearch(env2, 'd1', 'UTC', near);
    // 30s remaining + 60s grace = 90; the +60 buffer (and the Math.max floor)
    // keep it >= KV's 60s minimum so put() never rejects near midnight.
    expect(puts[0]!.ttl).toBe(90);
  });

  it('TTL never drops below the KV 60s minimum, even 1s before midnight', async () => {
    const { kv: kv2, puts } = makeKv();
    const env2 = makeEnv('production', kv2);
    const near = 1_700_006_399; // 2023-11-14T23:59:59Z → 1s to UTC midnight
    await meterSearch(env2, 'd1', 'UTC', near);
    expect(puts[0]!.ttl).toBeGreaterThanOrEqual(60); // 1 + 60 = 61
  });

  it('NaN-guard: corrupt counter value is treated as 0', async () => {
    store.set(quotaKey('d1', formatDateInTz(new Date(now * 1000), 'UTC')), 'NaN');
    const r = await meterSearch(env, 'd1', 'UTC', now);
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(1);
  });
});

describe('meterSearch (ENV ceilings)', () => {
  it('development gets generous headroom', async () => {
    const { kv } = makeKv();
    const r = await meterSearch(makeEnv('development', kv), 'd1', 'UTC', now);
    expect(r.limit).toBeGreaterThan(TIERS.free.limit);
  });
  it('unknown ENV falls back to the production tier ceiling (fail-safe)', async () => {
    const { kv } = makeKv();
    const env = { ...makeEnv('production', kv), ENV: 'staging' as unknown as Env['ENV'] };
    const r = await meterSearch(env, 'd1', 'UTC', now);
    expect(r.limit).toBe(TIERS.free.limit);
  });
});
