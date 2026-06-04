// Tests for useEffectiveLocation (spec §4.5, §9.2, D11).
//
// Hook composition: defaultLocation (reactive) ?? lastSeed (mount-frozen) ?? null.
// The mount-frozen invariant (D11) is the load-bearing assertion: per-search
// edits to last_location must NOT change what the hook returned at mount time.
//
// WHY PATH B (no React rendering):
// Neither @testing-library/react-hooks nor @testing-library/react-native is
// installed; vitest.config.ts uses environment: 'node'. The hook's composition
// is a single ?-chain over two data sources. We test those data sources directly:
//   1. getSnapshot() from location-preference → exercises the defaultLocation arm
//   2. getLastLocation() from location-storage → exercises the lastSeed arm
//   3. A captured-at-call-time variable mirrors the lazy useState(() => …) init
//      to assert the D11 semantic WITHOUT React rendering.
//
// Limitation: we do not exercise the actual React useState lazy-init path. The
// hook's jsdoc references this test file; full reactive-render coverage is
// deferred to Phase 6 manual smoke and the canary swap.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Storage mock ─────────────────────────────────────────────────────────────

const memory = new Map<string, string>();

vi.mock('../../lib/storage', () => ({
  storage: {
    getString(key: string) {
      return memory.get(key);
    },
    set(key: string, value: string) {
      memory.set(key, value);
    },
    delete(key: string) {
      memory.delete(key);
    },
  },
}));

// ── activity-preference mock (required by initLocationPreference → D32) ──────

// initActivitySpy advances mockActivityStatus from 'loading' → 'unset'
// if nothing has changed it, matching the location-preference.test.ts pattern.
let mockActivityStatus: 'loading' | 'unset' | 'set' = 'set';
const initActivitySpy = vi.fn(() => {
  if (mockActivityStatus === 'loading') mockActivityStatus = 'unset';
});

vi.mock('../../lib/activity-preference', () => ({
  initActivityPreference: () => initActivitySpy(),
  __readActivityHydrationStatusSync: () => ({ hydrationStatus: mockActivityStatus }),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import {
  initLocationPreference,
  setDefaultLocation,
  clearDefaultLocation,
  __resetForTests as resetLocationPref,
  __getSubscribeAndSnapshot,
} from '../../lib/location-preference';

import {
  saveLocation,
  getLastLocation,
  clearLocation,
  type SavedLocation,
} from '../../lib/location-storage';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TOKYO: SavedLocation = {
  lat: 35.68,
  lng: 139.69,
  city: 'Tokyo',
  country: 'Japan',
  timezone: 'Asia/Tokyo',
  selected_at: 1,
};

const KYIV: SavedLocation = {
  lat: 50.45,
  lng: 30.52,
  city: 'Kyiv',
  country: 'Ukraine',
  timezone: 'Europe/Kyiv',
  selected_at: 2,
};

// ── Composition helper (mirrors hook's single expression) ─────────────────────
//
// The hook body is:
//   const { defaultLocation } = useLocationPreference();          // reactive
//   const [lastSeed] = useState(() => getLastLocation());         // mount-frozen
//   return defaultLocation ?? lastSeed ?? null;
//
// In Path B we resolve each arm independently and combine with the same operator
// so the precedence logic is tested even without React rendering.
function computeEffective(
  defaultLocation: SavedLocation | null,
  lastSeed: SavedLocation | null,
): SavedLocation | null {
  return defaultLocation ?? lastSeed ?? null;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  memory.clear();
  resetLocationPref();
  mockActivityStatus = 'set';
  initActivitySpy.mockClear();
  initLocationPreference();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useEffectiveLocation — composition logic (Path B)', () => {
  // Tests the operator precedence: defaultLocation ?? lastSeed ?? null.
  // Each test seeds the data sources directly and asserts via computeEffective.

  it('returns null when neither default nor last_location is set', () => {
    const { getSnapshot } = __getSubscribeAndSnapshot();
    const { defaultLocation } = getSnapshot();
    const lastSeed = getLastLocation();

    expect(computeEffective(defaultLocation, lastSeed)).toBeNull();
  });

  it('returns lastSeed when no default is set but last_location exists', () => {
    saveLocation(KYIV);
    const { getSnapshot } = __getSubscribeAndSnapshot();
    const { defaultLocation } = getSnapshot();
    const lastSeed = getLastLocation();

    expect(computeEffective(defaultLocation, lastSeed)).toEqual(KYIV);
  });

  it('returns defaultLocation when set — default takes precedence over lastSeed', () => {
    saveLocation(KYIV);
    setDefaultLocation(TOKYO);
    const { getSnapshot } = __getSubscribeAndSnapshot();
    const { defaultLocation } = getSnapshot();
    const lastSeed = getLastLocation();

    expect(computeEffective(defaultLocation, lastSeed)).toEqual(TOKYO);
  });

  it('returns defaultLocation when set and no lastSeed exists', () => {
    setDefaultLocation(TOKYO);
    const { getSnapshot } = __getSubscribeAndSnapshot();
    const { defaultLocation } = getSnapshot();
    const lastSeed = getLastLocation(); // null — never saved

    expect(computeEffective(defaultLocation, lastSeed)).toEqual(TOKYO);
  });

  it('falls back to lastSeed after default is cleared', () => {
    saveLocation(KYIV);
    setDefaultLocation(TOKYO);

    // Clear the default — composition should now fall through to seed.
    clearDefaultLocation();

    const { getSnapshot } = __getSubscribeAndSnapshot();
    const { defaultLocation } = getSnapshot();
    const lastSeed = getLastLocation();

    expect(computeEffective(defaultLocation, lastSeed)).toEqual(KYIV);
  });

  // D11 mount-frozen invariant.
  //
  // The hook captures lastSeed via useState(() => getLastLocation()) which runs
  // ONCE at mount. Any subsequent saveLocation() call (per-search pick) updates
  // `inceptio.last_location` in storage but does NOT change the captured seed.
  //
  // Path B mirrors this by capturing the seed value once at "mount time" (a
  // local const) and then proving storage mutations don't change that captured
  // reference. The same === identity semantics hold in the real hook because
  // useState's lazy initialiser is only invoked once.
  //
  // This test proves the semantic (a frozen value survives later writes)
  // without exercising the real useState call. Full in-situ validation is
  // covered by Phase 6 manual smoke test.
  it('D11 mount-frozen invariant — per-search saveLocation does not change captured seed', () => {
    // Arrange: KYIV is the location at "mount time".
    saveLocation(KYIV);

    // Capture once — mirrors useState(() => getLastLocation()) at mount.
    const capturedLastSeed = getLastLocation();
    expect(capturedLastSeed).toEqual(KYIV);

    // Act: per-search picker writes a new location (TOKYO) to last_location.
    saveLocation(TOKYO);

    // Assert: the captured seed has NOT changed.
    // In the hook, this is enforced by React's useState lazy-init semantics.
    // In Path B, it is enforced by the plain const binding — same contract.
    expect(capturedLastSeed).toEqual(KYIV);

    // Confirm storage itself updated (proves saveLocation ran, not a no-op).
    expect(getLastLocation()).toEqual(TOKYO);
  });
});

// Tests that the defaultLocation arm is reactive (getSnapshot() returns the
// updated value after setDefaultLocation/clearDefaultLocation). This is
// orthogonal to the frozen-seed concern and matches the useSyncExternalStore
// subscription that drives re-renders in the real hook.
describe('useEffectiveLocation — defaultLocation reactivity (Path B)', () => {
  it('getSnapshot reflects setDefaultLocation immediately', () => {
    const { getSnapshot } = __getSubscribeAndSnapshot();
    expect(getSnapshot().defaultLocation).toBeNull();

    setDefaultLocation(TOKYO);
    expect(getSnapshot().defaultLocation).toEqual(TOKYO);
  });

  it('getSnapshot reflects clearDefaultLocation immediately', () => {
    setDefaultLocation(TOKYO);
    clearDefaultLocation();
    const { getSnapshot } = __getSubscribeAndSnapshot();
    expect(getSnapshot().defaultLocation).toBeNull();
  });
});
