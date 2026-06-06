import { describe, it, expect } from 'vitest';
import { bumpCounter, readCounter, COUNTER_TTL_SECONDS } from '../lib/kv-counter';

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

describe('kv-counter', () => {
  it('readCounter returns 0 for missing key', async () => {
    const { kv } = makeKv();
    expect(await readCounter(kv, 'm:x')).toBe(0);
  });

  it('bumpCounter increments and sets the default TTL', async () => {
    const { kv, puts } = makeKv();
    await bumpCounter(kv, 'm:x');
    await bumpCounter(kv, 'm:x');
    expect(await readCounter(kv, 'm:x')).toBe(2);
    // noUncheckedIndexedAccess: bump above guarantees puts[0] exists.
    expect(puts[0]!.ttl).toBe(COUNTER_TTL_SECONDS);
  });

  it('bumpCounter honors a custom TTL', async () => {
    const { kv, puts } = makeKv();
    await bumpCounter(kv, 'm:x', 99);
    expect(puts[0]!.ttl).toBe(99);
  });

  it('NaN-guard: a corrupt value resets to 1, never sticks at NaN', async () => {
    const { kv, store } = makeKv();
    store.set('m:x', 'NaN');
    await bumpCounter(kv, 'm:x');
    expect(await readCounter(kv, 'm:x')).toBe(1);
  });

  it('readCounter NaN-guard reads corrupt value as 0', async () => {
    const { kv, store } = makeKv();
    store.set('m:x', 'garbage');
    expect(await readCounter(kv, 'm:x')).toBe(0);
  });

  it('bumpCounter swallows KV errors (best-effort, never throws)', async () => {
    const kv = {
      async get() { throw new Error('kv down'); },
      async put() { throw new Error('kv down'); },
    } as unknown as KVNamespace;
    await expect(bumpCounter(kv, 'm:x')).resolves.toBeUndefined();
  });
});
