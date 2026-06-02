# Default Activity Preference — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a user-selectable default activity preference (wedding / contracts / business_launch / travel) as a first-class persisted setting, consumed by the daily-note voice (with activity-asymmetric severity hints for Venus Rx / Mercury Rx / Moon VOC), the first-launch experience, and the Settings row in You.

**Architecture:** Mobile-side `useSyncExternalStore` module (`lib/activity-preference.ts`) backed by AsyncStorage wrapper; canonical activity display data in `lib/activities.ts`; Worker `/daily-note` route accepts `?activity=` via two-phase migration (Phase A optional with fallback, Phase B required); 12 confirmed + 4 pending severity-hint strings in Worker dictionary keyed by `(condition, activity)`, composed into the `displayable` response payload alongside headline + body.

**Tech Stack:** Expo SDK 55 / React Native 0.83 / React 19 / TypeScript strict / TanStack Query v5.100 / Zod 3.23 / NativeWind 4.2 / Cloudflare Workers (Wrangler) / Vitest (Worker tests) / Jest (mobile tests, existing setup).

---

## Authoritative source documents

Workers consuming this plan **MUST** read these alongside each phase:

- Feature spec — `docs/superpowers/specs/2026-06-02-activity-preference.md`
- Voice spec amendments — `docs/superpowers/specs/2026-05-28-daily-timing-voice-design.md` §3.3 entries 12/15/16/17, §11.4 pending-verification bullet, §12.4 D3 rescue (16 strings)
- Domain-expert audit — `docs/superpowers/expert/2026-06-02-default-activity-d3-audit.md`
- Knowledge base — `docs/superpowers/expert/_knowledge-base/astrology-electional.md`
- Project context — `/Users/user/Projects/inceptio/CLAUDE.md`

---

## Out of scope (do NOT silently expand)

1. Migrating `NoViableScreen.js`, `MomentDetailScreen.js`, `CalendarScreen.js` away from `getLastActivity() ?? 'wedding'` (EC-12 cleanup) — separate future work.
2. Generic `PreferencesContext` (D18 deferred until 3+ preferences exist).
3. Error-reporting SDK (Sentry/Bugsnag) — `console.warn` baseline only.
4. Deep links setting preference.
5. Onboarding flow restructuring beyond the inserted FirstLaunchActivityPicker step.

---

## Phase map (9 phases + 3 checkpoints)

| # | Phase | Tasks | Parallelizable internally? | Blocks next phase? |
|---|---|---|---|---|
| 1 | Foundational (mobile) | 4 | Task 1.4 sub-steps 1a/1b/1c/1d parallel (1a write + 1b/c/d read-only verifications); Step 2 and Step 3 sequential after 1a | YES |
| — | **🛑 Checkpoint 1 — Architectural commitment** | — | — | YES |
| 2 | Backend Phase A (Worker) | 6 | Tasks 2.1 + 2.3 parallel only (independent files); 2.2 → 2.4 → 2.5 → 2.6 sequential on `daily-note.ts` (shared file + dependency chain) | YES |
| 3 | Mobile hooks rewire | 3 | Sequential | YES |
| 4 | Picker component (incl. ActivityChangeSheet shared with Today) | 4 | Sequential | YES |
| 5 | Today UI integration (incl. tappable activity-line) | 3 | Sequential 5.1 → 5.2 → 5.3 (Tasks 5.1/5.2 likely target the same daily-note hero file; Task 5.3 audits files 5.1/5.2 may have just edited) | YES |
| 6 | Gate cascade (App.js) | 2 | Sequential | YES |
| 7 | Settings entry (YouScreen) | 1 | — | NO — Phase 9 can run on staging |
| — | **🛑 Checkpoint 3 — Phase B cutover gate (manual + KV counter)** | — | manual sign-off + KV query | YES |
| 8 | Backend Phase B cutover | 2 | Sequential | NO |
| 9 | Per-activity batch validation | 2 | Sequential | — |
| — | **🛑 Checkpoint 2 — Batch reality check** | — | runs Phase 9 output | — |

**Total: 27 tasks** (Phase 2 +1 for KV counter; Phase 4 +1 for ActivityChangeSheet moved up; Phase 7 −1 since ActivityChangeSheet now sits in Phase 4).

**Phase-internal partition revisions (2026-06-02, after partition-reviewer audit):**
- **Phase 2** — previously "Tasks 2.1 + 2.5 + 2.6 partial parallel" was unsafe: Task 2.6's `bumpCounter` insertion threads `wasActivityFallback` semantics that Task 2.2 establishes in `daily-note.ts`. The route file is shared with 2.4 (composer's `wasActivityFallback` argument) and 2.5 (integration test reading both sides). Revised partition: 2.1 (severity-hints.ts NEW file) and 2.3 (`daily-note-cache.ts`) are independent — parallel-safe. 2.2 → 2.4 → 2.5 → 2.6 strict sequential on `daily-note.ts`.
- **Phase 5** — previously "Tasks 5.1 + 5.2 parallel" was unsafe: both tasks edit the daily-note hero component (per the plan's own prose "likely DailyHero.js or a sibling — same locale"). Revised to sequential 5.1 → 5.2 → 5.3. Task 5.3 also audits files 5.1/5.2 just modified (daily-note hero), so sequential ordering is correct downstream of 5.2.
- **Phase 1** — previously "Task 1.4 sub-steps parallel" was imprecise: it grouped Steps 1a/1b/1c/1d (read-only verifications + one write to `scaffold/activity-display.js`) with Step 2 (`ActivityPickerScreen.js` write, depends on Task 1.2's `lib/activities.ts`) and Step 3 (worker-mirror parity test, depends on 1.4 sub-step 1a complete). Revised description disambiguates: sub-steps 1a–1d parallel; Steps 2 and 3 sequential after sub-step 1a.

---

## Phase 1 — Foundational (mobile)

### Task 1.1: Create `lib/activity-preference.ts` module

**Files:**
- Create: `apps/mobile/src/lib/activity-preference.ts`
- Test: `apps/mobile/src/lib/__tests__/activity-preference.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/mobile/src/lib/__tests__/activity-preference.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { storage } from '../storage';
import {
  initActivityPreference,
  setDefaultActivity,
  getDefaultActivitySync,
  useActivityPreference,
  __resetForTests,
} from '../activity-preference';

const KEY = 'inceptio.default_activity';

beforeEach(() => {
  storage.delete(KEY);
  __resetForTests();
});

describe('activity-preference', () => {
  test('initial state before init is "loading"', () => {
    const { result } = renderHook(() => useActivityPreference());
    expect(result.current).toEqual({ hydrationStatus: 'loading', activity: undefined });
  });

  test('init from empty storage → unset', () => {
    initActivityPreference();
    const { result } = renderHook(() => useActivityPreference());
    expect(result.current).toEqual({ hydrationStatus: 'unset', activity: undefined });
  });

  test('init from valid stored value → set', () => {
    storage.set(KEY, 'wedding');
    initActivityPreference();
    const { result } = renderHook(() => useActivityPreference());
    expect(result.current).toEqual({ hydrationStatus: 'set', activity: 'wedding' });
  });

  test('init from invalid stored value → unset + purge + warn', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    storage.set(KEY, 'not_a_real_activity');
    initActivityPreference();
    expect(storage.getString(KEY)).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[activity-pref] invalid stored value'),
      'not_a_real_activity'
    );
    const { result } = renderHook(() => useActivityPreference());
    expect(result.current).toEqual({ hydrationStatus: 'unset', activity: undefined });
    warn.mockRestore();
  });

  test('setDefaultActivity writes, notifies, updates snapshot', () => {
    initActivityPreference();
    const { result } = renderHook(() => useActivityPreference());
    act(() => setDefaultActivity('contracts'));
    expect(result.current).toEqual({ hydrationStatus: 'set', activity: 'contracts' });
    expect(storage.getString(KEY)).toBe('contracts');
  });

  test('setDefaultActivity refuses invalid value', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    initActivityPreference();
    // @ts-expect-error testing runtime guard
    setDefaultActivity('garbage');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[activity-pref] refused invalid set()'),
      'garbage'
    );
    expect(getDefaultActivitySync()).toBeUndefined();
    warn.mockRestore();
  });

  test('init is idempotent (multiple calls no-op)', () => {
    initActivityPreference();
    initActivityPreference();
    initActivityPreference();
    const { result } = renderHook(() => useActivityPreference());
    expect(result.current.hydrationStatus).toBe('unset');
  });

  test('snapshot identity stable across unrelated re-renders', () => {
    initActivityPreference();
    setDefaultActivity('wedding');
    const { result, rerender } = renderHook(() => useActivityPreference());
    const first = result.current;
    rerender({});
    expect(result.current).toBe(first); // referential equality
  });

  // --- ACTIVITY_MIGRATIONS forward-looking insurance ---

  test('migrateOrInvalid helper returns Activity for valid current name', () => {
    const { migrateOrInvalid } = require('../activity-preference');
    expect(migrateOrInvalid('wedding')).toBe('wedding');
    expect(migrateOrInvalid('contracts')).toBe('contracts');
    expect(migrateOrInvalid('business_launch')).toBe('business_launch');
    expect(migrateOrInvalid('travel')).toBe('travel');
  });

  test('migrateOrInvalid returns undefined for empty + invalid raw values', () => {
    const { migrateOrInvalid } = require('../activity-preference');
    expect(migrateOrInvalid(undefined)).toBeUndefined();
    expect(migrateOrInvalid('garbage')).toBeUndefined();
    expect(migrateOrInvalid('')).toBeUndefined();
  });

  test('migrateOrInvalid maps a registered legacy name (contract test for future migration)', () => {
    // Empty map for MVP — when the first migration ships, add a real entry to
    // ACTIVITY_MIGRATIONS and replace this todo with a concrete assertion.
    const { ACTIVITY_MIGRATIONS } = require('../activity-preference');
    expect(ACTIVITY_MIGRATIONS).toEqual({});
  });

  test('init persists migrated value back to storage so next boot reads canonical name', () => {
    // No migration entry exists for MVP, so this test asserts the shape of the
    // persist-on-migrate code path by exercising the no-op case: a valid current
    // name does NOT get rewritten.
    storage.set(KEY, 'wedding');
    const setSpy = jest.spyOn(storage, 'set');
    initActivityPreference();
    expect(setSpy).not.toHaveBeenCalled(); // no rewrite when raw === migrated
    setSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/mobile && npx jest src/lib/__tests__/activity-preference.test.ts`
Expected: FAIL with `Cannot find module '../activity-preference'`.

- [ ] **Step 3: Implement the module**

```ts
// apps/mobile/src/lib/activity-preference.ts
import { useSyncExternalStore } from 'react';
import { storage } from './storage';
import { ActivitySchema, type Activity } from '@inceptio/shared-types';

const KEY_DEFAULT_ACTIVITY = 'inceptio.default_activity';

type HydrationStatus = 'loading' | 'unset' | 'set';

// Module-level state. RN-only — no SSR — so reusing getSnapshot for the third
// useSyncExternalStore arg (getServerSnapshot) is harmless.
let hydrationStatus: HydrationStatus = 'loading';
let current: Activity | undefined = undefined;
const listeners = new Set<() => void>();

/**
 * Forward-looking migration map. Empty for MVP because the 4 current
 * activities have no historical renames. When an activity is renamed in a
 * future release (e.g. v1.4 adds surgery → legal-advice rename), add the old
 * stored name here as a key mapping to the new canonical Activity enum value.
 * Existing installs with the old stored value will then migrate transparently
 * on next boot — initActivityPreference persists the migrated value back so
 * subsequent boots read the canonical name directly.
 *
 * Exported for the migrateOrInvalid contract test in Task 1.1.
 */
export const ACTIVITY_MIGRATIONS: Record<string, Activity> = {};

/**
 * Resolve a raw stored string to a current Activity. Tries the live schema
 * first, then the migration map. Returns undefined for empty / unknown values.
 */
export function migrateOrInvalid(raw: string | undefined): Activity | undefined {
  if (raw === undefined || raw === '') return undefined;
  const parsed = ActivitySchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  const migrated = ACTIVITY_MIGRATIONS[raw];
  if (migrated !== undefined) return migrated;
  return undefined;
}

/** Called once during app boot, after storage.hydrate() resolves. Idempotent. */
export function initActivityPreference(): void {
  if (hydrationStatus !== 'loading') return;
  const raw = storage.getString(KEY_DEFAULT_ACTIVITY);
  const migrated = migrateOrInvalid(raw);
  if (migrated !== undefined) {
    current = migrated;
    hydrationStatus = 'set';
    // Persist the migrated canonical name only when it differs from raw — i.e.
    // the migration map actually rewrote the value. A valid current-name read
    // does NOT trigger a redundant write.
    if (raw !== migrated) storage.set(KEY_DEFAULT_ACTIVITY, migrated);
  } else {
    if (raw !== undefined) {
      console.warn('[activity-pref] invalid stored value, resetting to unset:', raw);
      storage.delete(KEY_DEFAULT_ACTIVITY);
    }
    current = undefined;
    hydrationStatus = 'unset';
  }
  notify();
}

export function setDefaultActivity(activity: Activity): void {
  const parsed = ActivitySchema.safeParse(activity);
  if (!parsed.success) {
    console.warn('[activity-pref] refused invalid set():', activity);
    return;
  }
  current = parsed.data;
  hydrationStatus = 'set';
  storage.set(KEY_DEFAULT_ACTIVITY, parsed.data);
  notify();
}

export function getDefaultActivitySync(): Activity | undefined {
  return current;
}

type Snapshot = { hydrationStatus: HydrationStatus; activity: Activity | undefined };

let snapshot: Snapshot = { hydrationStatus, activity: current };
function getSnapshot(): Snapshot {
  if (snapshot.hydrationStatus !== hydrationStatus || snapshot.activity !== current) {
    snapshot = { hydrationStatus, activity: current };
  }
  return snapshot;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function notify(): void {
  // Recompute snapshot reference BEFORE notifying so React sees the new identity.
  getSnapshot();
  listeners.forEach((fn) => fn());
}

export function useActivityPreference(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** @internal Test-only state reset. Not exported from the barrel. */
export function __resetForTests(): void {
  hydrationStatus = 'loading';
  current = undefined;
  listeners.clear();
  snapshot = { hydrationStatus, activity: current };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/mobile && npx jest src/lib/__tests__/activity-preference.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/activity-preference.ts apps/mobile/src/lib/__tests__/activity-preference.test.ts
git commit -m "feat(activity-pref): add useSyncExternalStore module with trinary hydrationStatus"
```

---

### Task 1.2: Create `lib/activities.ts` canonical display data

**Files:**
- Create: `apps/mobile/src/lib/activities.ts`
- Test: `apps/mobile/src/lib/__tests__/activities.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/mobile/src/lib/__tests__/activities.test.ts
import {
  ACTIVITY_LABELS,
  ACTIVITY_NOUNS,
  ACTIVITY_EMOJI,
  ACTIVITY_DISPLAY,
  ACTIVITY_EYEBROW_PHRASES,
  getActivityLabel,
  getActivityNoun,
  getActivityEyebrowPhrase,
} from '../activities';
import type { Activity } from '@inceptio/shared-types';

const ALL: Activity[] = ['wedding', 'contracts', 'business_launch', 'travel'];

describe('activities', () => {
  test('ACTIVITY_LABELS covers all 4 MVP activities', () => {
    ALL.forEach((a) => expect(ACTIVITY_LABELS[a]).toBeDefined());
    expect(Object.keys(ACTIVITY_LABELS).sort()).toEqual(ALL.slice().sort());
  });

  test('ACTIVITY_NOUNS covers all 4 MVP activities', () => {
    ALL.forEach((a) => expect(ACTIVITY_NOUNS[a]).toBeDefined());
  });

  test('ACTIVITY_EMOJI covers all 4 MVP activities', () => {
    ALL.forEach((a) => expect(ACTIVITY_EMOJI[a]).toMatch(/.+/));
  });

  test('ACTIVITY_DISPLAY tint + ring tokens use bg- and border- prefixes', () => {
    ALL.forEach((a) => {
      expect(ACTIVITY_DISPLAY[a].tint).toMatch(/^bg-/);
      expect(ACTIVITY_DISPLAY[a].ring).toMatch(/^border-/);
    });
  });

  test('ACTIVITY_EYEBROW_PHRASES covers all 4 MVP activities with "for your …" pattern', () => {
    ALL.forEach((a) => {
      expect(ACTIVITY_EYEBROW_PHRASES[a]).toMatch(/^for your /i);
    });
  });

  test('getActivityLabel + getActivityNoun + getActivityEyebrowPhrase return mapped values', () => {
    expect(getActivityLabel('wedding')).toBe(ACTIVITY_LABELS.wedding);
    expect(getActivityNoun('travel')).toBe(ACTIVITY_NOUNS.travel);
    expect(getActivityEyebrowPhrase('wedding')).toBe(ACTIVITY_EYEBROW_PHRASES.wedding);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/mobile && npx jest src/lib/__tests__/activities.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

```ts
// apps/mobile/src/lib/activities.ts
import type { Activity } from '@inceptio/shared-types';

export const ACTIVITY_LABELS: Record<Activity, string> = {
  wedding: 'Wedding',
  contracts: 'Contract',
  business_launch: 'Business launch',
  travel: 'Travel',
};

export const ACTIVITY_NOUNS: Record<Activity, string> = {
  wedding: 'wedding',
  contracts: 'contract',
  business_launch: 'launch',
  travel: 'journey',
};

export const ACTIVITY_EMOJI: Record<Activity, string> = {
  wedding: '💍',
  contracts: '📝',
  business_launch: '🚀',
  travel: '🧭',
};

// Theme-token-bound tint + ring utility classes. The underlying color names
// in tailwind.config.js are the bare slugs (e.g. 'wedding-tint'). Tailwind
// auto-generates bg-wedding-tint / border-wedding-ring utilities from those
// bare names.
export const ACTIVITY_DISPLAY: Record<Activity, { tint: string; ring: string }> = {
  wedding:         { tint: 'bg-wedding-tint',         ring: 'border-wedding-ring' },
  contracts:       { tint: 'bg-contracts-tint',       ring: 'border-contracts-ring' },
  business_launch: { tint: 'bg-business-launch-tint', ring: 'border-business-launch-ring' },
  travel:          { tint: 'bg-travel-tint',          ring: 'border-travel-ring' },
};

// Eyebrow / activity-line copy. Voice spec §3.5 owns the canonical wording —
// these are the launching draft, signed off in this plan and committed in lib.
// When voice spec ships a revision, update this map AND voice spec §3.5
// together (coordinated PR, per the verify-in-sync discipline used for
// Worker translation dictionaries).
export const ACTIVITY_EYEBROW_PHRASES: Record<Activity, string> = {
  wedding:         'for your wedding',
  contracts:       'for your contracts',
  business_launch: 'for your launch',
  travel:          'for your travels',
};

export function getActivityLabel(activity: Activity): string {
  return ACTIVITY_LABELS[activity];
}

export function getActivityNoun(activity: Activity): string {
  return ACTIVITY_NOUNS[activity];
}

export function getActivityEyebrowPhrase(activity: Activity): string {
  return ACTIVITY_EYEBROW_PHRASES[activity];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/mobile && npx jest src/lib/__tests__/activities.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/activities.ts apps/mobile/src/lib/__tests__/activities.test.ts
git commit -m "feat(activities): add canonical activity display module"
```

---

### Task 1.3: Add NativeWind tokens

**Files:**
- Modify: `apps/mobile/tailwind.config.js`
- Modify: `apps/mobile/src/theme.js`

- [ ] **Step 1: Read current tailwind.config.js to locate `theme.extend.colors`**

Run: `grep -n "theme:\|extend:\|colors:" apps/mobile/tailwind.config.js`

Identify the `theme.extend.colors` block. Capture the exact location for the edit.

- [ ] **Step 2: Add 8 new color entries (4 tints + 4 rings)**

The bare color slugs that Tailwind utility classes will derive from:

```js
// Add inside theme.extend.colors:
'wedding-tint':         '#3D2A4A',
'wedding-ring':         'rgba(229, 199, 125, 0.40)',
'contracts-tint':       '#2A2F4A',
'contracts-ring':       'rgba(139, 111, 232, 0.40)',
'business-launch-tint': '#2E3D3D',
'business-launch-ring': 'rgba(111, 229, 198, 0.40)',
'travel-tint':          '#3D3528',
'travel-ring':          'rgba(184, 176, 204, 0.40)',
```

These mirror the rgba values currently in `apps/mobile/src/components/daily-note/scaffold/activity-display.js`. Read that file first to confirm the exact rgba — the values above are illustrative; the **actual values MUST be copied verbatim from the scaffold file** so Task 1.4 produces a no-op visual diff.

- [ ] **Step 3: Add a matching `theme.js` semantic-token map entry (parity with existing palette)**

Read `apps/mobile/src/theme.js` to find the existing color export. Add the 8 entries under the same shape so screens can also import these by code if needed (parity with the existing `colors.bgBase`, `colors.text`, etc.).

- [ ] **Step 4: Verify Tailwind compiles**

Run: `cd apps/mobile && npx tailwindcss --postcss-config postcss.config.js -i ./global.css -o /tmp/tw-test.css 2>&1 | head -20`
(Or whatever the project's Tailwind-build smoke is — check `package.json` scripts.)
Expected: No "unknown class" warnings for `bg-wedding-tint`, `border-wedding-ring`, etc.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/tailwind.config.js apps/mobile/src/theme.js
git commit -m "feat(theme): promote scaffold activity rgba to NativeWind tokens"
```

---

### Task 1.4: Migrate scaffold consumers + Worker-mirror parity test

**Files:**
- Modify: `apps/mobile/src/components/daily-note/scaffold/activity-display.js` — convert to re-export
- Modify: `apps/mobile/src/components/daily-note/scaffold/NewWindowCard.js` — import-path swap
- Modify: `apps/mobile/src/components/daily-note/scaffold/InWindowCard.js` — import-path swap
- Modify: `apps/mobile/src/components/daily-note/scaffold/SavedRow.js` — import-path swap
- Modify: `apps/mobile/src/screens/ActivityPickerScreen.js` — read labels from canonical
- Create: `apps/mobile/src/__tests__/worker-mirror-parity.test.ts`

**Sub-steps 1a, 1b, 1c, 1d run in parallel** — independent import-path swaps in different files.

- [ ] **Step 1a: Convert `scaffold/activity-display.js` to re-export from canonical**

Read the file first. Keep `ActivityPlate` component (it's not data, it's a React component — leaves it in scaffold). Replace the data exports with:

```js
// At top of scaffold/activity-display.js, replace ACTIVITY_NOUNS, ACTIVITY_DISPLAY, and getActivityNoun blocks with:
export {
  ACTIVITY_NOUNS,
  ACTIVITY_DISPLAY,
  getActivityNoun,
} from '../../../lib/activities';
```

Leave `ActivityPlate` component definition untouched. Verify no other exports break by reading the entire file before/after.

- [ ] **Step 1b: `NewWindowCard.js`** — change `import { … } from './activity-display'` if any data is imported directly; otherwise no change needed since the re-export keeps the same path working. Verify by reading line 11.

- [ ] **Step 1c: `InWindowCard.js`** — same verification at line 6.

- [ ] **Step 1d: `SavedRow.js`** — same verification at line 7.

- [ ] **Step 2: Update `ActivityPickerScreen.js` labels-only**

Read `apps/mobile/src/screens/ActivityPickerScreen.js:14-19` to locate the `CARDS` constant. The card's `title` field currently uses inline string literals. Convert title to:

```js
import { ACTIVITY_LABELS } from '../lib/activities';

const CARDS = [
  { id: 'wedding',         title: ACTIVITY_LABELS.wedding,         subtitle: '<inline>' },
  { id: 'contracts',       title: ACTIVITY_LABELS.contracts,       subtitle: '<inline>' },
  { id: 'business_launch', title: ACTIVITY_LABELS.business_launch, subtitle: '<inline>' },
  { id: 'travel',          title: ACTIVITY_LABELS.travel,          subtitle: '<inline>' },
];
```

Subtitles stay inline (per-screen tone, not canonical). Do NOT touch any visual styling.

- [ ] **Step 3: Write Worker-mirror parity test (TDD: write test first, expect PASS immediately since data is already in sync)**

```ts
// apps/mobile/src/__tests__/worker-mirror-parity.test.ts
import { ACTIVITY_NOUNS as MOBILE_NOUNS } from '../lib/activities';
// Adjust the relative path if the monorepo structure requires a tsconfig path or symlink.
import { ACTIVITY_NOUNS as WORKER_NOUNS } from '../../../../workers/api-proxy/src/translations/dictionary/status-lines';

describe('worker-mirror parity (verify-in-sync contract)', () => {
  test('ACTIVITY_NOUNS in mobile and Worker dictionaries are identical', () => {
    expect(MOBILE_NOUNS).toEqual(WORKER_NOUNS);
  });
});
```

If the cross-monorepo import path doesn't resolve via Jest's default config, add the file as a Worker-side parity test instead (location: `workers/api-proxy/src/translations/__tests__/mirror-parity.test.ts`), reading the mobile data via a relative path. Either side works; the contract is the assertion.

- [ ] **Step 4: Run all Phase 1 tests**

Run: `cd apps/mobile && npx jest src/lib/__tests__/ src/__tests__/worker-mirror-parity`
Expected: PASS (all Phase 1 suites).

- [ ] **Step 5: Visual smoke — start Metro, verify daily-note scaffold renders unchanged**

Run: `cd apps/mobile && npx expo start --ios` (or the project's standard dev command from `package.json` scripts)

Visually verify in the simulator: the daily-note scaffold cards (`NewWindowCard`, `InWindowCard`, `SavedRow`) render with their tinted activity backgrounds **identical to before this change**. Any visual diff = the NativeWind token values in Task 1.3 don't match the original rgba literals — revisit Task 1.3.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/components/daily-note/scaffold/ apps/mobile/src/screens/ActivityPickerScreen.js apps/mobile/src/__tests__/worker-mirror-parity.test.ts
git commit -m "refactor(activities): consolidate display data to lib/activities; scaffold delegates"
```

---

## 🛑 Checkpoint 1 — Architectural commitment

**Stop here. Do not proceed to Phase 2.**

**Surface to the user:**

1. Phase 1 commits (4 commits).
2. All Phase 1 tests passing locally.
3. The end-to-end consumer canary — **YouScreen Default activity Row swap** (one-edit version of Phase 7 Task 7.1 below, run as a minimal smoke).

**Canary edit (Phase 1's last step, before user review):**

Modify `apps/mobile/src/screens/YouScreen.js` line 15 to add `import { useActivityPreference } from '../lib/activity-preference';` and line 49 to read from the new hook:

```js
const { hydrationStatus, activity } = useActivityPreference();
const lastActivity = hydrationStatus === 'set' ? activity! : 'wedding';
```

Leave the rest of YouScreen untouched. This canary proves the consumer chain works without touching Today or the daily-note flow. It is NOT the full Phase 7 — the `onPress = comingSoon` stays, no change sheet, no display label rework. Pure swap.

Run `cd apps/mobile && npx jest && npx expo start --ios` and confirm YouScreen's Default activity Row renders without regression.

**User reviews and signs off before proceeding to Phase 2.** Output of the review feeds the go/no-go on the rest of the rollout.

---

## Phase 2 — Backend Phase A (Worker)

### Task 2.1: Create `severity-hints.ts` dictionary (16 strings with pending markers)

**Files:**
- Create: `workers/api-proxy/src/translations/dictionary/severity-hints.ts`
- Test: `workers/api-proxy/src/translations/__tests__/severity-hints.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// workers/api-proxy/src/translations/__tests__/severity-hints.test.ts
import { describe, test, expect } from 'vitest';
import {
  SEVERITY_HINTS,
  getSeverityHint,
  type SeverityCondition,
} from '../dictionary/severity-hints';
import { ActivitySchema, type Activity } from '@inceptio/shared-types';

const ACTIVITIES: Activity[] = ['wedding', 'contracts', 'business_launch', 'travel'];
const FORBIDDEN = [
  'magic', 'destiny', 'fortune', 'stars align', 'manifest',
  'vibes', 'alignment', 'blessed', 'the universe', 'luck',
];

describe('severity-hints dictionary', () => {
  test('12 confirmed entries exist: 3 conditions × 4 activities (no pending marker)', () => {
    const confirmed: SeverityCondition[] = [
      'mercury_retrograde',
      'venus_retrograde',
      'moon_voc',
    ];
    confirmed.forEach((cond) => {
      ACTIVITIES.forEach((act) => {
        const entry = SEVERITY_HINTS[cond][act];
        expect(entry.text).toMatch(/^For (a |)/);
        expect(entry.pending_astrologer_ruling).toBe(false);
      });
    });
  });

  test('4 pending entries exist for intraday moon VOC × 4 activities', () => {
    ACTIVITIES.forEach((act) => {
      const entry = SEVERITY_HINTS.moon_voc_intraday[act];
      expect(entry.text).toMatch(/^For (a |)/);
      expect(entry.pending_astrologer_ruling).toBe(true);
    });
  });

  test('every entry is ≤ 140 chars', () => {
    Object.values(SEVERITY_HINTS).forEach((perActivity) => {
      Object.values(perActivity).forEach((entry) => {
        expect(entry.text.length).toBeLessThanOrEqual(140);
      });
    });
  });

  test('no entry uses any forbidden voice word', () => {
    Object.values(SEVERITY_HINTS).forEach((perActivity) => {
      Object.values(perActivity).forEach((entry) => {
        FORBIDDEN.forEach((word) => {
          expect(entry.text.toLowerCase()).not.toContain(word);
        });
      });
    });
  });

  test('getSeverityHint returns text for confirmed entry', () => {
    expect(getSeverityHint('venus_retrograde', 'travel')).toMatch(/journey|trip|vacation/i);
  });

  test('getSeverityHint returns undefined for pending entry by default', () => {
    expect(getSeverityHint('moon_voc_intraday', 'wedding')).toBeUndefined();
  });

  test('getSeverityHint with includePending=true returns pending entry text', () => {
    expect(getSeverityHint('moon_voc_intraday', 'wedding', { includePending: true }))
      .toMatch(/wedding/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd workers/api-proxy && npx vitest run src/translations/__tests__/severity-hints.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the dictionary**

```ts
// workers/api-proxy/src/translations/dictionary/severity-hints.ts
import type { Activity } from '@inceptio/shared-types';

export type SeverityCondition =
  | 'mercury_retrograde'
  | 'venus_retrograde'
  | 'moon_voc'
  | 'moon_voc_intraday';

type Entry = {
  text: string;
  pending_astrologer_ruling: boolean;
};

export const SEVERITY_HINTS: Record<SeverityCondition, Record<Activity, Entry>> = {
  mercury_retrograde: {
    wedding: {
      text: "For a wedding, tradition is gentler here than for a contract — the vows themselves are less impacted than the legal documents that accompany them.",
      pending_astrologer_ruling: false,
    },
    contracts: {
      text: "For a contract, this is the stretch tradition asks you to wait through — words and agreements made now tend to need rewriting.",
      pending_astrologer_ruling: false,
    },
    business_launch: {
      text: "For a launch, the announcements and the early outreach don't land the way they will in a few weeks. Better held.",
      pending_astrologer_ruling: false,
    },
    travel: {
      text: "For travel, the trip itself is fine — but build buffer for delays, and double-check the tickets and the times.",
      pending_astrologer_ruling: false,
    },
  },
  venus_retrograde: {
    wedding: {
      text: "For a wedding, this is the stretch tradition asks you to wait through — Venus governs marriage, and her support is withdrawn now.",
      pending_astrologer_ruling: false,
    },
    contracts: {
      text: "For a contract, this matters most for partnerships and anything tied to money — renewing an old agreement holds; beginning a new one strains.",
      pending_astrologer_ruling: false,
    },
    business_launch: {
      text: "For a launch, this stretch sits across the things you want this venture to attract — revenue, customers, goodwill. Better to wait.",
      pending_astrologer_ruling: false,
    },
    travel: {
      text: "For travel, this matters less than it does for the other beginnings — a trip during this stretch is fine to take.",
      pending_astrologer_ruling: false,
    },
  },
  moon_voc: {
    wedding: {
      text: "For a wedding, tradition is unambiguous here — what's started today does not take root the way it does on other days.",
      pending_astrologer_ruling: false,
    },
    contracts: {
      text: "For a contract, today is the day to hold signing — the matter begun now tends to need revisiting or quietly fall away.",
      pending_astrologer_ruling: false,
    },
    business_launch: {
      text: "For a launch, the announcement made today tends to land softly or get reshuffled later — wait for the Moon to settle into the next sign.",
      pending_astrologer_ruling: false,
    },
    travel: {
      text: "For travel, the journey itself is fine — but if you're booking a ticket, wait until the Moon reaches the next sign.",
      pending_astrologer_ruling: false,
    },
  },
  moon_voc_intraday: {
    wedding: {
      text: "For a wedding, time the vows for the afternoon — the morning hours aren't held by the sky the way the afternoon will be.",
      pending_astrologer_ruling: true,
    },
    contracts: {
      text: "For a contract, hold the signing until after midday — the morning void doesn't carry agreements.",
      pending_astrologer_ruling: true,
    },
    business_launch: {
      text: "For a launch, time the announcement for the afternoon — the morning hours land softer than the rest of the day.",
      pending_astrologer_ruling: true,
    },
    travel: {
      text: "For travel, the morning is fine to be in motion — but hold any new bookings or reservations for the afternoon.",
      pending_astrologer_ruling: true,
    },
  },
};

type GetSeverityHintOptions = { includePending?: boolean };

export function getSeverityHint(
  condition: SeverityCondition,
  activity: Activity,
  options: GetSeverityHintOptions = {}
): string | undefined {
  const entry = SEVERITY_HINTS[condition]?.[activity];
  if (!entry) return undefined;
  if (entry.pending_astrologer_ruling && !options.includePending) return undefined;
  return entry.text;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd workers/api-proxy && npx vitest run src/translations/__tests__/severity-hints.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add workers/api-proxy/src/translations/dictionary/severity-hints.ts workers/api-proxy/src/translations/__tests__/severity-hints.test.ts
git commit -m "feat(worker/translations): add severity-hints dictionary (12 confirmed + 4 pending)"
```

---

### Task 2.2: Worker `/daily-note` route accepts `?activity=` (Phase A — optional with fallback)

**Files:**
- Modify: `workers/api-proxy/src/routes/daily-note.ts`
- Test: `workers/api-proxy/src/routes/__tests__/daily-note-activity.test.ts`

- [ ] **Step 1: Read current `daily-note.ts` route to understand request validation pattern**

Run: `cat workers/api-proxy/src/routes/daily-note.ts`

Identify:
- Where the query params are parsed (likely Zod schema).
- Where the response is composed (likely a function that builds the `displayable` payload).
- The current cache-key derivation site.

- [ ] **Step 2: Write the failing tests**

```ts
// workers/api-proxy/src/routes/__tests__/daily-note-activity.test.ts
import { describe, test, expect, vi } from 'vitest';
import { handleDailyNote } from '../daily-note';
// Adjust per the project's existing test harness pattern (env mocks, fixtures).

const makeReq = (qs: string) =>
  new Request(`https://example.test/daily-note?${qs}`, { method: 'GET' });

describe('Phase A — /daily-note route accepts ?activity= (optional)', () => {
  test('valid activity → 200 + cached under that activity', async () => {
    const res = await handleDailyNote(makeReq('lat=50.45&lng=30.52&tz=Europe/Kyiv&activity=wedding'), {/* env */});
    expect(res.status).toBe(200);
    // Inspect cache layer: entry exists at key including ':wedding'
  });

  test('missing activity → 200 + warn + cached under business_launch', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await handleDailyNote(makeReq('lat=50.45&lng=30.52&tz=Europe/Kyiv'), {/* env */});
    expect(res.status).toBe(200);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[daily-note] activity missing, defaulting to business_launch')
    );
    warn.mockRestore();
  });

  test('invalid activity → 400 with invalid_activity error', async () => {
    const res = await handleDailyNote(makeReq('lat=50.45&lng=30.52&tz=Europe/Kyiv&activity=not_real'), {/* env */});
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string; valid: string[] };
    expect(body.error).toBe('invalid_activity');
    expect(body.valid).toEqual(expect.arrayContaining(['wedding', 'contracts', 'business_launch', 'travel']));
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd workers/api-proxy && npx vitest run src/routes/__tests__/daily-note-activity.test.ts`
Expected: FAIL — `activity` param not recognized; current behavior returns 200 ignoring activity entirely.

- [ ] **Step 4: Implement Phase A route changes**

In `workers/api-proxy/src/routes/daily-note.ts`:

1. Import `ActivitySchema` from `@inceptio/shared-types`.
2. Extend the query-param Zod schema to add `activity: ActivitySchema.optional()`. Phase A — optional, NOT required.
3. After validation, if `activity` is missing: log `console.warn('[daily-note] activity missing, defaulting to business_launch')` and substitute `activity = 'business_launch'`.
4. If validation fails because of an invalid `activity`: return `new Response(JSON.stringify({ error: 'invalid_activity', valid: ['wedding', 'contracts', 'business_launch', 'travel'] }), { status: 400, headers: { 'content-type': 'application/json' } })`. (Other invalid-param 400s keep their existing handling.)
5. Propagate the resolved `activity` to the cache-key builder (Task 2.3) and to the composition function (Task 2.4).

Pseudo-shape (adjust to existing code style):

```ts
// in handleDailyNote, after parsing the rest of the query:
const result = QuerySchema.safeParse(searchParams);
if (!result.success) {
  const issue = result.error.issues.find((i) => i.path[0] === 'activity');
  if (issue) {
    return jsonError(400, {
      error: 'invalid_activity',
      valid: ['wedding', 'contracts', 'business_launch', 'travel'],
    });
  }
  return jsonError(400, { error: 'invalid_request', issues: result.error.issues });
}

let activity = result.data.activity;
if (activity === undefined) {
  console.warn('[daily-note] activity missing, defaulting to business_launch');
  activity = 'business_launch';
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd workers/api-proxy && npx vitest run src/routes/__tests__/daily-note-activity.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add workers/api-proxy/src/routes/daily-note.ts workers/api-proxy/src/routes/__tests__/daily-note-activity.test.ts
git commit -m "feat(worker/daily-note): Phase A activity param (optional with business_launch fallback)"
```

---

### Task 2.3: Worker cache key includes activity

**Files:**
- Modify: `workers/api-proxy/src/daily-note-cache.ts` (cache key builder)
- Test: `workers/api-proxy/src/__tests__/daily-note-cache-key.test.ts`

- [ ] **Step 1: Read current cache.ts / daily-note-cache.ts to understand the existing key format**

Run: `grep -n "cacheKey\|cache_key\|cache-key\|kv\." workers/api-proxy/src/daily-note-cache.ts workers/api-proxy/src/cache.ts`

Locate the key-building function and capture the current shape (e.g. `dn:v3:${lat}:${lng}:${tz}:${date}`).

- [ ] **Step 2: Write the failing test**

```ts
// workers/api-proxy/src/__tests__/daily-note-cache-key.test.ts
import { describe, test, expect } from 'vitest';
import { buildDailyNoteCacheKey } from '../daily-note-cache';

describe('daily-note cache key includes activity', () => {
  test('key embeds activity as final segment', () => {
    const key = buildDailyNoteCacheKey({
      lat: 50.45,
      lng: 30.52,
      tz: 'Europe/Kyiv',
      date: '2026-06-02',
      activity: 'wedding',
    });
    expect(key.endsWith(':wedding')).toBe(true);
  });

  test('keys for different activities are distinct', () => {
    const base = { lat: 50.45, lng: 30.52, tz: 'Europe/Kyiv', date: '2026-06-02' };
    const a = buildDailyNoteCacheKey({ ...base, activity: 'wedding' });
    const b = buildDailyNoteCacheKey({ ...base, activity: 'travel' });
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd workers/api-proxy && npx vitest run src/__tests__/daily-note-cache-key.test.ts`
Expected: FAIL — function signature does not accept `activity`.

- [ ] **Step 4: Modify `buildDailyNoteCacheKey` (or the equivalent) to include activity**

The function exists in `daily-note-cache.ts` (or `cache.ts` — confirm by grep in Step 1). Add `activity` to its argument shape, append `:${activity}` to the returned key.

If the function is part of a larger cache layer that doesn't currently expose a pure key builder, extract a pure `buildDailyNoteCacheKey` function for testability, then use it inside the cache-read/write callers. Keep behavior otherwise identical.

- [ ] **Step 5: Update all callers**

Run: `grep -rn "buildDailyNoteCacheKey\|daily-note.*cache.*key" workers/api-proxy/src/`

Update each caller to pass `activity` (which is resolved in Task 2.2's route handler). Phase A's fallback case passes `'business_launch'`.

- [ ] **Step 6: Run tests + full Worker suite**

Run: `cd workers/api-proxy && npx vitest run`
Expected: PASS for the new tests + no regressions in existing cache / route tests.

- [ ] **Step 7: Commit**

```bash
git add workers/api-proxy/src/daily-note-cache.ts workers/api-proxy/src/__tests__/daily-note-cache-key.test.ts
git commit -m "feat(worker/cache): include activity in /daily-note cache key"
```

---

### Task 2.4: Worker composition appends severity_hint to displayable payload

**Files:**
- Modify: `workers/api-proxy/src/translations/daily-notes/composer.ts` (or wherever the response composition lives — locate via grep)
- Modify: `packages/shared-types/src/api/daily-note.ts` (response schema) — add optional `severity_hint?: string` to the displayable section
- Test: `workers/api-proxy/src/translations/__tests__/severity-hint-composition.test.ts`

- [ ] **Step 1: Locate the composition site**

Run: `grep -rn "displayable\|composeDailyNote\|buildDisplayable" workers/api-proxy/src/translations/`

Identify the function that builds the response's `displayable` object (the section that the mobile app consumes). Find where the picked voice-library entry id is known at composition time.

- [ ] **Step 2: Map entry IDs to severity conditions**

Confirm voice spec §3.3 entry IDs:

| Entry ID | severity_hint condition |
|---|---|
| `closed-mercury-retrograde` | `mercury_retrograde` |
| `closed-venus-retrograde` | `venus_retrograde` |
| `closed-moon-voc` | `moon_voc` |
| `mixed-moon-void-until-noon` | `moon_voc_intraday` (PENDING — composer must not render this hint without `includePending: true`) |

Other entry IDs do NOT produce a severity_hint.

- [ ] **Step 3: Write the failing test**

```ts
// workers/api-proxy/src/translations/__tests__/severity-hint-composition.test.ts
import { describe, test, expect } from 'vitest';
import { composeDisplayable } from '../daily-notes/composer'; // adjust path per step 1

const baseInput = {
  // minimal valid composer input — copy shape from existing composer tests
};

describe('severity_hint composition', () => {
  test('asymmetric entry + activity → severity_hint in displayable', () => {
    const out = composeDisplayable({
      ...baseInput,
      pickedEntryId: 'closed-moon-voc',
      activity: 'wedding',
    });
    expect(out.severity_hint).toMatch(/does not take root/i);
  });

  test('asymmetric entry + travel activity → tolerant hint', () => {
    const out = composeDisplayable({
      ...baseInput,
      pickedEntryId: 'closed-venus-retrograde',
      activity: 'travel',
    });
    expect(out.severity_hint).toMatch(/matters less|fine to take/i);
  });

  test('non-asymmetric entry → no severity_hint', () => {
    const out = composeDisplayable({
      ...baseInput,
      pickedEntryId: 'good-venus-warm',
      activity: 'wedding',
    });
    expect(out.severity_hint).toBeUndefined();
  });

  test('pending-marked entry (intraday VOC) → no severity_hint without includePending', () => {
    const out = composeDisplayable({
      ...baseInput,
      pickedEntryId: 'mixed-moon-void-until-noon',
      activity: 'wedding',
    });
    expect(out.severity_hint).toBeUndefined();
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd workers/api-proxy && npx vitest run src/translations/__tests__/severity-hint-composition.test.ts`
Expected: FAIL — `severity_hint` not in output.

- [ ] **Step 5: Modify shared-types schema**

In `packages/shared-types/src/api/daily-note.ts` (or wherever the daily-note response schema lives — locate via grep), find the Zod schema for the `displayable` section. Add:

```ts
severity_hint: z.string().optional(),
```

This makes the field optional so existing tests / mobile decoders don't break.

- [ ] **Step 6: Implement the composer change**

In the composer file located in Step 1:

```ts
import { getSeverityHint, type SeverityCondition } from '../dictionary/severity-hints';

const ENTRY_TO_CONDITION: Record<string, SeverityCondition> = {
  'closed-mercury-retrograde': 'mercury_retrograde',
  'closed-venus-retrograde': 'venus_retrograde',
  'closed-moon-voc': 'moon_voc',
  'mixed-moon-void-until-noon': 'moon_voc_intraday',
};

// Inside composeDisplayable, after the existing headline/body composition:
const condition = ENTRY_TO_CONDITION[pickedEntryId];
const severityHint = condition
  ? getSeverityHint(condition, activity) // pending markers cause getSeverityHint to return undefined by default
  : undefined;

return {
  // ...existing fields...
  ...(severityHint !== undefined ? { severity_hint: severityHint } : {}),
};
```

If `activity` was the Phase A fallback (`business_launch` substituted in Task 2.2) AND `condition !== undefined`, also log:

```ts
if (condition && wasActivityFallback) {
  console.warn('[daily-note] severity-hint composed with fallback activity:', {
    date: dateIso,
    condition,
    fallback_activity: 'business_launch',
  });
}
```

`wasActivityFallback` is a boolean threaded from Task 2.2's route handler (track whether the original request omitted `?activity=`).

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd workers/api-proxy && npx vitest run`
Expected: PASS for new tests + no regressions.

- [ ] **Step 8: Commit**

```bash
git add workers/api-proxy/src/translations/daily-notes/composer.ts packages/shared-types/src/api/daily-note.ts workers/api-proxy/src/translations/__tests__/severity-hint-composition.test.ts
git commit -m "feat(worker/translations): compose activity-asymmetric severity_hint into displayable payload"
```

---

### Task 2.5: Worker fallback logging end-to-end test

**Files:**
- Test: `workers/api-proxy/src/routes/__tests__/daily-note-phase-a-fallback.test.ts`

- [ ] **Step 1: Write the integration test**

```ts
// workers/api-proxy/src/routes/__tests__/daily-note-phase-a-fallback.test.ts
import { describe, test, expect, vi } from 'vitest';
import { handleDailyNote } from '../daily-note';

describe('Phase A fallback — end-to-end', () => {
  test('missing activity + asymmetric date → response includes warn, NO severity_hint in displayable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Use a fixture / mock that forces the picker to select closed-moon-voc
    // (or whichever asymmetric entry is reproducible via mock).
    const res = await handleDailyNote(
      new Request('https://example.test/daily-note?lat=50.45&lng=30.52&tz=Europe/Kyiv', { method: 'GET' }),
      {/* env with fixture date forcing asymmetric entry */}
    );
    expect(res.status).toBe(200);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[daily-note] activity missing, defaulting to business_launch')
    );
    // Composer side: hint SHOULD render for business_launch — but with a SECOND warn about fallback
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[daily-note] severity-hint composed with fallback activity'),
      expect.objectContaining({ fallback_activity: 'business_launch' })
    );
    warn.mockRestore();
  });
});
```

- [ ] **Step 2: Run + iterate until passing**

Run: `cd workers/api-proxy && npx vitest run src/routes/__tests__/daily-note-phase-a-fallback.test.ts`

Per spec §6: the Phase A fallback still renders a severity_hint (using `business_launch`) and logs both warnings — the first about the request-level fallback, the second about the composition-time fallback. This makes Phase A's drift observable.

- [ ] **Step 3: Commit**

```bash
git add workers/api-proxy/src/routes/__tests__/daily-note-phase-a-fallback.test.ts
git commit -m "test(worker/daily-note): integration test for Phase A activity-fallback logging chain"
```

---

### Task 2.6: Worker-side KV counter for activity-missing fallback rate

**Files:**
- Modify: `workers/api-proxy/src/routes/daily-note.ts` (add KV increment in the missing-activity branch)
- Create: `workers/api-proxy/src/routes/__tests__/daily-note-kv-counter.test.ts`

**Why this exists.** Phase B is a breaking cutover (400 on missing activity). `wrangler tail` sampling can miss low-rate stragglers on old mobile builds, who would then receive 400s post-cutover. The KV counter makes the fallback rate queryable (rolling 14-day window) rather than sampled — cheap insurance proportionate to a breaking change. Used by Checkpoint 3 gate verification (see revised Checkpoint 3 block below).

**Design.**
- Keys: `metrics:dn-activity-missing:{YYYY-MM-DD}` and `metrics:dn-total:{YYYY-MM-DD}` — one key per day per metric.
- TTL: 14 days (auto-expires; no manual cleanup).
- Increment: one KV `put` per `/daily-note` request. The missing-activity path also increments the total counter (so the ratio is computable over the same denominator).
- Cost: 1 KV write per request × 2 keys = 2 writes per request on the missing path, 1 write per request on the present path. KV writes are 1 unit each — well within the 1M/day Workers Free tier.

**Implementation.**

- [ ] **Step 1: Write the failing tests**

```ts
// workers/api-proxy/src/routes/__tests__/daily-note-kv-counter.test.ts
import { describe, test, expect, vi } from 'vitest';
import { handleDailyNote } from '../daily-note';

const makeKVMock = () => {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => { store.set(key, value); }),
    _store: store,
  };
};

const makeReq = (qs: string) =>
  new Request(`https://example.test/daily-note?${qs}`, { method: 'GET' });

describe('Phase A KV counter', () => {
  test('missing activity → increments dn-total AND dn-activity-missing for today', async () => {
    const KV = makeKVMock();
    await handleDailyNote(makeReq('lat=50.45&lng=30.52&tz=Europe/Kyiv'), { KV /* + other env */ });
    const today = new Date().toISOString().slice(0, 10);
    expect(KV.put).toHaveBeenCalledWith(`metrics:dn-total:${today}`, expect.any(String), expect.objectContaining({ expirationTtl: 14 * 86400 }));
    expect(KV.put).toHaveBeenCalledWith(`metrics:dn-activity-missing:${today}`, expect.any(String), expect.objectContaining({ expirationTtl: 14 * 86400 }));
  });

  test('present activity → increments ONLY dn-total', async () => {
    const KV = makeKVMock();
    await handleDailyNote(makeReq('lat=50.45&lng=30.52&tz=Europe/Kyiv&activity=wedding'), { KV /* + other env */ });
    const today = new Date().toISOString().slice(0, 10);
    expect(KV.put).toHaveBeenCalledWith(`metrics:dn-total:${today}`, expect.any(String), expect.anything());
    expect(KV.put).not.toHaveBeenCalledWith(`metrics:dn-activity-missing:${today}`, expect.anything(), expect.anything());
  });

  test('counter increments are best-effort (KV failure does not 5xx the request)', async () => {
    const KV = makeKVMock();
    KV.put.mockRejectedValueOnce(new Error('KV outage'));
    const res = await handleDailyNote(makeReq('lat=50.45&lng=30.52&tz=Europe/Kyiv&activity=wedding'), { KV });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests — FAIL**

Run: `cd workers/api-proxy && npx vitest run src/routes/__tests__/daily-note-kv-counter.test.ts`

- [ ] **Step 3: Implement the counter in `daily-note.ts`**

Add a small helper near the top of the route file:

```ts
// workers/api-proxy/src/routes/daily-note.ts (additions)
const COUNTER_TTL_SECONDS = 14 * 86400;

async function bumpCounter(env: Env, key: string): Promise<void> {
  try {
    const prev = await env.KV.get(key);
    const next = String((prev ? Number(prev) : 0) + 1);
    await env.KV.put(key, next, { expirationTtl: COUNTER_TTL_SECONDS });
  } catch {
    // Best-effort: swallow KV errors so the user request still succeeds.
  }
}
```

In `handleDailyNote`, after determining whether activity was supplied or fallback-substituted:

```ts
const today = new Date().toISOString().slice(0, 10);
const wasActivityFallback = (activity from raw input === undefined);

// Always bump total. Best-effort, async; do NOT await before the response.
ctx.waitUntil(bumpCounter(env, `metrics:dn-total:${today}`));
if (wasActivityFallback) {
  ctx.waitUntil(bumpCounter(env, `metrics:dn-activity-missing:${today}`));
}
```

Use `ctx.waitUntil` to keep the increment off the response critical path. If the runtime's `ExecutionContext` is not already plumbed through, thread it from the entry handler (`src/index.ts`).

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Add a query helper script for Checkpoint 3**

```ts
// workers/api-proxy/scripts/query-activity-missing-rate.ts
// Usage: WORKER_URL=... npx tsx workers/api-proxy/scripts/query-activity-missing-rate.ts
//
// Queries the KV counters for the last 14 days and prints a per-day
// missing/total ratio. Used at Checkpoint 3 to gate Phase B deploy.

// Implementation: hit a small admin endpoint on the Worker that reads the
// counters from KV. The admin endpoint MUST be auth-gated (header check
// against a secret) and SHOULD be added as a sibling route file in the
// same PR as this task.
```

Actual implementation of the admin endpoint and CLI script: defer to the executor — the design is a `/admin/activity-missing-rate` route on the Worker that reads `metrics:dn-total:*` and `metrics:dn-activity-missing:*` keys, returns JSON `{ date, total, missing, ratio }[]`. Auth via header `x-admin-token` matching a Wrangler secret.

- [ ] **Step 6: Commit**

```bash
git add workers/api-proxy/src/routes/daily-note.ts workers/api-proxy/src/routes/__tests__/daily-note-kv-counter.test.ts workers/api-proxy/scripts/query-activity-missing-rate.ts
git commit -m "feat(worker/daily-note): KV counter for activity-missing fallback rate (Checkpoint 3 gate)"
```

---

## Phase 3 — Mobile hooks rewire

### Task 3.1: `lib/api.ts` `getDailyNote` signature += activity

**Files:**
- Modify: `apps/mobile/src/lib/api.ts`

- [ ] **Step 1: Read current `getDailyNote` signature**

Run: `grep -n "getDailyNote\b" apps/mobile/src/lib/api.ts`

Identify the function signature, its argument type, and how it builds the URL.

- [ ] **Step 2: Modify signature**

```ts
// apps/mobile/src/lib/api.ts
import type { Activity } from '@inceptio/shared-types';

export async function getDailyNote(args: {
  lat: number;
  lng: number;
  tz: string;
  activity: Activity;
}): Promise<DailyNoteResult> {
  const url = `${API_BASE}/daily-note?lat=${args.lat}&lng=${args.lng}&tz=${encodeURIComponent(args.tz)}&activity=${args.activity}`;
  // ...rest unchanged
}
```

Adjust per the actual existing function body (fetch + Zod parse).

- [ ] **Step 3: Run mobile typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: ONE error in `apps/mobile/src/hooks/useDailyNote.ts:66` — the caller doesn't yet pass `activity`. This is correct; Task 3.2 fixes it.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/lib/api.ts
git commit -m "feat(api): getDailyNote signature += activity"
```

---

### Task 3.2: `useDailyNote.ts` — queryKey reactive activity, enabled gates

**Files:**
- Modify: `apps/mobile/src/hooks/useDailyNote.ts`
- Test: `apps/mobile/src/hooks/__tests__/useDailyNote.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/mobile/src/hooks/__tests__/useDailyNote.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDailyNote } from '../useDailyNote';
import * as api from '../../lib/api';
import {
  initActivityPreference,
  setDefaultActivity,
  __resetForTests as resetActivityPref,
} from '../../lib/activity-preference';
import { storage } from '../../lib/storage';

const wrap = (qc: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };

beforeEach(() => {
  storage.delete('inceptio.default_activity');
  resetActivityPref();
});

describe('useDailyNote — activity integration', () => {
  test('hook disabled while hydrationStatus === loading', () => {
    const spy = jest.spyOn(api, 'getDailyNote').mockResolvedValue({} as any);
    const qc = new QueryClient();
    renderHook(() => useDailyNote(), { wrapper: wrap(qc) });
    expect(spy).not.toHaveBeenCalled();
  });

  test('hook disabled while hydrationStatus === unset', () => {
    const spy = jest.spyOn(api, 'getDailyNote').mockResolvedValue({} as any);
    initActivityPreference(); // empty storage → unset
    const qc = new QueryClient();
    renderHook(() => useDailyNote(), { wrapper: wrap(qc) });
    expect(spy).not.toHaveBeenCalled();
  });

  test('hook fires when hydrationStatus === set', async () => {
    const spy = jest.spyOn(api, 'getDailyNote').mockResolvedValue({} as any);
    storage.set('inceptio.default_activity', 'wedding');
    initActivityPreference();
    const qc = new QueryClient();
    renderHook(() => useDailyNote(), { wrapper: wrap(qc) });
    await waitFor(() => expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ activity: 'wedding' })
    ));
  });

  test('changing activity reactively refetches with new queryKey', async () => {
    const spy = jest.spyOn(api, 'getDailyNote').mockResolvedValue({} as any);
    storage.set('inceptio.default_activity', 'wedding');
    initActivityPreference();
    const qc = new QueryClient();
    const { rerender } = renderHook(() => useDailyNote(), { wrapper: wrap(qc) });
    await waitFor(() => expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ activity: 'wedding' })
    ));
    setDefaultActivity('travel');
    rerender({});
    await waitFor(() => expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ activity: 'travel' })
    ));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/mobile && npx jest src/hooks/__tests__/useDailyNote.test.ts`
Expected: FAIL — `enabled: true` always fires regardless of pref state; queryKey doesn't include activity; getDailyNote called without activity arg.

- [ ] **Step 3: Modify `useDailyNote.ts`**

```ts
// apps/mobile/src/hooks/useDailyNote.ts
import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { getDailyNote, type DailyNoteResult } from '../lib/api';
import { getLastLocation } from '../lib/location-storage';
import { storage } from '../lib/storage';
import { useActivityPreference } from '../lib/activity-preference';

const FALLBACK_LOCATION = {
  lat: 50.4501,
  lng: 30.5234,
  timezone: 'Europe/Kyiv',
} as const;

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

export function useDailyNote(): UseQueryResult<DailyNoteResult, Error> {
  const queryClient = useQueryClient();
  const { hydrationStatus, activity } = useActivityPreference();

  const { lat, lng, tz } = useMemo(() => {
    const loc = getLastLocation();
    if (loc) return { lat: round2(loc.lat), lng: round2(loc.lng), tz: loc.timezone };
    return {
      lat: round2(FALLBACK_LOCATION.lat),
      lng: round2(FALLBACK_LOCATION.lng),
      tz: FALLBACK_LOCATION.timezone,
    };
  }, []);

  const todayIsoDate = useMemo(() => isoTodayInTz(tz), [tz]);

  // queryKey is rebuilt every render. DO NOT wrap in useMemo — a missing dep
  // (e.g. forgetting `activity`) would silently lock the key to a stale value.
  // TanStack Query hashes array contents and only refetches on actual content
  // change, so unmemoized array literals are correct usage.
  const query = useQuery<DailyNoteResult, Error>({
    queryKey: ['daily-note', lat, lng, tz, todayIsoDate, activity] as const,
    queryFn: () => getDailyNote({ lat, lng, tz, activity: activity! }),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: hydrationStatus === 'set' && activity !== undefined,
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/mobile && npx jest src/hooks/__tests__/useDailyNote.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run mobile typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS (Task 3.1's compile error from `getDailyNote` signature is now resolved).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/hooks/useDailyNote.ts apps/mobile/src/hooks/__tests__/useDailyNote.test.ts
git commit -m "feat(useDailyNote): reactive activity in queryKey + enabled gating on hydrationStatus"
```

---

### Task 3.3: Worker daily-note response decoder accepts optional `severity_hint`

**Files:**
- Modify: `apps/mobile/src/lib/api.ts` (Zod decoder for `DailyNoteResult`)
- Test: `apps/mobile/src/lib/__tests__/daily-note-decoder.test.ts`

- [ ] **Step 1: Locate decoder**

Run: `grep -n "DailyNoteResult\|DailyNoteResponseSchema\|displayable" apps/mobile/src/lib/api.ts`

- [ ] **Step 2: Write failing test**

```ts
// apps/mobile/src/lib/__tests__/daily-note-decoder.test.ts
import { DailyNoteResultSchema } from '../api'; // or wherever the schema is exported from

describe('DailyNote response decoder', () => {
  test('accepts response with severity_hint', () => {
    const fixture = {
      // ...minimal valid daily-note response, then:
      response: {
        displayable: {
          headline: 'The Moon is between signs today.',
          body: 'Efforts begun now don\'t take root the way they do on other days.',
          severity_hint: "For a wedding, tradition is unambiguous here — what's started today does not take root the way it does on other days.",
        },
        library_version: 'v3',
        // ...
      },
    };
    expect(() => DailyNoteResultSchema.parse(fixture)).not.toThrow();
  });

  test('accepts response without severity_hint (backward compat)', () => {
    const fixture = {
      response: {
        displayable: {
          headline: 'A tender day for beginnings.',
          body: 'Venus is warm and dignified.',
          // no severity_hint
        },
        library_version: 'v3',
      },
    };
    const out = DailyNoteResultSchema.parse(fixture);
    expect(out.response.displayable.severity_hint).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run test**

Run: `cd apps/mobile && npx jest src/lib/__tests__/daily-note-decoder.test.ts`
Expected: FAIL — unknown field `severity_hint` (Zod strict mode) OR PASS if the schema already uses passthrough — read the schema first.

- [ ] **Step 4: If FAIL, add `severity_hint: z.string().optional()` to the displayable section of the Zod schema**

- [ ] **Step 5: Run test again — PASS**

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/lib/api.ts apps/mobile/src/lib/__tests__/daily-note-decoder.test.ts
git commit -m "feat(api): accept optional severity_hint in DailyNote response"
```

---

## Phase 4 — Picker component

Phase 4 groups all activity-picker primitives in one place.

- `ActivityOption` (Task 4.1) is the shared selection primitive. Three surfaces render it: FirstLaunchActivityPicker (Task 4.3, in-list), `ActivityChangeSheet` (Task 4.2, inside the bottom sheet's option list), and the in-sheet rendering inherits via composition. The primitive is the actual share point.
- `ActivityChangeSheet` (Task 4.2) is the dismissible bottom-sheet selector. **Two surfaces consume it: the Today tappable activity-line (Phase 5 Task 5.1) and the YouScreen Default activity Row (Phase 7 Task 7.1).** It is **NOT** used by FirstLaunchActivityPicker — first-launch is a mandatory, non-dismissible gate (D14) and renders its own full-screen layout that maps `ActivityOption` rows directly, with no Modal / backdrop / onClose escape.
- `FirstLaunchActivityPicker` (Task 4.3) is the full-screen first-launch gate. Maps `ActivityOption` rows inside a `SafeAreaView`. Continue button gated on selection. No dismissal path — D14 non-dismissibility is structural.

### Task 4.1: `ActivityOption` thin component

**Files:**
- Create: `apps/mobile/src/components/ActivityOption.tsx`
- Test: `apps/mobile/src/components/__tests__/ActivityOption.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/mobile/src/components/__tests__/ActivityOption.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { ActivityOption } from '../ActivityOption';

describe('ActivityOption', () => {
  test('renders activity label + emoji', () => {
    const { getByText } = render(
      <ActivityOption activity="wedding" selected={false} onPress={() => {}} />
    );
    expect(getByText('Wedding')).toBeTruthy();
    expect(getByText('💍')).toBeTruthy();
  });

  test('calls onPress with activity on tap', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ActivityOption activity="travel" selected={false} onPress={onPress} />
    );
    fireEvent.press(getByTestId('activity-option-travel'));
    expect(onPress).toHaveBeenCalledWith('travel');
  });

  test('renders selected ring when selected=true', () => {
    const { getByTestId } = render(
      <ActivityOption activity="contracts" selected onPress={() => {}} />
    );
    const root = getByTestId('activity-option-contracts');
    // The selected ring class is exposed as a testID-discoverable prop
    // OR via accessibilityState. Assert accessibilityState.selected === true.
    expect(root.props.accessibilityState?.selected).toBe(true);
  });
});
```

- [ ] **Step 2: Run test — FAIL**

Run: `cd apps/mobile && npx jest src/components/__tests__/ActivityOption.test.tsx`

- [ ] **Step 3: Implement**

```tsx
// apps/mobile/src/components/ActivityOption.tsx
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTw } from 'nativewind';
import type { Activity } from '@inceptio/shared-types';
import { ACTIVITY_EMOJI, ACTIVITY_LABELS, ACTIVITY_DISPLAY } from '../lib/activities';

type Props = {
  activity: Activity;
  selected: boolean;
  onPress: (activity: Activity) => void;
};

export function ActivityOption({ activity, selected, onPress }: Props) {
  const ringClass = selected ? 'border-2 border-accent-primary' : 'border-2 border-transparent';
  return (
    <Pressable
      testID={`activity-option-${activity}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onPress(activity)}
      className={`flex-row items-center gap-3 rounded-2xl px-4 py-4 ${ACTIVITY_DISPLAY[activity].tint} ${ringClass}`}
    >
      <Text className="text-2xl">{ACTIVITY_EMOJI[activity]}</Text>
      <Text className="text-text font-medium">{ACTIVITY_LABELS[activity]}</Text>
    </Pressable>
  );
}
```

If the project uses a different className mechanism (e.g. `tw` from a custom helper, or StyleSheet objects), adjust accordingly. Read another component (e.g. `ActivityChip.js`) for the local convention before locking the styling approach.

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/ActivityOption.tsx apps/mobile/src/components/__tests__/ActivityOption.test.tsx
git commit -m "feat(components): add ActivityOption thin selection primitive"
```

---

### Task 4.2: Create `ActivityChangeSheet` (shared component, was old Task 7.2)

**Files:**
- Create: `apps/mobile/src/components/ActivityChangeSheet.js`
- Test: `apps/mobile/src/components/__tests__/ActivityChangeSheet.test.tsx`

Two surfaces consume `ActivityChangeSheet`: the Today tappable activity-line (Phase 5 Task 5.1) and the YouScreen Default activity Row (Phase 7 Task 7.1). FirstLaunchActivityPicker (Task 4.3) is **NOT** a consumer — first-launch is a mandatory non-dismissible gate (D14) and renders `ActivityOption` rows directly inside its own full-screen layout. Built in Phase 4 to group activity-picker primitives.

- [ ] **Step 1: Write the failing tests**

```tsx
// apps/mobile/src/components/__tests__/ActivityChangeSheet.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { ActivityChangeSheet } from '../ActivityChangeSheet';

describe('ActivityChangeSheet', () => {
  test('renders 4 options when open', () => {
    const { getByTestId } = render(
      <ActivityChangeSheet open current="wedding" onSelect={() => {}} onClose={() => {}} />
    );
    expect(getByTestId('activity-option-wedding')).toBeTruthy();
    expect(getByTestId('activity-option-travel')).toBeTruthy();
  });

  test('does not render when open=false', () => {
    const { queryByTestId } = render(
      <ActivityChangeSheet open={false} current="wedding" onSelect={() => {}} onClose={() => {}} />
    );
    expect(queryByTestId('activity-option-wedding')).toBeNull();
  });

  test('tapping current activity is a no-op (no onSelect)', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <ActivityChangeSheet open current="wedding" onSelect={onSelect} onClose={() => {}} />
    );
    fireEvent.press(getByTestId('activity-option-wedding'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  test('tapping a different activity calls onSelect with that activity', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <ActivityChangeSheet open current="wedding" onSelect={onSelect} onClose={() => {}} />
    );
    fireEvent.press(getByTestId('activity-option-travel'));
    expect(onSelect).toHaveBeenCalledWith('travel');
  });

  test('backdrop press dismisses (onClose) — change-mode discard path', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <ActivityChangeSheet open current="wedding" onSelect={() => {}} onClose={onClose} />
    );
    // The backdrop is the outer Pressable; consumers can tag with testID
    // 'activity-change-sheet-backdrop' for direct simulation.
    fireEvent.press(getByTestId('activity-change-sheet-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests — FAIL**

Run: `cd apps/mobile && npx jest src/components/__tests__/ActivityChangeSheet.test.tsx`

- [ ] **Step 3: Implement**

```jsx
// apps/mobile/src/components/ActivityChangeSheet.js
import React from 'react';
import { Modal, Pressable, View, Text } from 'react-native';
import { ActivityOption } from './ActivityOption';

const ALL = ['wedding', 'contracts', 'business_launch', 'travel'];

/**
 * Bottom-sheet activity selector. Two consumers (both Phase 5+ surfaces, both
 * change-mode use cases):
 *   1. Today's tappable activity-line passes `current={defaultActivity}` and
 *      calls setDefaultActivity in onSelect.
 *   2. YouScreen Default activity Row — same as Today.
 *
 * NOT used by FirstLaunchActivityPicker — first-launch is a mandatory
 * non-dismissible gate (D14) and renders ActivityOption rows directly in its
 * own full-screen layout. This sheet is change-mode only.
 *
 * Tapping the current activity is a no-op. Tapping a different activity fires
 * onSelect with the new value. Backdrop press fires onClose (change-mode discard).
 */
export function ActivityChangeSheet({ open, current, onSelect, onClose }) {
  if (!open) return null;
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <Pressable testID="activity-change-sheet-backdrop" className="flex-1 bg-black/40" onPress={onClose}>
        <Pressable
          className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl px-6 pt-6 pb-10"
          onPress={(e) => e.stopPropagation()}
        >
          <Text className="text-text text-xl font-display mb-4">Default activity</Text>
          <View className="gap-3">
            {ALL.map((a) => (
              <ActivityOption
                key={a}
                activity={a}
                selected={a === current}
                onPress={(next) => {
                  if (next !== current) onSelect(next);
                }}
              />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
```

- [ ] **Step 4: Run tests — PASS (5 tests)**

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/ActivityChangeSheet.js apps/mobile/src/components/__tests__/ActivityChangeSheet.test.tsx
git commit -m "feat(components): add ActivityChangeSheet shared bottom-sheet selector"
```

---

### Task 4.3: `FirstLaunchActivityPicker` screen

**Files:**
- Create: `apps/mobile/src/screens/FirstLaunchActivityPicker.js`
- Test: `apps/mobile/src/screens/__tests__/FirstLaunchActivityPicker.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// apps/mobile/src/screens/__tests__/FirstLaunchActivityPicker.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { FirstLaunchActivityPicker } from '../FirstLaunchActivityPicker';
import { storage } from '../../lib/storage';
import * as pref from '../../lib/activity-preference';

beforeEach(() => {
  storage.delete('inceptio.last_activity');
  storage.delete('inceptio.default_activity');
  pref.__resetForTests();
});

describe('FirstLaunchActivityPicker', () => {
  test('renders 4 activity options', () => {
    const { getByTestId } = render(<FirstLaunchActivityPicker go={() => {}} />);
    expect(getByTestId('activity-option-wedding')).toBeTruthy();
    expect(getByTestId('activity-option-contracts')).toBeTruthy();
    expect(getByTestId('activity-option-business_launch')).toBeTruthy();
    expect(getByTestId('activity-option-travel')).toBeTruthy();
  });

  test('Continue is disabled until selection', () => {
    const { getByTestId } = render(<FirstLaunchActivityPicker go={() => {}} />);
    expect(getByTestId('first-launch-continue').props.accessibilityState?.disabled).toBe(true);
  });

  test('selecting + Continue → setDefaultActivity + go("today")', () => {
    const go = jest.fn();
    const spy = jest.spyOn(pref, 'setDefaultActivity');
    const { getByTestId } = render(<FirstLaunchActivityPicker go={go} />);
    fireEvent.press(getByTestId('activity-option-wedding'));
    fireEvent.press(getByTestId('first-launch-continue'));
    expect(spy).toHaveBeenCalledWith('wedding');
    expect(go).toHaveBeenCalledWith('today');
  });

  test('preselects from KEY_LAST_ACTIVITY if present (migration case)', () => {
    storage.set('inceptio.last_activity', 'travel');
    const { getByTestId } = render(<FirstLaunchActivityPicker go={() => {}} />);
    expect(getByTestId('activity-option-travel').props.accessibilityState?.selected).toBe(true);
  });

  test('does NOT silently call setDefaultActivity from preselect — only on Continue', () => {
    storage.set('inceptio.last_activity', 'travel');
    const spy = jest.spyOn(pref, 'setDefaultActivity');
    render(<FirstLaunchActivityPicker go={() => {}} />);
    expect(spy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests — FAIL**

- [ ] **Step 3: Implement**

```jsx
// apps/mobile/src/screens/FirstLaunchActivityPicker.js
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Starfield from '../components/Starfield';
import { ActivityOption } from '../components/ActivityOption';
import { setDefaultActivity } from '../lib/activity-preference';
import { getLastActivity } from '../lib/draft-store';

const ALL_ACTIVITIES = ['wedding', 'contracts', 'business_launch', 'travel'];

export default function FirstLaunchActivityPicker({ go }) {
  // Preselect from KEY_LAST_ACTIVITY on mount (migration courtesy).
  // Read-once, no silent write.
  const [selected, setSelected] = useState(() => getLastActivity() ?? null);

  const onContinue = () => {
    if (!selected) return;
    setDefaultActivity(selected);
    go('today');
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <Starfield />
      <View className="flex-1 px-6 pt-12 pb-8 justify-between">
        <View>
          <Text className="text-text text-3xl font-display mb-4">Welcome to Inceptio</Text>
          <Text className="text-muted text-base mb-8">
            What kind of moment would you like to find first?
          </Text>
          <View className="gap-3">
            {ALL_ACTIVITIES.map((a) => (
              <ActivityOption
                key={a}
                activity={a}
                selected={selected === a}
                onPress={setSelected}
              />
            ))}
          </View>
          <Text className="text-muted text-sm mt-6">
            You can change this anytime in You → Settings.
          </Text>
        </View>
        <Pressable
          testID="first-launch-continue"
          accessibilityRole="button"
          accessibilityState={{ disabled: !selected }}
          onPress={onContinue}
          disabled={!selected}
          className={`rounded-2xl py-4 items-center ${selected ? 'bg-accent-primary' : 'bg-surface'}`}
        >
          <Text className={`font-medium ${selected ? 'text-bg-base' : 'text-muted'}`}>Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
```

Match the project's existing screen-component conventions for styling (e.g. inline `style={}` vs `className=`) by reading another screen file first (e.g. `YouScreen.js`).

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/FirstLaunchActivityPicker.js apps/mobile/src/screens/__tests__/FirstLaunchActivityPicker.test.tsx
git commit -m "feat(screens): add FirstLaunchActivityPicker with KEY_LAST_ACTIVITY preselect"
```

---

### Task 4.4: Register `FirstLaunchActivityPicker` in `SCREENS` map

**Files:**
- Modify: `apps/mobile/App.js`

- [ ] **Step 1: Read App.js SCREENS map**

Run: `grep -n "SCREENS\|MODAL_SCREENS" apps/mobile/App.js`

Identify the SCREENS object (the registry of screen id → component) and the MODAL_SCREENS set (screens that hide the tab bar).

- [ ] **Step 2: Add registration**

```js
// At top of App.js, with other screen imports:
import FirstLaunchActivityPicker from './src/screens/FirstLaunchActivityPicker';

// In SCREENS object, add:
'first-launch-activity': FirstLaunchActivityPicker,

// In MODAL_SCREENS set, add:
MODAL_SCREENS = new Set([..., 'first-launch-activity']);
```

(Adjust to match the actual structure — single source of truth, not duplicated.)

- [ ] **Step 3: Smoke test**

Run: `cd apps/mobile && npx expo start --ios` and manually navigate to `first-launch-activity` via dev affordance (or temporarily set the initial screen) to verify the screen mounts without crash and tab bar is hidden.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/App.js
git commit -m "feat(app): register FirstLaunchActivityPicker as modal screen"
```

---

## Phase 5 — Today UI integration

**Sequential 5.1 → 5.2 → 5.3.** The plan's earlier draft declared 5.1 and 5.2 parallel on the assumption they targeted distinct files. Per partition-reviewer audit, both prose blocks say "the daily-note hero component (likely `DailyHero.js`)" and "the daily-note body component (same locale as Task 5.1)" — they probably land in the same file. Sequential ordering eliminates the collision risk. Task 5.3 is downstream of both since it audits `text-subtle` usages in files 5.1 and 5.2 just edited.

### Task 5.1: Daily-note adds tappable activity-line with chevron (Today-tap → change activity)

**Files:**
- Create: `apps/mobile/src/components/ActivityLine.tsx` (new shared visual component)
- Test: `apps/mobile/src/components/__tests__/ActivityLine.test.tsx`
- Modify: the daily-note hero component on TodayScreen (likely `apps/mobile/src/components/daily-note/DailyHero.js` — locate via grep)

**Design intent (spec §7, restored from brainstorm D12 per user review):** the daily-note hero gets a three-tier hierarchy: eyebrow (date, `text-muted`) → **activity-line (secondary, tappable, chevron)** → headline → body → [optional severity-hint]. The activity-line opens `ActivityChangeSheet` in change mode. The eyebrow stays date-only (no inline `· for your X`).

**Accessibility (locked):**
- `accessibilityRole="button"`
- `accessibilityLabel="Change activity, currently <ActivityLabel>"` (e.g. *"Change activity, currently Wedding"*)
- Touch target ≥ 44pt (use `minHeight: 44` or `hitSlop`).

- [ ] **Step 1: Locate the daily-note hero on TodayScreen**

Run: `grep -rn "daily-note\|DailyHero\|DailyNoteSection\|formatDailyEyebrow" apps/mobile/src/screens/TodayScreen.js apps/mobile/src/components/daily-note/`

Identify the component that renders the eyebrow + headline + body. Note its file path for use below.

- [ ] **Step 2: Write the failing tests for `ActivityLine`**

```tsx
// apps/mobile/src/components/__tests__/ActivityLine.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { ActivityLine } from '../ActivityLine';

describe('ActivityLine', () => {
  test('renders the eyebrow phrase for the activity', () => {
    const { getByText } = render(
      <ActivityLine activity="wedding" onPress={() => {}} />
    );
    expect(getByText(/for your wedding/i)).toBeTruthy();
  });

  test('renders a chevron affordance', () => {
    const { getByTestId } = render(
      <ActivityLine activity="travel" onPress={() => {}} />
    );
    expect(getByTestId('activity-line-chevron')).toBeTruthy();
  });

  test('a11y: accessibilityRole=button, accessibilityLabel includes current label', () => {
    const { getByTestId } = render(
      <ActivityLine activity="contracts" onPress={() => {}} />
    );
    const root = getByTestId('activity-line');
    expect(root.props.accessibilityRole).toBe('button');
    expect(root.props.accessibilityLabel).toBe('Change activity, currently Contract');
  });

  test('touch target ≥ 44pt (minHeight 44 OR hitSlop covering 44pt)', () => {
    const { getByTestId } = render(
      <ActivityLine activity="business_launch" onPress={() => {}} />
    );
    const root = getByTestId('activity-line');
    const style = Array.isArray(root.props.style) ? Object.assign({}, ...root.props.style) : root.props.style;
    const hitSlop = root.props.hitSlop ?? { top: 0, bottom: 0, left: 0, right: 0 };
    const effectiveHeight = (style?.minHeight ?? 0) + (hitSlop.top ?? 0) + (hitSlop.bottom ?? 0);
    expect(effectiveHeight).toBeGreaterThanOrEqual(44);
  });

  test('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ActivityLine activity="wedding" onPress={onPress} />
    );
    fireEvent.press(getByTestId('activity-line'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run tests — FAIL**

Run: `cd apps/mobile && npx jest src/components/__tests__/ActivityLine.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `ActivityLine`**

```tsx
// apps/mobile/src/components/ActivityLine.tsx
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Activity } from '@inceptio/shared-types';
import { getActivityEyebrowPhrase, getActivityLabel } from '../lib/activities';

type Props = {
  activity: Activity;
  onPress: () => void;
};

export function ActivityLine({ activity, onPress }: Props) {
  const phrase = getActivityEyebrowPhrase(activity);
  const label = getActivityLabel(activity);
  return (
    <Pressable
      testID="activity-line"
      accessibilityRole="button"
      accessibilityLabel={`Change activity, currently ${label}`}
      onPress={onPress}
      // Touch target ≥ 44pt via minHeight + hitSlop (belt and suspenders for
      // the test's effectiveHeight calculation).
      style={{ minHeight: 44 }}
      hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
      className="flex-row items-center gap-2 py-2"
    >
      <Text className="text-muted text-base">{phrase}</Text>
      <Text testID="activity-line-chevron" className="text-muted text-base">›</Text>
    </Pressable>
  );
}
```

- [ ] **Step 5: Run `ActivityLine` tests — PASS (5 tests)**

- [ ] **Step 6: Wire `ActivityLine` into the daily-note hero**

In the daily-note hero component (located in Step 1), insert the activity-line between the date eyebrow and the headline:

```jsx
import { useState, useCallback } from 'react';
import { useActivityPreference, setDefaultActivity } from '../../lib/activity-preference';
import { ActivityLine } from '../ActivityLine';
import { ActivityChangeSheet } from '../ActivityChangeSheet';

// inside the component, render block:
const { hydrationStatus, activity } = useActivityPreference();
const [changeOpen, setChangeOpen] = useState(false);
const openChange = useCallback(() => setChangeOpen(true), []);
const closeChange = useCallback(() => setChangeOpen(false), []);
const onSelectFromTap = useCallback((next: Activity) => {
  setDefaultActivity(next);
  setChangeOpen(false);
}, []);

return (
  <>
    <Text className="text-muted">{formatDailyEyebrow(dateIso)}</Text>
    {hydrationStatus === 'set' && activity && (
      <ActivityLine activity={activity} onPress={openChange} />
    )}
    <Text className="text-text font-display text-3xl">{displayable.headline}</Text>
    <Text className="text-text text-base">{displayable.body}</Text>
    {displayable.severity_hint && (
      <Text className="text-muted text-base mt-2">{displayable.severity_hint}</Text>
    )}
    <ActivityChangeSheet
      open={changeOpen}
      current={activity}
      onSelect={onSelectFromTap}
      onClose={closeChange}
    />
  </>
);
```

Use `text-muted` for the activity-line per EC-9 (`text-subtle` fails AA — spec §11). The chevron (`›`) inherits the same `text-muted` class.

- [ ] **Step 7: Add a daily-hero integration test asserting the activity-line is rendered when hydrationStatus === set**

(Per the existing test patterns of the daily-hero component — adjust framework as needed.)

```tsx
test('renders ActivityLine when hydrationStatus === set', () => {
  storage.set('inceptio.default_activity', 'wedding');
  initActivityPreference();
  const { getByTestId } = render(<DailyHero />);
  expect(getByTestId('activity-line')).toBeTruthy();
});

test('does NOT render ActivityLine when hydrationStatus !== set', () => {
  // unset state
  const { queryByTestId } = render(<DailyHero />);
  expect(queryByTestId('activity-line')).toBeNull();
});

test('tapping ActivityLine opens ActivityChangeSheet', () => {
  storage.set('inceptio.default_activity', 'wedding');
  initActivityPreference();
  const { getByTestId, queryByTestId } = render(<DailyHero />);
  expect(queryByTestId('activity-option-wedding')).toBeNull(); // sheet closed initially
  fireEvent.press(getByTestId('activity-line'));
  expect(getByTestId('activity-option-wedding')).toBeTruthy(); // sheet open
});
```

- [ ] **Step 8: Run all Phase 5 Task 5.1 tests — PASS**

- [ ] **Step 9: Visual smoke**

Run: `cd apps/mobile && npx expo start --ios`
Verify: Today screen renders date eyebrow → activity-line ("for your wedding ›") → headline → body. Tapping the activity-line opens the change sheet. Selecting a different activity dismisses sheet, updates the line, and Today re-fetches with the new activity (visible as a brief loading state if the new activity's response wasn't cached).

- [ ] **Step 10: Commit**

```bash
git add apps/mobile/src/components/ActivityLine.tsx apps/mobile/src/components/__tests__/ActivityLine.test.tsx apps/mobile/src/components/daily-note/<hero-component>.js apps/mobile/src/components/daily-note/__tests__/<hero-component>.test.tsx
git commit -m "feat(daily-note): tappable activity-line opens ActivityChangeSheet (Today-tap)"
```

---

### Task 5.2: Severity-hint slot rendered as third body line

**Files:**
- Modify: the daily-note body component (likely `DailyHero.js` or a sibling — same locale as Task 5.1)

- [ ] **Step 1: Identify component receiving response.displayable**

The component that renders `displayable.headline` and `displayable.body` is the one that gains the `severity_hint` line.

- [ ] **Step 2: Write the failing test**

```tsx
// in __tests__ for the body component
test('renders severity_hint as third body line in text-muted when present', () => {
  const data = {
    headline: 'The Moon is between signs today.',
    body: 'Efforts begun now don\'t take root the way they do on other days.',
    severity_hint: "For a wedding, tradition is unambiguous here — what's started today does not take root the way it does on other days.",
  };
  const { getByText } = render(<DailyHeroBody data={data} />);
  expect(getByText(/tradition is unambiguous here/)).toBeTruthy();
});

test('omits severity_hint slot when undefined', () => {
  const data = {
    headline: 'A tender day for beginnings.',
    body: 'Venus is warm and dignified.',
  };
  const { queryByText } = render(<DailyHeroBody data={data} />);
  expect(queryByText(/For a/)).toBeNull();
});
```

- [ ] **Step 3: Modify component**

```jsx
{data.severity_hint && (
  <Text className="text-muted text-base mt-2">{data.severity_hint}</Text>
)}
```

`text-muted` is binding per EC-9. **Do NOT** use `text-subtle`.

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/daily-note/<body-component>.js apps/mobile/src/components/daily-note/__tests__/<body-component>.test.tsx
git commit -m "feat(daily-note): render severity_hint as third body line"
```

---

### Task 5.3: Audit + fix preference-surface text-subtle usages

**Files:**
- Modify: any preference-related copy using `text-subtle`

- [ ] **Step 1: Grep for text-subtle in surfaces this feature touches**

Run: `grep -rn "text-subtle\|textSubtle\|colors.textSubtle" apps/mobile/src/screens/YouScreen.js apps/mobile/src/screens/FirstLaunchActivityPicker.js apps/mobile/src/components/ActivityOption.tsx apps/mobile/src/components/daily-note/`

- [ ] **Step 2: For each result in a preference surface, promote to text-muted**

Any occurrence in `YouScreen` `Row` `hint` prop, the FirstLaunchActivityPicker helper text, the ActivityOption labels, or the daily-note eyebrow/severity-hint text is a binding fix. Replace `text-subtle` with `text-muted`.

Occurrences in OTHER surfaces (calendars, moments lists, decorative copy not related to preferences) are out of scope for this feature — leave them alone.

- [ ] **Step 3: Commit**

```bash
git add <files>
git commit -m "feat(activity-pref): EC-9 promote text-subtle to text-muted on preference surfaces"
```

---

## Phase 6 — Gate cascade (App.js)

### Task 6.1: Call `initActivityPreference()` after `hydrateStorage()`

**Files:**
- Modify: `apps/mobile/App.js`

- [ ] **Step 1: Locate the existing `hydrateStorage().then(...)` block**

Run: `grep -n "hydrateStorage\|setStorageReady" apps/mobile/App.js`

Identify the useEffect that resolves storage hydration. The exact lines: App.js:103-108 is the **render-time gate** that returns the boot ActivityIndicator while `!storageReady`. The **setter** for `storageReady` lives elsewhere — locate by grepping the same setter name.

- [ ] **Step 2: Modify the hydration useEffect to also init the preference**

```js
import { hydrateStorage } from './src/lib/storage';
import { initActivityPreference } from './src/lib/activity-preference';

// inside the existing hydration useEffect:
useEffect(() => {
  hydrateStorage().then(() => {
    initActivityPreference();
    setStorageReady(true);
  });
}, []);
```

This is idempotent on hot reload because `initActivityPreference()` is no-op on subsequent calls (Task 1.1 implementation).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/App.js
git commit -m "feat(app): initActivityPreference on storage hydrate"
```

---

### Task 6.2: Wire first-launch picker as the unset-status gate

**Files:**
- Modify: `apps/mobile/App.js`

- [ ] **Step 1: Read render block to identify where to insert the unset-status branch**

The boot gate at App.js:103-108 handles `!fontsLoaded || !storageReady`. After that gate passes, the next block currently renders `<Screen go={go}/>`. The new gate must sit between them — after storage is ready but before mounting the regular screen tree.

- [ ] **Step 2: Add the unset gate**

```jsx
// After lines 103-108 (boot gate) and before `const Screen = SCREENS[screen] || SCREENS.today;`

const { hydrationStatus } = useActivityPreference();

// Belt-and-suspenders — if pref is still loading at render, fall back to the boot view.
// In practice, the storage hydrate effect runs initActivityPreference() before setStorageReady(true),
// so hydrationStatus should be 'set' or 'unset' by the time storageReady === true.
if (hydrationStatus === 'loading') {
  return (
    <View style={styles.boot}>
      <ActivityIndicator color={colors.primaryGlow}/>
    </View>
  );
}

// First-launch path: no preference set yet → mount the picker as a modal screen with
// no surrounding tab bar.
if (hydrationStatus === 'unset' && screen !== 'first-launch-activity') {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <View style={styles.root} onLayout={onLayoutRoot}>
          <StatusBar style="light"/>
          <View style={styles.content}>
            <FirstLaunchActivityPicker go={go}/>
          </View>
        </View>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
```

Add the `useActivityPreference` import to the App.js header. Place imports per existing style.

- [ ] **Step 3: Smoke test by clearing storage and relaunching**

Run: `cd apps/mobile && npx expo start --ios`
In a fresh simulator (or after clearing AsyncStorage via dev menu), the app boots → splash → FirstLaunchActivityPicker (no tab bar) → select activity → Today screen with tab bar.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/App.js
git commit -m "feat(app): gate cascade routes unset preference through FirstLaunchActivityPicker"
```

---

## Phase 7 — Settings entry (YouScreen)

### Task 7.1: Rewire `YouScreen` Default activity Row

**Files:**
- Modify: `apps/mobile/src/screens/YouScreen.js`

- [ ] **Step 1: Replace the canary swap from Checkpoint 1 with the full integration**

```js
// apps/mobile/src/screens/YouScreen.js — at top
import { useActivityPreference } from '../lib/activity-preference';
import { getActivityLabel } from '../lib/activities';

// inside YouScreen — replace the existing lastActivity read (line 49 area):
const { hydrationStatus, activity } = useActivityPreference();
const activityDetail =
  hydrationStatus === 'set' && activity
    ? getActivityLabel(activity)
    : hydrationStatus === 'unset'
    ? 'Not set'
    : '...';

// Replace the Row's onPress = comingSoon with:
const [changeSheetOpen, setChangeSheetOpen] = useState(false);
const openActivityChangeSheet = useCallback(() => setChangeSheetOpen(true), []);

// In JSX, the Default activity Row now reads:
<Row label="Default activity" detail={activityDetail} onPress={openActivityChangeSheet}/>
```

Keep the existing `tick`/`bumpTick` state — it is NOT activity-specific (per spec §8). Do NOT remove it.

- [ ] **Step 2: Render the change sheet at the bottom of the screen tree**

```jsx
<ActivityChangeSheet
  open={changeSheetOpen}
  current={activity}
  onSelect={(next) => { setDefaultActivity(next); setChangeSheetOpen(false); }}
  onClose={() => setChangeSheetOpen(false)}
/>
```

`ActivityChangeSheet` was created in **Phase 4 Task 4.2** (moved up because three surfaces consume it: FirstLaunchActivityPicker, Today's tappable activity-line, and this YouScreen Row). Import from `../components/ActivityChangeSheet`.

- [ ] **Step 3: Run YouScreen tests if present, then visual smoke**

Run: `cd apps/mobile && npx jest src/screens/__tests__/YouScreen` (if test file exists; otherwise skip), then `npx expo start --ios`.

Verify: Default activity Row shows current default; tap opens the change sheet (same sheet as Today-tap, by design); select a different activity dismisses the sheet and updates BOTH the YouScreen Row detail AND any consuming Today component (via useSyncExternalStore broadcast).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/screens/YouScreen.js
git commit -m "feat(YouScreen): rewire Default activity Row to useActivityPreference + ActivityChangeSheet"
```

---

## 🛑 Checkpoint 3 — Phase B cutover gate (manual go/no-go + KV counter)

**Stop here. Do not proceed to Phase 8 production deploy.**

Phase B is a breaking cutover (the Worker will start returning `400` on requests missing `?activity=`). The gate is intentionally manual + measured, NOT automated, because the stack has no app-analytics SDK (rollout % is read from store dashboards) and no log push (warn-rate is queried via the KV counter added in Task 2.6).

**Three signals must agree before Phase 8 deploys to production:**

### Signal 1 — Mobile rollout via store dashboards (manual review)

- App Store Connect → Analytics → App Versions: read the active-user share of the new mobile version vs the prior version.
- Google Play Console → Statistics → Active installs by version: same review.
- **Acceptance:** the new mobile version is the dominant active version on BOTH stores for ≥ 7 consecutive days.

No precise % threshold (the stores don't expose a single canonical "% on this version" — they show distributions). Visual dominance for ≥ 7 days is the gate.

### Signal 2 — Worker activity-missing rate via KV counter (queryable)

Use the Task 2.6 admin endpoint:

```bash
WORKER_URL=https://<production-worker-url> \
  ADMIN_TOKEN=<from wrangler secret> \
  npx tsx workers/api-proxy/scripts/query-activity-missing-rate.ts
```

Output is a per-day table from the last 14 days:

```
date         total       missing    ratio
2026-XX-01   123,456     42         0.034%
2026-XX-02   125,901     38         0.030%
...
```

- **Acceptance:** ratio < 0.5% for ≥ 3 consecutive days. (The 0.5% threshold mirrors spec §6 Hard-decision #5; the KV counter makes it queryable rather than sampled.)

If ratio is non-zero but trending down, identify the lagging mobile build via App Store / Play Store version histograms (Signal 1) and wait for further rollout before re-checking.

### Signal 3 — `wrangler tail` sanity sample (belt-and-suspenders)

Even with the KV counter, run a 30-minute `wrangler tail` sample during peak traffic to verify the counter values are believable:

```bash
cd workers/api-proxy && npx wrangler tail --env production --format=pretty
```

Count `[daily-note] activity missing` warn-line occurrences in the window. Cross-check against the KV counter for the same window (rough order of magnitude). If wildly divergent (e.g. tail shows 50 warns in 30 min but KV counter says 0/day), the KV write path is broken — investigate before proceeding.

### Phase A rollback readiness (mandatory before Phase 8 deploy)

Phase A (the optional + fallback shape from Tasks 2.2 / 2.4 / 2.5) MUST stay live in production through this checkpoint. The rollback path: revert the Phase 8 commit (Task 8.1) and redeploy. Operationally this is one `wrangler deploy --env production` away.

Before flipping Phase 8 to production:
1. Verify the Phase A code path is still on the `main` branch's previous commit (i.e. nothing has been force-pushed away).
2. Identify the exact prior deploy hash (`wrangler deployments list --env production` — find the immediately-prior version id).
3. Document the rollback command in this checkpoint sign-off note.
4. Keep the Phase A `daily-note-phase-a-fallback.test.ts` test green on a parallel branch in case rollback is needed.

If post-Phase 8 deploy a spike in 400s surfaces from a previously-undetected stale-client cohort, the rollback target is `wrangler rollback --message "Reverting Phase B; stale clients still on optional path"` against the prior version id from step 2.

### Sign-off

User signs off on:
- Signal 1 reviewed (date range, store dashboards screenshotted into checkpoint note).
- Signal 2 ratio < 0.5% × 3 days (KV counter output pasted into checkpoint note).
- Signal 3 wrangler tail sample numerically consistent (counts pasted).
- Phase A rollback command + prior version id documented.

Then Phase 8 may proceed.

### Note on Phase 9 timing

Phase 9 batch validation (split sampling per voice spec §12.4) can run on **staging during this checkpoint window** — it does NOT require Phase 8 (Phase B cutover) to land first. The asymmetry layer is exercised in Phase A. Running Phase 9 here surfaces composition bugs before the breaking Worker change ships, and provides the §12.4 evidence the astrologer review needs.

---

## Phase 8 — Backend Phase B cutover

### Task 8.1: Worker route requires `activity`, returns 400 on missing

**Files:**
- Modify: `workers/api-proxy/src/routes/daily-note.ts`
- Modify: `workers/api-proxy/src/routes/__tests__/daily-note-activity.test.ts` (Phase B tests)

- [ ] **Step 1: Flip the Zod schema**

Change `activity: ActivitySchema.optional()` → `activity: ActivitySchema` (required).

- [ ] **Step 2: Replace the fallback branch with a 400**

```ts
if (!result.success) {
  const missingActivity = result.error.issues.find((i) => i.path[0] === 'activity' && i.code === 'invalid_type');
  if (missingActivity) {
    return jsonError(400, { error: 'missing_activity' });
  }
  const invalidActivity = result.error.issues.find((i) => i.path[0] === 'activity');
  if (invalidActivity) {
    return jsonError(400, {
      error: 'invalid_activity',
      valid: ['wedding', 'contracts', 'business_launch', 'travel'],
    });
  }
  return jsonError(400, { error: 'invalid_request', issues: result.error.issues });
}
```

Remove the `console.warn('[daily-note] activity missing, defaulting to business_launch')` line and the `let activity = ...; if (activity === undefined) ...` substitution. Also remove the `wasActivityFallback` tracking from Task 2.4's composer call site (composer no longer needs the fallback flag — `activity` is always client-supplied now).

- [ ] **Step 3: Update tests**

In `daily-note-activity.test.ts`:
- Replace the Phase A "missing activity → 200 + warn + cached under business_launch" test with: "missing activity → 400 with `missing_activity` error".
- Remove the Phase A fallback test from `daily-note-phase-a-fallback.test.ts` (or convert it to assert the 400 path).

```ts
test('Phase B — missing activity → 400 with missing_activity error', async () => {
  const res = await handleDailyNote(makeReq('lat=50.45&lng=30.52&tz=Europe/Kyiv'), {/* env */});
  expect(res.status).toBe(400);
  const body = await res.json() as { error: string };
  expect(body.error).toBe('missing_activity');
});
```

- [ ] **Step 4: Run full Worker test suite — PASS**

Run: `cd workers/api-proxy && npx vitest run`

- [ ] **Step 5: Commit**

```bash
git add workers/api-proxy/src/routes/daily-note.ts workers/api-proxy/src/routes/__tests__/
git commit -m "feat(worker/daily-note): Phase B cutover — activity required, fallback removed"
```

---

### Task 8.2: Deploy + monitor

- [ ] **Step 1: Deploy Worker to staging**

Run: `cd workers/api-proxy && npx wrangler deploy --env staging`

- [ ] **Step 2: Smoke test staging**

```bash
# Should succeed (200)
curl 'https://<staging-worker-url>/daily-note?lat=50.45&lng=30.52&tz=Europe/Kyiv&activity=wedding'

# Should fail (400 missing_activity)
curl 'https://<staging-worker-url>/daily-note?lat=50.45&lng=30.52&tz=Europe/Kyiv'

# Should fail (400 invalid_activity)
curl 'https://<staging-worker-url>/daily-note?lat=50.45&lng=30.52&tz=Europe/Kyiv&activity=garbage'
```

- [ ] **Step 3: Monitor staging for 24h** — verify the fallback warn rate stays at 0 (no client should be sending activity-less requests by now if mobile rollout completed).

- [ ] **Step 4: Deploy to production**

Run: `cd workers/api-proxy && npx wrangler deploy --env production`

- [ ] **Step 5: Commit + tag**

```bash
git tag -a phase-b-cutover-2026-XX-XX -m "Worker /daily-note activity required (Phase B)"
git push --tags
```

---

## Phase 9 — Per-activity batch validation

### Task 9.1: Batch test script with Venus Rx 2026 fixture

**Files:**
- Create: `workers/api-proxy/scripts/activity-batch-validation.ts`

- [ ] **Step 1: Write the script**

```ts
// workers/api-proxy/scripts/activity-batch-validation.ts
// Usage: npx tsx workers/api-proxy/scripts/activity-batch-validation.ts
//
// Hits the Worker /daily-note endpoint for the 4 MVP activities across
// 3 sample categories per voice spec §12.4 split sampling rule:
//   1. Convergent (moon-dominated)
//   2. Divergent (significator-asymmetric)
//   3. Venus Rx mandatory (2026-10-15)

const WORKER = process.env.WORKER_URL ?? 'https://<staging-worker-url>';
const KYIV = { lat: 50.45, lng: 30.52, tz: 'Europe/Kyiv' };

const ACTIVITIES = ['wedding', 'contracts', 'business_launch', 'travel'] as const;

// Picker selects:
//   - Convergent: a moon-waxing-led day with no retrograde / VOC
//   - Divergent: dates known to surface Mercury Rx / Venus Rx / Moon VOC
const SAMPLES: { label: string; date: string; expect: 'convergent' | 'divergent' }[] = [
  { label: 'convergent — moon-dominated', date: '2026-06-15', expect: 'convergent' },
  { label: 'divergent — Mercury Rx',       date: '2026-08-20', expect: 'divergent' }, // adjust to actual Mercury Rx date in 2026
  { label: 'divergent — Moon VOC',         date: '2026-06-08', expect: 'divergent' }, // adjust to a known VOC date
  { label: 'mandatory — Venus Rx 2026',    date: '2026-10-15', expect: 'divergent' },
];

async function fetchAll(date: string): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  for (const a of ACTIVITIES) {
    const url = `${WORKER}/daily-note?lat=${KYIV.lat}&lng=${KYIV.lng}&tz=${encodeURIComponent(KYIV.tz)}&activity=${a}&date=${date}`;
    const res = await fetch(url);
    out[a] = await res.json();
  }
  return out;
}

function distinctHints(byActivity: Record<string, any>): Set<string | undefined> {
  return new Set(ACTIVITIES.map((a) => byActivity[a]?.response?.displayable?.severity_hint));
}

function identicalHeadlinesAndBodies(byActivity: Record<string, any>): boolean {
  const first = byActivity[ACTIVITIES[0]]?.response?.displayable;
  return ACTIVITIES.every((a) => {
    const d = byActivity[a]?.response?.displayable;
    return d?.headline === first?.headline && d?.body === first?.body;
  });
}

(async () => {
  let failures = 0;
  for (const sample of SAMPLES) {
    console.log(`\n## Sample: ${sample.label} (${sample.date})`);
    const byActivity = await fetchAll(sample.date);

    const identical = identicalHeadlinesAndBodies(byActivity);
    const hints = distinctHints(byActivity);
    console.log(`  headlines + bodies identical across 4 activities: ${identical}`);
    console.log(`  distinct severity_hint values: ${hints.size}`);

    if (sample.expect === 'convergent') {
      if (!identical) {
        console.error(`  ❌ FAIL: headlines/bodies should be identical on convergent day`);
        failures++;
      }
      if (hints.size > 1) {
        console.error(`  ❌ FAIL: NO severity_hint expected on convergent day`);
        failures++;
      }
    } else {
      if (!identical) {
        console.error(`  ❌ FAIL: headlines/bodies should be identical (activity-agnostic base)`);
        failures++;
      }
      if (hints.size < 2) {
        console.error(`  ❌ FAIL: severity_hint should differ across activities on divergent day`);
        failures++;
      }
      // Travel-as-tolerant check (Venus Rx + VOC only)
      const travelHint = byActivity.travel?.response?.displayable?.severity_hint ?? '';
      if (sample.label.includes('Venus Rx') || sample.label.includes('VOC')) {
        if (!/fine|less|tolerant|matters less/i.test(travelHint)) {
          console.error(`  ❌ FAIL: travel hint does NOT read tolerant: "${travelHint}"`);
          failures++;
        }
      }
    }

    for (const a of ACTIVITIES) {
      const hint = byActivity[a]?.response?.displayable?.severity_hint;
      console.log(`    ${a.padEnd(16)} — ${hint ?? '(no hint)'}`);
    }
  }
  console.log(`\n${failures === 0 ? '✅ ALL PASS' : `❌ ${failures} FAILURE(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
})();
```

- [ ] **Step 2: Confirm fixture dates**

Replace the placeholder dates (2026-08-20 Mercury Rx, 2026-06-08 Moon VOC) with the actual real dates from astrology-api.io. Run a one-off Postman / curl to identify them, then update the SAMPLES array.

- [ ] **Step 3: Commit**

```bash
git add workers/api-proxy/scripts/activity-batch-validation.ts
git commit -m "test(worker): add per-activity batch validation script (§12.4 split sampling)"
```

---

### Task 9.2: Run the batch + analyze output

- [ ] **Step 1: Run against staging**

```bash
WORKER_URL=https://<staging-worker-url> npx tsx workers/api-proxy/scripts/activity-batch-validation.ts
```

Expected output (PASS case):
- Sample 1 (convergent): 4 identical headlines + bodies, no severity_hint shown.
- Sample 2 (Mercury Rx): 4 identical headlines + bodies, 4 distinct severity_hints, travel reads less severe than contracts.
- Sample 3 (Moon VOC): 4 identical headlines + bodies, 4 distinct severity_hints, travel hint matches `/fine|less|matters less/`.
- Sample 4 (Venus Rx 2026): 4 distinct severity_hints, travel hint matches `/fine|less|matters less/`.

Exit code 0 → PASS. Exit code 1 → at least one assertion failed.

- [ ] **Step 2: If FAIL → stop and debug (Checkpoint 2 trigger)**

The most common failure: travel surfaces the same severity hint as wedding on a Venus-Rx day, indicating the asymmetry layer is not wired through. Trace back: composer (Task 2.4) → severity-hints dictionary lookup (Task 2.1) → activity routing in the route handler (Task 2.2).

- [ ] **Step 3: Commit the batch output as evidence**

Save the run output to `docs/superpowers/expert/2026-XX-XX-activity-batch-results.md` and commit. This becomes the artifact reviewed in Checkpoint 2.

```bash
git add docs/superpowers/expert/2026-XX-XX-activity-batch-results.md
git commit -m "test(worker): record activity batch validation results"
```

---

## 🛑 Checkpoint 2 — Batch reality check

**Surface to the user:**
1. The batch script output (PASS / FAIL per sample).
2. The travel-as-tolerant assertion result for Venus Rx and Moon VOC.
3. Distinct-hint counts across activities on divergent days.

**Acceptance criterion:** All 4 samples PASS, travel reads tolerant on Venus Rx + Moon VOC, distinct hints on all divergent samples.

**If any sample fails:** STOP. The asymmetry layer is not actually wired. Debug per Task 9.2 Step 2. Do not declare the feature complete.

**If all samples pass:** the feature is functionally complete. Astrologer review of the 16 strings (12 confirmed + 4 pending intraday) happens as the parallel CLAUDE.md Translation Layer review per §11.4 of the voice spec.

---

## Self-review checklist (writer, revised after 2026-06-02 user review)

- **Spec coverage:** All 13 sections of the feature spec are mapped to phases. EC-1..EC-13 are referenced by spec section in each relevant task. Decision log D1..D22 traced through task content (D2 canonical Activity → Task 1.1/1.2 imports; D3 rescue → Phase 2 + voice spec amendments; D6 storage key → Task 1.1; D7 module pattern → Task 1.1; D8 trinary → Task 1.1 tests; D9 reactive read → Task 3.2; **D11 telemetry → Tasks 2.2 + 2.5 + 2.6 (KV counter added per user decision 4)**; D12 cache key → Task 2.3; D13 phased migration → Phase 2 + Phase 8; D17 thin ActivityOption → Task 4.1; D19 canonical + scaffold migrate → Tasks 1.2 + 1.4; D20 mount discipline → Task 3.2 enabled gate; D21 keep both keys → Tasks 4.3 + 7.1).

- **Decision 1 (Path B — Today-tap IN):** Phase 4 now contains 4 tasks (4.1 ActivityOption, 4.2 ActivityChangeSheet [moved up from old 7.2], 4.3 FirstLaunchActivityPicker, 4.4 SCREENS registration). Phase 5 Task 5.1 restructured for separate tappable activity-line (`ActivityLine` component) + chevron + a11y label + 44pt touch target. `ACTIVITY_EYEBROW_PHRASES` drafted in Task 1.2 and referenced in voice spec §3.5 amendment. Phase 7 reduced to 1 task (ActivityChangeSheet now lives in Phase 4).

- **Decision 2 (Path A — preselect spec is correct):** No plan or spec change. Task 4.3 `FirstLaunchActivityPicker` continues to read `getLastActivity() ?? null` (no preselect on truly fresh install, courtesy preselect on migration case, Continue gated on selection). Matches spec §4 + §10 + EC-2 verbatim.

- **Decision 3 (ACTIVITY_MIGRATIONS re-add):** Task 1.1 module shape includes `ACTIVITY_MIGRATIONS: Record<string, Activity>` (empty for MVP) + `migrateOrInvalid` helper (try schema → try map → undefined) + persist-on-migrate path in `initActivityPreference`. Task 1.1 Step 1 tests cover the helper's contract and the no-rewrite-on-canonical-name behavior. Spec §3 + EC-6 receive a parallel ~2-line note in spec-edits below.

- **Decision 4 (Checkpoint 3 manual + KV counter):** Checkpoint 3 block fully rewritten. Three signals (store dashboards, KV counter, wrangler tail), Phase A rollback readiness mandatory, explicit user sign-off. New Task 2.6 implements the Worker-side KV counter (`metrics:dn-total:{date}` + `metrics:dn-activity-missing:{date}` with 14-day TTL) and a CLI query script for gate verification.

- **Out-of-scope guard:** No task touches `NoViableScreen.js`, `MomentDetailScreen.js`, `CalendarScreen.js` (EC-12 cleanup deferred). No PreferencesContext (D18 deferred). No Sentry. No deep link. Decision 1's ActivityChangeSheet share across Today + Settings is NOT a context consolidation — it's one component consumed in two places via prop-passing, which is exactly the share-without-context pattern.

- **Placeholder scan:** Reviewed. Concrete code blocks in every implementation step. Tasks 5.1 + 5.2 + 7.1 leave the daily-note hero component filename "to locate via grep" — a real instruction, not a placeholder. Task 2.6 Step 5 defers the admin-endpoint + CLI implementation detail to executor (design is fully specified; the actual route file + auth wiring follows existing Worker conventions).

- **Type consistency:** `Activity` type imported from `@inceptio/shared-types` in every consumer. `useActivityPreference()` returns the same `{ hydrationStatus, activity }` shape throughout. `severity_hint` field name consistent across Zod schema, Worker composer, mobile decoder, and rendering component. `setDefaultActivity` / `getDefaultActivitySync` / `initActivityPreference` / `migrateOrInvalid` / `ACTIVITY_MIGRATIONS` signatures match between module definition (Task 1.1) and consumer call sites. `ActivityOption` props `{ activity, selected, onPress }` are identical at THREE consumers (Task 4.2 `ActivityChangeSheet` interior, Task 4.3 `FirstLaunchActivityPicker`, and transitively wherever `ActivityChangeSheet` is rendered). `ActivityChangeSheet` props `{ open, current, onSelect, onClose }` are identical at its TWO consumers (Task 5.1 `ActivityLine` → `DailyHero`, Task 7.1 `YouScreen`). `ActivityChangeSheet` is NOT consumed by `FirstLaunchActivityPicker` — first-launch is a mandatory non-dismissible gate (D14) that renders `ActivityOption` directly. `ActivityLine` props `{ activity, onPress }` are stable in Task 5.1 between component + integration. `ACTIVITY_EYEBROW_PHRASES` keys match the `Activity` enum's 4 members.

- **Checkpoint placement:** Checkpoint 1 after Phase 1 + canary (architectural commitment). Checkpoint 3 after Phase 7 + before Phase 8 (manual + KV-counter gate, three signals, rollback ready). Checkpoint 2 after Phase 9 (batch reality check). All three present as STOP gates.

- **TDD discipline:** Every implementation task includes "write failing test" → "run failing" → "implement" → "run passing" → "commit". Worker tasks use Vitest; mobile tasks use Jest. New tasks (Task 2.6 KV counter, Task 4.2 ActivityChangeSheet shared, Task 5.1 ActivityLine) all include failing-test-first steps.

- **Frequent commits:** Every task closes with a `git commit` step. Granular commits, not "WIP" mega-commits.

- **Task count reconciliation:** 4 (Phase 1) + 6 (Phase 2, +1 KV counter) + 3 (Phase 3) + 4 (Phase 4, +1 ActivityChangeSheet moved up) + 3 (Phase 5) + 2 (Phase 6) + 1 (Phase 7, −1 ActivityChangeSheet moved out) + 2 (Phase 8) + 2 (Phase 9) = **27 tasks**.

---

*End of plan. Implementation halts at plan landing per user override of the writing-plans skill's execution-handoff offer. User reviews plan before approving execution dispatch.*
