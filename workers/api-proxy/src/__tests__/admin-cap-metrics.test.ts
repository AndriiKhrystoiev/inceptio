import { describe, it, expect } from 'vitest';
import { handleCapMetrics } from '../routes/admin';
import type { Env } from '../env';

function makeKv(seed: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(seed));
  const kv = {
    async get(k: string) { return store.get(k) ?? null; },
    async put(k: string, v: string) { store.set(k, v); },
  } as unknown as KVNamespace;
  return { kv, store };
}
function makeEnv(kv: KVNamespace): Env {
  return { CACHE: kv, UPSTREAM_BASE_URL: 'x', WORKER_VERSION: 't',
    ASTROLOGY_API_KEY: 'k', ENV: 'production', ADMIN_TOKEN: 'secret' };
}
function req(token?: string) {
  return new Request('https://w/admin/cap-metrics', {
    method: 'GET', headers: token ? { 'x-admin-token': token } : {},
  });
}
const today = new Date().toISOString().slice(0, 10);

describe('handleCapMetrics auth', () => {
  it('401 on missing token', async () => {
    const { kv } = makeKv();
    expect((await handleCapMetrics(req(), makeEnv(kv))).status).toBe(401);
  });
  it('401 on wrong token', async () => {
    const { kv } = makeKv();
    expect((await handleCapMetrics(req('nope'), makeEnv(kv))).status).toBe(401);
  });
});

describe('handleCapMetrics shape', () => {
  it('returns a 14-day window newest-first with capped_ratio + reach curve', async () => {
    const { kv } = makeKv({
      [`metrics:search-metered:${today}`]: '10',
      [`metrics:search-capped:${today}`]: '2',
      [`metrics:search-reach:${today}:1`]: '8',
      [`metrics:search-reach:${today}:5`]: '3',
    });
    const res = await handleCapMetrics(req('secret'), makeEnv(kv));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      days: Array<{ date: string; metered: number; capped: number; capped_ratio: number; reach: number[] }>;
      reach_max: number;
    };
    expect(json.days).toHaveLength(14);
    expect(json.days[0]!.date).toBe(today);
    expect(json.days[0]!.metered).toBe(10);
    expect(json.days[0]!.capped).toBe(2);
    expect(json.days[0]!.capped_ratio).toBeCloseTo(0.2);
    expect(json.days[0]!.reach[0]).toBe(8); // N=1
    expect(json.days[0]!.reach[4]).toBe(3); // N=5
    expect(json.days[1]!.metered).toBe(0);  // uninstrumented day → zeros
    expect(json.days[1]!.capped_ratio).toBe(0);
    expect(json.reach_max).toBe(10);
  });
});
