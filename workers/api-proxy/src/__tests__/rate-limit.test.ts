import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkAndIncrement,
  periodStart,
  rateLimitKey,
} from '../rate-limit';
import { FEATURES } from '../env';

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

describe('checkAndIncrement', () => {
  const now = 1_700_000_000;

  let kv: KVNamespace;
  let store: Map<string, string>;
  beforeEach(() => {
    ({ kv, store } = makeKv());
  });

  it('allows the first N requests and stores incrementing counter', async () => {
    for (let i = 1; i <= FEATURES.MAX_FREE_SEARCHES; i++) {
      const r = await checkAndIncrement(kv, 'd1', now);
      expect(r.allowed).toBe(true);
      expect(r.count).toBe(i);
      expect(r.limit).toBe(FEATURES.MAX_FREE_SEARCHES);
    }
    const stored = store.get(rateLimitKey('d1', now));
    expect(stored).toBe(String(FEATURES.MAX_FREE_SEARCHES));
  });

  it('blocks the (N+1)th request', async () => {
    for (let i = 0; i < FEATURES.MAX_FREE_SEARCHES; i++) {
      await checkAndIncrement(kv, 'd1', now);
    }
    const r = await checkAndIncrement(kv, 'd1', now);
    expect(r.allowed).toBe(false);
    expect(r.count).toBe(FEATURES.MAX_FREE_SEARCHES);
  });

  it('isolates devices', async () => {
    for (let i = 0; i < FEATURES.MAX_FREE_SEARCHES; i++) {
      await checkAndIncrement(kv, 'd1', now);
    }
    const r = await checkAndIncrement(kv, 'd2', now);
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(1);
  });

  it('resets after the period boundary', async () => {
    for (let i = 0; i < FEATURES.MAX_FREE_SEARCHES; i++) {
      await checkAndIncrement(kv, 'd1', now);
    }
    const next = await checkAndIncrement(kv, 'd1', now + PERIOD_SEC);
    expect(next.allowed).toBe(true);
    expect(next.count).toBe(1);
  });

  it('reports reset_at_unix at the next period boundary', async () => {
    const r = await checkAndIncrement(kv, 'd1', now);
    expect(r.reset_at_unix).toBe(periodStart(now) + PERIOD_SEC);
  });
});
