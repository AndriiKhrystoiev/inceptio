# Test Coverage for the Node-Testable Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise coverage of the node-testable code to ≥90% statements/lines per package, make it measurable (`test:coverage` + v8 provider), and enforce it (per-package thresholds + minimal CI).

**Architecture:** Add a `@vitest/coverage-v8` provider and a `coverage` config block to each of the three packages. Add an additive, per-file-overridable mock setup file to `apps/mobile` so node-environment tests can import files that pull in AsyncStorage / expo-* / `react-native` / `__DEV__`. Write fixture/mock-based tests for the currently-untested `lib`/`hooks` files and the unimported `shared-types` Zod schemas. Thresholds are added and CI is wired in the final task, after real coverage is measured.

**Tech Stack:** vitest 2.1.9, `@vitest/coverage-v8` 2.1.9 (v8 provider), Zod 3, TypeScript strict, npm workspaces, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-06-24-test-coverage-node-layer-design.md`

## Global Constraints

- **vitest + coverage-v8 versions:** all three packages on vitest `^2.1.9`; `@vitest/coverage-v8` pinned to `^2.1.9` in each. The coverage-v8 peer is an EXACT pin to vitest — never run a bare `npm i -D @vitest/coverage-v8` (installs 4.x, hard-errors).
- **Coverage thresholds (final target):** `{ lines: 90, statements: 90, functions: 85, branches: 80 }` per package. Calibrate DOWN to the achieved level (rounded down to nearest 5%) only if a package lands below a threshold because of excluded logic — never leave a perpetually-red gate.
- **Mobile coverage `include`:** `src/{lib,config,hooks,i18n,share}/**/*.{ts,tsx}`.
- **Mobile coverage `exclude`:** `**/__tests__/**`, `**/*.test.*`, plus the thin-wrapper list: `src/hooks/useLocationSearch.ts`, `src/hooks/useElectionalSearch.ts`, `src/hooks/useDailyNote.ts`, `src/hooks/useMomentCardShare.js`, `src/lib/update-gate/update-gate-context.ts`, `src/lib/update-gate/use-update-gate.ts`, `src/share/native-share-provider.ts`, `src/share/share-provider.ts`, `src/i18n/index.ts`, `src/i18n/polyfills.ts`.
- **Setup file is a per-file-overridable fallback.** It must NOT assign `global.fetch`. Its RN/expo/AsyncStorage stubs must be supersets of every existing per-file stub. It must define `globalThis.__DEV__`.
- **TypeScript strict, no `any` without an inline comment. Test golden files / fixtures, not implementation.**

---

## Task 0: Coverage tooling + per-package vitest configs (no thresholds yet)

**Files:**
- Modify: `apps/mobile/package.json` (devDeps + script), `apps/mobile/vitest.config.ts`
- Modify: `packages/translations/package.json`, `packages/shared-types/package.json`
- Create: `packages/translations/vitest.config.ts`, `packages/shared-types/vitest.config.ts`
- Modify: `package.json` (root script)

**Interfaces:**
- Produces: `npm run test:coverage` at root and in each package; a `coverage` block in each `vitest.config.ts` (provider + reporters + include/exclude, NO thresholds yet — thresholds land in Task 14 after measurement).

- [ ] **Step 1: Install coverage provider + align vitest, all three packages**

> IMPORTANT: `apps/mobile` is a **standalone npm project** (its own `package-lock.json` + `node_modules`), NOT part of the root workspace (`workspaces: ["packages/*"]`). Do NOT add `apps/*` to the root workspaces and do NOT install mobile via `-w` — that hoists Expo deps into the root lockfile and breaks Metro resolution. Install mobile via its own lockfile with `--prefix`. The two packages ARE workspaces, so `-w` is correct for them.

```bash
cd /Users/user/Projects/inceptio
# exact-peer pin: coverage-v8 must match vitest patch. All three → 2.1.9.
# mobile = standalone project (own lockfile):
npm --prefix apps/mobile i -D @vitest/coverage-v8@^2.1.9
# packages = root workspaces:
npm i -D -w @inceptio/translations @vitest/coverage-v8@^2.1.9 vitest@^2.1.9
npm i -D -w @inceptio/shared-types @vitest/coverage-v8@^2.1.9 vitest@^2.1.9
```

Expected: installs `2.1.9` in all three. Root `package.json` `workspaces` stays `["packages/*"]` (unchanged). `cd apps/mobile && npm ls @vitest/coverage-v8` and `npm ls vitest @vitest/coverage-v8` (root) both show `2.1.9`.

- [ ] **Step 2: Add `coverage` block to `apps/mobile/vitest.config.ts`**

Replace the file with:

```ts
import { defineConfig } from 'vitest/config';

// Mobile-side tests run only the node-friendly lib files. Anything that
// touches React Native, NativeWind, or native modules is left to the device.
export default defineConfig({
  test: {
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/config/__tests__/**/*.test.ts',
      'src/lib/**/__tests__/**/*.test.ts',
      'src/components/__tests__/**/*.test.{ts,js}',
      'src/hooks/__tests__/**/*.test.ts',
      'src/i18n/__tests__/**/*.test.ts',
      'src/screens/__tests__/**/*.test.{ts,js}',
      'src/share/__tests__/**/*.test.ts',
    ],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html'],
      include: ['src/{lib,config,hooks,i18n,share}/**/*.{ts,tsx}'],
      exclude: [
        '**/__tests__/**',
        '**/*.test.*',
        'src/hooks/useLocationSearch.ts',
        'src/hooks/useElectionalSearch.ts',
        'src/hooks/useDailyNote.ts',
        'src/hooks/useMomentCardShare.js',
        'src/lib/update-gate/update-gate-context.ts',
        'src/lib/update-gate/use-update-gate.ts',
        'src/share/native-share-provider.ts',
        'src/share/share-provider.ts',
        'src/i18n/index.ts',
        'src/i18n/polyfills.ts',
      ],
      // thresholds added in Task 14 after first measured run
    },
  },
});
```

> NOTE: `setupFiles` points at a file created in Task 1. Until then `npm test` will error "cannot find ./src/test/setup.ts" — do Task 1 immediately after, before running the mobile suite. (If executing strictly sequentially, create an empty `src/test/setup.ts` now: `export {};`.)

- [ ] **Step 3: Create `packages/translations/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['**/__tests__/**', '**/*.test.*', 'src/index.ts'],
    },
  },
});
```

- [ ] **Step 4: Create `packages/shared-types/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['**/__tests__/**', '**/*.test.*', 'src/index.ts'],
    },
  },
});
```

- [ ] **Step 5: Add `test:coverage` scripts**

In `apps/mobile/package.json`, `packages/translations/package.json`, `packages/shared-types/package.json` add to `"scripts"`:

```json
"test:coverage": "vitest run --coverage"
```

In root `package.json` add to `"scripts"` (covers the two workspace packages AND the standalone mobile project — `-ws` does not reach mobile):

```json
"test:coverage": "npm -ws --if-present run test:coverage && npm --prefix apps/mobile run test:coverage"
```

- [ ] **Step 6: Add `coverage/` to `.gitignore`**

Append to `/Users/user/Projects/inceptio/.gitignore` (create the line if absent):

```
coverage/
**/coverage/
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test(coverage): add v8 provider, scripts, per-package vitest configs

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 1: Mobile mock setup file (the mock layer)

**Files:**
- Create: `apps/mobile/src/test/setup.ts`

**Interfaces:**
- Produces: a global vitest setup providing fallback `vi.mock`s for `@react-native-async-storage/async-storage` (superset incl. `getAllKeys`/`multiGet`), `react-native` (`Platform`, `Linking`, `AppState`, `NativeModules`), `expo-application`, `expo-calendar`, `expo-clipboard`, `expo-constants`, `expo-store-review`, and `globalThis.__DEV__ = false`. Does NOT touch `global.fetch`.
- Consumes: wired via `test.setupFiles` (Task 0 Step 2).

- [ ] **Step 1: Write the setup file**

```ts
// Global, per-file-overridable mock fallbacks for the node test environment.
//
// vitest runs in `environment: 'node'`, so files importing AsyncStorage,
// expo-* native modules, react-native, or the `__DEV__` global cannot be
// imported unmocked. These are FALLBACKS: any test file's own `vi.mock(...)`
// still wins (file-scoped hoisted mocks override setupFiles). This file must
// NOT assign `global.fetch` — three tests manage fetch themselves and a
// permanent assignment corrupts their restore semantics.
import { vi } from 'vitest';

// React Native's `__DEV__` global — referenced bare (not `typeof`-guarded) in
// some files (e.g. lib/rating/store-review.ts). Define it so those imports
// don't ReferenceError. Tests that need the dev branch set it to true locally.
(globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;

// In-memory AsyncStorage — superset of every per-file stub (adds getAllKeys +
// multiGet, needed by storage.ts hydrateStorage()).
vi.mock('@react-native-async-storage/async-storage', () => {
  const mem = new Map<string, string>();
  return {
    default: {
      getItem: async (k: string) => mem.get(k) ?? null,
      setItem: async (k: string, v: string) => { mem.set(k, v); },
      removeItem: async (k: string) => { mem.delete(k); },
      getAllKeys: async () => [...mem.keys()],
      multiGet: async (keys: string[]) => keys.map((k) => [k, mem.get(k) ?? null] as [string, string | null]),
      clear: async () => { mem.clear(); },
    },
  };
});

// react-native — superset of the per-file `{ Platform: { OS: 'ios' } }` stubs.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '17.0', select: (o: Record<string, unknown>) => o.ios ?? o.default },
  Linking: { canOpenURL: vi.fn(async () => true), openURL: vi.fn(async () => undefined) },
  AppState: { currentState: 'active', addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
  NativeModules: {},
}));

vi.mock('expo-application', () => ({
  getIosIdForVendorAsync: vi.fn(async () => 'ios-vendor-id'),
  getAndroidId: vi.fn(() => 'android-id'),
}));

vi.mock('expo-calendar', () => ({
  EntityTypes: { EVENT: 'event' },
  requestCalendarPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
  getCalendarsAsync: vi.fn(async () => [
    { id: 'cal-1', allowsModifications: true, source: { name: 'iCloud' } },
  ]),
  createEventAsync: vi.fn(async () => 'event-id'),
}));

vi.mock('expo-clipboard', () => ({
  setStringAsync: vi.fn(async () => undefined),
}));

vi.mock('expo-constants', () => ({
  default: { expoConfig: { version: '1.0.0' } },
}));

vi.mock('expo-store-review', () => ({
  isAvailableAsync: vi.fn(async () => true),
  requestReview: vi.fn(async () => undefined),
  storeUrl: vi.fn(() => null),
}));
```

- [ ] **Step 2: Run the FULL existing suite with the setup file — verification gate**

Run: `npm -w apps/mobile test`
Expected: all 361 existing tests still PASS. If any fail, the setup stub is missing a member a per-file mock relied on (or double-mocks) — widen/adjust the stub until green. Do NOT proceed until green.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/test/setup.ts
git commit -m "test(mobile): add per-file-overridable mock setup for node tests

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `tz-aliases.ts` + `nav-params.ts` (pure logic)

**Files:**
- Test: `apps/mobile/src/lib/__tests__/tz-aliases.test.ts`, `apps/mobile/src/lib/__tests__/nav-params.test.ts`

**Interfaces:**
- Consumes: `canonicalIanaName(tz: string): string`, `tzEquivalent(a: string|null, b: string|null): boolean` from `../tz-aliases`; `setSelectedWindow`/`getSelectedWindow`/`clearSelectedWindow` from `../nav-params`.

- [ ] **Step 1: Write `tz-aliases.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { canonicalIanaName, tzEquivalent } from '../tz-aliases';

describe('canonicalIanaName', () => {
  it('maps a legacy zone to its canonical name', () => {
    expect(canonicalIanaName('Europe/Kiev')).toBe('Europe/Kyiv');
    expect(canonicalIanaName('Asia/Calcutta')).toBe('Asia/Kolkata');
    expect(canonicalIanaName('US/Pacific')).toBe('America/Los_Angeles');
  });
  it('returns an already-canonical or unknown name unchanged', () => {
    expect(canonicalIanaName('Europe/Kyiv')).toBe('Europe/Kyiv');
    expect(canonicalIanaName('Not/AZone')).toBe('Not/AZone');
  });
});

describe('tzEquivalent', () => {
  it('treats two nulls as equivalent', () => {
    expect(tzEquivalent(null, null)).toBe(true);
  });
  it('treats one null vs a real zone as not equivalent', () => {
    expect(tzEquivalent(null, 'Europe/Kyiv')).toBe(false);
    expect(tzEquivalent('Europe/Kyiv', null)).toBe(false);
  });
  it('matches a legacy alias against its canonical form', () => {
    expect(tzEquivalent('Europe/Kiev', 'Europe/Kyiv')).toBe(true);
  });
  it('returns false for genuinely different zones', () => {
    expect(tzEquivalent('Europe/Kyiv', 'America/New_York')).toBe(false);
  });
});
```

- [ ] **Step 2: Write `nav-params.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { setSelectedWindow, getSelectedWindow, clearSelectedWindow } from '../nav-params';

beforeEach(() => clearSelectedWindow());

describe('nav-params selected-window store', () => {
  it('returns null before anything is set', () => {
    expect(getSelectedWindow()).toBeNull();
  });
  it('stores and returns the window object by reference', () => {
    const w = { start: '2026-07-01T12:00:00+03:00', score: 65 };
    setSelectedWindow(w);
    expect(getSelectedWindow()).toBe(w);
  });
  it('clears the stored window', () => {
    setSelectedWindow({ start: 'x' });
    clearSelectedWindow();
    expect(getSelectedWindow()).toBeNull();
  });
});
```

- [ ] **Step 3: Run both tests**

Run: `npm -w apps/mobile test -- tz-aliases nav-params`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/lib/__tests__/tz-aliases.test.ts apps/mobile/src/lib/__tests__/nav-params.test.ts
git commit -m "test(mobile): cover tz-aliases and nav-params

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `format-window.ts` (duration-aware formatting)

**Files:**
- Test: `apps/mobile/src/lib/__tests__/format-window.test.ts`

**Interfaces:**
- Consumes: `getDurationVariant(minutes): 'long'|'medium'|'short'|'single'|'unknown'`, `formatWindowTime(window): { primary, secondary }`, `buildNarrative(window): string[]` from `../format-window`. (i18next is NOT initialized in the test → the en-dictionary fallback path runs deterministically.)

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect } from 'vitest';
import { getDurationVariant, formatWindowTime, buildNarrative } from '../format-window';

describe('getDurationVariant', () => {
  it('classifies by duration_minutes', () => {
    expect(getDurationVariant(null)).toBe('unknown');
    expect(getDurationVariant(undefined)).toBe('unknown');
    expect(getDurationVariant(90)).toBe('long');
    expect(getDurationVariant(61)).toBe('long');
    expect(getDurationVariant(60)).toBe('medium');
    expect(getDurationVariant(10)).toBe('medium');
    expect(getDurationVariant(5)).toBe('short');
    expect(getDurationVariant(2)).toBe('short');
    expect(getDurationVariant(1)).toBe('single');
    expect(getDurationVariant(0)).toBe('unknown');
  });
});

describe('formatWindowTime', () => {
  it('returns empty primary when no start', () => {
    expect(formatWindowTime({})).toEqual({ primary: '', secondary: null });
  });
  it('renders a long window as a range with duration', () => {
    const r = formatWindowTime({ start: '2026-07-01T12:00:00Z', end: '2026-07-01T13:25:00Z', duration_minutes: 85 });
    expect(r.primary).toMatch(/\(1h 25m\)$/);
    expect(r.secondary).toBeNull();
  });
  it('renders a single-minute window with the "exactly" label + hint', () => {
    const r = formatWindowTime({ start: '2026-07-01T12:00:00Z', end: '2026-07-01T12:01:00Z', duration_minutes: 1 });
    expect(r.primary).toMatch(/exactly/i);
    expect(r.secondary).toBe('A single, pristine moment. Be ready.');
  });
  it('treats a synthetic window as approximate', () => {
    const r = formatWindowTime({ start: '2026-07-01T12:00:00Z', _synthetic: true, duration_minutes: null });
    expect(r.secondary).toMatch(/Approximate time/);
  });
});

describe('buildNarrative', () => {
  it('falls back honestly when there are no displayable factors', () => {
    expect(buildNarrative({})).toEqual([
      'Less detail is available for this day — try a focused search to see the full breakdown.',
    ]);
  });
  it('picks up to two passing factors then one partial/non-low fail', () => {
    const paras = buildNarrative({
      factors: [
        { factor_id: 'a', weight_class: 'high' },
        { factor_id: 'b', weight_class: 'high' },
        { factor_id: 'c', weight_class: 'high' },
      ],
      displayable: {
        factors: [
          { factor_id: 'a', status: 'pass', phrase_short: 'A', phrase_full: 'Para A.' },
          { factor_id: 'b', status: 'pass', phrase_short: 'B', phrase_full: 'Para B.' },
          { factor_id: 'c', status: 'partial', phrase_short: 'C', phrase_full: 'Para C.' },
        ],
      },
    });
    expect(paras).toEqual(['Para A.', 'Para B.', 'Para C.']);
  });
  it('skips a low-weight fail', () => {
    const paras = buildNarrative({
      factors: [{ factor_id: 'x', weight_class: 'low' }],
      displayable: { factors: [{ factor_id: 'x', status: 'fail', phrase_short: 'X', phrase_full: 'Low fail.' }] },
    });
    // no passing, only a low-weight fail → falls back to the first annotated phrase
    expect(paras).toEqual(['Low fail.']);
  });
});
```

- [ ] **Step 2: Run**

Run: `npm -w apps/mobile test -- format-window`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/lib/__tests__/format-window.test.ts
git commit -m "test(mobile): cover format-window duration + narrative logic

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `cluster-windows.ts` (incl. BUG-001 RED test)

**Files:**
- Test: `apps/mobile/src/lib/__tests__/cluster-windows.test.ts`

**Interfaces:**
- Consumes: `clusterWindows(windows): ListCard[]` from `../cluster-windows`. `ListCard` has `{ representative, count, dateText, timePrimary, timeSecondary, windows }`.

> BUG-001 note: `cluster-windows.ts:130` formats the date label with no `timeZone`, so the date renders in the runtime zone, not the event zone. The RED test below uses `it.fails(...)` so it documents the bug AND keeps CI green; when the bug is fixed the test starts passing and `it.fails` turns red, signalling removal of `.fails`. The test pins `process.env.TZ` so it is deterministic regardless of the CI host zone.

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { clusterWindows } from '../cluster-windows';

describe('clusterWindows', () => {
  it('returns [] for empty input', () => {
    expect(clusterWindows([])).toEqual([]);
  });

  it('collapses same-day windows into one card, strongest as representative', () => {
    const cards = clusterWindows([
      { start: '2026-07-01T21:30:00+03:00', end: '2026-07-01T21:45:00+03:00', score: 60, duration_minutes: 15 },
      { start: '2026-07-01T22:00:00+03:00', end: '2026-07-01T22:15:00+03:00', score: 70, duration_minutes: 15 },
    ]);
    expect(cards).toHaveLength(1);
    expect(cards[0].count).toBe(2);
    expect(cards[0].representative.score).toBe(70);
  });

  it('sorts cards by the day best score descending', () => {
    const cards = clusterWindows([
      { start: '2026-07-01T21:30:00+03:00', score: 64, duration_minutes: 15 },
      { start: '2026-07-02T21:30:00+03:00', score: 72, duration_minutes: 15 },
    ]);
    expect(cards.map((c) => c.representative.score)).toEqual([72, 64]);
  });

  it('shows a contiguous range when windows fall within ~90 min', () => {
    const cards = clusterWindows([
      { start: '2026-07-01T21:30:00+03:00', score: 60, duration_minutes: 15 },
      { start: '2026-07-01T22:30:00+03:00', score: 65, duration_minutes: 15 },
    ]);
    expect(cards[0].timePrimary).toContain('→');
  });

  it('points to the strongest moment when windows are spread across the day', () => {
    const cards = clusterWindows([
      { start: '2026-07-01T15:00:00+03:00', score: 60, duration_minutes: 15 },
      { start: '2026-07-01T22:00:00+03:00', score: 65, duration_minutes: 15 },
    ]);
    expect(cards[0].timePrimary.toLowerCase()).toMatch(/best/);
  });
});

// BUG-001: date label is rendered in the device zone, not the event zone.
// A window starting 23:30 in a +12:00 zone is still the SAME calendar day
// locally, but on a device in a far-west zone Intl renders the prior day.
describe('clusterWindows date label (BUG-001)', () => {
  const realTZ = process.env.TZ;
  beforeAll(() => { process.env.TZ = 'America/Los_Angeles'; });
  afterAll(() => { process.env.TZ = realTZ; });

  it.fails('renders the date in the EVENT zone, not the device zone', () => {
    // 2026-07-01 23:30 at +12:00 → 2026-07-01 11:30 UTC → 2026-07-01 04:30 LA.
    // Same local date (July 1) at the event, but a naive formatter on an LA
    // device still says July 1 here; pick a case that crosses midnight:
    // 2026-07-02 00:30 at +12:00 → 2026-07-01 12:30 UTC → 2026-07-01 05:30 LA.
    const cards = clusterWindows([
      { start: '2026-07-02T00:30:00+12:00', score: 65, duration_minutes: 15 },
    ]);
    // Correct (event-zone) label is July 2; buggy code renders July 1.
    expect(cards[0].dateText).toMatch(/(July 2|2 July|Jul 2)/);
  });
});
```

- [ ] **Step 2: Run**

Run: `npm -w apps/mobile test -- cluster-windows`
Expected: all PASS — including the `it.fails` case, which vitest reports as passing *because* its assertion fails (documenting BUG-001). If the `it.fails` case shows as FAILING, the bug has been fixed elsewhere; remove the `.fails` and the comment.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/lib/__tests__/cluster-windows.test.ts
git commit -m "test(mobile): cover cluster-windows + document BUG-001 with it.fails

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `storage.ts` (Convention B + module-state reset)

**Files:**
- Test: `apps/mobile/src/lib/__tests__/storage-wrapper.test.ts`

**Interfaces:**
- Consumes: `storage.getString/set/delete`, `hydrateStorage()`, `isStorageHydrated()` from `../storage`. Uses the global AsyncStorage mock (superset incl. `getAllKeys`/`multiGet`). Module-level `cache`/`hydrated` reset via `vi.resetModules()` + dynamic `import()`.

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// storage.ts holds module-level state (cache Map + hydrated flag). Re-import
// fresh per test so hydration state does not leak across tests.
async function freshStorage() {
  vi.resetModules();
  return import('../storage');
}

describe('storage wrapper', () => {
  beforeEach(() => vi.clearAllMocks());

  it('round-trips a value through the in-memory cache', async () => {
    const { storage } = await freshStorage();
    storage.set('k', 'v');
    expect(storage.getString('k')).toBe('v');
  });

  it('delete removes a value', async () => {
    const { storage } = await freshStorage();
    storage.set('k', 'v');
    storage.delete('k');
    expect(storage.getString('k')).toBeUndefined();
  });

  it('isStorageHydrated is false until hydrateStorage runs, then true', async () => {
    const { hydrateStorage, isStorageHydrated } = await freshStorage();
    expect(isStorageHydrated()).toBe(false);
    await hydrateStorage();
    expect(isStorageHydrated()).toBe(true);
  });

  it('hydrateStorage loads persisted AsyncStorage pairs into the cache', async () => {
    // Seed AsyncStorage via setItem (goes through the global mock), then a
    // fresh module hydrates from it.
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem('seed', 'fromdisk');
    const { storage, hydrateStorage } = await freshStorage();
    await hydrateStorage();
    expect(storage.getString('seed')).toBe('fromdisk');
  });

  it('hydrateStorage is idempotent (second call is a no-op)', async () => {
    const { hydrateStorage, isStorageHydrated } = await freshStorage();
    await hydrateStorage();
    await hydrateStorage();
    expect(isStorageHydrated()).toBe(true);
  });
});
```

> If Step 4 shows the seed test leaking the in-memory AsyncStorage Map across `vi.resetModules()` (the mock module may itself be reset), move the AsyncStorage import to AFTER `freshStorage()` in that test, or seed via the same module instance. Adjust until green; the behavior under test is `storage.ts`, not the mock.

- [ ] **Step 2: Run**

Run: `npm -w apps/mobile test -- storage-wrapper`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/lib/__tests__/storage-wrapper.test.ts
git commit -m "test(mobile): cover storage.ts wrapper + hydration

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `device-id.ts`, `draft-store.ts`, `locale-preference.ts`

**Files:**
- Test: `apps/mobile/src/lib/__tests__/device-id.test.ts`, `apps/mobile/src/lib/__tests__/draft-store.test.ts`, `apps/mobile/src/lib/__tests__/locale-preference.test.ts`

**Interfaces:**
- Consumes: `getDeviceId()`/`clearDeviceId()`; `getDraft`/`patchDraft`/`clearDraft`/`getLastActivity`/`setLastActivity`/`getSavedMoments`/`saveMoment`/`removeSavedMoment`; `getPersistedLocale`/`setPersistedLocale`. All use Convention A — mock `../storage` with an in-memory Map (matches the 8 existing Convention-A tests).

- [ ] **Step 1: Write `device-id.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mem = new Map<string, string>();
vi.mock('../storage', () => ({
  storage: {
    getString: (k: string) => mem.get(k),
    set: (k: string, v: string) => { mem.set(k, v); },
    delete: (k: string) => { mem.delete(k); },
  },
}));

import { getDeviceId, clearDeviceId } from '../device-id';

beforeEach(() => { mem.clear(); vi.clearAllMocks(); });

describe('getDeviceId', () => {
  it('returns the cached id without re-deriving', async () => {
    mem.set('inceptio.device_id', 'cached-123');
    expect(await getDeviceId()).toBe('cached-123');
  });
  it('derives + caches the iOS vendor id on first call', async () => {
    const id = await getDeviceId();
    expect(id).toBe('ios-vendor-id'); // from the global expo-application mock
    expect(mem.get('inceptio.device_id')).toBe('ios-vendor-id');
  });
  it('clearDeviceId removes the cached id', async () => {
    mem.set('inceptio.device_id', 'x');
    clearDeviceId();
    expect(mem.get('inceptio.device_id')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Write `draft-store.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mem = new Map<string, string>();
vi.mock('../storage', () => ({
  storage: {
    getString: (k: string) => mem.get(k),
    set: (k: string, v: string) => { mem.set(k, v); },
    delete: (k: string) => { mem.delete(k); },
  },
}));

import {
  getDraft, patchDraft, clearDraft, getLastActivity, setLastActivity,
  getSavedMoments, saveMoment, removeSavedMoment, type SavedMoment,
} from '../draft-store';

beforeEach(() => mem.clear());

describe('search draft', () => {
  it('returns {} when no draft persisted', () => {
    expect(getDraft()).toEqual({});
  });
  it('patchDraft merges and persists', () => {
    patchDraft({ activity: 'wedding' });
    const next = patchDraft({ city: 'Kyiv' });
    expect(next).toEqual({ activity: 'wedding', city: 'Kyiv' });
    expect(getDraft()).toEqual({ activity: 'wedding', city: 'Kyiv' });
  });
  it('clearDraft empties it', () => {
    patchDraft({ activity: 'travel' });
    clearDraft();
    expect(getDraft()).toEqual({});
  });
  it('returns {} when stored JSON is corrupt', () => {
    mem.set('inceptio.search_draft', '{not json');
    expect(getDraft()).toEqual({});
  });
});

describe('last activity', () => {
  it('round-trips', () => {
    expect(getLastActivity()).toBeNull();
    setLastActivity('contracts');
    expect(getLastActivity()).toBe('contracts');
  });
});

describe('saved moments', () => {
  const moment: SavedMoment = {
    id: 'm1', activity: 'wedding', city: 'Kyiv',
    start: '2026-07-01T12:00:00+03:00', end: '2026-07-01T12:15:00+03:00',
    duration_minutes: 15, score: 65, grade: 'fair', headline: 'A tender day.', saved_at: '2026-06-24T00:00:00Z',
  };
  it('saves, dedupes by id, removes', () => {
    saveMoment(moment);
    saveMoment(moment); // dedupe
    expect(getSavedMoments()).toHaveLength(1);
    removeSavedMoment('m1');
    expect(getSavedMoments()).toEqual([]);
  });
  it('prepends newest first', () => {
    saveMoment(moment);
    saveMoment({ ...moment, id: 'm2' });
    expect(getSavedMoments().map((m) => m.id)).toEqual(['m2', 'm1']);
  });
});
```

- [ ] **Step 3: Write `locale-preference.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mem = new Map<string, string>();
vi.mock('../storage', () => ({
  storage: {
    getString: (k: string) => mem.get(k),
    set: (k: string, v: string) => { mem.set(k, v); },
    delete: (k: string) => { mem.delete(k); },
  },
}));

import { getPersistedLocale, setPersistedLocale } from '../locale-preference';

beforeEach(() => mem.clear());

describe('persisted locale', () => {
  it('returns null when unset', () => {
    expect(getPersistedLocale()).toBeNull();
  });
  it('round-trips a supported bundle', () => {
    setPersistedLocale('de');
    expect(getPersistedLocale()).toBe('de');
  });
  it('returns null when the stored value is no longer a supported bundle', () => {
    mem.set('inceptio.locale', 'xx-removed');
    expect(getPersistedLocale()).toBeNull();
  });
});
```

- [ ] **Step 4: Run**

Run: `npm -w apps/mobile test -- device-id draft-store locale-preference`
Expected: PASS. (If `setPersistedLocale('de')` fails because `de` is not in `SUPPORTED`, swap for any member of the real `SUPPORTED` union from `src/i18n/locale.ts`.)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/__tests__/device-id.test.ts apps/mobile/src/lib/__tests__/draft-store.test.ts apps/mobile/src/lib/__tests__/locale-preference.test.ts
git commit -m "test(mobile): cover device-id, draft-store, locale-preference

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: `launch-constants.ts` + `query-client.ts`

**Files:**
- Test: `apps/mobile/src/lib/rating/__tests__/launch-constants.test.ts`, `apps/mobile/src/lib/__tests__/query-client.test.ts`

**Interfaces:**
- Consumes: `IOS_APP_STORE_URL`/`ANDROID_PLAY_STORE_URL`/`WEB_STORE_URL`/`SUPPORT_EMAIL`/`buildEmailSubject()` from `../launch-constants`; `queryClient` from `../query-client`, and the error classes from `../api`. The retry policy is read via `queryClient.getDefaultOptions().queries.retry`.

- [ ] **Step 1: Write `launch-constants.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  IOS_APP_STORE_URL, ANDROID_PLAY_STORE_URL, WEB_STORE_URL, SUPPORT_EMAIL, buildEmailSubject,
} from '../launch-constants';

describe('launch constants', () => {
  it('exposes openable store/web/support strings', () => {
    expect(IOS_APP_STORE_URL).toMatch(/^https:\/\/apps\.apple\.com\//);
    expect(ANDROID_PLAY_STORE_URL).toMatch(/^https:\/\/play\.google\.com\//);
    expect(WEB_STORE_URL).toMatch(/^https:\/\//);
    expect(SUPPORT_EMAIL).toContain('@');
  });
  it('builds a locale-tagged email subject', () => {
    // i18next not initialized → activeBundle() resolves the default bundle.
    expect(buildEmailSubject()).toMatch(/^Inceptio feedback \([a-z-]+\)$/);
  });
});
```

- [ ] **Step 2: Write `query-client.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { queryClient } from '../query-client';
import { RateLimitError, UpstreamQuotaError, SchemaMismatchError, ServerError } from '../api';

const retry = queryClient.getDefaultOptions().queries!.retry as (n: number, e: Error) => boolean;

describe('queryClient retry policy', () => {
  it('never retries non-retryable errors', () => {
    expect(retry(0, new RateLimitError(null))).toBe(false);
    expect(retry(0, new UpstreamQuotaError('quota'))).toBe(false);
    expect(retry(0, new SchemaMismatchError([]))).toBe(false);
    expect(retry(0, new ServerError(502, 'x'))).toBe(false);
  });
  it('retries a generic error once', () => {
    expect(retry(0, new Error('flaky'))).toBe(true);
    expect(retry(1, new Error('flaky'))).toBe(false);
  });
  it('does not retry a 4xx ServerError beyond the generic budget', () => {
    expect(retry(0, new ServerError(422, 'bad'))).toBe(true); // <500 falls to generic
    expect(retry(1, new ServerError(422, 'bad'))).toBe(false);
  });
});
```

- [ ] **Step 3: Run**

Run: `npm -w apps/mobile test -- launch-constants query-client`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/lib/rating/__tests__/launch-constants.test.ts apps/mobile/src/lib/__tests__/query-client.test.ts
git commit -m "test(mobile): cover launch-constants + query-client retry policy

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: `calendar-export.ts` (expo-calendar mock)

**Files:**
- Test: `apps/mobile/src/lib/__tests__/calendar-export.test.ts`

**Interfaces:**
- Consumes: `addWindowToCalendar(window, activity, city): Promise<CalendarResult>` from `../calendar-export`. Overrides the global `expo-calendar` mock per-test via `vi.mocked(...)` to drive permission/no-calendar/success/error branches.

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Calendar from 'expo-calendar';
import { addWindowToCalendar } from '../calendar-export';

const win = { start: '2026-07-01T12:00:00Z', end: '2026-07-01T12:30:00Z', displayable: { headline: 'A tender day.' } };

beforeEach(() => vi.clearAllMocks());

describe('addWindowToCalendar', () => {
  it('rejects a window with no start', async () => {
    const r = await addWindowToCalendar({}, 'wedding', 'Kyiv');
    expect(r).toEqual({ ok: false, reason: 'invalid_window', message: expect.any(String) });
  });

  it('returns permission failure when denied', async () => {
    vi.mocked(Calendar.requestCalendarPermissionsAsync).mockResolvedValueOnce({ status: 'denied' } as never);
    const r = await addWindowToCalendar(win, 'wedding', 'Kyiv');
    expect(r).toMatchObject({ ok: false, reason: 'permission' });
  });

  it('returns no_calendar when no writable calendar exists', async () => {
    vi.mocked(Calendar.getCalendarsAsync).mockResolvedValueOnce([
      { id: 'c', allowsModifications: false, source: { name: 'Other' } },
    ] as never);
    const r = await addWindowToCalendar(win, 'wedding', 'Kyiv');
    expect(r).toMatchObject({ ok: false, reason: 'no_calendar' });
  });

  it('creates an event and returns ok', async () => {
    const r = await addWindowToCalendar(win, 'business_launch', 'Kyiv');
    expect(r).toEqual({ ok: true });
    expect(Calendar.createEventAsync).toHaveBeenCalledOnce();
  });

  it('returns unknown failure when createEvent throws', async () => {
    vi.mocked(Calendar.createEventAsync).mockRejectedValueOnce(new Error('boom'));
    const r = await addWindowToCalendar(win, 'travel', 'Kyiv');
    expect(r).toMatchObject({ ok: false, reason: 'unknown', message: 'boom' });
  });
});
```

- [ ] **Step 2: Run**

Run: `npm -w apps/mobile test -- calendar-export`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/lib/__tests__/calendar-export.test.ts
git commit -m "test(mobile): cover calendar-export branches

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: `rating/store-review.ts` (expo + Linking mocks)

**Files:**
- Test: `apps/mobile/src/lib/rating/__tests__/store-review.test.ts`

**Interfaces:**
- Consumes: `attemptNativeReview(now?)`, `openStoreListing()`, `openFeedback({onCopied,onError})`, `debugForceRequestReview()` from `../store-review`. Mocks `../rating-store` (`recordAttempt`) per-file; drives `expo-store-review`, `react-native` Linking, `expo-clipboard` via the global stubs + per-test overrides.

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as StoreReview from 'expo-store-review';
import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';

const recordAttempt = vi.fn();
vi.mock('../rating-store', () => ({ recordAttempt: (d: Date) => recordAttempt(d) }));

import { attemptNativeReview, openStoreListing, openFeedback, debugForceRequestReview } from '../store-review';

beforeEach(() => vi.clearAllMocks());

describe('attemptNativeReview', () => {
  it('records an attempt and requests review when available', async () => {
    await attemptNativeReview(new Date('2026-06-24T00:00:00Z'));
    expect(recordAttempt).toHaveBeenCalledOnce();
    expect(StoreReview.requestReview).toHaveBeenCalledOnce();
  });
  it('no-ops (burns no attempt) when the store is unavailable', async () => {
    vi.mocked(StoreReview.isAvailableAsync).mockResolvedValueOnce(false);
    await attemptNativeReview();
    expect(recordAttempt).not.toHaveBeenCalled();
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });
});

describe('openStoreListing', () => {
  it('opens the first openable candidate with the write-review param (iOS)', async () => {
    await openStoreListing();
    expect(Linking.openURL).toHaveBeenCalledOnce();
    const url = vi.mocked(Linking.openURL).mock.calls[0][0];
    expect(url).toContain('action=write-review');
  });
});

describe('openFeedback', () => {
  it('opens the mail composer when mailto is supported', async () => {
    const onCopied = vi.fn();
    await openFeedback({ onCopied });
    expect(Linking.openURL).toHaveBeenCalledOnce();
    expect(onCopied).not.toHaveBeenCalled();
  });
  it('falls back to clipboard when mailto is unsupported', async () => {
    vi.mocked(Linking.canOpenURL).mockResolvedValueOnce(false);
    const onCopied = vi.fn();
    await openFeedback({ onCopied });
    expect(Clipboard.setStringAsync).toHaveBeenCalledOnce();
    expect(onCopied).toHaveBeenCalledOnce();
  });
});

describe('debugForceRequestReview', () => {
  it('no-ops when __DEV__ is false (setup default)', async () => {
    await debugForceRequestReview();
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });
  it('requests review when __DEV__ is true', async () => {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;
    await debugForceRequestReview();
    expect(StoreReview.requestReview).toHaveBeenCalledOnce();
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false; // restore
  });
});
```

- [ ] **Step 2: Run**

Run: `npm -w apps/mobile test -- store-review`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/lib/rating/__tests__/store-review.test.ts
git commit -m "test(mobile): cover store-review review/feedback/listing branches

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: `api.ts` gap closure (getDailyNote, timeout, network, schema-mismatch, healthCheck)

**Files:**
- Test: `apps/mobile/src/lib/__tests__/api-gaps.test.ts`

**Interfaces:**
- Consumes: `searchElectional`, `getDailyNote`, `healthCheck`, and error classes `TimeoutError`/`NetworkError`/`SchemaMismatchError`/`ServerError` from `../api`. Uses a per-test `global.fetch` spy (NOT the setup file). Reuses the real 200 fixture at `apps/mobile/src/lib/__tests__/fixtures/api-public/search-200.json` for the valid-envelope path.

> Existing files already cover `searchElectional` happy path + 429. This task targets the gaps only. `getDailyNote` needs both fetch AND the global AsyncStorage mock (for the daily-note cache write).

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import search200 from './fixtures/api-public/search-200.json';
import {
  searchElectional, getDailyNote, healthCheck,
  TimeoutError, NetworkError, SchemaMismatchError, ServerError,
} from '../api';

const validRequest = {
  activity: 'wedding' as const,
  start: '2026-07-01', end: '2026-07-01',
  lat: 50.45, lng: 30.52, timezone: 'Europe/Kyiv', city: 'Kyiv',
};

function mockFetchOnce(impl: () => Promise<Response>) {
  vi.spyOn(globalThis, 'fetch').mockImplementationOnce(impl as never);
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.restoreAllMocks());

describe('searchElectional error paths', () => {
  it('throws NetworkError when fetch rejects', async () => {
    mockFetchOnce(async () => { throw new Error('offline'); });
    await expect(searchElectional(validRequest)).rejects.toBeInstanceOf(NetworkError);
  });

  it('throws TimeoutError when fetch aborts', async () => {
    mockFetchOnce(async () => {
      const e = new Error('aborted'); e.name = 'AbortError'; throw e;
    });
    await expect(searchElectional(validRequest)).rejects.toBeInstanceOf(TimeoutError);
  });

  it('throws ServerError on a non-429 !ok response', async () => {
    mockFetchOnce(async () => new Response('{"detail":"bad"}', { status: 422 }));
    await expect(searchElectional(validRequest)).rejects.toBeInstanceOf(ServerError);
  });

  it('throws SchemaMismatchError when the body fails Zod parse', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchOnce(async () => new Response('{"not":"an envelope"}', { status: 200 }));
    await expect(searchElectional(validRequest)).rejects.toBeInstanceOf(SchemaMismatchError);
  });

  it('returns a translated envelope on a valid 200', async () => {
    mockFetchOnce(async () => new Response(JSON.stringify(search200), { status: 200 }));
    const { envelope, cacheHit } = await searchElectional(validRequest);
    expect(cacheHit).toBe(false);
    expect(envelope.data).toBeDefined();
  });
});

describe('healthCheck', () => {
  it('returns the parsed health body on ok', async () => {
    mockFetchOnce(async () => new Response(JSON.stringify({ status: 'healthy', worker_version: '1', upstream_check: true }), { status: 200 }));
    expect((await healthCheck()).status).toBe('healthy');
  });
  it('throws ServerError on a failed health check', async () => {
    mockFetchOnce(async () => new Response('', { status: 503 }));
    await expect(healthCheck()).rejects.toBeInstanceOf(ServerError);
  });
});

describe('getDailyNote', () => {
  it('synthesizes a daily note from a fresh search and caches it', async () => {
    // First call: cache miss → fetches search200, synthesizes, writes cache.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(search200), { status: 200 }) as never,
    );
    const r = await getDailyNote({ lat: 50.45, lng: 30.52, tz: 'Europe/Kyiv', activity: 'wedding' });
    expect(r.cacheHit).toBe(false);
    expect(r.response.daily_note).toBeDefined();
  });
});
```

> If `search200` lacks a non-empty `top_windows[0]` AND any `excluded_ranges`, `getDailyNote` throws `ServerError(502)` (the empty-day guard). Inspect the fixture; if it's an all-blocked day, either pick a fixture with a top window or assert the 502 path instead. Verify the fixture shape before finalizing the assertion.

- [ ] **Step 2: Run**

Run: `npm -w apps/mobile test -- api-gaps`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/lib/__tests__/api-gaps.test.ts
git commit -m "test(mobile): cover api.ts timeout/network/schema/health/getDailyNote

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: `shared-types` — request, factor, excluded-range schemas

**Files:**
- Create: `packages/shared-types/src/__tests__/fixtures.ts`
- Test: `packages/shared-types/src/__tests__/request.test.ts`, `packages/shared-types/src/__tests__/factor.test.ts`, `packages/shared-types/src/__tests__/excluded-range.test.ts`

**Interfaces:**
- Produces: `validFactor`, `validExcludedRange`, `validWindow`, `validEnvelope` fixture builders in `fixtures.ts` (reused by Task 12). Built inline (NOT imported from translations — that would be a circular dep, since translations depends on shared-types).

- [ ] **Step 1: Create `fixtures.ts` with minimal valid builders**

```ts
import type { Factor } from '../api/factor';
import type { ExcludedRange } from '../api/excluded-range';

export const validFactor: Factor = {
  factor_id: 'venus_dignified_direct_well_aspected',
  category: 'electional',
  observation: 'Venus in Leo 9.8° (term, direct)',
  contribution: 15.58,
  weight_class: 'high',
  status: 'pass',
  score: 80,
  rationale_short: 'Venus is strong.',
  details: null,
};

export const validExcludedRange: ExcludedRange = {
  from: '2026-10-01T00:00:00+03:00',
  to: '2026-11-15T00:00:00+03:00',
  reason_id: 'venus_retrograde',
  severity: 'hard_stop',
  label: 'Venus retrograde — not a season for new commitments.',
  applies_to_activity: true,
};
```

- [ ] **Step 2: Write `request.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { ActivitySchema, ElectionalSearchRequestSchema } from '../api/request';

const valid = {
  activity: 'wedding', start: '2026-07-01', end: '2026-07-31',
  lat: 50.45, lng: 30.52, timezone: 'Europe/Kyiv', city: 'Kyiv',
};

describe('ActivitySchema', () => {
  it('accepts the four MVP activities', () => {
    for (const a of ['wedding', 'contracts', 'business_launch', 'travel']) {
      expect(ActivitySchema.safeParse(a).success).toBe(true);
    }
  });
  it('rejects a deferred activity', () => {
    expect(ActivitySchema.safeParse('surgery').success).toBe(false);
  });
});

describe('ElectionalSearchRequestSchema', () => {
  it('accepts a valid request', () => {
    expect(ElectionalSearchRequestSchema.safeParse(valid).success).toBe(true);
  });
  it('rejects an out-of-range lat', () => {
    expect(ElectionalSearchRequestSchema.safeParse({ ...valid, lat: 91 }).success).toBe(false);
  });
  it('rejects a too-short start date', () => {
    expect(ElectionalSearchRequestSchema.safeParse({ ...valid, start: '2026' }).success).toBe(false);
  });
  it('rejects unknown extra keys (.strict)', () => {
    expect(ElectionalSearchRequestSchema.safeParse({ ...valid, extra: 1 }).success).toBe(false);
  });
});
```

- [ ] **Step 3: Write `factor.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { FactorSchema, FactorIdSchema, WeightClassSchema, KNOWN_FACTOR_IDS } from '../api/factor';
import { validFactor } from './fixtures';

describe('FactorSchema', () => {
  it('accepts a valid factor', () => {
    expect(FactorSchema.safeParse(validFactor).success).toBe(true);
  });
  it('passes through unknown extra fields', () => {
    const r = FactorSchema.safeParse({ ...validFactor, brand_new_field: 42 });
    expect(r.success).toBe(true);
  });
  it('accepts an unknown factor_id (permissive enum)', () => {
    expect(FactorIdSchema.safeParse('some_new_upstream_id').success).toBe(true);
  });
  it('rejects an empty factor_id', () => {
    expect(FactorIdSchema.safeParse('').success).toBe(false);
  });
  it('rejects an unknown weight_class', () => {
    expect(WeightClassSchema.safeParse('catastrophic').success).toBe(false);
  });
  it('has 15 known factor ids', () => {
    expect(KNOWN_FACTOR_IDS).toHaveLength(15);
  });
});
```

- [ ] **Step 4: Write `excluded-range.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { ExcludedRangeSchema, ReasonIdSchema, SeveritySchema, KNOWN_REASON_IDS } from '../api/excluded-range';
import { validExcludedRange } from './fixtures';

describe('ExcludedRangeSchema', () => {
  it('accepts a valid range', () => {
    expect(ExcludedRangeSchema.safeParse(validExcludedRange).success).toBe(true);
  });
  it('accepts an unknown reason_id (permissive)', () => {
    expect(ReasonIdSchema.safeParse('brand_new_reason').success).toBe(true);
  });
  it('rejects an empty reason_id', () => {
    expect(ReasonIdSchema.safeParse('').success).toBe(false);
  });
  it('rejects an unknown severity', () => {
    expect(SeveritySchema.safeParse('mild').success).toBe(false);
  });
  it('includes the mid-2026 upstream reason additions', () => {
    for (const id of ['mercury_combust', 'mars_retrograde', 'jupiter_retrograde']) {
      expect(KNOWN_REASON_IDS).toContain(id);
    }
  });
});
```

- [ ] **Step 5: Run**

Run: `npm -w @inceptio/shared-types test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/shared-types/src/__tests__/fixtures.ts packages/shared-types/src/__tests__/request.test.ts packages/shared-types/src/__tests__/factor.test.ts packages/shared-types/src/__tests__/excluded-range.test.ts
git commit -m "test(shared-types): cover request, factor, excluded-range schemas

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: `shared-types` — response envelope + daily-note schemas

**Files:**
- Modify: `packages/shared-types/src/__tests__/fixtures.ts` (add `validWindow`, `validEnvelope`)
- Test: `packages/shared-types/src/__tests__/response.test.ts`, `packages/shared-types/src/__tests__/daily-note.test.ts`

**Interfaces:**
- Consumes: `validFactor`/`validExcludedRange` from Task 11. Produces `validWindow`/`validEnvelope` builders.

- [ ] **Step 1: Extend `fixtures.ts`**

```ts
// Append to packages/shared-types/src/__tests__/fixtures.ts
import type { Window, ApiEnvelope } from '../api/response';

export const validWindow: Window = {
  rank: 1,
  start: '2026-07-01T21:30:00+03:00',
  end: '2026-07-01T22:30:00+03:00',
  duration_minutes: 60,
  score: 65,
  grade: 'fair',
  factors: [validFactor],
  cautions: [],
  rationale: 'A tender day for beginnings.',
  summary: null,
  chart_summary: null,
  natal_alignment: null,
  natal_modifier: null,
  personal_advisories: [],
};

export const validEnvelope: ApiEnvelope = {
  success: true,
  data: {
    activity: 'wedding',
    house_system: 'placidus',
    search_window: {},
    summary: {
      total_candidates_evaluated: 100,
      viable_windows_count: 1,
      excluded_ranges_count: 1,
      best_score: 65,
      best_grade: 'fair',
      no_viable_windows: false,
      quality_advisory: null,
    },
    heatmap: [{
      date: { year: 2026, month: 7, day: 1 },
      best_score: 65,
      best_grade: 'fair',
      best_window_start: '2026-07-01T21:30:00+03:00',
      viable_count: 1,
      blocked: false,
      blocked_reasons: [],
    }],
    top_windows: [validWindow],
    excluded_ranges: [validExcludedRange],
  },
  metadata: {
    timestamp: '2026-07-01T00:00:00Z',
    calculation_time_ms: 8,
    api_version: 'v3',
    endpoint: '/electional/search',
    request_id: 'req-1',
    cache_hit: false,
    cache_age_seconds: null,
    credits_used: 5,
    server_location: null,
    calculation_method: null,
  },
  warnings: null,
  pagination: null,
};
```

> `validFactor` and `validExcludedRange` are already imported at the top of `fixtures.ts` from Task 11; reuse them directly (do not re-import).

- [ ] **Step 2: Write `response.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  ApiEnvelopeSchema, ApiDataSchema, WindowSchema, ScoreSchema, GradeSchema, KNOWN_GRADES,
} from '../api/response';
import { validEnvelope, validWindow } from './fixtures';

describe('ApiEnvelopeSchema', () => {
  it('accepts a full valid envelope', () => {
    expect(ApiEnvelopeSchema.safeParse(validEnvelope).success).toBe(true);
  });
  it('passes through unknown top-level fields', () => {
    expect(ApiEnvelopeSchema.safeParse({ ...validEnvelope, extra: 1 }).success).toBe(true);
  });
  it('rejects when data is missing', () => {
    const { data, ...rest } = validEnvelope;
    expect(ApiEnvelopeSchema.safeParse(rest).success).toBe(false);
  });
});

describe('ApiDataSchema', () => {
  it('rejects a deferred activity', () => {
    expect(ApiDataSchema.safeParse({ ...validEnvelope.data, activity: 'surgery' }).success).toBe(false);
  });
});

describe('WindowSchema', () => {
  it('accepts a valid window', () => {
    expect(WindowSchema.safeParse(validWindow).success).toBe(true);
  });
  it('rejects duration_minutes < 1', () => {
    expect(WindowSchema.safeParse({ ...validWindow, duration_minutes: 0 }).success).toBe(false);
  });
});

describe('ScoreSchema + GradeSchema', () => {
  it('bounds score to 0..100 ints', () => {
    expect(ScoreSchema.safeParse(72).success).toBe(true);
    expect(ScoreSchema.safeParse(101).success).toBe(false);
    expect(ScoreSchema.safeParse(50.5).success).toBe(false);
  });
  it('accepts an unknown grade (permissive) and lists the known grades', () => {
    expect(GradeSchema.safeParse('mythic').success).toBe(true);
    expect(KNOWN_GRADES).toContain('good');
  });
});
```

- [ ] **Step 3: Write `daily-note.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  DailyNoteOutputSchema, DailyNoteResponseSchema, QualityBucketSchema,
  MoonPhaseSchema, PartOfDayCutoffsSchema,
} from '../api/daily-note';

const validNote = {
  mood: 'good', moon_phase: 'waxing-crescent', date: '2026-07-01',
  headline: 'A tender day.', supporting: 'Venus brings warmth.',
  entry_id: 'e1', used_fallback: false,
};

const validResponse = {
  daily_note: validNote,
  saved_searches: [],
  total_saved_count: 0,
  library_version: '1.0.0',
  part_of_day_cutoffs: { morning_end_hour: 12, afternoon_end_hour: 17, evening_end_hour: 21 },
  cache_hit: false,
};

describe('DailyNoteOutputSchema', () => {
  it('accepts a valid note', () => {
    expect(DailyNoteOutputSchema.safeParse(validNote).success).toBe(true);
  });
  it('rejects a headline over 48 chars', () => {
    expect(DailyNoteOutputSchema.safeParse({ ...validNote, headline: 'x'.repeat(49) }).success).toBe(false);
  });
  it('rejects a non-ISO date', () => {
    expect(DailyNoteOutputSchema.safeParse({ ...validNote, date: '07/01/2026' }).success).toBe(false);
  });
  it('rejects an unknown mood', () => {
    expect(QualityBucketSchema.safeParse('radiant').success).toBe(false);
  });
  it('rejects an unknown moon phase', () => {
    expect(MoonPhaseSchema.safeParse('blue-moon').success).toBe(false);
  });
});

describe('PartOfDayCutoffsSchema', () => {
  it('bounds hours 0..24', () => {
    expect(PartOfDayCutoffsSchema.safeParse({ morning_end_hour: 25, afternoon_end_hour: 17, evening_end_hour: 21 }).success).toBe(false);
  });
});

describe('DailyNoteResponseSchema', () => {
  it('accepts a valid response', () => {
    expect(DailyNoteResponseSchema.safeParse(validResponse).success).toBe(true);
  });
  it('accepts a response without the optional cache_hit', () => {
    const { cache_hit, ...rest } = validResponse;
    expect(DailyNoteResponseSchema.safeParse(rest).success).toBe(true);
  });
});
```

- [ ] **Step 4: Run**

Run: `npm -w @inceptio/shared-types test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared-types/src/__tests__/fixtures.ts packages/shared-types/src/__tests__/response.test.ts packages/shared-types/src/__tests__/daily-note.test.ts
git commit -m "test(shared-types): cover response envelope + daily-note schemas

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Measure coverage + fill remaining gaps

**Files:**
- Test: any package whose first measured run falls below target (add targeted tests for the specific uncovered lines).

**Interfaces:**
- Consumes: all prior test tasks. Produces: a measured `text-summary` per package.

- [ ] **Step 1: Measure each package**

```bash
npm -w apps/mobile run test:coverage
npm -w @inceptio/translations run test:coverage
npm -w @inceptio/shared-types run test:coverage
```

Expected: mobile ≥90% lines (was 68%), shared-types ≥90% lines (was 10.5%), translations already ≥96%.

- [ ] **Step 2: For any file still below target, open its `html` report and add targeted tests**

For each uncovered block the report flags, add a test that exercises that branch in the relevant existing test file (follow the patterns from Tasks 2–12). Re-run `test:coverage` until the package clears `{ lines: 90, statements: 90, functions: 85, branches: 80 }` OR you confirm the remaining uncovered lines are in excluded thin-wrappers / unreachable hook lines (`useSyncExternalStore` in `activity-preference.ts`/`location-preference.ts`).

- [ ] **Step 3: Commit any gap-fill tests**

```bash
git add -A
git commit -m "test: fill remaining coverage gaps to clear thresholds

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Add thresholds + CI gate

**Files:**
- Modify: `apps/mobile/vitest.config.ts`, `packages/translations/vitest.config.ts`, `packages/shared-types/vitest.config.ts`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: the measured numbers from Task 13. Produces: a failing-on-regression coverage gate, run in CI.

- [ ] **Step 1: Add `thresholds` to each `vitest.config.ts` coverage block**

Add to the `coverage` object in all three configs:

```ts
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 85,
        branches: 80,
      },
```

If Task 13 showed a package genuinely below one of these (after excludes), lower THAT package's threshold to the achieved value rounded down to the nearest 5% (Global Constraints rule), and add a one-line comment stating the measured number and why.

- [ ] **Step 2: Verify the gate passes locally**

```bash
npm run test:coverage
```

Expected: all three packages PASS with the thresholds enforced (exit 0). If a package fails the gate, return to Task 13 or adjust the threshold per Step 1.

- [ ] **Step 3: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      # root workspace = packages/* (translations, shared-types)
      - run: npm ci
      - run: npm -ws --if-present run typecheck
      - run: npm -ws --if-present run test:coverage
      # apps/mobile is a standalone npm project with its own lockfile
      - run: npm --prefix apps/mobile ci
      - run: npm --prefix apps/mobile run test:coverage
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/vitest.config.ts packages/translations/vitest.config.ts packages/shared-types/vitest.config.ts .github/workflows/ci.yml
git commit -m "test(coverage): enforce thresholds + add CI workflow

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage check (each spec section → task):**
- §1 Mock layer → Task 1 (additive fallback, no `global.fetch`, superset stubs, `__DEV__`, verification gate). ✓
- §2 mobile pure-logic tests → Tasks 2, 3, 4 (tz-aliases, nav-params, format-window, cluster-windows incl. BUG-001), Task 7 (launch-constants), and `useDailyNote.helpers` is already tested (no task needed — confirmed in spec). ✓
- §2 mobile via-mocks → Task 5 (storage), Task 6 (device-id/draft-store/locale-preference), Task 7 (query-client), Task 8 (calendar-export), Task 9 (store-review), Task 10 (api gaps). ✓
- §3 shared-types schema tests → Tasks 11, 12. ✓
- §4 translations → covered by Task 0 config + Task 13 measurement (already ≥96%, clears thresholds; no new tests expected). ✓
- §5 coverage config/scripts/thresholds → Task 0 (config/scripts) + Task 14 (thresholds). ✓
- §6 CI → Task 14. ✓
- Version alignment (decided) → Task 0 Step 1. ✓

**Placeholder scan:** No "TBD"/"implement later". The two measurement-driven steps (Task 13 Step 2, Task 14 Step 1 calibration) are inherent to a coverage goal and carry concrete instructions + the exact threshold rule. Fixture-shape caveats (search-200.json in Task 10; `de` bundle in Task 6) are flagged with concrete fallbacks. ✓

**Type consistency:** `SavedMoment` fields match `draft-store.ts`. `ListCard` fields match `cluster-windows.ts`. `retry` signature read from `getDefaultOptions().queries.retry`. Error classes match `api.ts` exports (`RateLimitError(resetAtUnix, limit?, used?)`, `UpstreamQuotaError(msg)`, `SchemaMismatchError(issues)`, `ServerError(status, msg)`). Fixture builders in `shared-types/__tests__/fixtures.ts` match `Factor`/`ExcludedRange`/`Window`/`ApiEnvelope` shapes. ✓

**Known accepted RED:** Task 4's `it.fails` for BUG-001 — passes in CI while the bug stands, flips red when fixed (signal to remove `.fails`).
