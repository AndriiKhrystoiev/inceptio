# Default-Location Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user set a persistent default location the app reads on every boot, so Today shows daily timing for *their* place — set via onboarding (NEW interceptor), YouScreen Settings (NEW row), or Today empty-state CTA (NEW). The Kyiv `FALLBACK_LOCATION` in `useDailyNote.ts` retires; the empty-deps `useMemo` lockup retires with it.

**Architecture:** Parallel modal interceptor in `App.js` mirroring `FirstLaunchActivityPicker`. New `location-preference.ts` standalone store mirroring `activity-preference.ts` shape exactly. New `useEffectiveLocation()` composition hook with mount-frozen `lastSeed` (D11). Generalized `SetDefaultLocationScreen` used by all 3 entry points; `LocationPickerScreen` gets `onConfirm + embedded?:boolean` contract extension (no `initialLocation`/`onBack`/`onClose`); per-search caller gets ONE line added (D30).

**Tech Stack:** Expo SDK 55 / RN 0.83 / React 19 / TypeScript strict / Vitest 2.1.9 (mobile) with `it()` convention + `vi.spyOn`/`vi.mock`/`vi.fn` (NOT Jest, NOT `test()`) / `useSyncExternalStore` / TanStack Query / Maestro for flow regression. NativeWind for styling (matches existing screens).

---

## Authoritative source documents

Workers consuming this plan MUST cross-reference these alongside each task:

- **Spec** — `/Users/user/Projects/inceptio/docs/superpowers/specs/2026-06-04-default-location.md` (this plan's task descriptions reference its §-numbers extensively)
- **Architectural precedent** — `apps/mobile/src/lib/activity-preference.ts` (location-preference.ts mirrors this shape exactly)
- **Activity-preference test precedent** — `apps/mobile/src/lib/__tests__/activity-preference.test.ts` (location-preference.test.ts mirrors this shape; use `it()` per Phase 1+2 newer convention, not the legacy `test()` activity-preference uses)
- **Tz-fix spec + plan (foundation already shipped)** — `docs/superpowers/specs/2026-06-03-location-timezone-correctness.md` + `plans/...md` — do NOT plan changes to anything they shipped (`pickToSavedLocation`, `tryTzLookup`, `migrateLocationTimezones_v1`, App.js hydrate wiring of migration)
- **Project context** — `/Users/user/Projects/inceptio/CLAUDE.md`
- **Active gates memory** — `~/.claude/projects/-Users-user-Projects-inceptio/memory/tz-fix-active-gates.md`

---

## Active deny gates (file-backed; survive compaction)

| Surface | Patterns | Why it matters for this plan |
|---|---|---|
| Worker prod deploy | 10 (`*wrangler*--env production*` + `-e` + env-var variants) | Plan attempts ZERO Worker deploys. Pure mobile feature. |
| Push to main/master | 12 (`git push origin main*`/`master*`, refspecs, `--force*`, `--no-verify*`) | Plan attempts ZERO push-to-main. Work continues on `feature/set-default-location`. |
| Edit/Write(App.js), Edit/Write(location-storage.ts) | LIFTED 2026-06-03 post-Hermes confirmation | Plan freely edits both. |

If a future deny is needed (e.g. push-to-main lift for merge), it's an operator step OUTSIDE this plan.

---

## Out of scope (do NOT silently expand)

From spec §14:

1. Per-search caller edits BEYOND the single `onConfirm={() => go('loading')}` addition (D30).
2. `initialLocation` / `defaultValue` prop on LocationPickerScreen (D16, D20).
3. `onBack` / `onClose` props on LocationPickerScreen (D16).
4. Multi-default or favorite cities UI.
5. GPS-as-silent-default (D11).
6. Skip-vs-completed behavioral split in MVP (D19) — flag is tri-state, interceptor logic is binary.
7. Cache eviction / migration of pre-existing `default_location` data (no pre-existing data).
8. Worker amendments (Worker is correct; pure mobile feature).
9. Push-to-main.

---

## Phase map (7 phases, 31 tasks, no parallel internal tasks)

| # | Phase | Tasks | Description |
|---|---|---|---|
| 0 | Foundational | 5 | Skeletons + the new `__readActivityHydrationStatusSync` Activity export (D28) |
| 1 | Storage primitives | 3 | Failing tests, implement init+setters, wire into App.js boot |
| 2 | Hooks | 4 | `useLocationPreference` + `useEffectiveLocation` TDD pairs |
| 3 | useDailyNote integration + FALLBACK removal + TodayScreen guard | 5 | `__computeEnabled` extension, useDailyNote body change, **TodayScreen no-location guard with PROVISIONAL CTA target (`go('you')`)** so Phase 3 doesn't leave TodayScreen crashable for no-location devices, full suite verify |
| 4 | LocationPickerScreen contract extension | 4 | `onConfirm` + `embedded`, D30 one-line update, Maestro 04 regression |
| 5 | SetDefaultLocationScreen + entry-point wiring | 6 | Screen impl, App.js interceptor, EmptyStateHero polish, TodayScreen empty-state CTA target FINALIZATION (from `go('you')` to `go('set-default-location')`), YouScreen row |
| 6 | Verification + Maestro | 4 | New Maestro flow, full vitest, tsc gate (tolerant of pre-existing cluster-windows error), manual sim smoke (4 flows incl. D14/D32 upgrade acceptance) |

**Total: 31 tasks.**

**Correctness-ordering note (the reason Phase 3 has 5 tasks not 4):** the Kyiv `FALLBACK_LOCATION` removal + the 4-gate `__computeEnabled` (Phase 3) and the TodayScreen no-location guard (D27) are two halves of ONE invariant. After Phase 3's useDailyNote change, the hook is disabled when `effectiveLocation === null` → `data === undefined`. TodayScreen's existing `isLoading`/`isError` guards both read `false` in the disabled state, so without the D27 guard it falls through to `data.response.daily_note` and CRASHES on any no-location device. The guard MUST land alongside the consumer-disabling change, NOT defer to Phase 5. The empty-state CTA's final target (`SetDefaultLocationScreen`) doesn't exist until Phase 5 → in Phase 3 the CTA points at a non-crashing target (`go('you')`); Phase 5 / Task 5.5 finalizes it to `go('set-default-location')`. EmptyStateHero is already skeleton-ready from Task 0.3 + polished in Task 5.4.

---

## Phase 0 — Foundational

Phase 0 creates skeletons so subsequent phases can build them out under TDD. No behavior shipped; no failing tests. Each task commits a single skeleton file.

### Task 0.1: `location-preference.ts` skeleton

**Spec:** §4.4, §4.8, §4.9, §4.10. Mirrors `apps/mobile/src/lib/activity-preference.ts`.

**Files:**
- Create: `apps/mobile/src/lib/location-preference.ts`

- [ ] **Step 1: Write the skeleton**

Create the file with this content:

```ts
import { useSyncExternalStore } from 'react';
import { storage } from './storage';
import { initActivityPreference, __readActivityHydrationStatusSync } from './activity-preference';
import type { SavedLocation } from './location-storage';

const KEY_DEFAULT_LOCATION = 'inceptio.default_location';
const KEY_ONBOARDING_LOCATION = 'inceptio.onboarding_location_step_v1';

type HydrationStatus = 'loading' | 'unset' | 'set';
export type OnboardingLocationStatus = 'pending' | 'skipped' | 'completed';

// Module-level state. RN-only — no SSR — so reusing getSnapshot for the third
// useSyncExternalStore arg (getServerSnapshot) is harmless. Mirrors
// activity-preference.ts shape exactly (spec §4.4 / D21).
let hydrationStatus: HydrationStatus = 'loading';
let currentDefault: SavedLocation | null = null;
let onboardingStatus: OnboardingLocationStatus = 'pending';
const listeners = new Set<() => void>();

/**
 * Defensive parser for stored default_location. Returns the parsed
 * SavedLocation if shape-valid, else undefined. Implementation lands in
 * Phase 1 / Task 1.2.
 */
export function parseStoredLocation(_raw: string | undefined): SavedLocation | undefined {
  throw new Error('not yet implemented — Phase 1 / Task 1.2');
}

/**
 * Idempotent. Called from App.js boot AFTER initActivityPreference() — but
 * defensively also calls initActivityPreference() at the top per D32 so a
 * future reorder cannot silently break D14's upgrade-path guarantee.
 * Implementation lands in Phase 1 / Task 1.2.
 */
export function initLocationPreference(): void {
  throw new Error('not yet implemented — Phase 1 / Task 1.2');
}

export function setDefaultLocation(_loc: SavedLocation): void {
  throw new Error('not yet implemented — Phase 1 / Task 1.2');
}

export function clearDefaultLocation(): void {
  throw new Error('not yet implemented — Phase 1 / Task 1.2');
}

export function markOnboardingLocationStatus(_s: OnboardingLocationStatus): void {
  throw new Error('not yet implemented — Phase 1 / Task 1.2');
}

export function getDefaultLocationSync(): SavedLocation | null {
  return currentDefault;
}

type Snapshot = {
  hydrationStatus: HydrationStatus;
  defaultLocation: SavedLocation | null;
  onboardingLocationStatus: OnboardingLocationStatus;
};

let snapshot: Snapshot = {
  hydrationStatus,
  defaultLocation: currentDefault,
  onboardingLocationStatus: onboardingStatus,
};

function getSnapshot(): Snapshot {
  if (
    snapshot.hydrationStatus !== hydrationStatus ||
    snapshot.defaultLocation !== currentDefault ||
    snapshot.onboardingLocationStatus !== onboardingStatus
  ) {
    snapshot = {
      hydrationStatus,
      defaultLocation: currentDefault,
      onboardingLocationStatus: onboardingStatus,
    };
  }
  return snapshot;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notify(): void {
  getSnapshot();
  listeners.forEach((fn) => fn());
}

export function useLocationPreference(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** @internal Test-only state reset. Not exported from the barrel. */
export function __resetForTests(): void {
  hydrationStatus = 'loading';
  currentDefault = null;
  onboardingStatus = 'pending';
  listeners.clear();
  snapshot = {
    hydrationStatus,
    defaultLocation: currentDefault,
    onboardingLocationStatus: onboardingStatus,
  };
}

/**
 * @internal Test-only: exposes the subscribe/getSnapshot pair so tests can
 * verify the external-store contract without a React rendering environment.
 * Mirrors activity-preference's same export.
 */
export function __getSubscribeAndSnapshot() {
  return { subscribe, getSnapshot };
}
```

- [ ] **Step 2: Confirm tsc clean for new file**

Run: `cd apps/mobile && npx tsc --noEmit 2>&1 | head -20`
Expected: only the pre-existing `cluster-windows.ts(108,35)` error. No new errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/src/lib/location-preference.ts && git commit -m "feat(location-preference): skeleton — mirrors activity-preference shape

Module state + Snapshot type + subscribe/getSnapshot/notify pattern in
place; init/setters throw 'not yet implemented'. Body lands in Phase 1
under TDD. Mirrors apps/mobile/src/lib/activity-preference.ts per
spec §4.4 + D21."
```

---

### Task 0.2: `useEffectiveLocation.ts` skeleton

**Spec:** §4.5, §8.2. Composition hook for the daily-note query.

**Files:**
- Create: `apps/mobile/src/hooks/useEffectiveLocation.ts`

- [ ] **Step 1: Write the skeleton**

```ts
import { useState } from 'react';
import { useLocationPreference } from '../lib/location-preference';
import { getLastLocation, type SavedLocation } from '../lib/location-storage';

/**
 * Composes the effective location used for daily-note + display.
 *
 * Precedence:
 *   default_location  →  lastSeed (mount-frozen mirror of last_location)  →  null
 *
 * The lastSeed is FROZEN at mount via lazy useState init. Per-search edits
 * to `last_location` do NOT poison Today's display by leaking back through
 * useEffectiveLocation. Only explicit `default_location` mutations propagate
 * reactively (via the useSyncExternalStore subscription inside
 * useLocationPreference). Spec §4.5 + D11.
 *
 * Returns null when neither default nor lastSeed is present. Callers (the
 * daily-note hook + TodayScreen empty-state guard) decide what to do with
 * null — typically: gate the query, render empty-state.
 *
 * IMPORTANT: do NOT use this hook inside the per-search flow. Per-search
 * intentionally treats each pick as fresh (the picker writes last_location
 * but reads nothing). D20.
 */
export function useEffectiveLocation(): SavedLocation | null {
  const { defaultLocation } = useLocationPreference();
  const [lastSeed] = useState(() => getLastLocation());
  return defaultLocation ?? lastSeed ?? null;
}
```

- [ ] **Step 2: tsc clean**

Run: `cd apps/mobile && npx tsc --noEmit 2>&1 | head -10`
Expected: only pre-existing cluster-windows error.

- [ ] **Step 3: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/src/hooks/useEffectiveLocation.ts && git commit -m "feat(useEffectiveLocation): composition hook with mount-frozen lastSeed

Returns default_location → frozen lastSeed → null. The lastSeed is captured
via lazy useState init so per-search edits to last_location do not poison
Today's display (D11). Default mutations propagate reactively via the
useLocationPreference subscription. Spec §4.5."
```

---

### Task 0.3: `EmptyStateHero.js` skeleton

**Spec:** §4.7, §5.3, D29.

**Files:**
- Create: `apps/mobile/src/components/daily-note/EmptyStateHero.js`

- [ ] **Step 1: Read sibling for style baseline**

```bash
cat /Users/user/Projects/inceptio/apps/mobile/src/components/daily-note/DailyHero.js | head -60
```

Note the LoadingHero / ErrorHero exports, the HeroBackdrop wrapper, the NativeWind classes used, and the import style. The skeleton below uses a minimal version; final styling lands in Task 5.4.

- [ ] **Step 2: Write the skeleton**

```js
// Empty-state hero rendered by TodayScreen when the user has completed
// onboarding (locationHydrationStatus === 'set') but has no effective
// location (effectiveLocation === null). Sibling of LoadingHero/ErrorHero.
// Final styling + voice copy lands in Phase 5 / Task 5.4 (D29).

import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeroGradient from '../HeroGradient';
import Starfield from '../Starfield';
import PrimaryButton from '../PrimaryButton';

export default function EmptyStateHero({ onSetLocation }) {
  return (
    <View className="flex-1 bg-base">
      <HeroGradient height={900}/>
      <Starfield density="light"/>
      <SafeAreaView className="flex-1 px-6">
        <View className="flex-1"/>
        <View className="items-center">
          <Text className="font-display-reg text-[28px] leading-[36px] text-cream text-center max-w-[320px]">
            Set a default location to see your daily timing.
          </Text>
        </View>
        <View className="flex-[1.5]"/>
        <View className="pb-8">
          <PrimaryButton onPress={onSetLocation}>Add a location</PrimaryButton>
        </View>
      </SafeAreaView>
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/src/components/daily-note/EmptyStateHero.js && git commit -m "feat(EmptyStateHero): skeleton — soft-anchor empty state for Today

New component file at apps/mobile/src/components/daily-note/EmptyStateHero.js.
Sibling of LoadingHero/ErrorHero per D29. TodayScreen renders this when
locationHydrationStatus === 'set' && effectiveLocation === null per D27.
Voice/copy polish lands in Phase 5."
```

---

### Task 0.4: `SetDefaultLocationScreen.js` skeleton

**Spec:** §4.2, §5.1, §5.2, §5.3, D22.

**Files:**
- Create: `apps/mobile/src/screens/SetDefaultLocationScreen.js`

- [ ] **Step 1: Write the skeleton**

```js
// Generalized set-default-location flow used by 3 entry points (D22):
//   1. Onboarding interceptor (dismissLabel="Skip for now", onDismissStatus="skipped")
//   2. YouScreen Settings row (dismissLabel="Cancel", onDismissStatus={null})
//   3. Today empty-state CTA (dismissLabel="Cancel", onDismissStatus={null} per D31)
//
// Renders LocationPickerScreen embedded=true as a child and supplies its
// own header chrome (soft-anchor heading + dismiss button). Full impl lands
// in Phase 5 / Task 5.1.

import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LocationPickerScreen from './LocationPickerScreen';
import { setDefaultLocation, markOnboardingLocationStatus } from '../lib/location-preference';

export default function SetDefaultLocationScreen({ go, dismissLabel = 'Cancel', onDismissStatus = null }) {
  const handleConfirm = (loc) => {
    setDefaultLocation(loc);
    // Onboarding entry passes onDismissStatus='skipped' but confirms write 'completed'.
    // Settings + empty-state entries pass null and don't touch the flag on confirm
    // unless onboarding-status is still 'pending' (covered by interceptor; can't
    // happen from those entry points).
    if (onDismissStatus !== null) {
      markOnboardingLocationStatus('completed');
    }
    go('today');
  };

  const handleDismiss = () => {
    if (onDismissStatus !== null) {
      markOnboardingLocationStatus(onDismissStatus);
    }
    go('today');
  };

  return (
    <View className="flex-1 bg-base">
      <SafeAreaView className="flex-1">
        <View className="flex-row justify-between items-center px-6 py-4">
          <Text className="font-display-reg text-[20px] text-cream">
            Where do you usually start from?
          </Text>
          <Text className="font-ui text-base text-muted" onPress={handleDismiss}>
            {dismissLabel}
          </Text>
        </View>
        <View className="flex-1">
          <LocationPickerScreen go={go} onConfirm={handleConfirm} embedded={true}/>
        </View>
      </SafeAreaView>
    </View>
  );
}
```

Note: `embedded` + `onConfirm` props will only WORK after Phase 4 (the contract extension). This skeleton is structurally correct but the embedded behavior (header suppression) won't fire until Phase 4. That's fine — Phase 5 wires everything together.

- [ ] **Step 2: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/src/screens/SetDefaultLocationScreen.js && git commit -m "feat(SetDefaultLocationScreen): skeleton — generalized flow for 3 entry points

Renders LocationPickerScreen embedded=true with onConfirm handler that
writes default_location + (conditionally) markOnboardingLocationStatus.
dismissLabel + onDismissStatus props differentiate entry-point semantics
per D22. embedded behavior fires after Phase 4 contract extension lands."
```

---

### Task 0.5: Export `__readActivityHydrationStatusSync()` from activity-preference (D28)

**Spec:** §4.4, §4.8, D28.

**Files:**
- Modify: `apps/mobile/src/lib/activity-preference.ts`
- Modify: `apps/mobile/src/lib/__tests__/activity-preference.test.ts` (append one test)

- [ ] **Step 1: Write the failing test FIRST**

Append to `apps/mobile/src/lib/__tests__/activity-preference.test.ts`:

```ts
  // --- D28: __readActivityHydrationStatusSync (added for location-preference) ---

  it('__readActivityHydrationStatusSync returns hydration status without subscribing', () => {
    initActivityPreference();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { __readActivityHydrationStatusSync } = require('../activity-preference');
    expect(__readActivityHydrationStatusSync()).toEqual({ hydrationStatus: 'unset' });
    memory.set(KEY, 'wedding');
    __resetForTests();
    initActivityPreference();
    expect(__readActivityHydrationStatusSync()).toEqual({ hydrationStatus: 'set' });
  });
```

(Note: the existing activity-preference.test.ts uses `test()`; this new case uses `it()` per the newer convention. Both work in vitest; keep `test()` on the existing cases to avoid noise in the diff.)

- [ ] **Step 2: Run to verify fail**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run src/lib/__tests__/activity-preference.test.ts 2>&1 | tail -15
```
Expected: 1 new test fails with "is not a function" — the export does not exist yet.

- [ ] **Step 3: Add the export**

In `apps/mobile/src/lib/activity-preference.ts`, after `__getSubscribeAndSnapshot` (last export), append:

```ts

/**
 * @internal Sync read of the hydration status without triggering a
 * subscription. Used by location-preference.ts initLocationPreference()
 * to decide the upgrade-path branch (D14) — fresh install vs existing
 * user with activity already 'set'. Returns the in-memory hydrationStatus;
 * does NOT re-read storage (initActivityPreference does that). D28.
 */
export function __readActivityHydrationStatusSync(): { hydrationStatus: HydrationStatus } {
  return { hydrationStatus };
}
```

- [ ] **Step 4: Run test — should pass**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run src/lib/__tests__/activity-preference.test.ts 2>&1 | tail -10
```
Expected: all activity-preference tests pass (previous count + 1).

- [ ] **Step 5: Full mobile suite still green**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run 2>&1 | tail -6
```
Expected: full suite passes; baseline was 70 (Phase 1+2 tz-fix end state); now 71.

- [ ] **Step 6: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/src/lib/activity-preference.ts apps/mobile/src/lib/__tests__/activity-preference.test.ts && git commit -m "feat(activity-preference): export __readActivityHydrationStatusSync (D28)

Helper exposes the in-memory hydrationStatus without triggering a
subscription. Consumed by location-preference.ts initLocationPreference()
for the D14 upgrade-path branch (existing users with activity 'set' get
onboarding status 'completed' so the new location interceptor does not
fire retroactively). Mirrors getDefaultActivitySync naming + pattern.
Spec §4.4 (mirror table) + §4.8 (init logic) + D28."
```

---

## Phase 1 — Storage primitives

### Task 1.1: Failing tests for `initLocationPreference()` + setters

**Spec:** §4.8, §4.9, §9.1, D14, D25, D32.

**Files:**
- Create: `apps/mobile/src/lib/__tests__/location-preference.test.ts`

- [ ] **Step 1: Write the test file**

```ts
// Tests for location-preference.ts (spec §4.8/§4.9/§4.10 + §9.1).
// Mirrors apps/mobile/src/lib/__tests__/activity-preference.test.ts shape.
// Uses it() per the newer Phase 1+2 convention.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const memory = new Map<string, string>();

vi.mock('../storage', () => ({
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

// activity-preference is mocked so location-preference's defensive
// initActivityPreference() call (D32) is observable + the
// __readActivityHydrationStatusSync read can be controlled by tests.
let mockActivityStatus: 'loading' | 'unset' | 'set' = 'loading';
const initActivitySpy = vi.fn(() => {
  mockActivityStatus = mockActivityStatus === 'loading' ? 'unset' : mockActivityStatus;
});

vi.mock('../activity-preference', () => ({
  initActivityPreference: () => initActivitySpy(),
  __readActivityHydrationStatusSync: () => ({ hydrationStatus: mockActivityStatus }),
}));

import {
  initLocationPreference,
  setDefaultLocation,
  clearDefaultLocation,
  markOnboardingLocationStatus,
  getDefaultLocationSync,
  parseStoredLocation,
  __resetForTests,
  __getSubscribeAndSnapshot,
} from '../location-preference';

const KEY_DEFAULT = 'inceptio.default_location';
const KEY_ONBOARDING = 'inceptio.onboarding_location_step_v1';

const SAMPLE_LOC = {
  lat: 35.68,
  lng: 139.69,
  city: 'Tokyo',
  country: 'Japan',
  timezone: 'Asia/Tokyo',
  selected_at: 1234567890,
};

beforeEach(() => {
  memory.clear();
  __resetForTests();
  mockActivityStatus = 'loading';
  initActivitySpy.mockClear();
});

describe('location-preference', () => {
  describe('parseStoredLocation', () => {
    it('returns parsed SavedLocation for valid JSON', () => {
      const raw = JSON.stringify(SAMPLE_LOC);
      expect(parseStoredLocation(raw)).toEqual(SAMPLE_LOC);
    });

    it('returns undefined for missing required fields', () => {
      const raw = JSON.stringify({ lat: 35.68 }); // missing lng, city, etc.
      expect(parseStoredLocation(raw)).toBeUndefined();
    });

    it('returns undefined for corrupt JSON', () => {
      expect(parseStoredLocation('{not json')).toBeUndefined();
    });

    it('returns undefined for undefined input', () => {
      expect(parseStoredLocation(undefined)).toBeUndefined();
    });
  });

  describe('initLocationPreference — fresh install', () => {
    it('with empty storage + activity unset → hydration set, default null, status pending', () => {
      mockActivityStatus = 'loading'; // initActivity will move it to 'unset'
      initLocationPreference();
      expect(initActivitySpy).toHaveBeenCalledTimes(1); // D32 defensive call
      const { getSnapshot } = __getSubscribeAndSnapshot();
      expect(getSnapshot()).toEqual({
        hydrationStatus: 'set',
        defaultLocation: null,
        onboardingLocationStatus: 'pending',
      });
      expect(memory.get(KEY_ONBOARDING)).toBe('pending');
    });

    it('with empty storage + activity already set (upgrade scenario) → status completed', () => {
      mockActivityStatus = 'set'; // simulate existing user with activity already chosen
      initLocationPreference();
      const { getSnapshot } = __getSubscribeAndSnapshot();
      expect(getSnapshot()).toEqual({
        hydrationStatus: 'set',
        defaultLocation: null,
        onboardingLocationStatus: 'completed',
      });
      expect(memory.get(KEY_ONBOARDING)).toBe('completed');
    });
  });

  describe('initLocationPreference — stored values', () => {
    it('parses valid default_location JSON', () => {
      memory.set(KEY_DEFAULT, JSON.stringify(SAMPLE_LOC));
      memory.set(KEY_ONBOARDING, 'completed');
      mockActivityStatus = 'set';
      initLocationPreference();
      expect(getDefaultLocationSync()).toEqual(SAMPLE_LOC);
    });

    it('clears corrupt default_location JSON + warns + leaves defaultLocation null', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      memory.set(KEY_DEFAULT, '{not json');
      mockActivityStatus = 'set';
      initLocationPreference();
      expect(memory.get(KEY_DEFAULT)).toBeUndefined();
      expect(getDefaultLocationSync()).toBeNull();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('[location-pref] invalid stored default'),
        expect.any(String),
      );
      warn.mockRestore();
    });

    it('honors stored valid onboarding status', () => {
      memory.set(KEY_ONBOARDING, 'skipped');
      mockActivityStatus = 'set';
      initLocationPreference();
      const { getSnapshot } = __getSubscribeAndSnapshot();
      expect(getSnapshot().onboardingLocationStatus).toBe('skipped');
    });

    it('resets invalid onboarding status string to completed + warns', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      memory.set(KEY_ONBOARDING, 'garbage');
      mockActivityStatus = 'set';
      initLocationPreference();
      expect(memory.get(KEY_ONBOARDING)).toBe('completed');
      const { getSnapshot } = __getSubscribeAndSnapshot();
      expect(getSnapshot().onboardingLocationStatus).toBe('completed');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('[location-pref] invalid onboarding status'),
        'garbage',
      );
      warn.mockRestore();
    });
  });

  describe('initLocationPreference — idempotency', () => {
    it('second call after set is a no-op', () => {
      mockActivityStatus = 'set';
      initLocationPreference();
      initLocationPreference();
      initLocationPreference();
      // initActivityPreference defensive call ran 3 times (each guarded
      // internally by activity's own idempotency); location-preference's
      // own guard prevents the body from running twice.
      expect(initActivitySpy).toHaveBeenCalledTimes(3);
      const { getSnapshot } = __getSubscribeAndSnapshot();
      expect(getSnapshot().hydrationStatus).toBe('set');
    });
  });

  describe('setters', () => {
    beforeEach(() => {
      mockActivityStatus = 'set';
      initLocationPreference();
    });

    it('setDefaultLocation updates in-memory + storage + notifies', () => {
      const { subscribe, getSnapshot } = __getSubscribeAndSnapshot();
      const snapshots: ReturnType<typeof getSnapshot>[] = [];
      const unsubscribe = subscribe(() => { snapshots.push(getSnapshot()); });

      setDefaultLocation(SAMPLE_LOC);

      expect(getSnapshot().defaultLocation).toEqual(SAMPLE_LOC);
      expect(memory.get(KEY_DEFAULT)).toBe(JSON.stringify(SAMPLE_LOC));
      expect(snapshots).toHaveLength(1);
      unsubscribe();
    });

    it('clearDefaultLocation clears in-memory + storage + notifies', () => {
      setDefaultLocation(SAMPLE_LOC);
      const { subscribe, getSnapshot } = __getSubscribeAndSnapshot();
      const snapshots: ReturnType<typeof getSnapshot>[] = [];
      const unsubscribe = subscribe(() => { snapshots.push(getSnapshot()); });

      clearDefaultLocation();

      expect(getSnapshot().defaultLocation).toBeNull();
      expect(memory.get(KEY_DEFAULT)).toBeUndefined();
      expect(snapshots).toHaveLength(1);
      unsubscribe();
    });

    it('markOnboardingLocationStatus updates flag + notifies', () => {
      const { subscribe, getSnapshot } = __getSubscribeAndSnapshot();
      const snapshots: ReturnType<typeof getSnapshot>[] = [];
      const unsubscribe = subscribe(() => { snapshots.push(getSnapshot()); });

      markOnboardingLocationStatus('skipped');

      expect(getSnapshot().onboardingLocationStatus).toBe('skipped');
      expect(memory.get(KEY_ONBOARDING)).toBe('skipped');
      expect(snapshots).toHaveLength(1);
      unsubscribe();
    });
  });

  describe('snapshot identity', () => {
    it('returns the same object reference across unrelated re-renders', () => {
      mockActivityStatus = 'set';
      initLocationPreference();
      setDefaultLocation(SAMPLE_LOC);
      const { getSnapshot } = __getSubscribeAndSnapshot();
      const first = getSnapshot();
      const second = getSnapshot();
      expect(second).toBe(first);
    });
  });
});
```

- [ ] **Step 2: Run — all tests fail at the throw statements**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run src/lib/__tests__/location-preference.test.ts 2>&1 | tail -20
```
Expected: ~16 tests, ALL fail with "not yet implemented" or thrown errors. The `parseStoredLocation` tests fail at the throw; init tests fail at the throw inside init.

- [ ] **Step 3: Commit failing tests**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/src/lib/__tests__/location-preference.test.ts && git commit -m "test(location-preference): add failing tests for init + setters (TDD red)

Mirrors activity-preference.test.ts shape. Covers spec §9.1 init cases
(fresh install, upgrade with activity 'set', stored value parsing, corrupt
JSON handling, idempotency) + setters + subscription. activity-preference
is mocked so the D32 defensive initActivityPreference() call is observable
and the upgrade-path branch is controllable. All tests fail; impl in 1.2."
```

---

### Task 1.2: Implement `initLocationPreference()` + setters

**Spec:** §4.8, §4.9, D14, D32.

**Files:**
- Modify: `apps/mobile/src/lib/location-preference.ts`

- [ ] **Step 1: Replace the skeleton bodies with implementations**

Replace `parseStoredLocation`, `initLocationPreference`, `setDefaultLocation`, `clearDefaultLocation`, `markOnboardingLocationStatus` with these bodies (the surrounding module state, types, snapshot machinery, and exports stay from Task 0.1):

```ts
/**
 * Defensive parser for stored default_location. Validates shape (lat/lng
 * numbers, city/country/timezone strings, selected_at number) before
 * returning. Returns undefined on parse error or missing fields so the
 * caller can clear corrupt storage. Mirrors getLastLocation's validation
 * in location-storage.ts.
 */
export function parseStoredLocation(raw: string | undefined): SavedLocation | undefined {
  if (raw === undefined) return undefined;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedLocation>;
    if (
      typeof parsed.lat !== 'number' ||
      typeof parsed.lng !== 'number' ||
      typeof parsed.city !== 'string' ||
      typeof parsed.country !== 'string' ||
      typeof parsed.timezone !== 'string' ||
      typeof parsed.selected_at !== 'number'
    ) {
      return undefined;
    }
    return {
      lat: parsed.lat,
      lng: parsed.lng,
      city: parsed.city,
      country: parsed.country,
      timezone: parsed.timezone,
      selected_at: parsed.selected_at,
    };
  } catch {
    return undefined;
  }
}

/**
 * Idempotent. Called from App.js boot AFTER initActivityPreference() — but
 * defensively also calls initActivityPreference() at the top per D32 so a
 * future reorder cannot silently break D14's upgrade-path guarantee.
 * The activity init's own idempotency guard makes the call a no-op if
 * activity-init already ran.
 */
export function initLocationPreference(): void {
  if (hydrationStatus !== 'loading') return;

  // 0. Defensive: ensure activity-preference is hydrated before we read its
  //    status for the D14 upgrade-path branch below. App.js calls
  //    initActivityPreference() first; this is belt-and-suspenders against a
  //    future reorder. initActivityPreference() is idempotent. D32.
  initActivityPreference();

  // 1. Default location primitive
  const rawDefault = storage.getString(KEY_DEFAULT_LOCATION);
  if (rawDefault) {
    const parsed = parseStoredLocation(rawDefault);
    if (parsed !== undefined) {
      currentDefault = parsed;
    } else {
      console.warn('[location-pref] invalid stored default, clearing:', rawDefault);
      storage.delete(KEY_DEFAULT_LOCATION);
    }
  }

  // 2. Onboarding-status primitive
  const rawStatus = storage.getString(KEY_ONBOARDING_LOCATION);
  if (rawStatus === undefined) {
    // First boot of this version. D14:
    // - existing user (activity 'set') → init 'completed' (no retroactive interceptor)
    // - fresh install (activity 'unset') → init 'pending' (interceptor fires after activity)
    const { hydrationStatus: activityStatus } = __readActivityHydrationStatusSync();
    const initStatus: OnboardingLocationStatus = activityStatus === 'set' ? 'completed' : 'pending';
    onboardingStatus = initStatus;
    storage.set(KEY_ONBOARDING_LOCATION, initStatus);
  } else if (rawStatus === 'pending' || rawStatus === 'skipped' || rawStatus === 'completed') {
    onboardingStatus = rawStatus;
  } else {
    console.warn('[location-pref] invalid onboarding status, resetting to completed:', rawStatus);
    onboardingStatus = 'completed';
    storage.set(KEY_ONBOARDING_LOCATION, 'completed');
  }

  hydrationStatus = 'set';
  notify();
}

/**
 * Same ordering as activity-preference: in-memory state updated BEFORE
 * storage.set. AsyncStorage async-flush failures are swallowed at the
 * storage-wrapper level; residual risk is documented and accepted (spec
 * EC-8 / activity-preference EC-14).
 */
export function setDefaultLocation(loc: SavedLocation): void {
  currentDefault = loc;
  storage.set(KEY_DEFAULT_LOCATION, JSON.stringify(loc));
  notify();
}

export function clearDefaultLocation(): void {
  currentDefault = null;
  storage.delete(KEY_DEFAULT_LOCATION);
  notify();
}

export function markOnboardingLocationStatus(s: OnboardingLocationStatus): void {
  onboardingStatus = s;
  storage.set(KEY_ONBOARDING_LOCATION, s);
  notify();
}
```

- [ ] **Step 2: Run — all 16 tests pass**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run src/lib/__tests__/location-preference.test.ts 2>&1 | tail -10
```
Expected: 16 passed.

- [ ] **Step 3: Full mobile suite + tsc**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run 2>&1 | tail -6
cd /Users/user/Projects/inceptio/apps/mobile && npx tsc --noEmit 2>&1 | head -10
```
Expected: 71 (Phase 0 baseline) + 16 = 87 mobile tests pass; tsc only pre-existing cluster-windows error.

- [ ] **Step 4: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/src/lib/location-preference.ts && git commit -m "feat(location-preference): impl init + setters (TDD green)

initLocationPreference branches on activity-preference state for the D14
upgrade-path (existing 'set' → 'completed'; fresh 'unset' → 'pending').
Defensively calls initActivityPreference() at top per D32. Setters mirror
activity-preference's in-memory-then-storage ordering (EC-8). All 16
location-preference tests green; full mobile suite 87/87."
```

---

### Task 1.3: Wire `initLocationPreference()` into App.js boot effect

**Spec:** §7.2. App.js boot order: migrateLocationTimezones_v1 → initActivityPreference → initLocationPreference → setStorageReady(true).

**Files:**
- Modify: `apps/mobile/App.js`

- [ ] **Step 1: Add the import**

In `apps/mobile/App.js`, find the existing import at line 21:
```js
import { initActivityPreference, useActivityPreference } from './src/lib/activity-preference';
```

Add this import immediately after it:
```js
import { initLocationPreference, useLocationPreference } from './src/lib/location-preference';
```

- [ ] **Step 2: Add the init call inside the hydrate effect**

In the existing `useEffect` block at lines 81–97, modify the `.then()` body to add the new init call between `initActivityPreference()` and `setStorageReady(true)`:

```js
useEffect(() => {
  hydrateStorage().then(() => {
    storage.delete('inceptio.results_view');
    migrateLocationTimezones_v1();
    initActivityPreference();
    // NEW: location-preference init AFTER activity-init (D14 upgrade path reads activity status).
    // Defensive D32 call inside initLocationPreference is belt-and-suspenders.
    initLocationPreference();
    setStorageReady(true);
  });
}, []);
```

- [ ] **Step 3: Subscribe at the top of the component (Rules of Hooks)**

Find the existing `useActivityPreference()` call at line 121 (`const { hydrationStatus } = useActivityPreference();`). Add a parallel `useLocationPreference` subscription immediately after:

```js
const { hydrationStatus } = useActivityPreference();
// Subscribe to location-preference so the interceptor block in Phase 5
// (Task 5.3) re-renders on status change. Hook call site MUST be above
// the boot gate per Rules of Hooks (lesson from activity-pref Task 6.2).
const {
  hydrationStatus: locationHydrationStatus,
  onboardingLocationStatus,
} = useLocationPreference();
```

(The destructured values aren't used yet — Phase 5 wires them into the interceptor. This subscription is here NOW so the hook call site is established before any conditional return; placing it later would risk the Rules-of-Hooks regression the activity work hit.)

- [ ] **Step 4: tsc + full suite**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx tsc --noEmit 2>&1 | head -10
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run 2>&1 | tail -6
```
Expected: tsc only pre-existing cluster-windows error; 87 mobile tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/App.js && git commit -m "feat(app): wire initLocationPreference into boot + subscribe at component top

initLocationPreference runs in the hydrateStorage().then() chain after
initActivityPreference so D14 upgrade-path branch can read activity
status. useLocationPreference subscription is hoisted above the boot gate
per Rules of Hooks (lesson from activity-pref Task 6.2). Destructured
values await wire-up in Phase 5 Task 5.3. Spec §7.2."
```

---

## Phase 2 — Hook (useLocationPreference + useEffectiveLocation)

### Task 2.1: Failing tests for `useLocationPreference()` snapshot stability

**Spec:** §4.10, §8.1, §9.1 (subscription tests).

**Files:**
- Modify: `apps/mobile/src/lib/__tests__/location-preference.test.ts`

- [ ] **Step 1: Append hook-specific tests**

At the bottom of the test file (after the `describe('snapshot identity', ...)` block), append:

```ts
describe('useLocationPreference (external store contract)', () => {
  beforeEach(() => {
    mockActivityStatus = 'set';
    initLocationPreference();
  });

  it('subscribe receives notify on setDefaultLocation', () => {
    const { subscribe } = __getSubscribeAndSnapshot();
    const cb = vi.fn();
    const unsubscribe = subscribe(cb);
    setDefaultLocation(SAMPLE_LOC);
    expect(cb).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('subscribe receives notify on markOnboardingLocationStatus', () => {
    const { subscribe } = __getSubscribeAndSnapshot();
    const cb = vi.fn();
    const unsubscribe = subscribe(cb);
    markOnboardingLocationStatus('skipped');
    expect(cb).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('subscribe receives notify on clearDefaultLocation', () => {
    setDefaultLocation(SAMPLE_LOC);
    const { subscribe } = __getSubscribeAndSnapshot();
    const cb = vi.fn();
    const unsubscribe = subscribe(cb);
    clearDefaultLocation();
    expect(cb).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('unsubscribe removes the listener', () => {
    const { subscribe } = __getSubscribeAndSnapshot();
    const cb = vi.fn();
    const unsubscribe = subscribe(cb);
    unsubscribe();
    setDefaultLocation(SAMPLE_LOC);
    expect(cb).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — 4 new tests pass**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run src/lib/__tests__/location-preference.test.ts 2>&1 | tail -10
```
Expected: 20 tests pass (16 existing + 4 new). The store machinery from Task 0.1's skeleton already satisfies the subscription contract.

- [ ] **Step 3: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/src/lib/__tests__/location-preference.test.ts && git commit -m "test(location-preference): add subscription contract tests

4 cases for the subscribe/notify behavior of the external store: notify
fires on setDefaultLocation, clearDefaultLocation, markOnboardingLocationStatus;
unsubscribe removes the listener. Mirrors activity-preference's
setDefaultActivity subscription test pattern. Spec §9.1."
```

---

### Task 2.2: `useLocationPreference()` — already implemented in Phase 0, verify

**Spec:** §4.10, §8.1.

**Files:**
- (verify only — implementation landed in Task 0.1's skeleton)

- [ ] **Step 1: Read the export from Phase 0**

```bash
grep -A 3 "export function useLocationPreference" /Users/user/Projects/inceptio/apps/mobile/src/lib/location-preference.ts
```
Expected: function exists, returns `useSyncExternalStore(subscribe, getSnapshot, getSnapshot)`.

- [ ] **Step 2: Type the consumer destructure works**

Add a one-line type test at the bottom of `location-preference.test.ts` to confirm the snapshot type accepts the destructure pattern App.js uses:

```ts
describe('useLocationPreference type', () => {
  it('snapshot shape matches consumer destructure', () => {
    mockActivityStatus = 'set';
    initLocationPreference();
    const { getSnapshot } = __getSubscribeAndSnapshot();
    const snap = getSnapshot();
    // Type-level check: destructure must work without runtime error.
    const { hydrationStatus, defaultLocation, onboardingLocationStatus } = snap;
    expect(hydrationStatus).toBe('set');
    expect(defaultLocation).toBeNull();
    expect(onboardingLocationStatus).toBe('completed');
  });
});
```

- [ ] **Step 3: Run + verify**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run src/lib/__tests__/location-preference.test.ts 2>&1 | tail -8
```
Expected: 21 tests pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/src/lib/__tests__/location-preference.test.ts && git commit -m "test(location-preference): add useLocationPreference snapshot type test

Confirms the destructure shape App.js uses (hydrationStatus + defaultLocation
+ onboardingLocationStatus) matches the snapshot's TypeScript type. Hook
itself shipped in Phase 0 Task 0.1's skeleton; this test pins the consumer
contract. Spec §4.10 + §8.1."
```

---

### Task 2.3: Failing tests for `useEffectiveLocation()` (mount-frozen + reactive)

**Spec:** §4.5, §9.2, D11.

**Files:**
- Create: `apps/mobile/src/hooks/__tests__/useEffectiveLocation.test.ts`

- [ ] **Step 1: Write the test file**

```ts
// Tests for useEffectiveLocation (spec §4.5/§9.2).
// Hook composition: defaultLocation (reactive) ?? lastSeed (mount-frozen) ?? null.
// The mount-frozen invariant (D11) is the load-bearing assertion.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const memory = new Map<string, string>();

vi.mock('../../lib/storage', () => ({
  storage: {
    getString(key: string) { return memory.get(key); },
    set(key: string, value: string) { memory.set(key, value); },
    delete(key: string) { memory.delete(key); },
  },
}));

let mockActivityStatus: 'loading' | 'unset' | 'set' = 'set';
vi.mock('../../lib/activity-preference', () => ({
  initActivityPreference: vi.fn(),
  __readActivityHydrationStatusSync: () => ({ hydrationStatus: mockActivityStatus }),
}));

import { renderHook, act } from '@testing-library/react-hooks';
// NOTE: if @testing-library/react-hooks is not installed, use Path B:
// drop the renderHook usage and test the composition logic directly via
// useState init + module-state observation. See activity-preference.test.ts
// for the precedent (test the subscribe/getSnapshot pair, not the hook).

import { useEffectiveLocation } from '../useEffectiveLocation';
import {
  initLocationPreference,
  setDefaultLocation,
  clearDefaultLocation,
  __resetForTests as resetLocationPref,
} from '../../lib/location-preference';
import { saveLocation, clearLocation } from '../../lib/location-storage';

const TOKYO = {
  lat: 35.68, lng: 139.69, city: 'Tokyo', country: 'Japan',
  timezone: 'Asia/Tokyo', selected_at: 1,
};
const KYIV = {
  lat: 50.45, lng: 30.52, city: 'Kyiv', country: 'Ukraine',
  timezone: 'Europe/Kyiv', selected_at: 2,
};

beforeEach(() => {
  memory.clear();
  resetLocationPref();
  mockActivityStatus = 'set';
  initLocationPreference();
});

describe('useEffectiveLocation', () => {
  it('returns defaultLocation when set', () => {
    setDefaultLocation(TOKYO);
    const { result } = renderHook(() => useEffectiveLocation());
    expect(result.current).toEqual(TOKYO);
  });

  it('returns mount-frozen lastSeed when no default', () => {
    saveLocation(KYIV);
    const { result } = renderHook(() => useEffectiveLocation());
    expect(result.current).toEqual(KYIV);
  });

  it('returns null when both null', () => {
    const { result } = renderHook(() => useEffectiveLocation());
    expect(result.current).toBeNull();
  });

  it('D11 mount-frozen invariant — per-search edit does NOT poison Today seed', () => {
    saveLocation(KYIV);
    const { result, rerender } = renderHook(() => useEffectiveLocation());
    expect(result.current).toEqual(KYIV);
    // Simulate per-search edit updating last_location to Tokyo.
    saveLocation(TOKYO);
    rerender();
    // The hook should STILL return KYIV (the mount-frozen seed).
    // If this fails, D11's anti-leak protection is broken.
    expect(result.current).toEqual(KYIV);
  });

  it('default reactivity — setDefaultLocation triggers re-render with new value', () => {
    saveLocation(KYIV);
    const { result, rerender } = renderHook(() => useEffectiveLocation());
    expect(result.current).toEqual(KYIV); // seed
    act(() => {
      setDefaultLocation(TOKYO);
    });
    rerender();
    expect(result.current).toEqual(TOKYO); // default wins
  });

  it('clearing default falls through to mount-frozen lastSeed', () => {
    saveLocation(KYIV);
    setDefaultLocation(TOKYO);
    const { result, rerender } = renderHook(() => useEffectiveLocation());
    expect(result.current).toEqual(TOKYO);
    act(() => {
      clearDefaultLocation();
    });
    rerender();
    expect(result.current).toEqual(KYIV); // falls through to seed
  });
});
```

- [ ] **Step 2: Run — check whether renderHook is available**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run src/hooks/__tests__/useEffectiveLocation.test.ts 2>&1 | tail -15
```

**Two possible outcomes:**

(A) `@testing-library/react-hooks` is installed → all 6 tests pass directly (since `useEffectiveLocation` was implemented in Task 0.2).

(B) Module not found → switch to Path B (direct module-state observation, no React rendering). Replace the test bodies with:
- Read `useLocationPreference`'s exported `__getSubscribeAndSnapshot` to drive the default reactivity
- Inline-extract the precedence logic via a small test helper: `(defaultLocation, lastSeed) => defaultLocation ?? lastSeed ?? null` and assert on it

If Path B: re-write the failing tests as composition-logic tests + an additional integration-style test via `renderHook` from `@testing-library/react-native` if it's installed. The mount-frozen assertion (D11) is the only test that genuinely requires React rendering — for that one, you can extract the lazy-init logic into a tiny inline helper inside the hook file and unit-test the helper.

- [ ] **Step 3: Commit (tests + Path A/B note)**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/src/hooks/__tests__/useEffectiveLocation.test.ts && git commit -m "test(useEffectiveLocation): mount-frozen + reactive default tests

6 cases: default-wins, seed-fallback, both-null, D11 mount-frozen
invariant (per-search edit does NOT poison Today seed), default
reactivity via setDefaultLocation, clear falls through to seed.
Hook landed in Phase 0 Task 0.2 skeleton; these tests pin the
contract. Path A uses @testing-library/react-hooks; Path B
(if RNTL missing) falls back to direct module-state observation."
```

---

### Task 2.4: Implement `useEffectiveLocation()` — already implemented in Phase 0, verify

**Spec:** §4.5, D11.

**Files:**
- (verify only — implementation landed in Task 0.2's skeleton)

- [ ] **Step 1: Confirm the hook returns the composition**

```bash
cat /Users/user/Projects/inceptio/apps/mobile/src/hooks/useEffectiveLocation.ts
```
Expected: returns `defaultLocation ?? lastSeed ?? null` with `lastSeed = useState(() => getLastLocation())[0]`.

- [ ] **Step 2: Full mobile suite + tsc**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run 2>&1 | tail -6
cd /Users/user/Projects/inceptio/apps/mobile && npx tsc --noEmit 2>&1 | head -10
```
Expected: prior count + 6 new (Path A) OR + 1-2 (Path B helper tests) = ~93 or ~88 total; tsc only pre-existing cluster-windows.

- [ ] **Step 3: Commit (verification only — no code change)**

If suite + tsc are clean, NO commit is needed (impl landed in 0.2; tests landed in 2.3). Skip if green.

---

## Phase 3 — useDailyNote integration + FALLBACK_LOCATION removal

### Task 3.1: Failing tests for extended `__computeEnabled`

**Spec:** §4.6, §8.4, §9.3.

**Files:**
- Modify: `apps/mobile/src/hooks/__tests__/useDailyNote.test.ts`

- [ ] **Step 1: Read current test file shape**

```bash
cat /Users/user/Projects/inceptio/apps/mobile/src/hooks/__tests__/useDailyNote.test.ts
```
Confirm imports include `__computeEnabled` from `../useDailyNote.helpers` and existing `ComputeEnabledArgs`-style cases.

- [ ] **Step 2: Add the new test cases**

At the bottom of the existing `describe('__computeEnabled', ...)` block (or in a new describe), append:

```ts
  // --- Phase 3 / Task 3.1: 4-gate extension for location dimension ---

  it('returns false when locationHydrationStatus is "loading"', () => {
    expect(__computeEnabled({
      activityHydrationStatus: 'set',
      locationHydrationStatus: 'loading',
      activity: 'wedding',
      effectiveLocation: { lat: 1, lng: 1, city: 'X', country: 'Y', timezone: 'UTC', selected_at: 0 },
    })).toBe(false);
  });

  it('returns false when effectiveLocation is null', () => {
    expect(__computeEnabled({
      activityHydrationStatus: 'set',
      locationHydrationStatus: 'set',
      activity: 'wedding',
      effectiveLocation: null,
    })).toBe(false);
  });

  it('returns true when all four gates green', () => {
    expect(__computeEnabled({
      activityHydrationStatus: 'set',
      locationHydrationStatus: 'set',
      activity: 'wedding',
      effectiveLocation: { lat: 35.68, lng: 139.69, city: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo', selected_at: 0 },
    })).toBe(true);
  });
});
```

Also update the EXISTING `__computeEnabled` tests in the file to add the two new args (`locationHydrationStatus: 'set'` and `effectiveLocation: <stub>`) — without these, the existing tests will fail typecheck once Task 3.2 extends the type.

- [ ] **Step 3: Run — new tests fail, existing tests fail typecheck**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run src/hooks/__tests__/useDailyNote.test.ts 2>&1 | tail -20
```
Expected: 3 new tests fail (current __computeEnabled signature doesn't accept the new args); existing tests may also fail typecheck if the new args are required.

- [ ] **Step 4: Commit failing tests**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/src/hooks/__tests__/useDailyNote.test.ts && git commit -m "test(useDailyNote): add failing tests for __computeEnabled 4-gate extension

3 new cases: false when locationHydrationStatus='loading'; false when
effectiveLocation=null; true when all four gates green. Existing
ComputeEnabledArgs cases extended with the two new fields. All fail
until Phase 3 Task 3.2 extends the signature."
```

---

### Task 3.2: Extend `ComputeEnabledArgs` + `__computeEnabled` to 4 gates

**Spec:** §4.6, §8.4.

**Files:**
- Modify: `apps/mobile/src/hooks/useDailyNote.helpers.ts`

- [ ] **Step 1: Read current shape**

```bash
cat /Users/user/Projects/inceptio/apps/mobile/src/hooks/useDailyNote.helpers.ts
```

- [ ] **Step 2: Extend type + function**

Find:
```ts
type ComputeEnabledArgs = {
  hydrationStatus: HydrationStatus;
  activity: Activity | undefined;
};

export function __computeEnabled(args: ComputeEnabledArgs): boolean {
  return args.hydrationStatus === 'set' && args.activity !== undefined;
}
```

Replace with:
```ts
import type { SavedLocation } from '../lib/location-storage';

type ComputeEnabledArgs = {
  activityHydrationStatus: HydrationStatus;
  locationHydrationStatus: HydrationStatus;
  activity: Activity | undefined;
  effectiveLocation: SavedLocation | null;
};

export function __computeEnabled(args: ComputeEnabledArgs): boolean {
  return args.activityHydrationStatus === 'set'
    && args.locationHydrationStatus === 'set'
    && args.activity !== undefined
    && args.effectiveLocation !== null;
}
```

(If the file's existing `hydrationStatus` field is named differently, adapt — but the test in Task 3.1 uses `activityHydrationStatus` so the rename has to land in this task.)

- [ ] **Step 3: Run — tests now pass**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run src/hooks/__tests__/useDailyNote.test.ts 2>&1 | tail -10
```
Expected: all useDailyNote tests pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/src/hooks/useDailyNote.helpers.ts && git commit -m "feat(useDailyNote.helpers): extend __computeEnabled to 4-gate

ComputeEnabledArgs renames hydrationStatus to activityHydrationStatus
and adds locationHydrationStatus + effectiveLocation. __computeEnabled
returns true only when all four gates green: activity hydrated, location
hydrated, activity defined, effectiveLocation non-null. Spec §4.6 + §8.4."
```

---

### Task 3.3: Remove FALLBACK_LOCATION + empty-deps useMemo; wire useDailyNote to useEffectiveLocation

**Spec:** §4.6, §2 (FALLBACK_LOCATION as headline bug).

**Files:**
- Modify: `apps/mobile/src/hooks/useDailyNote.ts`

- [ ] **Step 1: Read current shape**

```bash
cat /Users/user/Projects/inceptio/apps/mobile/src/hooks/useDailyNote.ts
```

- [ ] **Step 2: Rewrite the hook body**

Replace the hook's body per spec §4.6:

```ts
import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { getDailyNote, type DailyNoteResult } from '../lib/api';
import { storage } from '../lib/storage';
import { useActivityPreference } from '../lib/activity-preference';
import { useLocationPreference } from '../lib/location-preference';
import { useEffectiveLocation } from './useEffectiveLocation';
import { __computeQueryKey, __computeEnabled } from './useDailyNote.helpers';

const KEY_LIBRARY_VERSION = 'inceptio.daily_note_library_version';

function isoTodayInTz(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}

/**
 * Today screen's data source.
 *
 * Location reads via useEffectiveLocation (default ?? mount-frozen lastSeed ?? null).
 * The Kyiv FALLBACK_LOCATION + empty-deps useMemo from prior versions are
 * RETIRED — the query is gated by __computeEnabled when effectiveLocation
 * is null, and TodayScreen renders EmptyStateHero in that path (D27).
 * Spec §4.6.
 *
 * Activity reactivity unchanged: useActivityPreference subscribes via
 * useSyncExternalStore; setDefaultActivity triggers a refetch through
 * queryKey content change.
 */
export function useDailyNote(): UseQueryResult<DailyNoteResult, Error> {
  const queryClient = useQueryClient();
  const { hydrationStatus: activityHydrationStatus, activity } = useActivityPreference();
  const { hydrationStatus: locationHydrationStatus } = useLocationPreference();
  const effectiveLocation = useEffectiveLocation();

  // Sentinel values are NEVER sent — __computeEnabled gates the query when
  // effectiveLocation is null. They exist so the query-key types stay
  // consistent during the disabled window.
  const lat = effectiveLocation !== null ? round2(effectiveLocation.lat) : 0;
  const lng = effectiveLocation !== null ? round2(effectiveLocation.lng) : 0;
  const tz  = effectiveLocation !== null ? effectiveLocation.timezone : 'UTC';

  const todayIsoDate = useMemo(() => isoTodayInTz(tz), [tz]);

  const query = useQuery<DailyNoteResult, Error>({
    queryKey: __computeQueryKey({ lat, lng, tz, todayIsoDate, activity }),
    queryFn: () => getDailyNote({ lat, lng, tz, activity: activity! }),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: __computeEnabled({
      activityHydrationStatus,
      locationHydrationStatus,
      activity,
      effectiveLocation,
    }),
  });

  useEffect(() => {
    if (!query.data) return;
    const incoming = query.data.response.library_version;
    const lastSeen = storage.getString(KEY_LIBRARY_VERSION);
    if (lastSeen !== incoming) {
      storage.set(KEY_LIBRARY_VERSION, incoming);
      queryClient.invalidateQueries({ queryKey: ['daily-note'] });
    }
  }, [query.data, queryClient]);

  return query;
}
```

Removed: `FALLBACK_LOCATION` constant; the empty-deps `useMemo`; the `getLastLocation` import; the inline `loc` reading. All four retire together.

- [ ] **Step 3: tsc + tests**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx tsc --noEmit 2>&1 | head -10
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run 2>&1 | tail -6
```
Expected: tsc only pre-existing cluster-windows error; full suite green.

If any pre-existing test breaks (e.g. TodayScreen integration that depended on Kyiv fallback), THAT is the surface Phase 5 Task 5.5 will fix — flag it but don't fix here.

- [ ] **Step 4: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/src/hooks/useDailyNote.ts && git commit -m "feat(useDailyNote): retire FALLBACK_LOCATION + empty-deps useMemo

Hook now reads via useLocationPreference + useEffectiveLocation. Sentinel
lat=0/lng=0/tz='UTC' values are NEVER sent (__computeEnabled gates the
query when effectiveLocation is null). TodayScreen renders EmptyStateHero
in that path per D27 (wired in Phase 5 Task 5.5). The Kyiv silent-
substitution bug + the useMemo([]) lockup retire together. Spec §4.6."
```

---

### Task 3.4: TodayScreen no-location guard (PROVISIONAL CTA — finalized in Phase 5)

**Spec:** §4.7, §5.4, D26, D27. **Correctness-paired with Task 3.3** — after 3.3, `useDailyNote` returns `data === undefined` when `effectiveLocation === null`, and TodayScreen's existing `isLoading`/`isError` checks both read false in that disabled state. Without this guard, TodayScreen falls through to `data.response.daily_note` and **crashes** on any no-location device. This task closes that window the moment data can be absent.

**Why provisional CTA:** `SetDefaultLocationScreen` is not registered yet (lands in Phase 5 Task 5.2), so `go('set-default-location')` would crash. In the interim, the CTA points at `go('you')` — YouScreen exists today, the route is non-crashing, and from YouScreen the user can (in Phase 5 onward) reach the Default-location row. Task 5.5 finalizes the CTA target to `go('set-default-location')`.

**Files:**
- Modify: `apps/mobile/src/screens/TodayScreen.js`

- [ ] **Step 1: Read current shape**

```bash
cat /Users/user/Projects/inceptio/apps/mobile/src/screens/TodayScreen.js
```

- [ ] **Step 2: Modify**

Replace the imports block to include EmptyStateHero + location hooks:

```js
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useDailyNote } from '../hooks/useDailyNote';
import { useLocationPreference } from '../lib/location-preference';
import { useEffectiveLocation } from '../hooks/useEffectiveLocation';
import DailyNoteSection from '../components/daily-note/DailyNoteSection';
import { LoadingHero, ErrorHero } from '../components/daily-note/DailyHero';
import EmptyStateHero from '../components/daily-note/EmptyStateHero';
import StatePicker from '../components/StatePicker';
import PrimaryButton from '../components/PrimaryButton';
import { getSavedMoments } from '../lib/draft-store';
```

Modify the component body — add the location hooks at top and prepend the empty-state guard:

```js
export default function TodayScreen({ go }) {
  const { hydrationStatus: locationHydrationStatus } = useLocationPreference();
  const effectiveLocation = useEffectiveLocation();
  const { data, isLoading, isError, error, refetch } = useDailyNote();
  const [moodOverride, setMoodOverride] = useState(null);

  // Empty-state guard FIRST — fires when location hydration is done AND no
  // effective location resolves. Must come before isLoading/isError because
  // when useDailyNote is enabled=false, isLoading is false too, and the next
  // check would fall through to `data.response.daily_note` on undefined data
  // → crash. D27.
  //
  // PROVISIONAL CTA target: go('you'). SetDefaultLocationScreen isn't
  // registered yet (Phase 5 Task 5.2); routing there would crash. YouScreen
  // exists today and is a non-crashing landing. Task 5.5 finalizes the
  // target to go('set-default-location') once the screen is registered.
  if (locationHydrationStatus === 'set' && effectiveLocation === null) {
    return <EmptyStateHero onSetLocation={() => go('you')}/>;
  }

  if (isLoading) return <LoadingHero/>;
  if (isError) return <ErrorHero error={error} onRetry={refetch}/>;

  const dailyNote = data.response.daily_note;
  const renderedMood = moodOverride ?? dailyNote.mood;
  const savedMomentsCount = getSavedMoments().length;

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ paddingBottom: 120 }}>
      <DailyNoteSection
        dailyNote={{ ...dailyNote, mood: renderedMood }}
        savedMomentsCount={savedMomentsCount}
        onInvitePress={() => go('picker')}
      />

      {__DEV__ && (
        <StatePicker
          value={renderedMood}
          onChange={setMoodOverride}
          options={[
            ['strong', 'A · strong'],
            ['good',   'B · good'],
            ['mixed',  'C · mixed'],
            ['closed', 'D · closed'],
          ]}
        />
      )}

      <View className="px-6 mt-7">
        <PrimaryButton onPress={() => go('picker')}>Find a moment for…</PrimaryButton>
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 3: tsc + suite**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx tsc --noEmit 2>&1 | head -10
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run 2>&1 | tail -6
```
Expected: tsc only pre-existing `cluster-windows.ts(108,35)` error; suite passes (existing TodayScreen consumers either don't have unit tests or use mocked queries that bypass the empty-state path; if any test breaks because it didn't supply `locationHydrationStatus`, update that mock setup).

- [ ] **Step 4: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/src/screens/TodayScreen.js && git commit -m "feat(TodayScreen): no-location guard (provisional CTA target — Phase 3)

Pair with Task 3.3 — after the useDailyNote 4-gate change, data is
undefined when effectiveLocation is null. The existing isLoading/isError
guards both read false in that disabled state, so without this guard
TodayScreen falls through to data.response.daily_note and crashes on
any no-location device. The D27 two-part check fires the EmptyStateHero
the moment the consumer can be data-less.

CTA target is PROVISIONAL: go('you') is non-crashing today; Task 5.5
finalizes it to go('set-default-location') once the screen is registered
in Phase 5 Task 5.2. Spec §4.7 + §5.4 + D27."
```

---

### Task 3.5: Full suite verification — Phase 3 gate

**Spec:** §9.8.

- [ ] **Step 1: Full mobile vitest**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run 2>&1 | tail -6
```
Expected: count reflects Phase 0-3 additions cleanly. If any test breaks because it depended on `FALLBACK_LOCATION`, that test needs its expectation updated — the failure is correct (the bug is gone); the test is stale. Update individual tests if needed; do NOT re-introduce the fallback.

- [ ] **Step 2: tsc — no NEW errors**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx tsc --noEmit 2>&1 | head -10
```
Expected: ONLY the known pre-existing `cluster-windows.ts(108,35): error TS2345` (EC-13 / memo `tz-fix-pre-existing-debt`; predates branch; not introduced by this work). Any OTHER error is a real regression — fix before declaring Phase 3 complete. Do NOT count the cluster-windows error as a failure.

- [ ] **Step 3: TodayScreen non-crashability gate (NEW)**

This is the Phase 3 checkpoint the user verifies. Confirm the change in Task 3.4 means a no-location device DOES NOT crash TodayScreen:

```bash
grep -n "EmptyStateHero\|locationHydrationStatus === 'set' && effectiveLocation === null" /Users/user/Projects/inceptio/apps/mobile/src/screens/TodayScreen.js
```
Expected: the import line + the guard line both present, BEFORE the `isLoading`/`isError` checks.

- [ ] **Step 4: No commit if everything green**

If suite + tsc + grep clean, no commit. If a stale test had to be updated, commit:

```bash
cd /Users/user/Projects/inceptio && git add <touched test files> && git commit -m "test: update stale tests after FALLBACK_LOCATION removal"
```

---

## Phase 4 — LocationPickerScreen contract extension

### Task 4.1: Failing tests for `onConfirm` + `embedded`

**Spec:** §4.3, §9.4, D16, D22, D30.

**Files:**
- Create: `apps/mobile/src/screens/__tests__/LocationPickerScreen.contract.test.js`

- [ ] **Step 1: Write the failing tests**

Mobile test environment may not have full React Native rendering. Use Path B — assert on the props the component should accept and the dispatch behavior at the call-site level:

```js
// Contract tests for LocationPickerScreen's onConfirm + embedded extension.
// Path B (no RNTL): verify the picker's exported default function accepts
// the new props in its signature and that the per-search caller passes
// only `onConfirm={() => go('loading')}` per D30.

import { describe, it, expect } from 'vitest';
import LocationPickerScreen from '../LocationPickerScreen';

describe('LocationPickerScreen contract', () => {
  it('default export is a function component', () => {
    expect(typeof LocationPickerScreen).toBe('function');
  });

  // The actual onConfirm/embedded behavior is exercised by the existing
  // Maestro flow 04-location-picker-regression.yaml (per-search regression)
  // and by the new Maestro flow 05-onboarding-location-step.yaml (embedded
  // mode in onboarding context). Both run in Phase 6.
  //
  // We do NOT renderHook or shallow-render here because the picker imports
  // expo-location + Nominatim and the test environment is node-only.
  // The contract is enforced by:
  //   (a) tsc — onConfirm and embedded must be in the prop type
  //   (b) Maestro 04 — per-search caller's onConfirm wiring works end-to-end
  //   (c) Maestro 05 — embedded mode suppresses header
});
```

- [ ] **Step 2: Run — passes already if default export exists**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run src/screens/__tests__/LocationPickerScreen.contract.test.js 2>&1 | tail -8
```
Expected: 1 passes (the default-export check).

- [ ] **Step 3: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/src/screens/__tests__/LocationPickerScreen.contract.test.js && git commit -m "test(LocationPickerScreen): add contract pin-test

Path B test: pins that the default export exists. Behavioral coverage
of the onConfirm + embedded contract extension is via Maestro 04
(per-search regression) and Maestro 05 (embedded onboarding flow) in
Phase 6. RNTL is not installed; node-only environment can't render the
picker's expo-location + Nominatim chain."
```

---

### Task 4.2: Add `onConfirm` + `embedded` props to LocationPickerScreen

**Spec:** §4.3.

**Files:**
- Modify: `apps/mobile/src/screens/LocationPickerScreen.js`

- [ ] **Step 1: Read the current call signature + the three hardcoded `go()` sites**

```bash
grep -n "^export default\|go('loading'\|go('date'\|go('today')" /Users/user/Projects/inceptio/apps/mobile/src/screens/LocationPickerScreen.js
```
Expected: line 45 `export default function LocationPickerScreen({ go })`; line 149 `go('loading')`; line 166 `go('date')` (Back); line 172 `go('today')` (Close).

- [ ] **Step 2: Modify the signature**

Find:
```js
export default function LocationPickerScreen({ go }) {
```

Replace with:
```js
export default function LocationPickerScreen({ go, onConfirm, embedded = false }) {
```

- [ ] **Step 3: Replace the hardcoded `go('loading')` with the onConfirm callback**

Find the line ~149 with `go('loading')`. Look at the surrounding context — it's the "Find moments" tap handler, after the draft-store patch. Modify:

```js
// BEFORE:
go('loading');

// AFTER:
if (onConfirm) {
  onConfirm(savedLocation);
} else {
  go('loading');  // legacy fallback for any caller that doesn't pass onConfirm
}
```

(`savedLocation` is the local variable holding the SavedLocation just constructed by the existing draft-store wiring; if the variable is named differently in the file, use the actual name.)

- [ ] **Step 4: Wrap the Back/Close header in a conditional render**

Find the header IconBtns at lines ~166 and ~172. Wrap their parent View in:

```js
{!embedded && (
  // existing header JSX with the Back + Close IconBtns
)}
```

If the IconBtns are sibling elements rather than wrapped in a single View, wrap them in a Fragment with the conditional:
```js
{!embedded && <>
  <IconBtn onPress={() => go('date')} label="Back">…</IconBtn>
  <IconBtn onPress={() => go('today')} label="Close">…</IconBtn>
</>}
```

- [ ] **Step 5: tsc + Maestro 04 regression smoke (manual or CI)**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx tsc --noEmit 2>&1 | head -10
```
Expected: only pre-existing cluster-windows error.

The Maestro 04 regression flow runs in Task 4.4. Don't run yet — Task 4.3 (the one-line per-search caller update) is required first.

- [ ] **Step 6: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/src/screens/LocationPickerScreen.js && git commit -m "feat(LocationPickerScreen): add onConfirm + embedded props (D16, D22)

onConfirm REPLACES the hardcoded go('loading') after a location is picked;
when omitted, falls through to legacy go('loading') so any caller that
hasn't migrated still works (per-search caller migrates in Task 4.3).
embedded=true suppresses the picker's own Back/Close header so a parent
wrapper (SetDefaultLocationScreen) can supply its own chrome. NO
initialLocation, NO onBack/onClose per D16/D20. Spec §4.3."
```

---

### Task 4.3: Per-search caller — ONE LINE change (D30)

**Spec:** §4.3 (Per-search caller paragraph), D30.

**Files:**
- Modify: `apps/mobile/App.js`

- [ ] **Step 1: Find the per-search render of LocationPickerScreen**

Per the spec, the per-search caller is wherever App.js renders LocationPickerScreen for `screen === 'location'`. Looking at App.js:165-172 (the main render), screens are dispatched via:
```js
const Screen = SCREENS[screen] || SCREENS.today;
// ...
<Screen go={go}/>
```

So LocationPickerScreen is rendered via the `<Screen go={go}/>` line — with ONLY the `go` prop. The per-search caller is THAT site.

Two implementation options:

(a) **Special-case the `'location'` screen** at the dispatch site. Cleaner but adds one branch.

(b) **Wrap LocationPickerScreen at registration**. Even cleaner. Modify the SCREENS map:

```js
const SCREENS = {
  // ... other entries unchanged ...
  location: (props) => <LocationPickerScreen {...props} onConfirm={() => props.go('loading')}/>,
  // ... rest unchanged ...
};
```

Per D30 ("ONE LINE change"), option (b) is the minimal expression — exactly one line of the SCREENS map changes from `LocationPickerScreen,` to the inline wrapper.

- [ ] **Step 2: Apply the change**

Find the SCREENS map (App.js:40-54):
```js
location:   LocationPickerScreen,
```

Replace with:
```js
location:   (props) => <LocationPickerScreen {...props} onConfirm={() => props.go('loading')}/>,
```

- [ ] **Step 3: tsc + suite**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx tsc --noEmit 2>&1 | head -10
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run 2>&1 | tail -6
```
Expected: tsc only pre-existing cluster-windows; suite count unchanged.

- [ ] **Step 4: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/App.js && git commit -m "feat(app): per-search LocationPickerScreen passes onConfirm (D30)

ONE-LINE change in the SCREENS map: 'location' now dispatches through a
tiny inline wrapper that supplies onConfirm={() => props.go('loading')}.
No embedded prop. Per-search flow byte-identical: picker writes
last_location (existing draft-store wiring runs INSIDE the picker before
onConfirm fires), then routes to Loading. D30. Spec §4.3."
```

---

### Task 4.4: Verify `04-location-picker-regression.yaml` Maestro flow still passes

**Spec:** §9.8.

**Files:**
- (none — verification only)

- [ ] **Step 1: Read the Maestro flow**

```bash
cat /Users/user/Projects/inceptio/apps/mobile/maestro/flows/04-location-picker-regression.yaml
```

The flow exercises per-search navigation: Today → Find a moment → activity → date → location → tap city → Find moments → Loading. The D30 change must preserve this byte-identically.

- [ ] **Step 2: Run Maestro (optional — requires simulator)**

```bash
which maestro && echo "maestro available"
```

If available + simulator running, optionally run:
```bash
cd /Users/user/Projects/inceptio/apps/mobile && maestro test maestro/flows/04-location-picker-regression.yaml 2>&1 | tail -10
```
Expected: PASS.

If not available, this gate is deferred to Phase 6 / Task 6.4 (manual sim smoke) and CI.

- [ ] **Step 3: Static cross-check**

```bash
grep -n "LocationPickerScreen" /Users/user/Projects/inceptio/apps/mobile/App.js
grep -n "go('loading')\|onConfirm" /Users/user/Projects/inceptio/apps/mobile/src/screens/LocationPickerScreen.js | head
```
Expected:
- App.js SCREENS map line for 'location' contains the inline wrapper with onConfirm
- LocationPickerScreen.js has the `onConfirm` prop in the signature; the `go('loading')` line is now inside an `if (onConfirm) { onConfirm(...) } else { go('loading') }` conditional

If both check out, the contract is correct; Maestro execution is a downstream verification.

- [ ] **Step 4: No commit needed**

This is a verification gate.

---

## Phase 5 — SetDefaultLocationScreen + entry-point wiring

### Task 5.1: Flesh out `SetDefaultLocationScreen` body

**Spec:** §5.1, §5.2, §5.3.

**Files:**
- Modify: `apps/mobile/src/screens/SetDefaultLocationScreen.js`

- [ ] **Step 1: Read Phase 0 skeleton**

```bash
cat /Users/user/Projects/inceptio/apps/mobile/src/screens/SetDefaultLocationScreen.js
```

The skeleton is structurally correct. This task polishes the chrome to match design conventions (HeroGradient + Starfield background, font/spacing tokens, dismiss-button affordance).

- [ ] **Step 2: Replace the body with the production version**

```js
// Generalized set-default-location flow (D22) — used by 3 entry points:
//   1. Onboarding interceptor (dismissLabel="Skip for now", onDismissStatus="skipped")
//   2. YouScreen Settings row (dismissLabel="Cancel", onDismissStatus={null})
//   3. Today empty-state CTA (dismissLabel="Cancel", onDismissStatus={null} per D31)
//
// Renders LocationPickerScreen embedded=true as a child; supplies header
// chrome (soft-anchor heading + dismiss button); wires onConfirm to write
// default_location + (conditionally) mark onboarding status.

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import LocationPickerScreen from './LocationPickerScreen';
import {
  setDefaultLocation,
  markOnboardingLocationStatus,
} from '../lib/location-preference';

export default function SetDefaultLocationScreen({
  go,
  dismissLabel = 'Cancel',
  onDismissStatus = null,
}) {
  const handleConfirm = (loc) => {
    setDefaultLocation(loc);
    // Onboarding entry (onDismissStatus='skipped') wants 'completed' on confirm.
    // Settings + empty-state entries pass null — they don't write on confirm
    // because the status is already terminal (by interceptor invariant).
    if (onDismissStatus !== null) {
      markOnboardingLocationStatus('completed');
    }
    go('today');
  };

  const handleDismiss = () => {
    // D31: empty-state CTA Cancel writes NOTHING (null sentinel).
    // Settings Cancel: same — null preserves whatever terminal status was set.
    // Onboarding Skip: writes 'skipped' to mark the user's choice.
    if (onDismissStatus !== null) {
      markOnboardingLocationStatus(onDismissStatus);
    }
    go('today');
  };

  return (
    <View className="flex-1 bg-base">
      <HeroGradient height={500}/>
      <Starfield density="light"/>
      <SafeAreaView className="flex-1">
        <View className="flex-row justify-between items-center px-6 py-4">
          <Text className="font-display-reg text-[20px] leading-[28px] text-cream max-w-[240px]">
            Where do you usually start from?
          </Text>
          <Pressable onPress={handleDismiss} hitSlop={12}>
            <Text className="font-ui text-base text-muted">{dismissLabel}</Text>
          </Pressable>
        </View>
        <View className="flex-1">
          <LocationPickerScreen
            go={go}
            onConfirm={handleConfirm}
            embedded={true}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
```

- [ ] **Step 3: tsc + suite**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx tsc --noEmit 2>&1 | head -10
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run 2>&1 | tail -6
```
Expected: tsc only pre-existing; suite unchanged.

- [ ] **Step 4: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/src/screens/SetDefaultLocationScreen.js && git commit -m "feat(SetDefaultLocationScreen): flesh out chrome + handlers (D22, D31)

Header: soft-anchor heading + dismiss button (Pressable, hitSlop). Body:
LocationPickerScreen embedded=true. handleConfirm writes default_location
+ (if onDismissStatus !== null) marks 'completed'. handleDismiss writes
onDismissStatus only if non-null (D31 — empty-state Cancel writes nothing).
Spec §5.1 + §5.2 + §5.3."
```

---

### Task 5.2: Register `'set-default-location'` screen in App.js

**Spec:** §7.1.

**Files:**
- Modify: `apps/mobile/App.js`

- [ ] **Step 1: Add the import**

In `App.js`, find the existing imports near `FirstLaunchActivityPicker`. Add:
```js
import SetDefaultLocationScreen from './src/screens/SetDefaultLocationScreen';
```

- [ ] **Step 2: Register in SCREENS map**

In the SCREENS map at lines 40-54, add the new entry:
```js
'first-launch-activity': FirstLaunchActivityPicker,
'set-default-location': SetDefaultLocationScreen,  // NEW
```

- [ ] **Step 3: Register in MODAL_SCREENS set**

At line 57:
```js
const MODAL_SCREENS = new Set(['onboarding', 'picker', 'date', 'location', 'loading', 'noviable', 'paywall', 'first-launch-activity', 'set-default-location']);
```

- [ ] **Step 4: tsc + suite**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx tsc --noEmit 2>&1 | head -10
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run 2>&1 | tail -6
```
Expected: tsc only pre-existing; suite unchanged.

- [ ] **Step 5: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/App.js && git commit -m "feat(app): register 'set-default-location' screen + add to MODAL_SCREENS

Screen registered in SCREENS map; added to MODAL_SCREENS so the tab bar
hides while the user is in the flow. Routable via go('set-default-location')
from TodayScreen empty-state CTA (wired in Task 5.5) and YouScreen Settings
row (wired in Task 5.6). Spec §7.1."
```

---

### Task 5.3: Add the parallel interceptor block in App.js

**Spec:** §7.3.

**Files:**
- Modify: `apps/mobile/App.js`

- [ ] **Step 0: Sentinel check — verify Task 1.3's destructure landed**

```bash
grep -n "locationHydrationStatus\|onboardingLocationStatus" /Users/user/Projects/inceptio/apps/mobile/App.js
```

Expected: at least one match showing the Task 1.3 destructure line:
```js
const { hydrationStatus: locationHydrationStatus, onboardingLocationStatus } = useLocationPreference();
```

If the destructure is absent, Task 1.3 did NOT land cleanly — STOP and investigate before adding the interceptor (the interceptor's guard references those identifiers; without the destructure they are undefined and the boot gate would render before the location-pref subscription is established).

- [ ] **Step 1: Find the existing activity interceptor**

Lines 143-160 of App.js render the FirstLaunchActivityPicker interceptor:
```js
if (hydrationStatus === 'unset' && screen !== 'first-launch-activity') {
  return (
    <QueryClientProvider client={queryClient}>
      ...
      <FirstLaunchActivityPicker go={go}/>
      ...
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Add the location interceptor immediately after**

After the closing `}` of the activity-interceptor block, add:

```js
// Second-launch location gate (NEW). Fires when activity onboarding is
// already done (interceptor sequencing per D13: activity → location → Today)
// AND the location-preference hydrated AND the user hasn't completed OR
// skipped the location onboarding step. Spec §7.3.
if (
  hydrationStatus === 'set' &&
  locationHydrationStatus === 'set' &&
  onboardingLocationStatus === 'pending' &&
  screen !== 'set-default-location'
) {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <View style={styles.root} onLayout={onLayoutRoot}>
          <StatusBar style="light"/>
          <View style={styles.content}>
            <SetDefaultLocationScreen
              go={go}
              dismissLabel="Skip for now"
              onDismissStatus="skipped"
            />
          </View>
        </View>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
```

(`locationHydrationStatus` and `onboardingLocationStatus` were already destructured in Task 1.3 — Step 3.)

- [ ] **Step 3: tsc + suite**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx tsc --noEmit 2>&1 | head -10
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run 2>&1 | tail -6
```
Expected: tsc only pre-existing; suite unchanged.

- [ ] **Step 4: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/App.js && git commit -m "feat(app): add parallel location interceptor block (D22, D24)

Mirrors FirstLaunchActivityPicker interceptor pattern. Four-part guard:
activity hydrated + 'set', location hydrated + 'set', onboardingLocation
'pending', screen not already 'set-default-location'. On dismiss, the
screen marks 'skipped' (per spec §5.1 onboarding handler). On confirm,
the screen marks 'completed' and writes default_location. Spec §7.3."
```

---

### Task 5.4: Polish `EmptyStateHero` styling (designer-final pass)

**Spec:** §4.7, §5.3, D29.

**Files:**
- Modify: `apps/mobile/src/components/daily-note/EmptyStateHero.js`

- [ ] **Step 1: Read the skeleton + sibling DailyHero for visual consistency**

```bash
cat /Users/user/Projects/inceptio/apps/mobile/src/components/daily-note/EmptyStateHero.js
cat /Users/user/Projects/inceptio/apps/mobile/src/components/daily-note/DailyHero.js | head -120
```

- [ ] **Step 2: Refine to match the strong/good/mixed mood-card aesthetic**

Adjust class names + spacing to match DailyHero's render shape (HeroBackdrop wrapper, Moon graphic if it appears in the precedent, etc.). The exact styling is design-judgment; the contract that MUST hold:

- Soft-anchor copy: "Set a default location to see your daily timing." (or voice-reviewed equivalent)
- Primary CTA: "Add a location" wired to `onSetLocation` prop
- HeroGradient + Starfield background present
- Same SafeAreaView + content padding as DailyHero so the screen feels like a sibling mood variant rather than a separate UI

Example refined version (adapt to actual DailyHero structure):

```js
import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeroGradient from '../HeroGradient';
import Starfield from '../Starfield';
import Moon from '../Moon';
import PrimaryButton from '../PrimaryButton';

export default function EmptyStateHero({ onSetLocation }) {
  return (
    <View className="flex-1 bg-base">
      <HeroGradient height={900}/>
      <Starfield density="light"/>
      <SafeAreaView className="flex-1 px-6">
        <View className="flex-1"/>
        <View className="items-center">
          <Moon phase="waxing-crescent" size={48}/>
          <View className="h-8"/>
          <Text className="font-display-reg text-[28px] leading-[36px] tracking-[-0.3px] text-cream text-center max-w-[320px]">
            Set a default location to see your daily timing.
          </Text>
          <Text className="font-ui text-base leading-6 text-muted text-center mt-4 max-w-[320px]">
            We'll show how the sky is moving for your usual starting point.
          </Text>
        </View>
        <View className="flex-[1.5]"/>
        <View className="pb-8">
          <PrimaryButton onPress={onSetLocation}>Add a location</PrimaryButton>
        </View>
      </SafeAreaView>
    </View>
  );
}
```

(Voice copy is implementation-final-pass UX; if the voice review surfaces a different wording, replace.)

- [ ] **Step 3: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/src/components/daily-note/EmptyStateHero.js && git commit -m "feat(EmptyStateHero): designer-final pass (D29)

HeroGradient + Starfield + Moon graphic to match sibling mood variants
visually. Soft-anchor copy 'Set a default location to see your daily
timing.' Primary CTA 'Add a location' wired to onSetLocation. Voice copy
subject to final review pass; structural contract pinned. Spec §4.7+§5.3."
```

---

### Task 5.5: TodayScreen empty-state CTA — finalize target (provisional → real)

**Spec:** §4.7, §5.4, D22, D27. **Pair with Phase 3 Task 3.4** which landed the guard with a provisional CTA target. Now that `'set-default-location'` is registered in App.js (Task 5.2), update the CTA target to its final value.

**Files:**
- Modify: `apps/mobile/src/screens/TodayScreen.js`

- [ ] **Step 1: Verify the provisional target is in place**

```bash
grep -n "EmptyStateHero\|onSetLocation" /Users/user/Projects/inceptio/apps/mobile/src/screens/TodayScreen.js
```
Expected: the guard from Task 3.4 with `onSetLocation={() => go('you')}` present.

If absent, Phase 3 didn't land cleanly — STOP and investigate before continuing.

- [ ] **Step 2: Swap the target**

Find:
```js
return <EmptyStateHero onSetLocation={() => go('you')}/>;
```

Replace with:
```js
return <EmptyStateHero onSetLocation={() => go('set-default-location')}/>;
```

Also strip the Phase-3 "PROVISIONAL CTA target" comment block in the guard's preamble — it's no longer accurate. Replace:
```js
  // PROVISIONAL CTA target: go('you'). SetDefaultLocationScreen isn't
  // registered yet (Phase 5 Task 5.2); routing there would crash. YouScreen
  // exists today and is a non-crashing landing. Task 5.5 finalizes the
  // target to go('set-default-location') once the screen is registered.
```

With:
```js
  // CTA target opens SetDefaultLocationScreen DIRECTLY per D22 (no Settings hop).
  // The screen is registered as a modal in App.js SCREENS map + MODAL_SCREENS set
  // (Task 5.2) and routes the user through the same generalized flow used by
  // the onboarding interceptor + YouScreen Settings row.
```

- [ ] **Step 3: tsc + suite**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx tsc --noEmit 2>&1 | head -10
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run 2>&1 | tail -6
```
Expected: tsc only pre-existing cluster-windows error; suite passes.

- [ ] **Step 4: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/src/screens/TodayScreen.js && git commit -m "feat(TodayScreen): finalize empty-state CTA target (D22)

Swap from the provisional Phase-3 go('you') to the final go('set-default-location').
SetDefaultLocationScreen was registered as a modal in Task 5.2; CTA now
opens the generalized flow DIRECTLY per D22 (no Settings hop). Spec §4.7
+ §5.4 + D22."
```

---

### Task 5.6: YouScreen "Default location" Settings row

**Spec:** §5.2, ruling 5 (Clear copy).

**Files:**
- Modify: `apps/mobile/src/screens/YouScreen.js`

- [ ] **Step 1: Read current shape + the existing Default activity row for visual mirroring**

```bash
cat /Users/user/Projects/inceptio/apps/mobile/src/screens/YouScreen.js
```
Identify the existing "Default activity" Row component or markup — the new row must mirror it visually.

- [ ] **Step 2: Add the new row**

Add the import:
```js
import {
  useLocationPreference,
  setDefaultLocation,
  clearDefaultLocation,
} from '../lib/location-preference';
```

Inside the component body, add subscription:
```js
const { defaultLocation } = useLocationPreference();
```

After the existing Default activity row in the JSX, add a parallel "Default location" row. Exact JSX depends on YouScreen's current structure; the contract:

- **Position:** immediately below "Default activity" row
- **Display label:** "Default location"
- **Display value:** `defaultLocation?.city ?? 'Not set'` — the city is the user-facing identifier
- **Tap target:** `go('set-default-location')` — opens SetDefaultLocationScreen with no `onDismissStatus` (Settings entry uses default `null`)
- **Secondary "Clear" action visible only when `defaultLocation !== null`** — copy MUST communicate the fall-through. Suggested label (subject to voice review):

  *"Clear — your recent locations are still available"*

  This copy is REQUIRED per spec §5.2 (Ruling 5). A bare "Clear" button is forbidden because it would imply the slot empties entirely; the precedence chain (default → lastSeed → null) means clearing falls through to the user's most recent search pick if any.

Example row JSX (adapt to YouScreen's existing pattern):

```jsx
<Pressable onPress={() => go('set-default-location')} className="px-6 py-4 border-b border-elevated">
  <View className="flex-row justify-between items-center">
    <Text className="font-ui text-base text-cream">Default location</Text>
    <Text className="font-ui text-base text-muted">
      {defaultLocation?.city ?? 'Not set'}
    </Text>
  </View>
</Pressable>

{defaultLocation !== null && (
  <Pressable onPress={() => clearDefaultLocation()} className="px-6 py-3">
    <Text className="font-ui text-[13px] text-muted">
      Clear — your recent locations are still available
    </Text>
  </Pressable>
)}
```

- [ ] **Step 3: tsc + suite**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx tsc --noEmit 2>&1 | head -10
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run 2>&1 | tail -6
```
Expected: tsc only pre-existing; suite passes.

- [ ] **Step 4: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/src/screens/YouScreen.js && git commit -m "feat(YouScreen): add Default location Settings row + Clear affordance (Ruling 5)

New row mirrors Default activity row visually. Shows city name or 'Not set'.
Tap routes to go('set-default-location'). Clear is a SECONDARY affordance
visible only when defaultLocation is set; copy communicates the fall-through
to lastSeed ('Clear — your recent locations are still available') so the
user doesn't expect Today to go quiet. Voice copy subject to final review.
Spec §5.2 + Ruling 5."
```

---

## Phase 6 — Verification + Maestro

### Task 6.1: Write Maestro `05-onboarding-location-step.yaml`

**Spec:** §9.7.

**Files:**
- Create: `apps/mobile/maestro/flows/05-onboarding-location-step.yaml`

- [ ] **Step 1: Identify sentinel strings**

```bash
grep -n "Where do you usually\|Skip for now\|Search city\|Find moments\|Add a location\|Set a default" \
  /Users/user/Projects/inceptio/apps/mobile/src/screens/SetDefaultLocationScreen.js \
  /Users/user/Projects/inceptio/apps/mobile/src/screens/LocationPickerScreen.js \
  /Users/user/Projects/inceptio/apps/mobile/src/components/daily-note/EmptyStateHero.js | head -20
```
Use the literal strings from the source as sentinels.

- [ ] **Step 2: Write the flow**

```yaml
appId: host.exp.Exponent
name: "Onboarding location step (Phase 5 wire-up regression)"
---
# Phase 5 / Task 5.3 + 5.5
#
# Two sub-flows in one file: (A) pick a city in onboarding → land on Today
# with daily-note for that city, (B) skip in onboarding → land on Today
# empty-state → tap CTA → land in SetDefaultLocationScreen.
#
# This flow assumes a CLEAN install (fresh user state). If running against
# a checkpoint with state populated, use `clearState: true` to reset.

- launchApp:
    clearState: true

# Cold launch — Welcome screen
- waitForAnimationToEnd:
    timeout: 8000
- runFlow:
    when:
      visible: "Recently opened"
    commands:
      - tapOn: "Inceptio"
      - waitForAnimationToEnd:
          timeout: 8000

# Welcome → Find your moment
- tapOn: "Find your moment"
- waitForAnimationToEnd

# Activity interceptor — pick wedding (any activity works)
- tapOn:
    text: "💍, Wedding or engagement, Lasting commitments and unions"
- waitForAnimationToEnd

# LOCATION INTERCEPTOR (NEW from this feature)
# Confirm heading
- extendedWaitUntil:
    visible: "Where do you usually start from"
    timeout: 5000

# Sub-flow A: pick a city → Today shows daily-note for it
- tapOn: "Search city"
- inputText: "Tokyo"
- extendedWaitUntil:
    visible: "Tokyo"
    timeout: 5000
- tapOn:
    text: "Tokyo"
    index: 0
- tapOn: "Find moments"

# Land on Today (no Loading because no per-search activity flow triggered;
# Today fires its own useDailyNote query for the new default)
- extendedWaitUntil:
    visible: "Looking at the sky"
    timeout: 10000
# Daily-note loads (Loading copy advances) — verify we're past Loading
- extendedWaitUntil:
    visible: "Find a moment for"  # Today's CTA visible only on Today
    timeout: 30000
```

For sub-flow B (skip path), add a SECOND yaml file or extend with stop/launchApp segments. Per Maestro convention, separate flows in separate files are cleaner — but to honor §9.7's "two flows in the file" specification, embed them in one file via `clearState: true` + `launchApp` between segments. The exact convention is at implementation discretion; the test surface that MUST land:

1. Cold install → activity → location → pick Tokyo → Today shows daily-note for Tokyo
2. Cold install → activity → location → tap Skip → Today shows empty-state → tap "Add a location" → SetDefaultLocationScreen opens

- [ ] **Step 3: Optional Maestro run (requires simulator)**

```bash
which maestro && cd /Users/user/Projects/inceptio/apps/mobile && maestro test maestro/flows/05-onboarding-location-step.yaml 2>&1 | tail -10
```

If simulator not available, skip — the file's value is CI verification.

- [ ] **Step 4: Commit**

```bash
cd /Users/user/Projects/inceptio && git add apps/mobile/maestro/flows/05-onboarding-location-step.yaml && git commit -m "test(maestro): add 05-onboarding-location-step flow

Two-flow file covering (A) cold install → onboarding chain → pick Tokyo
→ Today shows daily-note, and (B) cold install → onboarding chain →
Skip → Today empty-state → CTA opens SetDefaultLocationScreen. Sentinel
strings verified against SetDefaultLocationScreen.js + LocationPickerScreen.js
+ EmptyStateHero.js source. Spec §9.7."
```

---

### Task 6.2: Full mobile vitest gate

**Spec:** §9.8.

- [ ] **Step 1: Run full suite**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx vitest run 2>&1 | tail -10
```

Expected count: 70 baseline (Phase 1+2 tz-fix end state) + Phase 0 additions (1 activity-pref D28 test = 71) + Phase 1 additions (16 location-preference tests = 87) + Phase 2 additions (4 subscription + 1 type + ~6 useEffectiveLocation Path A or ~1-2 Path B = ~93-98) + Phase 3 additions (3 __computeEnabled cases = ~96-101) + Phase 4 (1 contract pin-test = ~97-102). Plan for ~95-105 tests; exact count depends on Path A/B for useEffectiveLocation.

All must pass.

- [ ] **Step 2: Note any stale-test fixes needed**

If any failure traces to a test that depended on the Kyiv FALLBACK_LOCATION or the empty-deps useMemo (e.g. an integration test that assumed daily-note always returns), that test needs its mock setup updated — do NOT re-introduce the fallback. The bug is gone; the test is stale.

- [ ] **Step 3: Commit any test fixups**

If touched test files, commit:
```bash
cd /Users/user/Projects/inceptio && git add <touched test files> && git commit -m "test: update mock setup after FALLBACK_LOCATION removal"
```

If no fixups needed, no commit.

---

### Task 6.3: Mobile tsc gate — no NEW errors

- [ ] **Step 1: Run tsc**

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx tsc --noEmit 2>&1 | head -20
```

**Acceptance: NO NEW tsc errors beyond the known pre-existing one.** Specifically:
- `cluster-windows.ts(108,35): error TS2345` IS allowed (EC-13 / memo `tz-fix-pre-existing-debt`; predates branch; not introduced by this work)
- ANY other error is a real regression — fix before declaring Phase 6 complete

Concretely, count errors after grep-filtering:

```bash
cd /Users/user/Projects/inceptio/apps/mobile && npx tsc --noEmit 2>&1 | grep -v "cluster-windows.ts(108,35)" | grep "error TS" | head
```
Expected: empty output. If anything appears, that's a NEW error to investigate.

- [ ] **Step 2: No commit unless fixups landed**

---

### Task 6.4: Manual simulator smoke — 5 flows (load-bearing acceptance)

**Spec:** §12 Phase 6 acceptance criterion + Ruling 14 (D14) + D32 upgrade acceptance + D11 mount-frozen invariant + Ruling 11 GPS-in-embedded + closure of the Phase-4 Maestro-04 analytical fallback.

**This task is the load-bearing manual acceptance** — DO NOT re-attempt Maestro 04 or refight the simulator keyboard. The 5 flows below cover the full functional surface this branch ships AND serve as the backstop for the analytical-coverage fallback that closed Phase 4.

- [ ] **Step 1: Cold install on iOS simulator (Flows A, B, D)**

Boot iOS simulator. Either delete the app via Settings → General → Reset → Erase All Content + Settings, OR via the simulator: long-press app icon → Remove → Delete App. Then re-launch Expo Go (or build a new dev client) and open Inceptio.

- [ ] **Step 2: Verify Flow A (fresh install, set during onboarding)**

1. Welcome screen displays
2. Tap "Find your moment" → activity picker
3. Pick any activity → tap Continue
4. **Location step appears** (new!) → tap "Search city" → type "Tokyo"
5. Tap the first Tokyo result → tap Continue / Find moments
6. Today screen renders with a daily-note for Tokyo (NOT for Kyiv — the FALLBACK is gone)

- [ ] **Step 3: Verify Flow B (fresh install, skip during onboarding)**

1. Delete app + re-install (cold install)
2. Welcome → Find your moment → Activity picker → pick → Continue
3. **Location step appears** → tap "Skip for now"
4. Today renders **EmptyStateHero** with "Add a location" CTA
5. Tap "Add a location" → SetDefaultLocationScreen opens
6. Pick a city (e.g. "Berlin") → Continue
7. Today re-renders with a daily-note for Berlin

- [ ] **Step 4: Verify Flow C — UPGRADE SCENARIO (D14 + D32 KEY ACCEPTANCE)**

This is the load-bearing acceptance check that an existing user with the activity-preference work already shipped is NOT bounced into the new location interceptor (D14) AND that the defensive `initActivityPreference()` call in `initLocationPreference()` (D32) holds.

**Seed the existing-install state manually** before launching:

1. Delete app + cold install. Boot once and complete activity onboarding so `inceptio.default_activity` is 'set'. Do NOT enter the location step yet (this is hard since the interceptor fires; alternative: on a build with this plan, after the activity step the location step auto-fires — TO SIMULATE the existing-install scenario, you instead need to seed MMKV before the location-pref init runs).

2. **Seeding approach: dev-only React Native debugger.** With the app in dev mode, open the React Native debugger or the Expo Dev Tools console and run:
   ```js
   // Via @react-native-async-storage/async-storage or the mmkv inspector,
   // depending on which side of the storage wrapper:
   //   1. SET 'inceptio.default_activity' to 'wedding' (or any valid Activity)
   //   2. SET 'inceptio.last_location' to a valid SavedLocation JSON for e.g. Kyiv
   //   3. DELETE 'inceptio.onboarding_location_step_v1' (the new key MUST be absent)
   //   4. DELETE 'inceptio.default_location' (also absent)
   ```
   (If the dev console isn't accessible, an alternative is to bake a `__DEV__`-only seed button into `OnboardingScreen` for the smoke; remove before merge.)

3. **Force a cold boot** (kill the app process in the simulator, then re-launch).

4. **Verify:**
   - **(a)** Welcome screen displays briefly (no interceptor flash). The location interceptor MUST NOT fire — the user goes straight from Welcome to Today.
   - **(b)** Inspect MMKV: `inceptio.onboarding_location_step_v1` MUST now be `'completed'` (auto-init per D14 because activity status was 'set' at first read).
   - **(c)** Today renders the daily-note for Kyiv (the seeded `last_location`'s value) — NOT the Kyiv `FALLBACK_LOCATION` (which is gone), NOT EmptyStateHero (because `lastSeed` is non-null), and NOT crashing.

**This is the canary that the entire D14/D32 upgrade-safety story holds.** If any of (a)/(b)/(c) fails, STOP and investigate before declaring Phase 6 complete.

- [ ] **Step 5: Verify Flow D — D11 anti-leak + per-search navigation (DOUBLE PURPOSE)**

This is the load-bearing flow for two acceptance items:
- D11 mount-frozen lastSeed invariant (per-search edits must NOT poison Today)
- Per-search picker → Loading → Results navigation (closes the Maestro-04 analytical-fallback question)

1. Start on Today with a default location set (e.g., Berlin from Flow A or D earlier). Today shows the Berlin daily-note.
2. Tap "Find a moment for…" → activity picker
3. Pick any activity → Continue
4. Date picker → Continue
5. Location picker (per-search context, NOT embedded) → search a DIFFERENT city (e.g. "Tokyo") → tap Tokyo result → tap "Find moments"
6. **PER-SEARCH NAVIGATION CHECKPOINT:** screen MUST advance to Loading → eventually to Results / Calendar (NOT stuck on the picker). If navigation does NOT fire, that's a real Phase 4 contract regression — STOP and surface immediately.
7. After Results/Calendar renders, navigate back to Today (tap Today tab or back-arrow)
8. **D11 ANTI-LEAK CHECKPOINT:** Today MUST still show the DEFAULT (Berlin) daily-note, NOT the per-search Tokyo. If Today shows Tokyo's sky, D11 mount-frozen lastSeed is broken — the per-search edit leaked into Today's effective location.

If either checkpoint fails, that's a real regression — surface to user before declaring Phase 6 complete.

- [ ] **Step 6: Verify Flow E — "Use current location" works in BOTH contexts (Ruling 11)**

The Phase 5 Task 5.1 code-quality fix passed `go={() => {}}` to the embedded picker (anti-escape-hatch). Verify the GPS button still functions in BOTH per-search (non-embedded) and onboarding/Settings (embedded) contexts.

**Per-search context:**
1. Today → Find a moment for → activity → date → location picker
2. Tap "Use current location" → GPS permission prompt (allow if needed)
3. After GPS resolves: city name appears in search field; "Find moments" enables
4. Tap "Find moments" → navigates to Loading → Results

**Embedded context (via SetDefaultLocationScreen):**
1. Today → "You" tab → "Default location" row → SetDefaultLocationScreen opens
2. Tap "Use current location" → GPS resolves (no permission re-prompt if granted)
3. After GPS resolves: city name appears; "Find moments" enables
4. Tap "Find moments" → SetDefaultLocationScreen's handleConfirm fires → writes default_location + go('today')
5. Return to Today → Today shows the GPS-resolved city's daily-note
6. (No regression: the no-op `go` did NOT kill the GPS button)

If GPS works per-search but NOT embedded, that's a regression of Ruling 11 — surface and fix.

- [ ] **Step 7: Verify Flow F — Settings clear with fall-through (Ruling 5)**

1. From Today (with a default location set), tap "You" tab
2. "Default location" row shows the current city
3. Tap "Clear — your recent locations are still available"
4. Return to Today
5. Today shows the lastSeed (the previous-search city if any), NOT empty-state (because lastSeed exists from per-search history)
6. If lastSeed is also null (fresh-install user who only set default via onboarding without per-search history), Today shows EmptyStateHero — also correct

- [ ] **Step 8: Note any UX issues**

Any visual hiccups, copy issues, or interaction bugs found during the smoke are TBD-during-implementation UX fixes; the spec's contract has held if the flow shapes work. Voice-copy polish for "Add a location" / Clear copy / empty-state heading lands at this stage if not already settled.

- [ ] **Step 9: No commit (operational verification)**

### Acceptance checkpoint (report to user)

After running Flows A/B/C/D/E/F, surface to user:
- Pass/fail per flow
- Specifically call out: D11 anti-leak HELD (Today still showed default) + per-search NAVIGATION HELD (picker → Loading → Results) — these close the analytical-coverage gap from Phase 4's Maestro 04 fallback
- Specifically call out: GPS WORKS embedded (closes the no-op-go Check #1 from Phase 5 review)
- Specifically call out: D14/D32 upgrade HELD (existing user not interrupted, lastSeed shown not Kyiv)

---

## Self-review checklist (writer)

- **Spec coverage:** Every D-numbered decision (D1–D32) maps to a task or is structurally inherited by the architecture (D11 mount-frozen lastSeed in Task 0.2 + Task 2.3; D14 upgrade-path in Task 1.2; D20/D30 per-search one-line in Task 4.3; D22 generalized flow in Task 5.1; D27 two-part guard in Task 5.5; D31 simplified Cancel in Task 5.1's handlers; D32 defensive initActivityPreference call in Task 1.2). Rulings 5 (Clear copy) is pinned in Task 5.6.
- **Out-of-scope guard:** No task touches `initialLocation`/`onBack`/`onClose` on LocationPickerScreen; no per-search caller edit beyond the D30 one-line wrapper; no Worker amendments; no push-to-main.
- **Placeholder scan:** No "TBD"/"implement later"/"add appropriate error handling" without disposition. UX polish items (voice copy, exact styling alignment with mood variants) are bounded designer/voice review tasks landed within Phase 5 itself, not deferred indefinitely.
- **Type consistency:** `SavedLocation` shape sourced from `location-storage.ts` (unchanged). `HydrationStatus` mirrors activity-preference. `ComputeEnabledArgs` extended consistently across `useDailyNote.helpers.ts` + `useDailyNote.ts` + the test file in Phase 3. `OnboardingLocationStatus` defined in `location-preference.ts` and exported for SetDefaultLocationScreen + tests.
- **TDD discipline:** Phase 1 / Task 1.1 → 1.2 (test → impl); Phase 2 / 2.1 → 2.2 (subscription tests on existing impl); 2.3 → 2.4 (useEffectiveLocation tests on existing impl, Path A/B branch); Phase 3 / 3.1 → 3.2 (extension test → extension impl); Phase 4 / 4.1 → 4.2 (Path B pin-test → impl, behavioral coverage via Maestro). Phase 0 is structural skeleton — no behavior to test.
- **Hermes / Worker / push-main constraints:** No worker deploys planned; no push-to-main planned; App.js + location-storage.ts edits are within the lifted Edit/Write surfaces (gated until 2026-06-03 Hermes confirm; lifted then).
- **Frequent commits:** Every task ends with `git commit` (conventional commit format). Phase 0 ships 5 small skeleton commits; Phase 1 ships 3 commits (tests, impl, App.js wire); Phases 2-5 each ship 3-6 commits. Total commits ~30 (one per task) + minor fixup commits for stale tests in 3.4 / 6.2 if needed.
- **Migration:** Zero data migration. The new keys (`inceptio.default_location` + `inceptio.onboarding_location_step_v1`) are introduced fresh. Existing `last_location` migration already shipped (Phase 2 of tz-fix); inherited.
- **EC-19 closure:** Default-location inherits tz correctness from `pickToSavedLocation` via the existing per-search code path; spec §2 + §6.3 document the inheritance explicitly. No Worker amendments.

---

*End of plan. Plan returns to user for partition-reviewer + their review before any task dispatch.*
