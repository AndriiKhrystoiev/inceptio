# In-App Rating Prompt — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ask genuinely-delighted users to rate Inceptio via the native in-app review API, gated by a pure, unit-testable eligibility policy, with a separate always-available Settings feedback channel.

**Architecture:** A pure `evaluateRatingEligibility(event, context, history, config, now) → {shouldAttempt, reason}` function (zero deps, Node-testable) wrapped by an impure shell: an AsyncStorage-backed `rating-store` (counters + cooldowns + idempotency), a thin `store-review` wrapper over `expo-store-review` (real native calls), and two fire-and-forget trigger functions wired into existing screens. A new Settings "Support" section adds `mailto:` feedback + a manual store-listing link.

**Tech Stack:** Expo SDK 55, React Native 0.83, TypeScript strict, `expo-store-review` (new), `@react-native-async-storage/async-storage` (existing `storage.ts` wrapper), `expo-clipboard` (existing), Vitest (Node env).

**Source-of-truth spec:** `docs/superpowers/specs/2026-06-09-app-rating-prompt-design.md`
**Design-constraint audits:** archaeology `docs/superpowers/expert/2026-06-09-app-rating-archaeology.md` · domain `docs/superpowers/expert/2026-06-09-app-rating-domain.md` · library `docs/superpowers/library-audit/2026-06-09-app-rating.md`

**Locked owner decisions:** `emailSubject` = plumbing constant (English + locale tag, NOT a chrome key); floor = ≥2 distinct days. Store-listing URLs + support email are `// TODO(launch)` placeholder constants (two-string swap at launch; Row 2 degrades gracefully until set).

> **⚠️ One deviation to surface (not in the locked spec):** the brainstorm locked **3** chrome keys (`support.title/feedback/rate`). This plan adds a **4th** — `support.emailCopied` — for the clipboard-fallback confirmation toast (a genuine user-facing string the brainstorm didn't enumerate). It is translated in all 5 locales, so the allowlist stays at 0. Flagged for owner; trivial to drop if rejected (replace the toast with the existing `toast.copyFailed` path or remove the toast).

---

## File structure

**New files (all under `apps/mobile/src/lib/rating/`):**
- `eligibility.ts` — PURE: types, `RATING_CONFIG`, `evaluateRatingEligibility`. No I/O, no native, no `Date.now`.
- `launch-constants.ts` — `// TODO(launch)` store URLs + support email + `buildEmailSubject()`.
- `rating-store.ts` — `rating.*` storage I/O, 4 recorders, `oncePerKey` dedupe, `searchKeyOf`, `resetRatingState`.
- `store-review.ts` — `expo-store-review` wrapper (real calls), `openStoreListing`, `openFeedback`, dev force-card.
- `prompt-triggers.ts` — `maybePromptAfterSave`, `maybePromptAfterView`, `debugEvaluate`.
- `__tests__/eligibility.test.ts`, `__tests__/rating-store.test.ts`, `__tests__/prompt-triggers.test.ts` — Node golden/unit tests.

**Modified files:**
- `apps/mobile/package.json` — `+ expo-store-review`.
- `apps/mobile/App.js:113-130` — `recordActiveDay()` after hydrate.
- `apps/mobile/src/screens/MomentDetailScreen.js:181-196` — save trigger.
- `apps/mobile/src/screens/CalendarScreen.js:~200` — view trigger (effect).
- `apps/mobile/src/screens/LoadingScreen.js:63-71` + new error effect — recorders.
- `apps/mobile/src/screens/YouScreen.js` — Support section (2 rows) + 3 Debug rows.
- `apps/mobile/src/locales/{en,de,fr,es-419,pt-BR}/settings.json` — 4 `support.*` keys.
- `apps/mobile/src/i18n/__tests__/settings-coverage.test.ts:23-58` — add 4 keys to the core-keys list.

**Commands (run from `apps/mobile`, which is standalone — NOT an npm workspace):**
- Unit test one file: `cd apps/mobile && npx vitest run <relative/path.test.ts>`
- All mobile tests: `cd apps/mobile && npm test`
- Typecheck: `cd apps/mobile && npx tsc --noEmit` (NOTE: a **pre-existing** `cluster-windows.ts:108` TS2345 error is expected — not introduced by this work; do not "fix" it.)

---

## Task 0: Install expo-store-review

**Files:** Modify `apps/mobile/package.json` (+ lockfile)

- [ ] **Step 1: Install the SDK-pinned version**

Run: `cd apps/mobile && npx expo install expo-store-review`
Expected: adds `"expo-store-review": "~55.0.x"` to dependencies. **Do NOT** use `npm i expo-store-review` — that pulls `56.0.3` (SDK 56) and mismatches.

- [ ] **Step 2: Verify it resolves**

Run: `cd apps/mobile && node -e "console.log(require('expo-store-review/package.json').version)"`
Expected: prints a `55.0.x` version string.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/package.json apps/mobile/package-lock.json
git commit -m "build(mobile): add expo-store-review (SDK 55) for in-app review"
```

> **LG4 note for the executor:** `expo-store-review` is a native module. A **dev-client rebuild** (`expo run:ios` / `expo run:android`) is required before the native card or `isAvailableAsync()` behaves on-device. It will NOT hot-reload. Pure-logic tasks (1–6) need no rebuild.

---

## Task 1: launch-constants.ts (placeholders + email subject)

**Files:**
- Create: `apps/mobile/src/lib/rating/launch-constants.ts`

- [ ] **Step 1: Write the constants module**

```ts
// Launch-swappable constants for the rating feature. Everything here is either
// a store-account-dependent placeholder (swap at launch) or the email-subject
// plumbing constant (owner decision 2026-06-09: NOT a chrome key).

import { activeBundle } from '../../i18n/locale';

// TODO(launch): real App Store ID. Until set, StoreReview.storeUrl() returns
// null and Row 2 falls through to this, then to the web URL. Two-string swap;
// no logic change. See spec §7 D8 Row 2 + library audit.
export const IOS_APP_STORE_URL = 'https://apps.apple.com/app/id000000000';

// TODO(launch): real Play package name (applicationId).
export const ANDROID_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=app.inceptio.placeholder';

// Final browser fallback — always openable, so Row 2 never dead-ends.
export const WEB_STORE_URL = 'https://inceptio.app';

// TODO(launch): owner-supplied support address. NOT store-gated — can be a real
// inbox now for testing. Placeholder until owner supplies the real value.
export const SUPPORT_EMAIL = 'support@inceptio.app';

// emailSubject strategy (a) — plumbing constant: English + resolved-app-locale
// tag (e.g. "Inceptio feedback (de)") for solo-dev inbox triage. Deliberately
// NOT a chrome key — the user never sees it as UI, only as a mail subject.
export function buildEmailSubject(): string {
  return `Inceptio feedback (${activeBundle()})`;
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no NEW errors (the pre-existing `cluster-windows.ts:108` error may appear — ignore it).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/lib/rating/launch-constants.ts
git commit -m "feat(rating): launch-swappable store URLs + support email + subject"
```

---

## Task 2: eligibility.ts (the pure policy) + golden tests

**Files:**
- Create: `apps/mobile/src/lib/rating/eligibility.ts`
- Test: `apps/mobile/src/lib/rating/__tests__/eligibility.test.ts`

- [ ] **Step 1: Write the failing golden-table test**

```ts
import { describe, it, expect } from 'vitest';
import {
  evaluateRatingEligibility,
  RATING_CONFIG,
  type RatingHistory,
  type TriggerEvent,
  type RatingContext,
} from '../eligibility';

const NOW = new Date('2026-06-09T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString();

// A history that passes every guard — start here and break one thing per case.
const HEALTHY: RatingHistory = {
  distinctDayCount: 5,
  successfulSearches: 5,
  lastAttemptAt: null,
  attemptsInWindow: [],
  lastFrustrationAt: null,
};
const SAVE: TriggerEvent = { kind: 'qualifying_save', grade: 'exceptional', isFirstEverSave: false };

function evl(over: Partial<{
  event: TriggerEvent; context: RatingContext; history: RatingHistory;
}> = {}) {
  return evaluateRatingEligibility({
    event: over.event ?? SAVE,
    context: over.context ?? 'moment_detail',
    history: over.history ?? HEALTHY,
    config: RATING_CONFIG,
    now: NOW,
  });
}

describe('evaluateRatingEligibility — one row per reason', () => {
  it('eligible: healthy save passes (null cooldown fields do not throw)', () => {
    expect(evl()).toEqual({ shouldAttempt: true, reason: 'eligible' });
  });

  it('suppressed_context: every suppressed surface short-circuits first', () => {
    for (const c of ['no_viable', 'rate_limited', 'upstream_quota', 'error', 'empty', 'paywall', 'onboarding', 'mid_flow'] as RatingContext[]) {
      expect(evl({ context: c })).toEqual({ shouldAttempt: false, reason: 'suppressed_context' });
    }
  });

  it('below_grade_cut: fair/caution/poor never qualify; good/strong/exceptional do', () => {
    for (const g of ['fair', 'caution', 'poor'] as const) {
      expect(evl({ event: { kind: 'qualifying_view', grade: g } }).reason).toBe('below_grade_cut');
    }
    for (const g of ['good', 'strong', 'exceptional'] as const) {
      expect(evl({ event: { kind: 'qualifying_view', grade: g } }).shouldAttempt).toBe(true);
    }
  });

  it('first_ever_save: the very first save never prompts even if exceptional', () => {
    expect(evl({ event: { kind: 'qualifying_save', grade: 'exceptional', isFirstEverSave: true } }))
      .toEqual({ shouldAttempt: false, reason: 'first_ever_save' });
  });

  it('below_floor: needs >=2 distinct days AND >=2 searches (boundary = eligible)', () => {
    expect(evl({ history: { ...HEALTHY, distinctDayCount: 1 } }).reason).toBe('below_floor');
    expect(evl({ history: { ...HEALTHY, successfulSearches: 1 } }).reason).toBe('below_floor');
    expect(evl({ history: { ...HEALTHY, distinctDayCount: 2, successfulSearches: 2 } }).shouldAttempt).toBe(true);
  });

  it('frustration_cooldown: 14d window, exact threshold is eligible (< guard)', () => {
    expect(evl({ history: { ...HEALTHY, lastFrustrationAt: daysAgo(13) } }).reason).toBe('frustration_cooldown');
    expect(evl({ history: { ...HEALTHY, lastFrustrationAt: daysAgo(14) } }).shouldAttempt).toBe(true);
  });

  it('attempt_cooldown: 90d window, exact threshold is eligible', () => {
    expect(evl({ history: { ...HEALTHY, lastAttemptAt: daysAgo(89), attemptsInWindow: [daysAgo(89)] } }).reason).toBe('attempt_cooldown');
    expect(evl({ history: { ...HEALTHY, lastAttemptAt: daysAgo(90), attemptsInWindow: [daysAgo(90)] } }).shouldAttempt).toBe(true);
  });

  it('max_attempts_reached: 2 attempts in window blocks even past the cooldown', () => {
    expect(evl({ history: { ...HEALTHY, lastAttemptAt: daysAgo(120), attemptsInWindow: [daysAgo(120), daysAgo(200)] } }))
      .toEqual({ shouldAttempt: false, reason: 'max_attempts_reached' });
  });

  it('EC6 backward clock skew: a future timestamp suppresses, never enables', () => {
    expect(evl({ history: { ...HEALTHY, lastFrustrationAt: daysAhead(5) } }).reason).toBe('frustration_cooldown');
    expect(evl({ history: { ...HEALTHY, lastAttemptAt: daysAhead(5), attemptsInWindow: [daysAhead(5)] } }).reason).toBe('attempt_cooldown');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/mobile && npx vitest run src/lib/rating/__tests__/eligibility.test.ts`
Expected: FAIL — `Cannot find module '../eligibility'`.

- [ ] **Step 3: Implement the pure function**

```ts
// Pure rating-eligibility policy. Imports nothing native, touches no storage,
// never reads the clock (now is injected). This is the only file the golden
// tests need — and the only file that defines WHEN we may ask for a review.

export type Grade = 'exceptional' | 'strong' | 'good' | 'fair' | 'caution' | 'poor';

export type TriggerEvent =
  | { kind: 'qualifying_save'; grade: Grade; isFirstEverSave: boolean }
  | { kind: 'qualifying_view'; grade: Grade };

export type RatingContext =
  | 'result_view' | 'moment_detail'                 // valid fire surfaces
  | 'no_viable' | 'rate_limited' | 'upstream_quota'
  | 'error' | 'empty' | 'paywall' | 'onboarding' | 'mid_flow';  // suppressed

export type RatingHistory = {
  distinctDayCount: number;
  successfulSearches: number;
  lastAttemptAt: string | null;        // ISO
  attemptsInWindow: string[];          // ISO list; the shell pre-prunes to 365d
  lastFrustrationAt: string | null;    // ISO
};

export type RatingConfig = {
  qualifyingGrades: Grade[];
  minDistinctDays: number;
  minSuccessfulSearches: number;
  minDaysBetweenAttempts: number;
  maxAttemptsPer365d: number;
  frustrationCooldownDays: number;
};

export const RATING_CONFIG: RatingConfig = {
  qualifyingGrades: ['exceptional', 'strong', 'good'],
  minDistinctDays: 2,
  minSuccessfulSearches: 2,
  minDaysBetweenAttempts: 90,
  maxAttemptsPer365d: 2,
  frustrationCooldownDays: 14,
};

export type EligibilityReason =
  | 'eligible' | 'suppressed_context' | 'below_grade_cut'
  | 'first_ever_save' | 'below_floor' | 'frustration_cooldown'
  | 'attempt_cooldown' | 'max_attempts_reached';

export type EligibilityDecision = { shouldAttempt: boolean; reason: EligibilityReason };

const SUPPRESSED: ReadonlySet<RatingContext> = new Set([
  'no_viable', 'rate_limited', 'upstream_quota', 'error', 'empty',
  'paywall', 'onboarding', 'mid_flow',
]);

const MS_PER_DAY = 86_400_000;

// Elapsed days between an instant and a stored ISO timestamp. Native Date math
// (date-fns is NOT installed). NOT a calendar-day diff — see spec §5/§6 BUG-001
// discipline. A future stored timestamp yields a NEGATIVE result, which every
// `< cooldown` guard reads as "still cooling down" → suppress (EC6).
function elapsedDays(now: Date, storedIso: string): number {
  return (now.getTime() - new Date(storedIso).getTime()) / MS_PER_DAY;
}

export function evaluateRatingEligibility(input: {
  event: TriggerEvent;
  context: RatingContext;
  history: RatingHistory;
  config: RatingConfig;
  now: Date;
}): EligibilityDecision {
  const { event, context, history, config, now } = input;

  if (SUPPRESSED.has(context)) {
    return { shouldAttempt: false, reason: 'suppressed_context' };
  }
  if (!config.qualifyingGrades.includes(event.grade)) {
    return { shouldAttempt: false, reason: 'below_grade_cut' };
  }
  if (event.kind === 'qualifying_save' && event.isFirstEverSave) {
    return { shouldAttempt: false, reason: 'first_ever_save' };
  }
  if (
    history.distinctDayCount < config.minDistinctDays ||
    history.successfulSearches < config.minSuccessfulSearches
  ) {
    return { shouldAttempt: false, reason: 'below_floor' };
  }
  if (
    history.lastFrustrationAt !== null &&
    elapsedDays(now, history.lastFrustrationAt) < config.frustrationCooldownDays
  ) {
    return { shouldAttempt: false, reason: 'frustration_cooldown' };
  }
  if (
    history.lastAttemptAt !== null &&
    elapsedDays(now, history.lastAttemptAt) < config.minDaysBetweenAttempts
  ) {
    return { shouldAttempt: false, reason: 'attempt_cooldown' };
  }
  if (history.attemptsInWindow.length >= config.maxAttemptsPer365d) {
    return { shouldAttempt: false, reason: 'max_attempts_reached' };
  }
  return { shouldAttempt: true, reason: 'eligible' };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/mobile && npx vitest run src/lib/rating/__tests__/eligibility.test.ts`
Expected: PASS — all cases green.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/rating/eligibility.ts apps/mobile/src/lib/rating/__tests__/eligibility.test.ts
git commit -m "feat(rating): pure eligibility policy + golden table (one row per reason)"
```

---

## Task 3: rating-store.ts (storage I/O, recorders, dedupe) + tests

**Files:**
- Create: `apps/mobile/src/lib/rating/rating-store.ts`
- Test: `apps/mobile/src/lib/rating/__tests__/rating-store.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mirror the activity-preference.test.ts pattern: an in-memory Map standing in
// for storage.ts's synchronous cache. Path resolves to src/lib/storage.
const memory = new Map<string, string>();
vi.mock('../../storage', () => ({
  storage: {
    getString: (k: string) => memory.get(k),
    set: (k: string, v: string) => { memory.set(k, v); },
    delete: (k: string) => { memory.delete(k); },
  },
}));

import {
  localDayKey, pruneAttempts, loadHistory, isFirstEverSave,
  recordActiveDay, recordSuccessfulSearch, recordFrustration,
  recordFirstSaveDone, recordAttempt, resetRatingState,
  oncePerKey, searchKeyOf, __resetRatingDedupeForTests,
} from '../rating-store';

const NOW = new Date('2026-06-09T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

beforeEach(() => { memory.clear(); __resetRatingDedupeForTests(); });

describe('rating-store', () => {
  it('localDayKey: device-local YYYY-MM-DD', () => {
    expect(localDayKey(new Date(2026, 5, 9))).toBe('2026-06-09'); // local components → stable
  });

  it('pruneAttempts: drops entries older than the 365d window', () => {
    const kept = pruneAttempts([daysAgo(10), daysAgo(400)], NOW);
    expect(kept).toEqual([daysAgo(10)]);
  });

  it('recordActiveDay: increments once per NEW local day only', () => {
    recordActiveDay(new Date(2026, 5, 8));
    recordActiveDay(new Date(2026, 5, 8)); // same day → no-op
    recordActiveDay(new Date(2026, 5, 9)); // new day → +1
    expect(loadHistory(NOW).distinctDayCount).toBe(2);
  });

  it('recordSuccessfulSearch / recordFrustration / first-save reflected in history', () => {
    recordSuccessfulSearch();
    recordSuccessfulSearch();
    recordFrustration(NOW);
    expect(loadHistory(NOW).successfulSearches).toBe(2);
    expect(loadHistory(NOW).lastFrustrationAt).toBe(NOW.toISOString());
  });

  it('isFirstEverSave: true until recorded, false after', () => {
    expect(isFirstEverSave()).toBe(true);
    recordFirstSaveDone();
    expect(isFirstEverSave()).toBe(false);
  });

  it('recordAttempt: sets lastAttemptAt, appends, and prunes >365d', () => {
    memory.set('rating.attemptsInWindow', JSON.stringify([daysAgo(400)]));
    recordAttempt(NOW);
    const h = loadHistory(NOW);
    expect(h.lastAttemptAt).toBe(NOW.toISOString());
    expect(h.attemptsInWindow).toEqual([NOW.toISOString()]); // old entry pruned
  });

  it('oncePerKey: dedupes consecutive identical keys, allows new ones', () => {
    expect(oncePerKey('b', 'k1')).toBe(true);
    expect(oncePerKey('b', 'k1')).toBe(false);
    expect(oncePerKey('b', 'k2')).toBe(true);
  });

  it('searchKeyOf: deterministic from request identity', () => {
    const r = { activity: 'wedding', start: '2026-06-09', end: '2026-07-09', lat: 50.4, lng: 30.5 };
    expect(searchKeyOf(r)).toBe(searchKeyOf({ ...r }));
  });

  it('resetRatingState: clears all rating.* keys', () => {
    recordSuccessfulSearch();
    recordFirstSaveDone();
    resetRatingState();
    expect(loadHistory(NOW).successfulSearches).toBe(0);
    expect(isFirstEverSave()).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/mobile && npx vitest run src/lib/rating/__tests__/rating-store.test.ts`
Expected: FAIL — `Cannot find module '../rating-store'`.

- [ ] **Step 3: Implement the store**

```ts
// Impure shell around storage.ts for the rating feature. All rating.* keys live
// here. storage.ts updates its in-memory cache SYNCHRONOUSLY on set() (verified
// storage.ts:36-51), so a write is visible to the next read in the same tick —
// that is what makes per-session attempt dedup work without a separate guard.

import { storage } from '../storage';
import type { RatingHistory } from './eligibility';

const K = {
  distinctDayCount: 'rating.distinctDayCount',
  lastActiveDay: 'rating.lastActiveDay',
  successfulSearches: 'rating.successfulSearches',
  firstSaveDone: 'rating.firstSaveDone',
  lastAttemptAt: 'rating.lastAttemptAt',
  attemptsInWindow: 'rating.attemptsInWindow',
  lastFrustrationAt: 'rating.lastFrustrationAt',
} as const;

const MS_PER_DAY = 86_400_000;

function getInt(key: string): number {
  const raw = storage.getString(key);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}
function setInt(key: string, n: number): void { storage.set(key, String(n)); }
function getStr(key: string): string | null { return storage.getString(key) ?? null; }
function getIsoArray(key: string): string[] {
  const raw = storage.getString(key);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
}

/** Device-local calendar day key. Device-local is the correct frame for
 *  "was the user active today" (spec §5 — NOT event-tz, no BUG-001 hazard). */
export function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Drop attempt timestamps older than the rolling window (default 365d). */
export function pruneAttempts(attempts: string[], now: Date, windowDays = 365): string[] {
  const cutoff = now.getTime() - windowDays * MS_PER_DAY;
  return attempts.filter((iso) => {
    const t = new Date(iso).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });
}

/** Read the full history the pure fn needs, pruning the attempt window first. */
export function loadHistory(now: Date): RatingHistory {
  return {
    distinctDayCount: getInt(K.distinctDayCount),
    successfulSearches: getInt(K.successfulSearches),
    lastAttemptAt: getStr(K.lastAttemptAt),
    attemptsInWindow: pruneAttempts(getIsoArray(K.attemptsInWindow), now),
    lastFrustrationAt: getStr(K.lastFrustrationAt),
  };
}

export function isFirstEverSave(): boolean {
  return storage.getString(K.firstSaveDone) !== '1';
}

// ── Recorders ──────────────────────────────────────────────────────────────

/** Bump the distinct-day counter once per new device-local day. */
export function recordActiveDay(now: Date = new Date()): void {
  const today = localDayKey(now);
  if (storage.getString(K.lastActiveDay) === today) return;
  storage.set(K.lastActiveDay, today);
  setInt(K.distinctDayCount, getInt(K.distinctDayCount) + 1);
}

export function recordSuccessfulSearch(): void {
  setInt(K.successfulSearches, getInt(K.successfulSearches) + 1);
}

/** Write a frustration instant (429 / upstream-quota / no_viable / error /
 *  feedback tap). Suppresses the next positive prompt for the cooldown. */
export function recordFrustration(now: Date = new Date()): void {
  storage.set(K.lastFrustrationAt, now.toISOString());
}

export function recordFirstSaveDone(): void {
  storage.set(K.firstSaveDone, '1');
}

/** Record OUR requestReview call (not a card-show — that is unknowable). */
export function recordAttempt(now: Date = new Date()): void {
  storage.set(K.lastAttemptAt, now.toISOString());
  const next = pruneAttempts(getIsoArray(K.attemptsInWindow), now);
  next.push(now.toISOString());
  storage.set(K.attemptsInWindow, JSON.stringify(next));
}

/** Dev-only: wipe every rating.* key (Debug "Reset rating state"). */
export function resetRatingState(): void {
  for (const key of Object.values(K)) storage.delete(key);
}

// ── Idempotency (EC10) — guards effect re-fires on cache-hit remounts ────────
// Module-scoped, so it survives screen remounts within a session (a useRef
// would not). Last-key-per-bucket: dedupes consecutive identical keys, allows a
// genuinely new search to record again.

const _lastKey: Record<string, string | undefined> = {};
export function oncePerKey(bucket: string, key: string): boolean {
  if (key && _lastKey[bucket] === key) return false;
  _lastKey[bucket] = key;
  return true;
}
export function __resetRatingDedupeForTests(): void {
  for (const k of Object.keys(_lastKey)) delete _lastKey[k];
}

/** Stable identity for one search (mirrors the React Query key fields). */
export function searchKeyOf(req: {
  activity?: string; start?: string; end?: string; lat?: number; lng?: number;
}): string {
  return [req.activity, req.start, req.end, req.lat, req.lng].join('|');
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/mobile && npx vitest run src/lib/rating/__tests__/rating-store.test.ts`
Expected: PASS — all cases green.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/rating/rating-store.ts apps/mobile/src/lib/rating/__tests__/rating-store.test.ts
git commit -m "feat(rating): storage-backed counters, recorders, dedupe + unit tests"
```

---

## Task 4: store-review.ts (native wrapper — real expo-store-review)

**Files:**
- Create: `apps/mobile/src/lib/rating/store-review.ts`

No Node unit test — this file imports native modules (`expo-store-review`) and is exercised by the on-device launch smoke (LG1). Keep it thin so all testable logic lives in the pure layers.

- [ ] **Step 1: Write the wrapper**

```ts
// Thin wrapper over the native review API + the manual store/feedback links.
// The ONLY file that imports expo-store-review. Fire-and-forget, read-only
// against the OS (no outcome detection). Native module → needs a dev-client
// rebuild (LG4); does nothing meaningful in plain Expo Go / sideloaded Android.

import * as StoreReview from 'expo-store-review';
import { Linking, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { activeBundle } from '../../i18n/locale';
import { recordAttempt } from './rating-store';
import {
  SUPPORT_EMAIL, IOS_APP_STORE_URL, ANDROID_PLAY_STORE_URL, WEB_STORE_URL,
  buildEmailSubject,
} from './launch-constants';

/**
 * Best-effort native review card. Records our attempt ONLY when we actually
 * call requestReview — when the store is unavailable we no-op and burn no
 * attempt slot (EC1). Never inspects whether the card showed or was acted on.
 */
export async function attemptNativeReview(now: Date = new Date()): Promise<void> {
  try {
    const available = await StoreReview.isAvailableAsync();
    if (!available) return;            // EC1 — degrade to the Settings link only
    recordAttempt(now);                // count OUR call (bookkeeping, not outcome)
    await StoreReview.requestReview();
  } catch {
    // EC8 — swallow; if we recorded an attempt it stands (we did attempt).
  }
}

/** iOS deep-links to the write-review sheet; storeUrl() returns the plain
 *  listing, so append the action param (domain audit refinement). */
function withWriteReview(url: string): string {
  if (Platform.OS !== 'ios') return url;
  return url.includes('?') ? `${url}&action=write-review` : `${url}?action=write-review`;
}

/**
 * User-initiated "Rate Inceptio". Opens the store LISTING — never calls
 * requestReview (Apple forbids button-triggered requestReview). Layered
 * fallback: SDK storeUrl() → hardcoded native URL → web URL. storeUrl() is null
 * until the owner sets ios.appStoreUrl / android.playStoreUrl (library audit),
 * so the fallback chain is required, not optional.
 */
export async function openStoreListing(): Promise<void> {
  const sdkUrl = StoreReview.storeUrl(); // string | null
  const native = Platform.OS === 'ios' ? IOS_APP_STORE_URL : ANDROID_PLAY_STORE_URL;
  const candidates = [
    sdkUrl ? withWriteReview(sdkUrl) : null,
    withWriteReview(native),
    WEB_STORE_URL,
  ].filter((u): u is string => typeof u === 'string');

  for (const url of candidates) {
    try {
      if (await Linking.canOpenURL(url)) { await Linking.openURL(url); return; }
    } catch { /* try the next candidate */ }
  }
  // All candidates failed (extremely unlikely — web URL is always openable):
  // soft no-op, never throw.
}

function diagnosticFooter(): string {
  // Non-sensitive only: app version / OS / resolved app-locale. No IDs, no
  // saved-moment data (spec §7 D8 Row 1).
  const v = Constants.expoConfig?.version ?? '0.0.0';
  return `\n\n—\nApp ${v} · ${Platform.OS} ${String(Platform.Version)} · ${activeBundle()}`;
}

/**
 * "Send feedback". Opens the mail composer; if no mail client, copies the
 * address to the clipboard (the valve must stay usable). Probe a BARE mailto:
 * for the capability check — iOS canOpenURL false-negatives on full mailto URLs
 * with spaces/quotes (library audit M4). NOTE: the caller writes the frustration
 * cooldown on the tap (action-only); this function does not read sentiment.
 */
export async function openFeedback(opts: {
  onCopied: () => void;
  onError?: () => void;
}): Promise<void> {
  const subject = encodeURIComponent(buildEmailSubject());
  const body = encodeURIComponent(diagnosticFooter());
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

  let canMail = false;
  try { canMail = await Linking.canOpenURL('mailto:'); } catch { canMail = false; }
  if (canMail) {
    try { await Linking.openURL(mailto); return; } catch { /* fall through to copy */ }
  }
  try { await Clipboard.setStringAsync(SUPPORT_EMAIL); opts.onCopied(); }
  catch { opts.onError?.(); }
}

/** Dev-only (Debug "Force requestReview"): bypasses ALL eligibility. Must be
 *  compiled out of production builds (it lives behind __DEV__ at the call site;
 *  verified absent on a prod build per LG9). */
export async function debugForceRequestReview(): Promise<void> {
  try {
    if (await StoreReview.isAvailableAsync()) await StoreReview.requestReview();
  } catch { /* swallow */ }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no NEW errors (pre-existing `cluster-windows.ts:108` may show — ignore).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/lib/rating/store-review.ts
git commit -m "feat(rating): expo-store-review wrapper + manual store/feedback links"
```

---

## Task 5: prompt-triggers.ts (orchestration) + tests

**Files:**
- Create: `apps/mobile/src/lib/rating/prompt-triggers.ts`
- Test: `apps/mobile/src/lib/rating/__tests__/prompt-triggers.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const memory = new Map<string, string>();
vi.mock('../../storage', () => ({
  storage: {
    getString: (k: string) => memory.get(k),
    set: (k: string, v: string) => { memory.set(k, v); },
    delete: (k: string) => { memory.delete(k); },
  },
}));

// Mock the native wrapper — prompt-triggers must call it exactly when eligible.
const attemptNativeReview = vi.fn(() => Promise.resolve());
vi.mock('../store-review', () => ({ attemptNativeReview }));

import { maybePromptAfterSave, maybePromptAfterView } from '../prompt-triggers';
import {
  recordActiveDay, recordSuccessfulSearch, __resetRatingDedupeForTests,
} from '../rating-store';

const NOW = new Date('2026-06-09T12:00:00.000Z');

function seedHealthy() {
  // 2 distinct days + 2 searches clears the floor.
  recordActiveDay(new Date(2026, 5, 8));
  recordActiveDay(new Date(2026, 5, 9));
  recordSuccessfulSearch();
  recordSuccessfulSearch();
}

beforeEach(() => { memory.clear(); __resetRatingDedupeForTests(); attemptNativeReview.mockClear(); });

describe('prompt-triggers', () => {
  it('eligible save → attempts the native review once', async () => {
    seedHealthy();
    await maybePromptAfterSave({ grade: 'exceptional', isFirstEverSave: false, now: NOW });
    expect(attemptNativeReview).toHaveBeenCalledTimes(1);
  });

  it('below floor → does not attempt', async () => {
    await maybePromptAfterSave({ grade: 'exceptional', isFirstEverSave: false, now: NOW });
    expect(attemptNativeReview).not.toHaveBeenCalled();
  });

  it('view dedupe: same searchKey attempts at most once (EC10)', async () => {
    seedHealthy();
    await maybePromptAfterView({ grade: 'good', noViable: false, searchKey: 'k1', now: NOW });
    await maybePromptAfterView({ grade: 'good', noViable: false, searchKey: 'k1', now: NOW });
    expect(attemptNativeReview).toHaveBeenCalledTimes(1);
  });

  it('no_viable view → suppressed (never attempts)', async () => {
    seedHealthy();
    await maybePromptAfterView({ grade: 'good', noViable: true, searchKey: 'k2', now: NOW });
    expect(attemptNativeReview).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/mobile && npx vitest run src/lib/rating/__tests__/prompt-triggers.test.ts`
Expected: FAIL — `Cannot find module '../prompt-triggers'`.

- [ ] **Step 3: Implement the triggers**

```ts
// Fire-and-forget orchestration: read history → run the pure policy → if
// eligible, attempt the native card. Screens call these at natural breaks.
// No React state — plain async functions (despite the "trigger" name).

import {
  evaluateRatingEligibility, RATING_CONFIG,
  type Grade, type RatingContext, type TriggerEvent, type EligibilityDecision,
} from './eligibility';
import { loadHistory, oncePerKey } from './rating-store';
import { attemptNativeReview } from './store-review';

// A grade we never qualify, used when the screen has no displayable grade
// (e.g. empty top_windows) so the pure cut returns below_grade_cut, not a throw.
const NON_QUALIFYING: Grade = 'poor';

/** Trigger (a): fires after a successful save of a qualifying-grade moment.
 *  `isFirstEverSave` is read by the CALLER before recordFirstSaveDone(), so the
 *  first-ever save is correctly blocked here. */
export async function maybePromptAfterSave(input: {
  grade: string;
  isFirstEverSave: boolean;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  const event: TriggerEvent = {
    kind: 'qualifying_save',
    grade: input.grade as Grade,
    isFirstEverSave: input.isFirstEverSave,
  };
  const decision = evaluateRatingEligibility({
    event, context: 'moment_detail', history: loadHistory(now), config: RATING_CONFIG, now,
  });
  if (decision.shouldAttempt) await attemptNativeReview(now);
}

/** Trigger (b): fires when viewing a qualifying-grade result on a return day.
 *  Idempotent per searchKey (EC10) so cache-hit remounts don't re-attempt. */
export async function maybePromptAfterView(input: {
  grade: string | undefined;
  noViable: boolean;
  searchKey: string;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  if (!oncePerKey('view-prompt', input.searchKey)) return;
  const context: RatingContext = input.noViable ? 'no_viable' : 'result_view';
  const event: TriggerEvent = {
    kind: 'qualifying_view',
    grade: (input.grade ?? NON_QUALIFYING) as Grade,
  };
  const decision = evaluateRatingEligibility({
    event, context, history: loadHistory(now), config: RATING_CONFIG, now,
  });
  if (decision.shouldAttempt) await attemptNativeReview(now);
}

/** Dev-only (Debug "Force rating eval"): evaluate the policy against current
 *  real history with a synthetic exceptional save; surfaces the reason. */
export function debugEvaluate(now: Date = new Date()): EligibilityDecision {
  return evaluateRatingEligibility({
    event: { kind: 'qualifying_save', grade: 'exceptional', isFirstEverSave: false },
    context: 'moment_detail',
    history: loadHistory(now),
    config: RATING_CONFIG,
    now,
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/mobile && npx vitest run src/lib/rating/__tests__/prompt-triggers.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/rating/prompt-triggers.ts apps/mobile/src/lib/rating/__tests__/prompt-triggers.test.ts
git commit -m "feat(rating): fire-and-forget save/view triggers + dedupe + tests"
```

---

## Task 6: i18n — 4 `support.*` chrome keys in all 5 locales (TDD)

**Files:**
- Modify: `apps/mobile/src/i18n/__tests__/settings-coverage.test.ts:23-58`
- Modify: `apps/mobile/src/locales/{en,de,fr,es-419,pt-BR}/settings.json`

- [ ] **Step 1: Add the 4 keys to the coverage test's core-keys list (failing)**

In `settings-coverage.test.ts`, inside the `'declares the core chrome keys'` array (after `'clearMoments.confirm',` on line 54), add:

```ts
      'support.title',
      'support.feedback',
      'support.rate',
      'support.emailCopied',
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/mobile && npx vitest run src/i18n/__tests__/settings-coverage.test.ts`
Expected: FAIL — `expect(has(en, 'support.title')).toBe(true)` is false (keys not yet in en).

- [ ] **Step 3: Add the keys to `en/settings.json`**

Change the last line `"clearMoments.confirm": "Clear"` to `"clearMoments.confirm": "Clear",` and append before the closing `}`:

```json
  "support.title": "Support",
  "support.feedback": "Send feedback",
  "support.rate": "Rate Inceptio",
  "support.emailCopied": "Email address copied"
```

- [ ] **Step 4: Add the keys to `de/settings.json`** (add comma to its current last key, then):

```json
  "support.title": "Support",
  "support.feedback": "Feedback senden",
  "support.rate": "Inceptio bewerten",
  "support.emailCopied": "E-Mail-Adresse kopiert"
```

- [ ] **Step 5: Add the keys to `fr/settings.json`**:

```json
  "support.title": "Assistance",
  "support.feedback": "Envoyer un commentaire",
  "support.rate": "Évaluer Inceptio",
  "support.emailCopied": "Adresse e-mail copiée"
```

- [ ] **Step 6: Add the keys to `es-419/settings.json`**:

```json
  "support.title": "Soporte",
  "support.feedback": "Enviar comentarios",
  "support.rate": "Calificar Inceptio",
  "support.emailCopied": "Dirección de correo copiada"
```

- [ ] **Step 7: Add the keys to `pt-BR/settings.json`**:

```json
  "support.title": "Suporte",
  "support.feedback": "Enviar feedback",
  "support.rate": "Avaliar o Inceptio",
  "support.emailCopied": "Endereço de e-mail copiado"
```

> Brand token "Inceptio" stays untranslated. "Support"/header term is native-review-pending but passes coverage now. `emailSubject` is NOT here (it is the `buildEmailSubject()` plumbing constant from Task 1).

- [ ] **Step 8: Run to verify it passes**

Run: `cd apps/mobile && npx vitest run src/i18n/__tests__/settings-coverage.test.ts`
Expected: PASS — both `CHROME keys exist in all 5 locales` and `declares the core chrome keys`.

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/src/i18n/__tests__/settings-coverage.test.ts apps/mobile/src/locales/*/settings.json
git commit -m "i18n(settings): add support.* (feedback/rate/title/emailCopied) in 5 locales"
```

---

## Task 7: Wire the save trigger into MomentDetailScreen

**Files:**
- Modify: `apps/mobile/src/screens/MomentDetailScreen.js` (imports + `handleSave` at 181-196)

- [ ] **Step 1: Add imports**

After line 31 (`import { addWindowToCalendar } from '../lib/calendar-export';`), add:

```js
import { maybePromptAfterSave } from '../lib/rating/prompt-triggers';
import { isFirstEverSave, recordFirstSaveDone } from '../lib/rating/rating-store';
```

- [ ] **Step 2: Wire `handleSave` (read first-save flag BEFORE recording)**

Replace the `handleSave` function body (lines 181-196) with:

```js
  function handleSave() {
    if (!w) return;
    // Capture BEFORE recordFirstSaveDone so the first-ever save is still blocked
    // by the eligibility floor (D3). Order matters: read → save → mark → prompt.
    const wasFirstSave = isFirstEverSave();
    saveMoment({
      id: `${w.start}_${activity}`,
      activity,
      city,
      start: w.start,
      end: w.end,
      duration_minutes: w.duration_minutes,
      score: w.score,
      grade: w.grade,
      headline,
      saved_at: new Date().toISOString(),
    });
    recordFirstSaveDone();
    showToast(t('toast.saved'));
    // Fire-and-forget: reads raw w.grade (NOT gradeToScorePill, which collapses
    // good→strong for color). Eligibility + native card are best-effort.
    void maybePromptAfterSave({ grade: w.grade, isFirstEverSave: wasFirstSave });
  }
```

- [ ] **Step 3: Typecheck (JS file — confirm no breakage in TS project refs)**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no NEW errors (pre-existing `cluster-windows.ts:108` only).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/screens/MomentDetailScreen.js
git commit -m "feat(rating): fire save trigger on qualifying-grade save success"
```

---

## Task 8: Wire the view trigger into CalendarScreen

**Files:**
- Modify: `apps/mobile/src/screens/CalendarScreen.js` (imports + an effect after the data hooks)

- [ ] **Step 1: Add imports**

Change line 12 `import React, { useCallback, useMemo, useState } from 'react';` to include `useEffect`:

```js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
```

After line 33 (`import { activeBundle, toIntlLocale } from '../i18n/locale';`), add:

```js
import { maybePromptAfterView } from '../lib/rating/prompt-triggers';
import { searchKeyOf } from '../lib/rating/rating-store';
```

- [ ] **Step 2: Add the view-trigger effect**

Immediately after line 200 (`const noViable = summary?.no_viable_windows ?? false;`), add:

```js
  // Rating trigger (b): viewing a qualifying-grade result on a return day is a
  // natural positive break. Fire-and-forget; idempotent per search (oncePerKey
  // inside maybePromptAfterView) so cache-hit remounts don't re-attempt (EC10).
  // noViable routes here too (calendar "closest moments") — pass it so the pure
  // fn suppresses it. Best grade = rank-ordered top_windows[0].grade.
  useEffect(() => {
    if (!result) return;
    void maybePromptAfterView({
      grade: topWindows[0]?.grade,
      noViable,
      searchKey: searchKeyOf(request),
    });
  }, [result]); // eslint-disable-line react-hooks/exhaustive-deps
```

> Depend on `[result]` only: `topWindows`/`noViable`/`request` derive deterministically from it and are read at call time. The `oncePerKey` guard makes any extra fire a no-op regardless.

- [ ] **Step 3: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no NEW errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/screens/CalendarScreen.js
git commit -m "feat(rating): fire view trigger on qualifying-grade results render"
```

---

## Task 9: Wire recorders into LoadingScreen (the single funnel)

**Files:**
- Modify: `apps/mobile/src/screens/LoadingScreen.js` (imports + success effect at 63-71 + new error effect)

- [ ] **Step 1: Add imports**

After line 17 (`import { friendlyMessage } from '../lib/error-messages';`), add:

```js
import {
  recordSuccessfulSearch, recordFrustration, oncePerKey, searchKeyOf,
} from '../lib/rating/rating-store';
```

- [ ] **Step 2: Compute the dedupe key once per render**

After line 50 (the closing `);` of the `useElectionalSearch(request)` destructure), add:

```js
  // Stable per-search key so the success/error recorders fire once per result,
  // even if React remounts this screen on a cache hit (EC10 funnel).
  const ratingSearchKey = searchKeyOf(request);
```

- [ ] **Step 3: Record the outcome inside the success effect**

Replace the success effect (lines 63-71) with:

```js
  // Navigate on success — and record the search outcome ONCE per result. This
  // is the single funnel for successful-search + no_viable frustration (the
  // search hook is TanStack v5 with no onSuccess; per-screen isError would
  // double-count on cache-hit remounts).
  useEffect(() => {
    if (!result) return;
    const noViable = result.envelope?.data?.summary?.no_viable_windows ?? false;
    if (oncePerKey('search-outcome', ratingSearchKey)) {
      if (noViable) recordFrustration();
      else recordSuccessfulSearch();
    }
    if (noViable) go('noviable');
    else go('calendar');
  }, [result, go, ratingSearchKey]);
```

- [ ] **Step 4: Add the error-outcome effect**

Immediately after the effect from Step 3, add:

```js
  // Record search ERRORS as frustration (429 / upstream-quota / network / parse
  // all suppress the next positive prompt for the cooldown). Same funnel key so
  // a success and an error for the same search can't both fire.
  useEffect(() => {
    if (!isError) return;
    if (oncePerKey('search-outcome', ratingSearchKey)) recordFrustration();
  }, [isError, ratingSearchKey]);
```

- [ ] **Step 5: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no NEW errors.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/screens/LoadingScreen.js
git commit -m "feat(rating): funnel search success/no-viable/error into rating recorders"
```

---

## Task 10: Wire recordActiveDay into App boot

**Files:**
- Modify: `apps/mobile/App.js` (import + the `hydrateStorage().then()` block at 113-130)

- [ ] **Step 1: Add the import**

After line 27 (`import { migrateLocationTimezones_v1 } from './src/lib/location-storage';`), add:

```js
import { recordActiveDay } from './src/lib/rating/rating-store';
```

- [ ] **Step 2: Call it after hydration, before the boot gate lifts**

In the `hydrateStorage().then(() => { ... })` block, add `recordActiveDay();` immediately after `initLocationPreference();` (line 128) and before `setStorageReady(true);`:

```js
      initLocationPreference();
      // Rating: bump the distinct-day counter once per device-local day. MUST be
      // after hydrateStorage() (reads rating.lastActiveDay) and is the only
      // pre-render rating read (spec EC7).
      recordActiveDay();
      setStorageReady(true);
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no NEW errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/App.js
git commit -m "feat(rating): record an active day on each post-hydration app boot"
```

---

## Task 11: Wire YouScreen — Support section (2 rows) + 3 Debug rows

**Files:**
- Modify: `apps/mobile/src/screens/YouScreen.js`

- [ ] **Step 1: Add imports**

Change line 8 `import { View, Text, ScrollView, Pressable, Alert } from 'react-native';` to add `Linking`:

```js
import { View, Text, ScrollView, Pressable, Alert, Linking } from 'react-native';
```

After line 21 (`import { getDeviceId, clearDeviceId } from '../lib/device-id';`), add:

```js
import { openFeedback, openStoreListing, debugForceRequestReview } from '../lib/rating/store-review';
import { recordFrustration, resetRatingState } from '../lib/rating/rating-store';
import { debugEvaluate } from '../lib/rating/prompt-triggers';
```

- [ ] **Step 2: Add the handlers**

After `confirmClearSavedMoments` (ends line 145), add:

```js
  // Support — always-available unhappy-user valve. The TAP writes the
  // frustration cooldown (action-only; no sentiment is ever read). openFeedback
  // opens the mail composer, or copies the address if there's no mail client.
  async function handleFeedback() {
    recordFrustration();
    await openFeedback({
      onCopied: () => showToast(t('support.emailCopied')),
      onError: () => showToast(t('toast.copyFailed'), 'warn'),
    });
  }

  // User-initiated store listing. Never calls requestReview (compliance).
  function handleRate() {
    void openStoreListing();
  }

  // Debug (__DEV__ only — compiled out of production, verified by LG9).
  function debugRatingEval() {
    const d = debugEvaluate();
    Alert.alert('Rating eval', `shouldAttempt: ${d.shouldAttempt}\nreason: ${d.reason}`);
  }
  function debugForceCard() {
    void debugForceRequestReview();
  }
  function debugResetRating() {
    resetRatingState();
    showToast('Rating state reset');
  }
```

- [ ] **Step 3: Add the Support section (above About)**

Between the location "Clear" affordance block (closes line 194) and the About `Pressable` (line 199), add:

```js
        <Section title={t('support.title')} />
        <Row label={t('support.feedback')} detail="" onPress={handleFeedback} />
        <Row label={t('support.rate')} detail="" onPress={handleRate} />

```

- [ ] **Step 4: Add the 3 Debug rows**

Inside the `{__DEV__ && showDebug && ( <> ... </> )}` block, after the `Clear saved moments` Row (closes line 226), add:

```js
            <Row label="Force rating eval" detail="" onPress={debugRatingEval} />
            <Row label="Force requestReview()" detail="" onPress={debugForceCard} />
            <Row label="Reset rating state" detail="" destructive onPress={debugResetRating} />
```

> Debug-row labels are intentionally hardcoded English (dev-only, stripped in prod) — they deliberately do NOT go through the 5-locale coverage guard.

- [ ] **Step 5: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no NEW errors.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/screens/YouScreen.js
git commit -m "feat(rating): Settings Support section (feedback + rate) + dev rating rows"
```

---

## Task 12: Full verification + launch-gate handoff

**Files:** none (verification only)

- [ ] **Step 1: Run the full mobile test suite**

Run: `cd apps/mobile && npm test`
Expected: PASS — all suites green, including the 3 new rating suites and `settings-coverage`.

- [ ] **Step 2: Typecheck the whole app**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: ONLY the pre-existing `cluster-windows.ts:108` TS2345 error (documented prior debt). No rating-related errors.

- [ ] **Step 3: Confirm the rating module shape**

Run: `cd apps/mobile && ls src/lib/rating src/lib/rating/__tests__`
Expected: `eligibility.ts launch-constants.ts prompt-triggers.ts rating-store.ts store-review.ts` and 3 `*.test.ts` files.

- [ ] **Step 4: Commit any final state (if dirty) and record the launch-gate checklist**

The following are **launch-gated, not implementation blockers** — the feature is complete and shippable-dormant without them. Record them in the PR/issue:

- **LG1 (split):** on-device card smoke. *Now:* iOS **dev build on a real device** (NOT TestFlight — `isAvailableAsync()` is false there); Android wiring via `FakeReviewManager`; policy via Debug "Force rating eval". *Deferred:* Android real card needs a **Play internal-track** upload; the live store-listing link needs real IDs.
- **LG5:** owner swaps `// TODO(launch)` placeholders in `launch-constants.ts` — `IOS_APP_STORE_URL`, `ANDROID_PLAY_STORE_URL`, `SUPPORT_EMAIL`.
- **LG9:** on a **production build**, verify the 3 rating Debug rows are **absent** (file-presence ≠ runtime; `__DEV__` is compiled out, but verify).
- **LG11:** pre-submission compliance self-check (spec §2): native API only; no sentiment gate; feedback row independent (not a gate); "Rate" never pre-selects stars / never calls `requestReview`. Anchors: Apple §5.6.3, Play Ratings/Reviews policy.
- **LG12:** accessibility smoke on the 2 Support rows + the clipboard-fallback toast.
- **Owner flag:** confirm the 4th chrome key `support.emailCopied` is acceptable (see header note).

---

## Self-review (completed by plan author)

**Spec coverage:** D1 (Task 7/8), D2 grade cut (Task 2 `RATING_CONFIG` + tests), D3 floor (Task 2/3), D4 two-layer suppression (Task 2 context guard + Task 9/11 frustration writers), D5 keys/knobs/day-semantics (Task 3), D6 pure fn (Task 2), D7 shell + recorders + sync-cache stacking (Task 3/4/5), D8 Settings rows + fallbacks (Task 11 + store-review), D9 i18n (Task 6), D10 dev trigger + prod-strip (Task 11 + LG9), EC1/EC6/EC8/EC10 (Tasks 2/4/5/8/9), launch gate (Task 12). All mapped.

**Placeholder scan:** the only `// TODO(launch)` markers are the deliberate owner-provided store/email constants (Task 1), each named and degrading gracefully — not plan gaps. No "implement later" / vague steps.

**Type consistency:** `RatingHistory`/`TriggerEvent`/`RatingContext`/`EligibilityDecision`/`Grade` defined in `eligibility.ts` (Task 2) and consumed unchanged in `rating-store.ts` (Task 3), `prompt-triggers.ts` (Task 5). Function names match across tasks: `loadHistory`, `isFirstEverSave`, `recordFirstSaveDone`, `recordActiveDay`, `recordSuccessfulSearch`, `recordFrustration`, `recordAttempt`, `oncePerKey`, `searchKeyOf`, `resetRatingState`, `attemptNativeReview`, `openFeedback`, `openStoreListing`, `debugForceRequestReview`, `maybePromptAfterSave`, `maybePromptAfterView`, `debugEvaluate`. `searchKeyOf` signature (Task 3) matches its call sites (Tasks 8/9). `maybePromptAfterSave` takes `{grade, isFirstEverSave, now?}` (Task 5) — matches the Task 7 call. `oncePerKey('search-outcome', …)` shared by both LoadingScreen effects (Task 9); `oncePerKey('view-prompt', …)` used only inside `maybePromptAfterView` (Task 5).
