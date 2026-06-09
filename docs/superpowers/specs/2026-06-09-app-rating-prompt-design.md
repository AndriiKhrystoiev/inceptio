# In-App Rating Prompt — Design Spec

**Date:** 2026-06-09
**Status:** Brainstorm complete (Sections 1–5, gated sign-off). Compound V pre-flights folded in (2026-06-09). Awaiting owner review of this spec before writing-plans.
**Branch:** `feature/rating`
**Scope:** **CLIENT-ONLY.** No Worker change. Does **not** touch the undeployed Worker set or the deploy gate.
**Pre-flight audits:** archaeology `docs/superpowers/expert/2026-06-09-app-rating-archaeology.md` · domain `docs/superpowers/expert/2026-06-09-app-rating-domain.md` · library `docs/superpowers/library-audit/2026-06-09-app-rating.md`. Verdicts: **zero compliance must-changes**; two factual corrections folded in (no `date-fns`; iOS smoke on dev-build-not-TestFlight); result-view fire point + double-count risk resolved below.
**Gate:** §12.3 launch gate — pure eligibility fn is fully unit-testable (Node, zero mocks); card *presentation* is not assertable in Node → on-device smoke + pre-submission compliance self-check (§9).

---

## 1. Why

Ask genuinely-delighted users to rate Inceptio, using **only** the native in-app review API, at honest positive moments, conservatively, and fire-and-forget. The mechanism for *unhappy* users is a **separate, always-available** feedback/support channel in Settings — never a gate placed before the review prompt.

This is a deliberately small, high-precision feature. The hard part is **not** the native call (one line) — it is the **eligibility policy** (when *not* to ask) and **staying inside Apple + Google policy** (§2). The policy is a pure, unit-testable function; everything stateful or native is an isolating shell around it.

---

## 2. Fixed compliance guardrails (hard boundaries — not design knobs)

These are verified against current Apple + Google policy and are **boundaries**, not options. Every decision below stays inside them.

1. **Native in-app review API only** — `expo-store-review` wrapping StoreKit `requestReview` (iOS) / Play In-App Review API (Android). **No custom star UI**; never modify, resize, or overlay the system card.
2. **No sentiment pre-question, no rating-steering, anywhere** — never "Do you like the app?", never "Would you rate us 5 stars?", never a "Yes→store / No→feedback" gate. The Yes/No gate is treated as rating manipulation and risks the account.
3. **No incentive of any kind** tied to rating (no reward/discount/currency/unlock); never gate app functionality on rating.
4. **No outcome detection** — the API does not report whether the user rated or whether the card even showed. All logic is fire-and-forget; **nothing downstream may depend on "did they rate."**
5. **Respect OS quotas** — iOS ≤3 prompts/365 days; Android has its own (undocumented) quota. Every prompt call is best-effort / no-op-safe.
6. **The unhappy-user channel is a separate Settings entry**, always available — **NOT** a gate before the review prompt.

**Pre-submission compliance self-check** is a launch-gate line (§12.3 LG11): re-verify all six before store submission.

---

## 3. Archaeology (confirmed against the codebase — Gate 0)

Corrections to initial assumptions (flag-don't-fix; carried into the design):

| Fact | Finding | Path |
|---|---|---|
| `expo-store-review` installed? | **No** — zero usage. New dependency. App runs a **dev-client** (`expo-dev-client` present), so a native module is fine (won't work in plain Expo Go — not used). | `apps/mobile/package.json` |
| Local storage | **AsyncStorage**, not MMKV. Sync-looking wrapper w/ in-memory cache; API `getString`/`set`/`delete`; **requires `await hydrateStorage()` at boot** before reads. (CLAUDE.md + a memory still say "MMKV" — stale; flagged, not fixed.) | `apps/mobile/src/lib/storage.ts` |
| Usage-cap client counter to extend? | **None.** 5/day cap is **server-side** (Worker KV, `rate-limit.ts`); client only sees `429 / RateLimitError` (`api.ts`). Our frequency bookkeeping is a small fresh store. "Suppress on cap" = hook the 429 path, not read a local count. | `workers/api-proxy/src/rate-limit.ts`, `apps/mobile/src/lib/api.ts` |
| Grade at save-time | `handleSave()` writes `grade: w.grade` into `SavedMoment`. Grade is a **raw API string** ∈ `exceptional\|strong\|good\|fair\|caution\|poor`. "Highly favorable" = raw `strong`; "Exceptional" = raw `exceptional`; `good` is its own tier. | `apps/mobile/src/screens/MomentDetailScreen.js:181`, `apps/mobile/src/lib/draft-store.ts:122` |
| Settings home | `YouScreen.js` — local `Row` + `Section` components (intentionally not promoted). About section (Version / Privacy / Terms stubs) + `__DEV__` Debug section. No feedback/rate entry exists. | `apps/mobile/src/screens/YouScreen.js` |
| i18n | `settings:` namespace, flat dotted keys, `nsSeparator:':'`, `keySeparator:false`. Per-namespace coverage tests assert all 5 locales (`en,de,fr,es-419,pt-BR`). **Allowlist = 0** (`TRANSLATION_DEFERRED = []` is the *allowlist*; the actual enforcer for new keys is `settings-coverage.test.ts:13-21`). | `apps/mobile/src/i18n/__tests__/settings-coverage.test.ts:13` |
| Dev-pill pattern + **prod-strip** | `DevLocaleBar` + `StatePicker`, `__DEV__` only. **`__DEV__` is compiled out in prod** (`babel-preset-expo` inlines `__DEV__=false` → Metro minifier dead-code-eliminates the branch) — so LG9 is satisfiable. YouScreen's Debug block is **double-gated** (`{__DEV__ && showDebug && …}`, 3s long-press reveals `showDebug`). | `apps/mobile/App.js`, `apps/mobile/src/screens/YouScreen.js:206` |
| `date-fns` installed? | **NO** — verified not in any `package.json`, not in `node_modules`, zero imports. CLAUDE.md "locked stack" listing it is **stale** (same drift class as MMKV→AsyncStorage). Cooldown math uses **native `Date` arithmetic** (codebase already does `now.getTime() + N*…` in 3 screens). Add **no** dependency. | (absence) |

---

## 4. Section 1 — Triggers & Eligibility (D1–D3)

### D1 — Trigger event set (v1) ✅ in: (a) + (b); defer (c)
A `requestReview()` attempt fires only at a **natural break after a positive outcome**, never mid-flow, never on cold app-open.

- **(a) Qualifying-grade save** — fires on **save success** at `MomentDetailScreen.handleSave()`. Failed save → no fire. Highest-precision signal; grade read directly from `w.grade`.
- **(b) Qualifying-grade result-view on a return day** — the **distinct-day count is an eligibility *gate*, not the trigger event**. The attempt *fires* on viewing a qualifying-grade result at a natural break (with or without a save), on a day where `distinctDayCount ≥ 2`. **Never** on cold app-open (app-open is neither a natural-break-after-positive-outcome nor a delight signal).
  - **Fire point (resolved by archaeology — C1):** the single results screen is **`CalendarScreen.js`** (the screen `LoadingScreen` routes to on search success — `LoadingScreen` itself is mid-flow and must **not** fire). There is **no `summary.grade`**; the best displayed grade = **`topWindows[0]?.grade`** (rank-ordered). Hook a `useEffect([result])` that evaluates once per distinct result (see the **idempotency `useRef`** requirement in EC10).
- **(c) ≥N successful sessions** — **deferred.** Overlaps (a)/(b); vaguest delight content.

### D2 — Trigger-grade cut ✅ Top-3 (`exceptional | strong | good`), distribution-conditioned
The cut governs **both** triggers — it defines what counts as a "positive result" for save *and* view. **`fair / caution / poor` never qualify.**

- **Chosen:** Top-3 — `exceptional`, `strong`, `good` (display: Exceptional / Highly favorable / Favorable).
- **Rationale (§12.3 discipline):** CLAUDE.md verified API behavior — scores rarely exceed **72**; design treats **60–74 (`fair`/`good`) as the win-state**. A Top-2 cut (`exceptional`/`strong` only) would be so rare that the prompt would almost never get an opportunity → effectively dormant. Top-3 is the pragmatic default.
- **Launch-gate caveat (LG7):** tied to current distribution data. If real smoke-data shows `strong`/`exceptional` are actually frequent, revisit the cut. **Owner has signed off Top-3.**

### D3 — Eligibility floor (brand-new-user guard) ✅ day + engagement
A brand-new user is **never** prompted, even if their first saved result is `exceptional`. Floor (checked **first** in the pure fn, short-circuits everything below):

- `distinctDayCount ≥ 2` (active on ≥2 distinct calendar days — the stronger engagement reading) **AND**
- `successfulSearches ≥ 2` **AND**
- **not** the first-ever save.

**Owner-tunable knob:** may bump distinct-days to ≥3 for a more conservative bar; default stays **≥2** unless owner says otherwise.

---

## 5. Section 2 — Suppression & Frequency (D4–D5)

### D4 — Two-layer suppression ✅
Contexts where we must NOT prompt even if every cap/counter would allow it.

**Layer 1 — Immediate context (never even call `attempt()`):** the trigger code is not wired into these surfaces; defense-in-depth, the pure fn also takes a `context` and refuses if it is any of:

1. `no_viable_windows` result (screen 03b)
2. Usage-cap hit — `429 / RateLimitError`
3. `UpstreamQuotaError` (astrology-api.io quota)
4. Any search **error** or **empty** state (network / timeout / parse)
5. **Paywall** surface (hidden in MVP — guarded anyway so a future flag-flip can't leak a prompt onto it)
6. Onboarding / first-run modal flow
7. Mid-flow screens (Loading, Activity, Date Range, Location) — only the result-view and save are valid fire points

**Layer 2 — Recent-frustration cooldown:** events **1, 2, 3, 4** *and the feedback action* (§7) write `rating.lastFrustrationAt`. The next positive-event prompt is suppressed while `now − lastFrustrationAt < FRUSTRATION_COOLDOWN`. A user who hit the cap or a no-viable result this morning won't be prompted off a lucky save this afternoon — the bad taste must clear first.

**Confirmed model invariants:**
- Trigger (a) fires **only on save success** (failed save → no fire).
- A **viable-but-low-grade** result (best ≤ `fair`) is correctly in **neither** layer: it does **not** fire (below the Top-3 cut) and does **not** write frustration (it is honest output, not a frustration event). Keep it that way.
- Feedback action writes frustration via **action alone** — we never read sentiment (prohibited). Rationale: feedback-seeking is a "have something to say" (possibly negative) headspace; EV asymmetry favors suppressing the next positive prompt for the cooldown.

### D5 — Local frequency policy ✅ keys, knobs, reset behavior
Own conservative bookkeeping in `storage.ts` (string API; values ISO / int / flag). All keys namespaced `rating.*`.

**Storage keys:**

| Key | Type | Purpose |
|---|---|---|
| `rating.distinctDayCount` | int | Feeds D3 floor (≥2) **and** D1(b) gate |
| `rating.lastActiveDay` | `YYYY-MM-DD` (device-local) | Bumps `distinctDayCount` when `today !== lastActiveDay` |
| `rating.successfulSearches` | int | Feeds D3 floor (≥2) |
| `rating.firstSaveDone` | `"1"` flag | Stops the first-ever save from prompting |
| `rating.lastAttemptAt` | ISO | Inter-attempt cooldown |
| `rating.attemptsInWindow` | JSON `string[]` of attempt ISOs (shell-pruned to 365d) | Max-attempts-per-window cap |
| `rating.lastFrustrationAt` | ISO | Layer-2 frustration cooldown |

**Dropped:** `rating.installDay` — no reader after the `distinctDayCount` switch; reset-detection is moot under storage wipe. (Re-add only if a real reader appears.)
**Absent by design:** `hasRated` / any outcome tracking — we cannot detect outcome; the **OS** suppresses re-prompts for users who already rated.

**`distinctDayCount` semantics:** on each active-session boot (after `hydrateStorage()`), if `today !== lastActiveDay` → `distinctDayCount++`, `lastActiveDay = today`. Bounded by construction; cumulative-since-install, matching D3 floor + D1(b) gate. (Revert to an array only if D1(b) ever becomes a rolling-window metric — not current scope.)

**Cooldown knobs (owner-tunable; launch defaults accepted):**

| Knob | Default | Why |
|---|---|---|
| `MIN_DAYS_BETWEEN_ATTEMPTS` | **90 days** | Far below the OS quota; never naggy |
| `MAX_ATTEMPTS_PER_365D` | **2** | Headroom under iOS's hard 3/365 ceiling |
| `FRUSTRATION_COOLDOWN_DAYS` | **14 days** | A bad session clears before any positive prompt |

**Post-launch dial order (LG8):** if review volume is too low, shorten `FRUSTRATION_COOLDOWN_DAYS`→7 **first**, then consider `MAX_ATTEMPTS_PER_365D`→3 (full OS allowance).

**Two day-semantics (BUG-001 discipline — explicit in code + comments):**
- **Activity = calendar-day, device-local** (`today !== lastActiveDay`). Device-local is the *correct* frame here ("was the user active today") — unlike BUG-001 where *event* tz mattered. No date-line hazard: we never compare a device day against an event-tz day.
- **Cooldowns (frustration-14d, attempt-90d) = elapsed duration** between instants (`now` vs stored ISO), **NOT** calendar-day diffs — avoids a midnight off-by-one. Compute with **native `Date` millis** (`(now - stored) / 86_400_000 < days`); `date-fns` is not installed and is not added (§6). The point is elapsed-instant math, never a calendar-day diff.

**Reset-on-reinstall:** AsyncStorage is wiped on uninstall → every `rating.*` key resets, the user looks brand-new, D3 floor re-applies (no immediate prompt). Acceptable because the **OS quota (iOS 3/365) persists at the StoreKit level** across reinstall — the real protection survives. No attempt to defeat the wipe.

---

## 6. Section 3 — Architecture (D6–D7)

### D6 — The pure eligibility function ✅
A single pure, synchronous, native-free function. Imports nothing from `expo-store-review` or `storage.ts` → `eligibility.test.ts` runs in Node with zero mocks.

```ts
// src/lib/rating/eligibility.ts  (PURE — no I/O, no native, no Date.now)

type Grade = 'exceptional' | 'strong' | 'good' | 'fair' | 'caution' | 'poor';

type TriggerEvent =
  | { kind: 'qualifying_save'; grade: Grade; isFirstEverSave: boolean }
  | { kind: 'qualifying_view'; grade: Grade };

type RatingContext =
  | 'result_view' | 'moment_detail'                 // valid fire surfaces
  | 'no_viable' | 'rate_limited' | 'upstream_quota'
  | 'error' | 'empty' | 'paywall' | 'onboarding' | 'mid_flow';  // suppressed

type RatingHistory = {
  distinctDayCount: number;
  successfulSearches: number;
  lastAttemptAt: string | null;        // ISO
  attemptsInWindow: string[];          // ISO list, shell pre-prunes to 365d
  lastFrustrationAt: string | null;    // ISO
};

type EligibilityReason =
  | 'eligible' | 'suppressed_context' | 'below_grade_cut'
  | 'first_ever_save' | 'below_floor' | 'frustration_cooldown'
  | 'attempt_cooldown' | 'max_attempts_reached';

type EligibilityDecision = { shouldAttempt: boolean; reason: EligibilityReason };

function evaluateRatingEligibility(input: {
  event: TriggerEvent;
  context: RatingContext;
  history: RatingHistory;
  config: RatingConfig;
  now: Date;                           // injected — never reads the clock itself
}): EligibilityDecision;
```

**Short-circuit decision order** (first failing guard wins; `reason` powers the dev panel + the golden test table):

1. **Context guard** — `context` ∈ suppressed set → `suppressed_context`
2. **Grade cut** — `event.grade` ∉ `config.qualifyingGrades` (`exceptional|strong|good`) → `below_grade_cut`
3. **First-save guard** — `qualifying_save` ∧ `isFirstEverSave` → `first_ever_save`
4. **Floor** — `distinctDayCount < 2` ∨ `successfulSearches < 2` → `below_floor`
5. **Frustration cooldown** — elapsed(`now`, `lastFrustrationAt`) `< 14d` → `frustration_cooldown`
6. **Inter-attempt cooldown** — elapsed(`now`, `lastAttemptAt`) `< 90d` → `attempt_cooldown`
7. **Max-per-window** — `attemptsInWindow.length ≥ 2` → `max_attempts_reached`
8. else → `eligible`

Returning `{shouldAttempt, reason}` (not a bare boolean) is strictly better — same boolean, plus the `reason` drives the `__DEV__` panel and self-documents the test table. `now` is injected so tests pin fixed dates. Guards 5 & 6 use **elapsed-duration** comparison (see D5 day-semantics); guard `<` means **exact threshold = eligible** (`elapsed === cooldown` passes).

**Cooldown math uses native `Date`, not `date-fns` (library audit — `date-fns` is NOT installed).** Elapsed days = `(now.getTime() - new Date(stored).getTime()) / 86_400_000`, compared `< COOLDOWN_DAYS`. This keeps the pure fn **dependency-free** (reinforcing "Node, zero mocks") and matches the codebase's existing native-`Date` millis arithmetic. Do **not** `expo install date-fns`. The earlier draft's `isAfter(addDays(...))` is replaced by this millis form; the BUG-001 reasoning (elapsed-instant, not calendar-day) is unchanged.

**Golden table coverage (required rows):**
- One row per `EligibilityReason` (table self-documents).
- `lastFrustrationAt = null` and `lastAttemptAt = null` → **first-ever-attempt path passes, does not throw**.
- Exact-threshold boundary rows: `elapsed === cooldown → eligible` (guard is `<`).

### D7 — The impure shell ✅
Everything touching storage or native lives outside the pure fn, in one folder:

```
src/lib/rating/
  eligibility.ts        // PURE (above) + types + RATING_CONFIG defaults
  rating-store.ts       // read/write rating.* keys via storage.ts (impure)
  store-review.ts       // thin wrapper: expo-store-review (isAvailableAsync/requestReview/storeUrl/hasAction)
  use-rating-prompt.ts  // hook: load history → call pure fn → if eligible, attempt → record
  eligibility.test.ts   // golden table, Node-only, zero mocks
```

**`use-rating-prompt.ts`** exposes:
- `maybePromptAfterSave(saved)` — from `MomentDetailScreen.handleSave()` **on save success**
- `maybePromptAfterView(result)` — from the result-view natural break on a return day

Both: read history → `evaluateRatingEligibility(...)` → if `shouldAttempt`, guard on `StoreReview.isAvailableAsync()`, then **fire-and-forget** `requestReview().catch(()=>{})` and write `lastAttemptAt` + append to `attemptsInWindow`.

- We record the attempt **when we call** `requestReview` (not when a card shows — that is unknowable; recording our own call is bookkeeping, **not** outcome detection).
- If `isAvailableAsync()` is **false** → **no-op and burn no attempt slot** (degrade path EC1).

**Recorders** (in `rating-store.ts`, called from existing paths — wiring resolved by archaeology C2/C3):

| Recorder | Wired into | Writes |
|---|---|---|
| `recordActiveDay()` | `App.js` boot, **after `hydrateStorage()`** (`App.js:113-130`, the `.then()`) | `distinctDayCount`++, `lastActiveDay` |
| `recordSuccessfulSearch()` | **`LoadingScreen.js` success effect** (the single funnel — `useElectionalSearch.ts` is TanStack v5 with **no `onSuccess`**; do NOT wire per-screen `isError`, which double-fires on cache-hit remounts) | `successfulSearches`++ |
| `recordFrustration(source)` | `LoadingScreen.js` error/no-viable branch — **branch source on `instanceof RateLimitError` / `UpstreamQuotaError`**, plus the `no_viable_windows` summary; and the **feedback-row tap** in `YouScreen` | `lastFrustrationAt` |
| `recordFirstSaveDone()` | `MomentDetailScreen.handleSave()`, immediately after `saveMoment(...)` (`MomentDetailScreen.js:194`) | `firstSaveDone` flag |

**Save-success semantics (C2):** `saveMoment()` is **synchronous and `void`** (`draft-store.ts:133`) — a persist error is swallowed and cannot be signalled. "Save success" therefore = `handleSave` did not early-return (`if (!w) return;`). Place `maybePromptAfterSave` + `recordFirstSaveDone` right after the `saveMoment(...)` call.

**Per-session stacking — required property of `storage.ts`:** the stacking guard relies on `storage.ts` updating its **in-memory cache synchronously** on `set()`, so writing `lastAttemptAt` immediately on attempt makes the next in-session `evaluate` hit `attempt_cooldown` (the view→save same-screen sequence). **No separate session-dedup guard.** This property must hold (it does — the wrapper writes the cache synchronously, persists async).

The pure fn never sees the clock, storage, or the native card → the entire eligibility policy is unit-testable in isolation, and the native card is the only thing the launch-gate smoke must cover.

---

## 7. Section 4 — Settings surface & i18n (D8–D9)

### D8 — Settings entries ✅
Two **independent** always-available rows in `YouScreen.js`, reusing the existing local `Row` + `Section` components (no new component — honoring the screen's "keep rows local" note). **NOT a Yes/No branch** — neither gates the other (compliance §2.2/§2.6). New **"Support"** `Section` placed **above** "About".

**Row 1 — "Send feedback" (always-available unhappy-user safety valve).** Client-only (no Worker/backend).
- Mechanism: `mailto:` composer via `Linking.openURL('mailto:…?subject=…&body=…')`.
- **Fallback (required):** guard with `Linking.canOpenURL`; if no mail client → **copy the support address to clipboard + confirmation toast** (or render as selectable text). The valve must remain usable without a configured mail app. **Caveat (library audit M4):** iOS `canOpenURL('mailto:')` can false-negative on URLs with spaces/quotes — **probe a bare `mailto:`** (no query) for the capability check, then open the full URL; lean on the clipboard fallback. **Reuse (DRY):** `expo-clipboard` and the `Toast` pattern are **already in `YouScreen.js:100-108`** — clone them verbatim; `Linking` must be newly imported into `YouScreen`.
- `recordFrustration('feedback')` fires on the **tap** (action-only signal) regardless of fallback path or whether the user cancels the composer.
- **Diagnostic footer = non-sensitive data only:** app version (`expo-constants`) / OS / resolved app-locale. **No** user IDs, **no** saved-moment data.
- **Owner-provided-at-launch:** the support email address (placeholder `support@inceptio.app` until owner supplies — not invented). LG5.

**Row 2 — "Rate Inceptio" (user-initiated store listing).** Opens the external store listing; user rates themselves there. Distinct from the automatic OS in-app card; **never** pre-selects stars.
- **Layered open order:** `StoreReview.storeUrl()` → hardcoded **native** store URL → hardcoded **web** store URL (browser, final fallback). Note `storeUrl()` returns **`null`** until owner sets `ios.appStoreUrl` / `android.playStoreUrl` (library audit) — so the fallback chain is **required, not optional**.
- **iOS write-review deep-link (domain refinement):** `storeUrl()` returns the plain *listing*, not the review page — append **`?action=write-review`** to the iOS URL so the user lands on the write-review sheet.
- `hasAction() === false` → soft no-op / toast, **never a crash**.
- Always visible — it is the manual route **and** the degrade path when the in-app card's `isAvailableAsync()` is false (EC1). No `recordFrustration` here (rating intent is positive/neutral).
- **Owner-provided-at-launch:** real **App Store ID** + **Play package name** don't exist until the app is created in the stores — these URLs are placeholders. **Row may ship now (dormant until on-store anyway); don't invent IDs.** LG5.

### D9 — i18n ✅ (chrome, 5 locales, allowlist stays 0)
Labels are **chrome** → `settings:` namespace, flat dotted keys (`keySeparator:false`, `nsSeparator:':'`), through the per-namespace coverage test in **all 5 locales** (`en, de, fr, es-419, pt-BR`). **Allowlist stays at 0 — no exception added.**

| Key | English | Notes |
|---|---|---|
| `settings:support.title` | Support | Header translatable (native-review for best per-locale term) |
| `settings:support.feedback` | Send feedback | |
| `settings:support.rate` | Rate Inceptio | Brand token **"Inceptio" stays untranslated** |

**`emailSubject` — PENDING owner sign-off (LG6).** Owner chooses:
- **(a) plumbing constant** (default lean) — English subject + resolved-app-locale tag, e.g. `Inceptio feedback (de)`, **NOT** a chrome key — for solo-dev inbox triage. → **3** chrome keys.
- **(b) localize** as a 4th chrome key `settings:support.emailSubject`. → **4** chrome keys.

Until owner confirms, **scaffold with (a)** and leave the 4th key out. Switching to (b) later is a trivial add.

**Minimal-strings choice:** the `mailto` **body** is a diagnostic footer (data, not prose) → needs no translation. The **OS review card itself is OS-localized** — nothing for us to translate there.

---

## 8. Section 5 — Dev/testability & Edge cases (D10, EC1–EC10)

### D10 — `__DEV__` manual trigger ✅ (mirrors the locale-pill pattern)
The real card doesn't reliably show in simulator/dev, so split "test the policy" from "test the card." Reuse the **existing `__DEV__` Debug section** in `YouScreen.js` — three new rows:

| Dev row | Action | Exercises |
|---|---|---|
| **Force rating eval** | Run `evaluateRatingEligibility` against *real* current history + synthetic `qualifying_save{grade:'exceptional'}`; show `{shouldAttempt, reason}` in an alert | The pure policy (assertable) + surfaces the short-circuit `reason` |
| **Force `requestReview()`** | Call `StoreReview.requestReview()` directly, **bypassing all eligibility/cooldowns/caps** | The native card on *this* device/build (not unit-testable) |
| **Reset rating state** | Clear all `rating.*` keys | Re-test floor/cooldowns from a clean profile |

**Hard requirement — production strip (LG9):** all three rows — **especially "Force `requestReview()`", which bypasses every guard** — must be compiled out of production builds (same discipline as the locale-pill). A leaked force-review would over-prompt and risk a manipulation flag. **File-presence ≠ runtime-behavior** — do not rely on "it's in a `__DEV__` block" without verifying the strip on a production build.

### Edge cases

- **EC1 — Store unavailable / `isAvailableAsync()===false`** (Play absent, sideload): in-app card no-ops, **burns no attempt slot**; the always-available Settings "Rate Inceptio" link is the degrade path.
- **EC2 — OS quota already exhausted** (iOS 3/365 used): API silently no-ops; undetectable. We still call best-effort (`.catch` swallow) and record *our* attempt (own cooldown). No retry, no error surfaced.
- **EC3 — Multiple qualifying events in one session** (view→save, or two saves): one attempt max — synchronous `lastAttemptAt` write makes the second evaluate hit `attempt_cooldown`. No stacking, no separate dedup guard.
- **EC4 — Reinstall wipes local counters**: acceptable — D3 floor re-applies (no immediate prompt) and the **OS quota persists at StoreKit level**, so real protection survives.
- **EC5 — Cooldown timestamp handling**: stored ISO instants; cooldown guards compare **elapsed duration** (not calendar-day); coarse-grained, BUG-001-aware.
- **EC6 — Clock skew**: **backward**-skew → stored ISO in the future → negative elapsed → treated as **cooldown-active (suppress)**, never eligible (errs toward not-prompting). **Forward**-skew is harmless — the **OS quota uses real server time**, not the device clock, as the true ceiling; only backward-skew needs explicit suppression handling (covered).
- **EC7 — Read before `hydrateStorage()`**: all eligibility reads occur post-boot (triggers fire from screens; `recordActiveDay` runs *after* `hydrateStorage()`). Never read pre-hydration.
- **EC8 — `requestReview()` throws**: `.catch(()=>{})` swallows; attempt already recorded; no crash. Same no-op-safe treatment for **Android's own undocumented quota**.
- **EC9 — `attemptsInWindow` growth**: shell prunes the ISO list to the last 365d before passing to the pure fn and before persisting → bounded (≤2–3 entries under the cooldowns).
- **EC10 — effect re-fire / double-count (archaeology R1 — the most likely silent bug):** `LoadingScreen`/`CalendarScreen` `useEffect`s re-run on cache-hit remounts, so `recordSuccessfulSearch` / `recordFrustration` / `maybePromptAfterView` could fire **more than once per search result**. **Required:** guard each with a per-result idempotency `useRef` keyed on a stable result identity (e.g. the search params / first window `start`), so a given result evaluates **exactly once** per mount-cycle. This is a MUST in the plan, not optional.

---

## 9. Implementation prerequisites

1. **Add `expo-store-review` via `npx expo install expo-store-review`** (pins `~55.0.x`; **`npm i` would pull `56.0.3`/SDK 56 — version mismatch**). API surface (`requestReview` / `isAvailableAsync` / `hasAction` / `storeUrl`) **verified correct** against first-party `expo/expo` source (library audit). **Native module → dev-client rebuild required**; won't hot-reload (LG4). **No config-plugin, no entitlement, no `Info.plist` / manifest key** needed for `requestReview`.
2. **Reuse `storage.ts`** (AsyncStorage wrapper) for all `rating.*` keys. Synchronous-cache-on-`set()` property **CONFIRMED** (`storage.ts:36-51`) — EC3 / D7 stacking holds.
3. **Add no new dependency for date math** — `date-fns` is **not installed**; use native `Date` millis (§6). `expo-clipboard` is **already installed and used** (`YouScreen.js`) — the mailto fallback is free.
4. **Owner inputs** (may stub now, required at launch): support email; App Store ID + Play package name (→ `ios.appStoreUrl` / `android.playStoreUrl`); `emailSubject` strategy (a)/(b).

---

## 10. File-change map (CLIENT-ONLY)

| File | Change |
|---|---|
| `apps/mobile/package.json` | + `expo-store-review` |
| `apps/mobile/src/lib/rating/eligibility.ts` | **new** — pure fn + types + `RATING_CONFIG` defaults |
| `apps/mobile/src/lib/rating/rating-store.ts` | **new** — `rating.*` read/write + 4 recorders |
| `apps/mobile/src/lib/rating/store-review.ts` | **new** — thin `expo-store-review` wrapper |
| `apps/mobile/src/lib/rating/use-rating-prompt.ts` | **new** — hook (`maybePromptAfterSave` / `maybePromptAfterView`) |
| `apps/mobile/src/lib/rating/eligibility.test.ts` | **new** — golden table (Node, zero mocks) |
| `apps/mobile/src/screens/MomentDetailScreen.js` | wire `maybePromptAfterSave` + `recordFirstSaveDone` after `saveMoment(...)` (`:194`, synchronous-void save) |
| `apps/mobile/src/screens/CalendarScreen.js` | wire `maybePromptAfterView` (grade = `topWindows[0]?.grade`) via a `useEffect([result])` with an idempotency `useRef` (EC10) |
| `apps/mobile/src/screens/LoadingScreen.js` | the **single funnel** for `recordSuccessfulSearch` (success effect) + `recordFrustration(source)` (error branch on `instanceof RateLimitError`/`UpstreamQuotaError` + `no_viable_windows`), each idempotency-guarded (EC10). Does **not** fire `maybePromptAfter*` (mid-flow) |
| `apps/mobile/App.js` | `recordActiveDay()` in the `hydrateStorage().then()` (`:113-130`) |
| `apps/mobile/src/screens/YouScreen.js` | new "Support" section (2 rows) + 3 `__DEV__` Debug rows |
| `apps/mobile/src/locales/{en,de,fr,es-419,pt-BR}/settings.json` | + `support.title` / `support.feedback` / `support.rate` (+`emailSubject` if owner picks (b)) |

**No Worker / shared-types / translations-package change.** Does not touch the deploy gate.

---

## 11. Testing

- **Unit (Node, zero mocks):** `eligibility.test.ts` golden table — one row per `EligibilityReason`, null-history first-attempt rows, exact-threshold boundary rows (D6). The grade cut reads **raw `w.grade`** — do **NOT** reuse `gradeToScorePill`, which collapses `good`→`strong` for *color only* and would corrupt the cut.
- **i18n coverage:** the existing per-namespace `settings` coverage test now asserts the new `support.*` keys in all 5 locales; allowlist stays 0.
- **Android automated tests:** use **`FakeReviewManager`** — never the real Play review manager in tests.
- **Not unit-testable → on-device smoke (§12.3):** card presentation.

---

## 12. Launch gate (§12.3 discipline)

The eligibility fn is fully unit-testable; card presentation is not assertable in Node.

### 12.1 On-device smoke (real device, not just simulator)
- **LG1** — Under forced-eligible (Debug "Force `requestReview()`"), confirm the system card **may appear** (it is best-effort even when eligible — assert "MAY appear," never MUST). *iOS leg (domain + library correction):* smoke on a **development build on a real device** — **NOT TestFlight**, where `isAvailableAsync()` resolves **`false`** and StoreKit suppresses the card. Treat absence as "system declined," never a wrapper bug. (iOS 26 has a modal-dismissal quirk — OS-level, not our bug.) *Android leg:* the card renders **only for an app installed via Google Play** (internal test track or higher); a sideloaded dev-client shows **nothing** — expected. So LG1-Android is gated on Play Console setup + an internal-track upload.
- **LG2** — Confirm it does **NOT** appear in the suppression contexts (`no_viable`, `429`/cap, error/empty, paywall, onboarding, mid-flow) — verify each via "Force rating eval" → `reason=suppressed_context`, and by live navigation.
- **LG3** — Confirm the **floor blocks a brand-new profile**: after "Reset rating state", no prompt until `distinctDayCount ≥ 2` ∧ `successfulSearches ≥ 2` ∧ not-first-save.

### 12.2 Prerequisites & owner-provided-at-launch
- **LG4** — `expo-store-review` added → **dev-client rebuild** (native module, won't hot-reload).
- **LG5** — Owner supplies: **support email** (D8 Row 1); **App Store ID + Play package name** (D8 Row 2 URLs). Rows may ship dormant.
- **LG6** — `emailSubject` strategy (a)/(b) — **owner sign-off pending** (D9).

### 12.3 Production-build & compliance verification
- **LG9** — On a **production build**, verify the three rating **Debug rows are absent** (file-presence ≠ runtime-behavior; a leaked force-review would over-prompt → manipulation-flag risk).
- **LG11 — Pre-submission compliance self-check:** re-verify the §2 guardrails — native API only; **no sentiment pre-question anywhere in any flow**; no incentive tied to rating; the Settings feedback channel is **independent and not a gate**; "Rate" never pre-selects stars and never calls `requestReview` (deep-links the store instead). *Guideline anchors (domain audit):* ratings-manipulation lives in **Apple §5.6.3 + Intro + §3**, and Google Play's **Ratings, Reviews & Installs** policy — **not** §1.1.7 (that's Safety/harmful-content).
- **LG12 — Accessibility smoke:** the two new Settings rows + the mailto clipboard-fallback toast announce correctly under screen-reader and meet hit-target size.

### 12.4 Post-launch dials (record, don't act)
- **LG7** — **Top-3 grade-cut distribution caveat** (D2): revisit the cut if real smoke-data shows `strong`/`exceptional` are actually frequent.
- **LG8** — If review volume is low: shorten `FRUSTRATION_COOLDOWN_DAYS`→7 first, then `MAX_ATTEMPTS_PER_365D`→3 (D5).

---

## 13. Decision summary

| ID | Decision |
|---|---|
| **D1** | Triggers v1 = (a) qualifying-grade save-success + (b) qualifying-grade result-view on a return day (distinct-day = gate, view = fire); defer (c). |
| **D2** | Grade cut = **Top-3** (`exceptional\|strong\|good`); governs both triggers; distribution-conditioned (LG7); owner-signed. `fair/caution/poor` never qualify. |
| **D3** | Floor = `distinctDayCount ≥ 2` ∧ `successfulSearches ≥ 2` ∧ not-first-save; checked first; owner-tunable to ≥3. |
| **D4** | Two-layer suppression: immediate 7-context guard + recent-frustration cooldown (429/upstream-quota/no_viable/error/feedback-action). |
| **D5** | `rating.*` keys + knobs 90 / 2 / 14; `distinctDayCount`+`lastActiveDay`; no `installDay`, no `hasRated`; calendar-day activity vs elapsed-duration cooldowns. |
| **D6** | Pure `evaluateRatingEligibility` — 8-step short-circuit, `{shouldAttempt, reason}`, injected `now`, Node-testable. |
| **D7** | `rating/` module — pure fn + store + native wrapper + hook; fire-and-forget; `isAvailableAsync` guard; 4 recorders; synchronous-cache stacking property. |
| **D8** | Two independent Settings rows in a new "Support" section: `mailto:` feedback (+clipboard fallback) and layered-fallback "Rate Inceptio"; owner-provided email + store IDs. |
| **D9** | 3 `settings:support.*` chrome keys, all 5 locales, allowlist 0; "Inceptio" untranslated; `emailSubject` (a)/(b) pending owner. |
| **D10** | Three `__DEV__` Debug rows (force eval / force requestReview / reset); **hard prod-strip** verified on a production build (LG9). |

---

*Brainstorm Sections 1–5 signed off gate-by-gate. Next: owner review of this spec → Compound V pre-flights (code-archaeologist + domain-expert + doc-validator) → writing-plans. No implementation until the spec is approved.*
