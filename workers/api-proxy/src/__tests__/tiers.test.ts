import { describe, it, expect } from 'vitest';
import { TIERS, resolveTier } from '../env';
import type { Env } from '../env';

const baseEnv = {
  CACHE: {} as KVNamespace,
  UPSTREAM_BASE_URL: 'x', WORKER_VERSION: 't', ASTROLOGY_API_KEY: 'k',
  ENV: 'production' as const, ADMIN_TOKEN: 'a',
} satisfies Env;

describe('tiers', () => {
  it('free tier has a numeric limit (the single source of the cap number)', () => {
    expect(typeof TIERS.free.limit).toBe('number');
    expect(TIERS.free.limit).toBeGreaterThan(0);
  });
  it('resolveTier returns free for any device (stub, no accounts yet)', () => {
    expect(resolveTier(baseEnv, 'any-device')).toBe('free');
  });
});
