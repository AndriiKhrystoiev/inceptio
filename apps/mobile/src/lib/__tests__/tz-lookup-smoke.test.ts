// apps/mobile/src/lib/__tests__/tz-lookup-smoke.test.ts
//
// Checkpoint A — Hermes/RN startup smoke for @photostructure/tz-lookup.
//
// Verifies the library imports + resolves IANA zone names correctly on the
// runtime our mobile app targets. Tokyo proves the basic happy path; Tehran
// proves a non-trivial mid-latitude coord resolves correctly under the active
// fork's current IANA DB. Note: tz-lookup maps coords -> IANA zone NAMES,
// which are stable across DST/abolition policy changes — Tehran is a
// correctness check, NOT a stale-vs-fresh DB discriminator. The fork's
// value is maintenance currency for rare zone-split/boundary cases.

import { describe, it, expect } from 'vitest';
import tzLookup from '@photostructure/tz-lookup';

describe('@photostructure/tz-lookup — startup smoke', () => {
  it('imports + returns IANA tz for Tokyo coords', () => {
    expect(typeof tzLookup).toBe('function');
    expect(tzLookup(35.68, 139.69)).toBe('Asia/Tokyo');
  });

  it('returns Asia/Tehran for Tehran coords (mid-latitude correctness check)', () => {
    expect(tzLookup(35.6892, 51.3890)).toBe('Asia/Tehran');
  });
});
