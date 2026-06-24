# Spec — Test coverage for the node-testable layer

**Date:** 2026-06-24
**Status:** Approved (design), pending implementation plan
**Author:** Claude Code + Andrew Khrystoiev

## Problem

The repo has 91 test files / ~1431 passing tests but **no coverage tooling at all** — no
`@vitest/coverage-v8` provider, no `test:coverage` script, no thresholds, no CI. Measured
coverage today (provider installed ad-hoc, not saved):

| Package | Lines / Statements | Branches | Functions |
|---|---|---|---|
| `@inceptio/translations` | 96.4% | 86.7% | 100% |
| `apps/mobile` (node-testable surface only) | 68.0% | 83.9% | 78.9% |
| `@inceptio/shared-types` | 10.5% | 56.5% | 25% |

There is no durable way to measure or defend coverage, and two packages have large gaps.

## Goal

Raise coverage of the **node-testable** code to **≥90% statements/lines per package**, make it
measurable (`test:coverage` scripts + v8 provider), and enforce it (per-package
`coverage.thresholds` + a minimal CI workflow that fails below threshold).

## Scope

**In scope:**
- `@inceptio/shared-types` — Zod schemas: `daily-note`, `excluded-range`, `factor`, `request`,
  `response`, `version-policy`, `index`, `semver` (semver already tested).
- `apps/mobile` node-testable surface — currently-untested `lib`/`hooks`/`config` files.
- `@inceptio/translations` — close remaining uncovered branches to clear the threshold.
- Coverage tooling: provider, scripts, thresholds, minimal CI.

**Out of scope (deliberate):**
- The 2 RN UI components (`UpdateBanner.tsx`, `UpdateGateScreen.tsx`) and thin React-render-only
  hooks (`useLocationSearch`, `useElectionalSearch`, `update-gate-context`, `use-update-gate`).
  Rationale follows the precedent already documented in
  `apps/mobile/src/hooks/__tests__/useDailyNote.test.ts`: vitest runs in `node`, RNTL is not
  installed, and React 19 removed `react-test-renderer`. There is no UI render harness and we are
  not adding `jest-expo` now (decided: there is essentially no UI yet — only 2 components, and
  expo-router `app/` does not exist; `src/screens` exists but holds no screen source, only a
  `__tests__` dir). Thin render-glue is excluded from the coverage
  denominator via a documented `coverage.exclude`; non-trivial logic inside those wrappers is
  **extracted into pure helpers** (as `useDailyNote.helpers.ts` already does) and tested directly.

**Full exclude list (audit-corrected — spec originally named only 4):** `useLocationSearch`,
`useElectionalSearch`, `update-gate/update-gate-context`, `update-gate/use-update-gate`,
`hooks/useDailyNote.ts` (render wrapper; logic lives in tested `useDailyNote.helpers.ts`),
`hooks/useMomentCardShare.js`, `share/native-share-provider.ts` (native `captureRef`, no pure logic),
`i18n/index.ts` + `i18n/polyfills.ts` (eager-init glue), and type-only `share/share-provider.ts`
(emits no runtime code). `useEffectiveLocation.ts` is tested via contract and may stay included.
Note: `lib/activity-preference.ts` and `lib/location-preference.ts` use `useSyncExternalStore`; their
`subscribe`/`getSnapshot` are tested in node but the hook line itself is unreachable there — the
`functions: 85` threshold absorbs this (or `/* v8 ignore */` the hook line).

## Design

### 1. Mock layer (`apps/mobile`)

Many `lib` files import AsyncStorage / expo-* / `react-native` / `fetch`, which cannot be imported
in a `node` environment unmocked. Add a vitest setup file `apps/mobile/src/test/setup.ts`, wired
via `test.setupFiles` in `vitest.config.ts`, providing **fallback** stubs that any per-file
`vi.mock` can still override:

- `@react-native-async-storage/async-storage` → in-memory implementation. **Must be a superset of
  every existing per-file stub**, including `getAllKeys` and `multiGet` (used by `storage.ts`'s
  `hydrateStorage()`; existing Convention-B stubs only provide `getItem/setItem/removeItem`).
- `expo-application`, `expo-calendar`, `expo-clipboard`, `expo-constants`, `expo-store-review` →
  lightweight `vi.mock` stubs.
- `react-native` → minimal stub; must be a **superset** of every existing per-file stub
  (`Platform.OS:'ios'`, plus `Linking`/`AppState`/`NativeModules` as needed).
- **`global.fetch` is NOT assigned in setup.** Two existing files manage `global.fetch` themselves
  (`api-headers.test.ts` saves/restores `realFetch`; `search-electional.test.ts` uses
  `vi.spyOn(globalThis,'fetch')` + `vi.restoreAllMocks()`). A permanent global assignment would
  contaminate `restoreAllMocks` semantics. Setup may export a fetch-mock helper, but must not touch
  `global.fetch`.

**Audit correction (code-archaeologist):** the setup file is *not* "purely additive with no behavior
change." The repo today has **two coexisting storage-mock conventions** — (A) mock the `../storage`
wrapper directly (8 files; real `storage.ts` never runs), and (B) mock
`@react-native-async-storage/async-storage` under the real wrapper (3 files: `alert-ack`,
`daily-note-cache`, `get-daily-note`). A global AsyncStorage stub is dead weight for Convention-A
files and therefore **does not raise `storage.ts` coverage on its own** — Convention-A bypasses the
wrapper entirely.

**Constraints:**
- The setup is safe only as a **per-file-overridable fallback** that never assigns `global.fetch`
  and whose stubs are supersets of all per-file stubs.
- **Verification gate:** run the full existing suite (361 tests) *with* the setup file added and
  confirm all green **before** writing any new test.
- `config/api` is already mocked per-file in `api-auth-header.test.ts` — do **not** add a global
  `config/api` stub.

### 2. Tests to add — `apps/mobile`

**Pure logic (direct tests, no mocks):**
- `lib/tz-aliases.ts`, `lib/nav-params.ts` — tables/mappers.
- `lib/format-window.ts` — duration formatting (1 min / 5–10 / 25 / hours).
- `lib/cluster-windows.ts` — ⚠️ contains known **BUG-001** at `cluster-windows.ts:130`
  (`FULL_DATE_OPTS` has no `timeZone`, so the date label renders in the runtime/device zone). Tests
  assert **correct** behavior, so one test will be RED and expose the bug. **The RED test must force
  a non-UTC runtime zone** (`process.env.TZ` or an explicit formatter) and use a window whose
  event-local date differs from device-local date across a date boundary — otherwise it passes
  accidentally on a UTC CI box and hides the bug. Assert the date label, not the time strings.
  Fixing BUG-001 is a separate decision, not part of this work.
- `lib/rating/launch-constants.ts`, `hooks/useDailyNote.helpers.ts`.

**Via mocks:**
- `lib/storage.ts` — needs Convention B (real wrapper over mocked AsyncStorage) **plus**
  module-state reset (`storage.ts` holds a module-level `const cache = new Map()` + `let hydrated`
  that persists across tests; reset via `vi.resetModules()` / re-import). A global mock alone will
  not cover it.
- `lib/device-id.ts`, `lib/draft-store.ts`, `lib/locale-preference.ts`.
- `lib/api.ts` — **already partially tested** (`search-electional.test.ts:50` covers
  429 → `UpstreamQuotaError`; `api-headers`/`api-auth-header` cover headers + dev-key). Real gaps to
  add: `getDailyNote` (heaviest — needs `fetch` + AsyncStorage mocked simultaneously, plus the cache
  write path), `TimeoutError`/`AbortError` (needs `vi.useFakeTimers()` past the 20s timeout),
  `NetworkError`, `SchemaMismatchError`, `healthCheck`. Note `RateLimitError` and `DateRangeError`
  are exported but **never thrown** — only their constructors are reachable, by direct
  instantiation.
- `lib/calendar-export.ts`, `lib/rating/store-review.ts`, `lib/query-client.ts`.

### 3. Tests to add — `@inceptio/shared-types`

Schema tests for each file: parse a valid fixture, reject an invalid one, and verify the
permissive-enum fallback for `factor_id` / `reason_id` / `grade` (these are `z.string()`, not
`z.enum`, per the CLAUDE.md schema policy). Fixtures sourced from real responses
(`docs/postman.json` / existing translation fixtures). Files: `daily-note`, `excluded-range`,
`factor`, `request`, `response`, `version-policy`, `index`.

### 4. Tests to add — `@inceptio/translations`

Targeted tests for remaining uncovered branches to clear the threshold (already at 96.4%).

### 5. Coverage config, scripts, thresholds

In each package (`apps/mobile`, `packages/translations`, `packages/shared-types`):
- Add `@vitest/coverage-v8` to `devDependencies`. **The coverage-v8 peer is an EXACT version pin to
  vitest (`vitest: "2.1.9"`), not a range** — so pin each package's coverage-v8 caret to that
  package's vitest caret: `apps/mobile` → `^2.1.9`, `packages/translations` → `^2.1.0`,
  `packages/shared-types` → `^2.1.0` (all dedupe to `2.1.9`, the last 2.1.x). **Never run a bare
  `npm i -D @vitest/coverage-v8`** — it installs `4.x` today and hard-errors against the exact peer.
- Add `"test:coverage": "vitest run --coverage"`.
- In `vitest.config.ts`, add a `coverage` block:
  - `provider: 'v8'`, `reporter: ['text-summary', 'html']`.
  - `include` — only the testable surface, glob `src/{lib,config,hooks,i18n,share}/**/*.{ts,tsx}`
    (the coverage `include` is a separate key from the existing *test* `include`; the glob also
    pulls in `.js` files like `useMomentCardShare.js` — those go in `exclude`).
  - `exclude` — `**/__tests__/**`, `*.test.*`, and the full thin-wrapper list above.
  - `thresholds: { lines: 90, statements: 90, functions: 85, branches: 80 }`.

Root `package.json`: `"test:coverage": "npm -ws --if-present run test:coverage"`.

**Threshold calibration:** if actual coverage for a package lands below a stated threshold because
of excluded logic (e.g. 88%), lower that package's threshold to the achieved level rounded down to
the nearest 5%, so the gate is not perpetually red. ~90% remains the target; the gate is set to
reality.

### 6. CI

No CI exists. Add a minimal `.github/workflows/ci.yml`: on push / PR →
`npm ci` → `npm run build:types` → `npm run test:coverage`. Coverage below threshold fails the run.

## Testing strategy

- Golden-file / fixture-based tests for schemas and translation (matches the repo's existing
  "test golden files, not implementation" standard in CLAUDE.md).
- Mock-based tests for native/fetch boundaries; assert behavior at the boundary, not internals.
- BUG-001 test asserts correct behavior and is expected to fail until the bug is fixed separately.

## Risks / open items

- `cluster-windows.ts` BUG-001 test will be red — must be clearly labeled so it is not mistaken for
  a regression introduced by this work.
- `api.ts` is the largest single target; mocking `fetch` + translate + timeout paths is the bulk of
  the effort and the main coverage lever for `apps/mobile`.
- Thresholds may need per-package calibration after the first full run (see §5).
- **Open item (version alignment):** `apps/mobile` pins vitest `^2.1.9` while the two packages pin
  `^2.1.0`. Both resolve to `2.1.9`, so coverage works, but a future `npm i` could drift and surface
  the exact-peer error. Optional cleanup: align all three to `^2.1.9`. Not a blocker.
