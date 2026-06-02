// Tests for useDailyNote pure helpers.
//
// Why no renderHook / @testing-library/react-native:
// vitest.config.ts uses environment: 'node'; RNTL is not installed;
// React 19 removed react-test-renderer. The hook's reactive behaviour
// (activity change → queryKey changes → TanStack Query refetches automatically)
// is an emergent property of the queryKey array identity, not a runtime
// React render cycle. We test the two pure functions that govern that identity
// and the enabled gate. If __computeQueryKey includes activity at the correct
// position and __computeEnabled gates on hydrationStatus correctly, the hook
// is correct by construction.
//
// Full reactive-refetch integration is verified at Phase 5 visual smoke test
// and the canary swap (Checkpoint 1 already covered the external-store wiring).

import { describe, it, expect } from 'vitest';
import { __computeQueryKey, __computeEnabled } from '../useDailyNote.helpers';

describe('__computeQueryKey', () => {
  it('returns a 6-element tuple with the expected shape', () => {
    const key = __computeQueryKey({
      lat: 50.45,
      lng: 30.52,
      tz: 'Europe/Kyiv',
      todayIsoDate: '2026-06-02',
      activity: 'wedding',
    });
    expect(key).toHaveLength(6);
    expect(key[0]).toBe('daily-note');
    expect(key[1]).toBe(50.45);
    expect(key[2]).toBe(30.52);
    expect(key[3]).toBe('Europe/Kyiv');
    expect(key[4]).toBe('2026-06-02');
    expect(key[5]).toBe('wedding');
  });

  it('places activity at position 5 — changing activity produces a different key', () => {
    const base = {
      lat: 50.45,
      lng: 30.52,
      tz: 'Europe/Kyiv',
      todayIsoDate: '2026-06-02',
    };
    const keyA = __computeQueryKey({ ...base, activity: 'wedding' });
    const keyB = __computeQueryKey({ ...base, activity: 'contracts' });
    // Position 5 must differ; all other positions must be identical.
    expect(keyA[5]).toBe('wedding');
    expect(keyB[5]).toBe('contracts');
    expect(keyA.slice(0, 5)).toEqual(keyB.slice(0, 5));
  });

  it('accepts undefined activity (pre-hydration default — key still stable)', () => {
    const key = __computeQueryKey({
      lat: 50.45,
      lng: 30.52,
      tz: 'Europe/Kyiv',
      todayIsoDate: '2026-06-02',
      activity: undefined,
    });
    expect(key[5]).toBeUndefined();
  });
});

describe('__computeEnabled', () => {
  it('returns false when hydrationStatus is "loading"', () => {
    expect(
      __computeEnabled({ hydrationStatus: 'loading', activity: undefined }),
    ).toBe(false);
  });

  it('returns false when hydrationStatus is "unset"', () => {
    expect(
      __computeEnabled({ hydrationStatus: 'unset', activity: undefined }),
    ).toBe(false);
  });

  it('returns false when hydrationStatus is "set" but activity is undefined', () => {
    expect(
      __computeEnabled({ hydrationStatus: 'set', activity: undefined }),
    ).toBe(false);
  });

  it('returns true when hydrationStatus is "set" and activity is defined', () => {
    expect(
      __computeEnabled({ hydrationStatus: 'set', activity: 'wedding' }),
    ).toBe(true);
    expect(
      __computeEnabled({ hydrationStatus: 'set', activity: 'contracts' }),
    ).toBe(true);
    expect(
      __computeEnabled({ hydrationStatus: 'set', activity: 'business_launch' }),
    ).toBe(true);
    expect(
      __computeEnabled({ hydrationStatus: 'set', activity: 'travel' }),
    ).toBe(true);
  });
});
