# App Rating Prompt — Code Archaeology (Compound V Phase 1A)

**Date:** 2026-06-09
**Branch:** `feature/rating`
**Scope:** CLIENT-ONLY. Confirms/corrects the Gate-0 archaeology pass in `docs/superpowers/specs/2026-06-09-app-rating-prompt-design.md`.
**Method:** flag-don't-fix. Findings only; no code modified. All claims below verified by reading the cited file:line.

---

## Findings

### F1 — `storage.ts` synchronous-cache property: CONFIRMED (load-bearing for EC3 / D7 stacking)

`apps/mobile/src/lib/storage.ts:36-51`. The wrapper holds a module-level `const cache = new Map<string,string>()` (line 18). `set()` writes the cache **first and synchronously**, then fires the AsyncStorage persist and discards the promise:

```ts
set(key: string, value: string): void {
  cache.set(key, value);                       // line 41 — synchronous
  AsyncStorage.setItem(key, value).catch(() => {});  // line 45 — fire-and-forget
}
```

`getString()` (line 37-39) is a pure `cache.get(key)` — no await, no AsyncStorage read. Therefore a `storage.set('rating.lastAttemptAt', iso)` is visible to the **very next synchronous** `storage.getString('rating.lastAttemptAt')` in the same JS tick. The spec's D7 / EC3 stacking-dedup property (§6 line 228, §8 EC3 line 288) **holds exactly as asserted**. No separate per-session guard needed.

Two caveats worth carrying into the plan (not corrections, but they bound the property):
- **Reads return `undefined` before `hydrateStorage()` resolves** (lines 16, 18, 37). The cache starts empty; it is only populated by `hydrateStorage()` (lines 21-34). Spec EC7 (line 292) already accounts for this — all rating reads occur post-boot. Confirmed safe.
- **Persist is best-effort**; an I/O failure is swallowed (`.catch(()=>{})`, line 45). So a `lastAttemptAt` write can fail to survive a process kill that races the async write. Acceptable for rating bookkeeping (worst case: one extra prompt opportunity after a crash mid-write). Not a blocker.

### F2 — Result-view fire point: RESOLVED. The screen is `CalendarScreen.js`, not "result-view screen(s)"; `LoadingScreen` is NOT a fire point.

There is **no standalone "results" screen**. The post-search results UI is **`apps/mobile/src/screens/CalendarScreen.js`** (the heatmap + list-view toggle). The flow is:

- `LoadingScreen.js:63-71` — on query success, navigates: `no_viable_windows === true → go('noviable')`, else `→ go('calendar')`. `LoadingScreen` itself renders no `top_windows` and is a mid-flow screen (in `MODAL_SCREENS`, `App.js:83`) → **must NOT be a fire point** (matches spec D4 Layer-1 item 7).
- `CalendarScreen.js` is where `top_windows`, `summary`, and per-window `grade` are first displayed to the user. It reads them at lines 196-200:

```js
const envelope = result?.envelope;
const heatmap = envelope?.data?.heatmap ?? [];
const topWindows = envelope?.data?.top_windows ?? [];   // line 198
const summary = envelope?.data?.summary;
const noViable = summary?.no_viable_windows ?? false;    // line 200
```

**Best/displayed grade availability on CalendarScreen:** grade is a **per-window** field (`w.grade`), NOT a top-level `summary.grade`. There is no `summary.grade`. The displayed-best grade for trigger D1(b) must be **derived** from `topWindows`. The screen already computes the best window per day (`bestWindowOfDay`, lines 244-249, picks max `score`) but there is **no single "overall best grade across the range" value** computed today. The cleanest single source is `topWindows[0].grade` — `top_windows` is rank-ordered (the screen relies on `w.rank` at lines 637/654 and slices `topWindows.slice(0,3)` for "closest moments"), so index 0 is the highest-ranked window. The plan should read **`topWindows[0]?.grade`** as "the best displayed grade."

**Is there a single natural "result viewed" moment to hook?** Yes — one. `CalendarScreen` is the result destination for the viable path. The natural break is **first successful render of CalendarScreen with a non-empty `topWindows`** (i.e. when `result` is present and `!noViable`). Recommended hook: a `useEffect` keyed on `result` (mirroring `LoadingScreen.js:63-71`'s success effect) that fires `maybePromptAfterView({ grade: topWindows[0]?.grade })` once per successful result. There is no separate "list view" vs "calendar view" result screen — the list/calendar toggle (lines 138-145) is in-screen state, same `topWindows`, so there is exactly ONE fire point regardless of which toggle is active.

**Correction to spec:** §10 file-change map row "result-view screen(s)" and §6 line 213 "the result-view natural break" should be pinned to **`apps/mobile/src/screens/CalendarScreen.js`, single fire point, grade via `topWindows[0]?.grade`.** Drop the plural "screen(s)."

One wrinkle for the plan (not a blocker): `MomentDetailScreen` is also reachable directly from `TodayScreen`/`CalendarScreen` taps and from a tab-bar deep-entry (it has its own `buildRequest` fallback, `MomentDetailScreen.js:99-105`). The spec's `RatingContext` already distinguishes `result_view` (Calendar) from `moment_detail`. D1(b) "result-view" = Calendar only; the save trigger D1(a) = MomentDetail. Keep them separate as the spec does.

### F3 — Save-success hook point: CONFIRMED with a sharpening. `saveMoment()` is SYNCHRONOUS and VOID — there is no failure path to distinguish.

`MomentDetailScreen.js:181-196`:

```js
function handleSave() {
  if (!w) return;
  saveMoment({ id: `${w.start}_${activity}`, activity, city, start: w.start,
    end: w.end, duration_minutes: w.duration_minutes, score: w.score,
    grade: w.grade, headline, saved_at: new Date().toISOString() });
  showToast(t('toast.saved'));
}
```

`saveMoment` (`draft-store.ts:133-138`) returns `void`, not a Promise. It calls `writeJson` → `storage.set` (F1), which **cannot throw** on persist failure (the I/O error is swallowed in `storage.ts:45`). So:

- **"Save success" = the statement after `saveMoment(...)` returns**, i.e. right where `showToast(t('toast.saved'))` is (line 195). There is no async resolution, no try/catch, no error branch.
- The spec's repeated framing "fires on save success / failed save → no fire" (§4 line 55, §5 line 95, §6 line 211, EC-model line 94) is **technically vacuous**: a save cannot fail-and-be-detected in the current code. The only "no fire" guards that actually exist are the **synchronous early return `if (!w) return;`** (line 182) and the grade cut. **Correction:** the plan should place `maybePromptAfterSave(saved)` + `recordFirstSaveDone()` immediately after `saveMoment(...)` (after line 194, alongside/after `showToast`), and drop the "only on save success, not failure" language — there is no failure signal. The grade read is `w.grade` (passed into the saved object, line 192), available synchronously.

### F4 — Recorder wiring points

**(a) `recordSuccessfulSearch()` — search SUCCESS path.**
The search hook `useElectionalSearch.ts` (note: `.ts`, NOT `.js` — spec implies `.js`) is a thin `useQuery` wrapper (`useElectionalSearch.ts:41-59`) with **no success callback** (no `onSuccess` — TanStack v5 removed it; the repo is on `@tanstack/react-query` v5 per `App.js:13`). So "search success" must be observed at a **consumer** via the `result` object, exactly like `LoadingScreen.js:63-71` does. The single canonical success point is **`LoadingScreen.js:63-71`** — the `useEffect(() => { if (!result) return; ... }, [result, go])` that runs once when the query resolves and routes to `calendar`/`noviable`. That is the one place every successful search funnels through. Recommended: call `recordSuccessfulSearch()` inside that effect, in the `else` (viable) **and** the `noViable` branch (a no-viable result is still a *successful search* per spec D3 floor semantics — but note it ALSO is a frustration event; see (b)). The plan must decide ordering: a no-viable result should `recordSuccessfulSearch()` AND `recordFrustration('no_viable')`. Both can fire; the floor counter and the frustration cooldown are independent keys.

Caveat: `LoadingScreen`'s effect re-runs whenever `result` identity changes. With React Query caching, a cache-hit re-mount yields the same `result`. The plan needs an idempotency guard (e.g. a `useRef` "already recorded for this result") so re-entering Loading off a cached query doesn't double-increment `successfulSearches`. Flagging — this is a real double-count risk the spec doesn't mention.

**(b) `recordFrustration(source)` — error/quota/no-viable paths.**
The typed error hierarchy lives in `api.ts:31-103`: `RateLimitError` (line 52, the 429 device cap), `UpstreamQuotaError` (line 70), `NetworkError`/`TimeoutError`/`SchemaMismatchError`/`DateRangeError`/`ServerError`. The 429 split (device cap vs upstream quota) happens in `searchElectional` at `api.ts:156-175` — `RATE_LIMIT_EXCEEDED` → `UpstreamQuotaError`, else `RateLimitError`. These surface to screens as the `error` object from `useElectionalSearch`. Mapping to friendly copy is centralized in **`error-messages.ts:22-31` (`friendlyMessage(err)`)** via `instanceof` checks.

Fire points for `recordFrustration`:
- **Search error:** `LoadingScreen.js:75-105` (`if (isError)` branch) — fires for ALL search errors (network/timeout/rate-limit/upstream-quota/schema/server). To distinguish `rate_limited` vs `upstream_quota` vs generic `error` for the spec's `source` arg, branch on `error instanceof RateLimitError` / `UpstreamQuotaError` (import from `api.ts`) inside that branch, else `'error'`. `CalendarScreen.js:396-407` and `MomentDetailScreen.js:120-128` and `NoViableScreen.js:91-102` also have `isError` branches reading the same cached query — but the FIRST screen the error hits is `LoadingScreen`, so recording there (with the idempotency guard from (a)) is the single canonical point. The downstream screens read the same cached error; do NOT also record there or you double-count.
- **`no_viable_windows`:** detected at `LoadingScreen.js:65` (`const noViable = result.envelope?.data?.summary?.no_viable_windows`) before `go('noviable')`. Record `recordFrustration('no_viable')` there. (`NoViableScreen.js:64-71` is the destination but reads the cached result; record at the Loading decision point, not on NoViable mount, to keep one source.)
- **Feedback action:** `recordFrustration('feedback')` fires on the Settings "Send feedback" tap (new code in `YouScreen.js`), per spec D8 line 242.

**Correction to spec:** §5/§10 say "search success path" / "429 + error paths" generically. The actual single funnel is **`LoadingScreen.js`'s two effects** (success effect lines 63-71; error branch lines 75-105) — NOT the hook (`useElectionalSearch.ts` has no success/error callback in v5) and NOT each screen's `isError` branch (those read cached state and would double-fire). Pin recorders to LoadingScreen + add a per-result idempotency ref.

**(c) `recordActiveDay()` — App boot AFTER `hydrateStorage()`.**
`App.js:108-131`. The post-hydration call site exists and is exactly where the spec wants it:

```js
useEffect(() => {
  initI18n();
  hydrateStorage().then(() => {
    storage.delete('inceptio.results_view');     // line 117
    migrateLocationTimezones_v1();                 // line 124
    initActivityPreference();                      // line 126
    initLocationPreference();                      // line 128
    setStorageReady(true);                         // line 129
  });
}, []);
```

`recordActiveDay()` slots cleanly inside the `.then()` callback (after line 128, before/with `setStorageReady(true)`). The cache is hydrated at that point (F1), so the read-modify-write of `rating.lastActiveDay`/`rating.distinctDayCount` is safe. Confirmed — spec §6 line 224 and EC7 line 292 hold.

### F5 — `__DEV__` production-strip mechanism: CONFIRMED COMPILED-OUT (LG9 is satisfiable).

`apps/mobile/babel.config.js` uses `babel-preset-expo`. In production, `babel-preset-expo/build/index.js:142-146` inlines literals:

```js
if (isProduction) {
  inlines['process.env.NODE_ENV'] = 'production';
  inlines['__DEV__'] = false;          // line 145
  inlines['Platform.OS'] = platform;
}
// extraPlugins.push([require('./define-plugin'), inlines]);  (line 152)
```

So `__DEV__` is **replaced with the literal `false`** at transform time (not left as a runtime-`false` global), and the Metro production minifier then dead-code-eliminates `if (false) { ... }` and `false && (...)` branches. This means:
- `App.js:152` (`__DEV__ ? activeBundle() : 'en'`), `App.js:167` (`{__DEV__ && (<DevLocaleBar/>)}`), and `YouScreen.js:206` (`{__DEV__ && showDebug && (...)}`) are **compiled out**, not merely runtime-guarded.
- LG9 ("verify the three rating Debug rows are absent on a production build") is **satisfiable and meaningful**: a production EAS build (`eas.json` `build.production` → `NODE_ENV=production`) will physically not contain the rows. Verification method: build production, inspect the bundle (e.g. `grep` the minified bundle for the debug row i18n keys / `requestReview`), or run on-device and confirm absence + that the strings aren't in the JS bundle.

**Sharpening for the plan:** put the three rating Debug rows inside the **existing** `{__DEV__ && showDebug && (...)}` block at `YouScreen.js:206`. Note that block is **double-gated**: `__DEV__` (compiled out in prod) AND `showDebug` (a runtime state, default `false`, revealed only by a 3-second long-press on the About header — `YouScreen.js:36-42`, `199-201`). So even in a dev build the rows are hidden until the long-press. This is *stronger* than the spec's "mirror the locale-pill" framing (the locale pill at `App.js:167` is `__DEV__`-only with no second gate). The "Force requestReview()" row inheriting the `showDebug` gate is a bonus safety margin. Confirmed; no correction, just better than assumed.

### F6 — Settings / i18n mechanics: CONFIRMED, with one enforcement nuance.

- **5 locale settings.json paths CONFIRMED:** `apps/mobile/src/locales/{en,de,fr,es-419,pt-BR}/settings.json` all exist (verified `ls src/locales` → `de en es-419 fr pt-BR`; `index.ts:25,44,63,82,101` import all five `*_settings`).
- **Key shape CONFIRMED:** flat dotted keys, `keySeparator:false`, `nsSeparator:':'` (`i18n/index.ts:228-229`). Existing keys use dotted literals like `"section.about"`, `"row.version"`, `"toast.comingSoon"` (en/settings.json). New `support.title`/`support.feedback`/`support.rate` match this shape exactly (flat literal keys with a `.`). Access via `t('row.version')` style; the screen calls `useTranslation('settings')` (`YouScreen.js:25`) then `t('...')`.
- **Coverage test path:** there are TWO enforcers:
  1. **`apps/mobile/src/i18n/__tests__/settings-coverage.test.ts`** — the per-namespace test. Its first `it` (lines 13-21) iterates `Object.keys(en)` **dynamically** and asserts every en key exists in de/fr/es-419/pt-BR. This **WILL enforce** the new `support.*` keys across all 5 locales automatically once added to en. ✅
  2. **`apps/mobile/src/i18n/__tests__/coverage.test.ts`** (the generic walker, the path the spec cited as `coverage.test.ts:96`) — `every CHROME key in en is present in de/fr/es-419/pt-BR` (lines 121-139) also catches it. ✅

  **Nuance / correction:** the spec's archaeology table cites `__tests__/coverage.test.ts:96`. Line 96 is the `TRANSLATION_DEFERRED = []` allowlist declaration, not the assertion. The actual per-namespace enforcer the spec's D9 relies on is **`settings-coverage.test.ts:13-21`** (dynamic key walk). Cite that. Also note `settings-coverage.test.ts:23-58` is a **hardcoded core-key list** that does NOT auto-include `support.*` — it won't fail without them, and it doesn't need updating (the dynamic test covers enforcement). Optionally add `support.*` to the hardcoded list for documentation, but it's not required for coverage.
- **Allowlist:** `TRANSLATION_DEFERRED = []` (`coverage.test.ts:96`), asserted empty (lines 192-197). Adding `support.*` requires real translations in all 5 locales — no allowlist exception available. Spec D9 "allowlist stays 0" CONFIRMED.

### F7 — Incidental findings (things the spec got slightly wrong or that will bite)

1. **`gradeToScorePill` maps `good` → visual `strong` tier** (`MomentDetailScreen.js:74-83`): `if (grade === 'strong' || grade === 'good') return { kind: 'strong', ... }`. This is **display/color mapping only** — it does NOT affect the rating eligibility cut. The rating grade cut must read the **raw** `w.grade` string (`'good'` stays `'good'`), exactly as the spec's pure fn does (D6 `Grade` union includes `'good'` distinctly). No conflict, but worth noting: do NOT reuse `gradeToScorePill` for the cut — it collapses `good`→`strong` and would mis-bucket. The spec correctly reads raw `w.grade`; keep it that way. The `fair` grade maps to display label "favorable" (`gradeVoice('favorable')`, line 77) — a UI-label detail, irrelevant to the cut.

2. **`expo-clipboard` is ALREADY a dependency AND already used** (`package.json:27` `"expo-clipboard": "~55.0.13"`; used in `YouScreen.js:12,103` `Clipboard.setStringAsync(deviceId)`). The spec's D8 mailto-fallback "copy support address to clipboard + toast" can **reuse the existing pattern** at `YouScreen.js:100-108` (`copyDeviceId`) verbatim — no new dep, no new import beyond what YouScreen already has. DRY win: clone that handler shape.

3. **Toast is already wired in YouScreen** (`YouScreen.js:15,27-31,231-238`) with the same `showToast(message, tone)` / `dismissToast` / `<Toast key tone onDismiss>` pattern used in `MomentDetailScreen`. The spec's "confirmation toast" for the clipboard fallback reuses this existing in-screen Toast — no new component. DRY win.

4. **`Linking` is already used** but NOT imported in YouScreen — current usage is `LocationPickerScreen.js:16,108` (`Linking.openSettings()`). YouScreen does **not** import `Linking` today; the plan must add `import { Linking } from 'react-native'` to YouScreen for the `mailto:` composer. No existing `Linking.openURL('mailto:...')` anywhere in the app — this is net-new. `Linking.canOpenURL` (spec D8 guard) is also unused today; standard RN API, fine to add.

5. **`expo-constants` is already a dep and used** (`package.json:28`; `YouScreen.js:11,94` `Constants.expoConfig?.version`). The spec's D8 diagnostic-footer "app version via expo-constants" reuses `Constants.expoConfig?.version ?? '0.0.0'` exactly as `YouScreen.js:94` already does. App version is currently `"0.1.0"` (`app.json` `expo.version`). DRY win.

6. **`expo-store-review` is NOT installed and has ZERO usage** — confirmed `grep` of `src/` + `package.json` returns nothing for `expo-store-review`/`StoreReview`/`requestReview`. Spec §3 CONFIRMED. This is a net-new native dependency requiring a dev-client rebuild (spec LG4). NOTE: `app.json` `expo.plugins` (lines listing expo-font/calendar/location/sharing/localization) does **not** include expo-store-review; if the SDK 55 module needs a config plugin, the plan must add it there. The doc-validator (Phase 1C) should confirm whether expo-store-review needs a plugins entry for SDK 55.

7. **App is a dev-client app, not Expo Go** — `eas.json` `build.development`/`simulator` set `developmentClient: true`. CLAUDE.md still says "Expo SDK 55, react-native-mmkv" but `storage.ts:1-12` documents the AsyncStorage swap (MMKV needs a dev client it doesn't yet use). Spec §3 already flagged the MMKV/AsyncStorage staleness. CONFIRMED stale-but-flagged. The native-module-OK claim holds (dev client present).

8. **`MomentDetailScreen.js` is `.js`, `MomentDetailScreen` save path uses `w.grade` raw** — both as spec says. But the spec §3 table cites `MomentDetailScreen.js:181` for `handleSave` grade write; the grade is actually assigned at **line 192** (`grade: w.grade`), with `handleSave` *starting* at line 181. Minor line-number sharpening.

9. **No `RatingContext: 'mid_flow'`/`'paywall'` surface will ever call the trigger** — the trigger hooks only get wired into CalendarScreen (view) and MomentDetailScreen (save). `LoadingScreen`, `ActivityPickerScreen`, `DatePickerScreen`, `LocationPickerScreen`, `PaywallScreen`, `OnboardingScreen` never import the hook. So the Layer-1 `context` guard (D4) is defense-in-depth as the spec says (§5 line 82) — confirmed, the suppressed contexts are unreachable by construction, the `context` param exists only to make the pure fn self-defending and testable. No correction.

---

## Corrections to spec (actionable)

| # | Spec location | Correction |
|---|---|---|
| C1 | §10 file map "result-view screen(s)"; §6 line 213 | The result-view fire point is a **single** screen: `apps/mobile/src/screens/CalendarScreen.js`. Drop plural. Hook a `useEffect([result])` (mirror `LoadingScreen.js:63-71`) firing `maybePromptAfterView({ grade: topWindows[0]?.grade })`. Grade source = `topWindows[0]?.grade` (rank-ordered; there is no `summary.grade`). |
| C2 | §4 line 55, §5 line 95, §6 line 211, §8 EC3 | `saveMoment()` is **synchronous + void** (`draft-store.ts:133`) and cannot signal failure (persist error swallowed, `storage.ts:45`). "Only on save success / failed save → no fire" is vacuous. Place `maybePromptAfterSave` + `recordFirstSaveDone` right after `saveMoment(...)` in `MomentDetailScreen.js:181-196` (after line 194). Only real guard is `if (!w) return;` (line 182). |
| C3 | §5/§10 "search success path", "429 + error paths" | Recorders funnel through **`LoadingScreen.js`** (success effect 63-71; error branch 75-105), NOT the hook (`useElectionalSearch.ts` v5 has no `onSuccess`/`onError`) and NOT each screen's `isError` (cached → double-fire). Branch error source on `instanceof RateLimitError`/`UpstreamQuotaError` (from `api.ts`). Record `no_viable` at `LoadingScreen.js:65`. **Add a per-result idempotency `useRef`** — the effect re-runs on cache-hit remount → would double-count `successfulSearches`/`recordFrustration`. (Spec omits this.) |
| C4 | §3 table cite `coverage.test.ts:96` | Line 96 is the empty-allowlist declaration. The per-namespace enforcer for new `support.*` keys is **`settings-coverage.test.ts:13-21`** (dynamic `Object.keys(en)` walk) plus the generic `coverage.test.ts:121-139`. Cite those. `settings-coverage.test.ts:23-58` is a hardcoded list that won't auto-enforce `support.*` (and doesn't need to). |
| C5 | §3 table cite `MomentDetailScreen.js:181` | `handleSave` opens at line 181; the `grade: w.grade` write is at **line 192**. Minor. |
| C6 | useElectionalSearch path | It is **`useElectionalSearch.ts`** (TypeScript), not `.js`. |

## Open risks

- **R1 (medium) — double-count on cache re-entry.** `LoadingScreen`'s success/error effects re-run whenever `result`/`error` identity changes, including a re-mount over a React-Query cache hit. Without an idempotency guard, `recordSuccessfulSearch`/`recordFrustration` fire more than once per logical search. The plan MUST add a `useRef` (or record keyed on `result` identity). The spec does not mention this; it is the single most likely silent bug.
- **R2 (low) — "best grade for D1(b)" definition.** No `summary.grade` exists; `topWindows[0]?.grade` is the de-facto best (rank-ordered). If a future Worker change re-orders `top_windows` or `top_windows` is empty on a viable result, the view trigger reads `undefined` → pure fn `below_grade_cut` → no fire (fail-safe). Acceptable, but the plan should assert "empty topWindows on viable result → no prompt" as a golden-table-adjacent expectation.
- **R3 (low) — expo-store-review config plugin.** `app.json` `plugins` has no store-review entry. If SDK 55's module requires one, omission silently breaks the native call. Defer to Phase 1C doc-validator to confirm the SDK-55 plugin requirement.
- **R4 (low) — `requestMetaHeaders` / `X-Locale`.** Not relevant to client-only rating (no Worker call), but note `activeBundle()` (`i18n/locale.ts`) is the resolved app-locale the spec's diagnostic footer wants — reuse `activeBundle()` for the footer's locale tag, not the device locale.
- **R5 (informational) — CLAUDE.md / MEMORY drift.** CLAUDE.md still says MMKV (storage is AsyncStorage) and `searches_used_count` MMKV counter (the live server cap is 5/day, client-only sees 429). Spec §3 already flagged both. No client rating code depends on the stale claims; safe.

---

## File Touch Map (for Phase 2 partitioning)

| File | Change | Shared? |
|---|---|---|
| `apps/mobile/package.json` | + `expo-store-review` dep | **SHARED RESOURCE** — dependency manifest; lockfile (`package-lock.json`/`yarn.lock`) regenerates. Order/merge-sensitive. |
| `apps/mobile/app.json` | possibly + expo-store-review plugins entry (pending Phase 1C) | **SHARED RESOURCE** — config; `plugins` array order can matter. |
| `apps/mobile/src/lib/rating/eligibility.ts` | new — pure fn + types + `RATING_CONFIG` | no |
| `apps/mobile/src/lib/rating/rating-store.ts` | new — `rating.*` read/write + 4 recorders (imports `storage.ts`) | no |
| `apps/mobile/src/lib/rating/store-review.ts` | new — `expo-store-review` wrapper | no |
| `apps/mobile/src/lib/rating/use-rating-prompt.ts` | new — hook (`maybePromptAfterSave`/`maybePromptAfterView`) | no |
| `apps/mobile/src/lib/rating/eligibility.test.ts` | new — golden table (Node, zero mocks) | no |
| `apps/mobile/src/screens/MomentDetailScreen.js` | wire `maybePromptAfterSave` + `recordFirstSaveDone` after `saveMoment` (line ~194) | no |
| `apps/mobile/src/screens/CalendarScreen.js` | wire `maybePromptAfterView` via `useEffect([result])` (single fire point, F2) | no |
| `apps/mobile/src/screens/LoadingScreen.js` | wire `recordSuccessfulSearch` (success effect) + `recordFrustration` (error branch + no_viable) + idempotency ref | no |
| `apps/mobile/App.js` | `recordActiveDay()` inside `hydrateStorage().then()` (after line 128) | **SHARED RESOURCE** — root boot sequence; order-sensitive (must run post-hydrate, alongside init* calls). Many tasks read/edit App.js. |
| `apps/mobile/src/screens/YouScreen.js` | new "Support" Section (2 Rows) above "About"; 3 new rows inside existing `{__DEV__ && showDebug}` block (line 206); add `Linking` import | no (single-screen, but two concerns — Support rows + Debug rows — partition together) |
| `apps/mobile/src/locales/en/settings.json` | + `support.title`/`support.feedback`/`support.rate` (authoritative) | **SHARED RESOURCE** — en is the coverage-test source-of-truth; every other locale + the dynamic coverage test key off it. |
| `apps/mobile/src/locales/{de,fr,es-419,pt-BR}/settings.json` | + same 3 keys, translated | **SHARED RESOURCE** — enforced by `settings-coverage.test.ts` + `coverage.test.ts`; must land in the SAME change as en or tests fail. |

**No Worker / shared-types / translations-package change.** Does not touch the deploy gate. Confirmed against spec §10.
