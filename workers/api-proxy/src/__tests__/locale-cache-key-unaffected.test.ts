// Task A2 — the cache-key-unaffected invariant, asserted against the REAL
// computeCacheKey (no module mocks here; mirrors cache.test.ts). Locale never
// enters the cache key: computeCacheKey's sole input is the parsed request
// body, the body schema is `.strict()` (locale can't leak into it), and the
// function has no locale parameter. Any extra arg a future caller passes is
// ignored — the key is byte-identical with or without it.
import { describe, expect, it } from 'vitest';
import type { ElectionalSearchRequest } from '@inceptio/shared-types';
import { computeCacheKey } from '../cache';

const baseRequest: ElectionalSearchRequest = {
  activity: 'wedding',
  start: '2026-06-01',
  end: '2026-06-30',
  lat: -23.5,
  lng: -46.6,
  timezone: 'America/Sao_Paulo',
  city: 'São Paulo',
};

describe('computeCacheKey is locale-free (cache-key-unaffected assertion)', () => {
  it('is byte-identical whether or not a locale would be present', async () => {
    const keyA = await computeCacheKey(baseRequest);
    const keyB = await computeCacheKey(baseRequest);
    expect(keyA).toBe(keyB);

    // computeCacheKey has no locale arity; a future caller passing a locale as
    // an extra arg must not change the key (proves the seam is non-poisoning).
    const withExtraArg = (
      computeCacheKey as unknown as (
        r: ElectionalSearchRequest,
        locale?: string,
      ) => Promise<string>
    )(baseRequest, 'pt-BR');
    expect(await withExtraArg).toBe(keyA);
  });
});
