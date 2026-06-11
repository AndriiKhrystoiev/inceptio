import { describe, it, expect } from 'vitest';
import { handleVersionPolicy } from '../version-policy';

function envWith(value: string | null) {
  const store = new Map<string, string>();
  if (value !== null) store.set('version-policy', value);
  return { CACHE: { get: async (k: string) => store.get(k) ?? null } } as unknown as import('../../env').Env;
}

const valid = JSON.stringify({
  forceEnabled: true,
  ios: { minVersion: '1.2.0', latestVersion: '1.5.0', storeUrl: 'https://apps.apple.com/app/id1' },
});

describe('handleVersionPolicy', () => {
  it('200 + 60s cache-control for a valid doc', async () => {
    const res = await handleVersionPolicy(envWith(valid));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60');
    expect((await res.json() as any).forceEnabled).toBe(true);
  });
  it('503 when the key is missing', async () => {
    const res = await handleVersionPolicy(envWith(null));
    expect(res.status).toBe(503);
  });
  it('503 when the value is not JSON', async () => {
    const res = await handleVersionPolicy(envWith('{not json'));
    expect(res.status).toBe(503);
  });
  it('503 when the doc fails schema', async () => {
    const res = await handleVersionPolicy(envWith(JSON.stringify({ forceEnabled: 'yes' })));
    expect(res.status).toBe(503);
  });
  it('neutralizes forceEnabled to false when min>latest on a platform', async () => {
    const incoherent = JSON.stringify({
      forceEnabled: true,
      ios: { minVersion: '1.9.0', latestVersion: '1.2.0', storeUrl: 'https://apps.apple.com/app/id1' },
    });
    const res = await handleVersionPolicy(envWith(incoherent));
    expect(res.status).toBe(200);
    expect((await res.json() as any).forceEnabled).toBe(false);
  });
});
