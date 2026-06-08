// FLIPPED in the VOICE phase (Task 0). The CHROME-phase invariant this file
// asserted — "computeCacheKey is locale-FREE; the key is byte-identical with
// or without a locale" — is now WRONG by design: the Worker composes copy in
// the request locale, so two requests differing only in X-Locale MUST produce
// DIFFERENT keys or cross-locale cache poisoning results. This is the STRONG
// form. (The companion spine test lives in locale-voice-spine.test.ts;
// retained here so the original CHROME guard's file name documents the flip.)
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

describe('computeCacheKey carries locale (cross-locale-poisoning boundary)', () => {
  it('is byte-identical for the same locale (determinism preserved)', async () => {
    const keyA = await computeCacheKey(baseRequest, 'en');
    const keyB = await computeCacheKey(baseRequest, 'en');
    expect(keyA).toBe(keyB);
  });

  it('produces DIFFERENT keys for different locales (strong form)', async () => {
    const en = await computeCacheKey(baseRequest, 'en');
    const pt = await computeCacheKey(baseRequest, 'pt-BR');
    const de = await computeCacheKey(baseRequest, 'de');
    expect(pt).not.toBe(en);
    expect(de).not.toBe(en);
    expect(pt).not.toBe(de);
  });
});
