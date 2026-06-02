import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkAndIncrement,
  periodStart,
  rateLimitKey,
  LIMITS,
} from '../rate-limit';
import { FEATURES, type Env } from '../env';

// Minimal in-memory KV stub. Only implements get/put with optional TTL.
function makeKv(): { kv: KVNamespace; store: Map<string, string> } {
  const store = new Map<string, string>();
  const kv = {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
  } as unknown as KVNamespace;
  return { kv, store };
}

function makeEnv(
  envName: Env['ENV'],
  kv: KVNamespace,
): Env {
  return {
    CACHE: kv,
    UPSTREAM_BASE_URL: 'https://example.invalid',
    WORKER_VERSION: 'test',
    ASTROLOGY_API_KEY: 'test-key',
    ENV: envName,
    ADMIN_TOKEN: 'test-admin-token',
  };
}

const PERIOD_SEC = FEATURES.FREE_SEARCH_PERIOD_DAYS * 24 * 60 * 60;

describe('periodStart', () => {
  it('aligns to PERIOD_SECONDS boundary', () => {
    const t = 1_700_000_000;
    const s = periodStart(t);
    expect(s % PERIOD_SEC).toBe(0);
    expect(s).toBeLessThanOrEqual(t);
    expect(s + PERIOD_SEC).toBeGreaterThan(t);
  });
});

describe('rateLimitKey', () => {
  it('includes device id and aligned period', () => {
    const k = rateLimitKey('device-abc', 1_700_000_000);
    expect(k).toMatch(/^ratelimit:device-abc:\d+$/);
  });

  it('uses the same key across the same period', () => {
    const k1 = rateLimitKey('d', 1_700_000_000);
    const k2 = rateLimitKey('d', 1_700_000_000 + 60); // one minute later
    expect(k1).toBe(k2);
  });
});

describe('checkAndIncrement (production)', () => {
  const now = 1_700_000_000;
  const PROD_LIMIT = LIMITS.production;

  let kv: KVNamespace;
  let store: Map<string, string>;
  let env: Env;
  beforeEach(() => {
    ({ kv, store } = makeKv());
    env = makeEnv('production', kv);
  });

  it('allows the first 10 requests and stores incrementing counter', async () => {
    for (let i = 1; i <= PROD_LIMIT; i++) {
      const r = await checkAndIncrement(env, 'd1', now);
      expect(r.allowed).toBe(true);
      expect(r.count).toBe(i);
      expect(r.limit).toBe(PROD_LIMIT);
    }
    const stored = store.get(rateLimitKey('d1', now));
    expect(stored).toBe(String(PROD_LIMIT));
  });

  it('blocks the 11th request', async () => {
    for (let i = 0; i < PROD_LIMIT; i++) {
      await checkAndIncrement(env, 'd1', now);
    }
    const r = await checkAndIncrement(env, 'd1', now);
    expect(r.allowed).toBe(false);
    expect(r.count).toBe(PROD_LIMIT);
    expect(r.limit).toBe(PROD_LIMIT);
  });

  it('isolates devices', async () => {
    for (let i = 0; i < PROD_LIMIT; i++) {
      await checkAndIncrement(env, 'd1', now);
    }
    const r = await checkAndIncrement(env, 'd2', now);
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(1);
  });

  it('resets after the period boundary', async () => {
    for (let i = 0; i < PROD_LIMIT; i++) {
      await checkAndIncrement(env, 'd1', now);
    }
    const next = await checkAndIncrement(env, 'd1', now + PERIOD_SEC);
    expect(next.allowed).toBe(true);
    expect(next.count).toBe(1);
  });

  it('reports reset_at_unix at the next period boundary', async () => {
    const r = await checkAndIncrement(env, 'd1', now);
    expect(r.reset_at_unix).toBe(periodStart(now) + PERIOD_SEC);
  });
});

describe('checkAndIncrement (development)', () => {
  const now = 1_700_000_000;
  const DEV_LIMIT = LIMITS.development;

  let kv: KVNamespace;
  let env: Env;
  beforeEach(() => {
    ({ kv } = makeKv());
    env = makeEnv('development', kv);
  });

  it('reports the development limit on each response', async () => {
    const r = await checkAndIncrement(env, 'd1', now);
    expect(r.limit).toBe(DEV_LIMIT);
    expect(r.allowed).toBe(true);
  });

  it('allows well past the production threshold (e.g. 11 quick requests)', async () => {
    for (let i = 1; i <= 11; i++) {
      const r = await checkAndIncrement(env, 'd1', now);
      expect(r.allowed).toBe(true);
      expect(r.count).toBe(i);
    }
  });

  it('blocks only at the development ceiling', async () => {
    // Walk up to the limit (without iterating 1000 times unnecessarily, we
    // seed the counter directly via the same KV key).
    const { kv: kv2, store } = makeKv();
    const env2 = makeEnv('development', kv2);
    store.set(rateLimitKey('d1', now), String(DEV_LIMIT));
    const r = await checkAndIncrement(env2, 'd1', now);
    expect(r.allowed).toBe(false);
    expect(r.count).toBe(DEV_LIMIT);
    expect(r.limit).toBe(DEV_LIMIT);
  });
});

describe('checkAndIncrement (fallback when ENV is missing/unknown)', () => {
  const now = 1_700_000_000;

  it('defaults to production limit when ENV value is not in LIMITS', async () => {
    const { kv } = makeKv();
    // Simulate a misconfigured Worker where ENV got set to an unexpected value.
    // The type system normally prevents this, but Wrangler vars are strings at
    // runtime and a typo in wrangler.toml would land here.
    const env = {
      ...makeEnv('production', kv),
      ENV: 'staging' as unknown as Env['ENV'],
    };
    const r = await checkAndIncrement(env, 'd1', now);
    expect(r.limit).toBe(LIMITS.production);
  });
});
