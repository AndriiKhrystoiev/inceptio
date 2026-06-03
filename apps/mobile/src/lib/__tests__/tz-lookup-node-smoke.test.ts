// apps/mobile/src/lib/__tests__/tz-lookup-node-smoke.test.ts
//
// Node V8 correctness smoke for @photostructure/tz-lookup.
//
// IMPORTANT: Vitest runs on Node V8, NOT Hermes (React Native's JS engine).
// This file does NOT satisfy the Phase 0 Hermes compat gate — it only proves
// that the library imports + resolves IANA zone names correctly under Node.
// The genuine Hermes/RN gate is a manual step in the iOS simulator: import
// the lib in the app, confirm it loads at startup, and confirm tzLookup
// returns a valid IANA string. The shared-runtime upside of this file is
// that Cloudflare Workers also run on V8, so this same correctness applies
// to the Worker (Phase 3); the file's primary job in the mobile package is
// catching regressions in our pinned version + sanity-checking coord→zone
// behavior we'll depend on in pickToSavedLocation (Task 1.2) once Hermes
// has been independently verified.
//
// Tokyo proves the basic happy path; Tehran is a non-trivial mid-latitude
// coord correctness check. tz-lookup maps coords -> IANA zone NAMES, which
// are stable across DST/abolition policy changes — Tehran is NOT a
// stale-vs-fresh DB discriminator. The active fork's value is maintenance
// currency for rare zone-split/boundary cases.

import { describe, it, expect } from 'vitest';
import tzLookup from '@photostructure/tz-lookup';

describe('@photostructure/tz-lookup — Node V8 correctness smoke', () => {
  it('imports + returns IANA tz for Tokyo coords', () => {
    expect(typeof tzLookup).toBe('function');
    expect(tzLookup(35.68, 139.69)).toBe('Asia/Tokyo');
  });

  it('returns Asia/Tehran for Tehran coords (mid-latitude correctness check)', () => {
    expect(tzLookup(35.6892, 51.3890)).toBe('Asia/Tehran');
  });
});
