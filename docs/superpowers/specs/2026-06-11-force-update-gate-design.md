# Server-Driven Force-Update Gate + Soft Update Banner — Design Spec

**Date:** 2026-06-11
**Status:** Brainstorm complete (Sections 1–9, gated section-by-section sign-off). **Compound V pre-flights folded in (2026-06-11)** — see §3.1. Awaiting owner review of this spec before writing-plans.
**Pre-flight audits:** archaeology `docs/superpowers/expert/2026-06-11-force-update-gate-archaeology.md` · domain `docs/superpowers/expert/2026-06-11-force-update-gate-domain.md` (+ KB `_knowledge-base/app-store-review.md`) · library `docs/superpowers/library-audit` (inline, below). Verdicts: **forced self-update is store-compliant** (de-risks the feature); **3 must-fix corrections** (KV binding name, `accessibilityAutoFocus` not real, store-URL/`canOpenURL` trap); **release-engineering footguns** added to the runbook; dev-simulator promoted from optional to **mandatory**.
**Branch:** TBD (suggest `feature/force-update-gate`)
**Scope:** **CLIENT + WORKER.** Adds one new Worker endpoint (`GET /version-policy`) and a client gate/banner. Dormant until release #2 (no prior published version exists to force/notify against at first launch).
**OTA note (load-bearing constraint):** **expo-updates / EAS Update is NOT present** in the project — `package.json` has `expo-application` + `expo-constants` but no `expo-updates`; `eas.json` configures only build/submit profiles, no `updates`/`runtimeVersion`/channel. **The gate logic itself is therefore NOT OTA-hotfixable.** A client bug that wrongly hard-locks users can only be fixed by shipping a new native build. This raises the stakes on two things: (1) the fail-open contract is the only client-side safety net, and (2) the **Worker kill-switch is the primary remediation lever** — server-side, instant, no release.

---

## 1. Why

Ship a server-controlled mechanism that can (a) **force** users off a dangerously-old build when a critical/breaking issue is found, and (b) **softly nudge** users toward a newer build — both driven by the existing Cloudflare Worker, both keyed on the installed **native marketing version** (OTA-independent), both **fail-open by construction**.

The hard part is **not** the UI (a full-screen gate + a dismissible banner). The hard part is the **safety contract**: because the gate is not OTA-fixable, the lockout-capable code path must be **total, pure, golden-tested, and fail-open** — its only safe failure mode is "let the user in" — and the server must carry an instant **kill-switch** so an operator error can be corrected in ≤60s without an app release.

This mirrors the proven `lib/rating` shape: a **pure core** (zero native/storage/clock, golden-tabled) wrapped by an **impure shell** (fetch, storage, AppState, native version read).

---

## 2. Locked decisions (fixed constraints — not design knobs)

These were locked before/at the start of the brainstorm and are **boundaries**, not options.

1. **Server-driven via the existing `api-proxy` Worker.** Worker returns a per-platform version policy: `{ ios | android: { minVersion, latestVersion, storeUrl } }` plus a top-level kill-switch.
2. **Two-tier behavior:**
   - `installed < minVersion` → **FORCE**: root-level, non-dismissible full-screen gate; single **Update** action → `Linking.openURL(storeUrl)`. No skip/close.
   - `minVersion ≤ installed < latestVersion` → **SOFT**: dismissible "update available" banner with version-keyed suppression + cooldown (reuse the rating feature's suppression discipline; do not nag).
   - `installed ≥ latestVersion` → **nothing**.
3. **Compare the installed NATIVE marketing version** — `expo-application` → `nativeApplicationVersion`. OTA-independent.
4. **semver comparison** — not string compare, not build number.
5. **FAIL-OPEN.** On fetch error / offline / Worker down / malformed policy → do **not** block; let the user in. The gate *fires* only on a successfully-fetched, successfully-parsed `installed < minVersion`.
6. **Re-check on launch AND on AppState `'active'`** (returning from the store without updating must remain blocked).
7. **Pure, unit-testable decision fn**, golden-tabled, TDD — mirrors the rating eligibility fn.
8. **Dev-override** to bypass the gate in `__DEV__` so we can't self-lock during tests.
9. **i18n** in all 5 locales (`en, de, fr, es-419, pt-BR`), new CHROME namespace, deferred-allowlist stays at zero.
10. **a11y** on the gate screen **and** the soft banner.
11. **Root-render integration** mirrors the existing first-run gate in `App.js`; **force-update outranks all** (onboarding, location, rating).

---

## 3. Archaeology (confirmed against the codebase)

| Fact | Finding | Path |
|---|---|---|
| expo-updates / EAS Update | **Absent.** No `expo-updates` dep; `eas.json` has build/submit only, no `updates`/`runtimeVersion`/channel. → gate is **not OTA-hotfixable**; Worker kill-switch is the primary lever. | `apps/mobile/package.json`, `apps/mobile/eas.json` |
| Native version read | `expo-application` present → `Application.nativeApplicationVersion` (sync getter, marketing version, OTA-independent). | `apps/mobile/package.json` |
| `semver` dep | **None.** Write a small zero-dep parse/compare util (matches the no-date-fns discipline). | (absence) |
| `AppState` usage | **None anywhere** in `src`. New subscription. | (absence) |
| Root gate pattern | `App.js` uses a "single first-run authority": `resolveLandingScreen(activity, location)` derives the landing screen; boot/pref-hydration guards are early returns; **hooks are called above all conditional returns** (documented Rules-of-Hooks lesson). Force gate inserts as a new early return. | `apps/mobile/App.js` |
| Pure/impure split precedent | `lib/rating/eligibility.ts` = pure (injected `now`, no storage/native, golden-tested) + `lib/rating/rating-store.ts` = impure shell (storage keys, recorders, `elapsedDays` native-Date math). Exact template for this feature. | `apps/mobile/src/lib/rating/` |
| Storage | AsyncStorage wrapper (`storage.ts`), **sync in-memory cache after `hydrateStorage()` at boot**; API `getString`/`set`/`delete`. (CLAUDE.md says MMKV — stale.) | `apps/mobile/src/lib/storage.ts` |
| date math | No `date-fns`. Reuse the rating pattern's native-`Date` `elapsedDays`. | `apps/mobile/src/lib/rating/eligibility.ts` |
| i18n | 17 CHROME namespaces, each present in all 5 locales, enforced by `coverage.test.ts` (all-5 file existence + every-en-key-present). `nsSeparator:':'`, `keySeparator:false`. **Deferred-allowlist `TRANSLATION_DEFERRED = []` (locked at zero).** | `apps/mobile/src/i18n/__tests__/coverage.test.ts` |
| Dev-pill pattern + prod-strip | `DevLocaleBar` + `StatePicker`, `__DEV__`-only, compiled out in prod (babel inlines `__DEV__=false` → dead-code-eliminated). Safe template for the dev-override simulator. | `apps/mobile/App.js` |
| shared-types | Existing package for the API contract — the right home for the `VersionPolicy` Zod schema (single source of truth for Worker + app). | `packages/shared-types/` |

### 3.1 Compound V pre-flight reconciliation (corrections folded into the sections below)

**Code archaeology (CORRECTED / MISSING):**
- **KV binding is `CACHE`, not `POLICY`.** One KV namespace (`CACHE`, shared by search-cache + rate-limit + health) in `wrangler.toml` / `env.ts:Env.CACHE`. No `POLICY` binding. Reuse `CACHE` with reserved key `version-policy` (matches the `health:upstream` key precedent). §6 updated.
- **`Application.nativeApplicationVersion` returns Expo Go's version inside Expo Go** (documented at `YouScreen.js:93-96`, which is why YouScreen reads `Constants.expoConfig.version` instead). Correct only in a real standalone build. → the `__DEV__` simulator is **mandatory**, the only way to exercise the gate locally. Do **NOT** switch to `expoConfig.version` (wrong axis for a native force gate). §7.6 updated.
- **Worker route convention is `src/routes/<name>.ts` + an `if`-ladder in `index.ts`** — file is `src/routes/version-policy.ts`, not `src/version-policy.ts`. §4 updated.
- **`App.js` has 3 boot/hydration guards, not 2**, and guards #2/#3 return a bare `ActivityIndicator` **not** wrapped in `withProviders` — so the force gate must self-wrap (it already does, §8.4). No `localeReady` signal exists; locale resolution is synchronous and coupled to `storageReady` → treat `storageReady` as the de-facto locale-ready gate. §8 updated.
- **Don't reuse `API_CONFIG.timeout` (60s)** for the policy fetch — own ~5s AbortController. Prod Worker `baseUrl` still TBD (`https://api.inceptio.app`). §7.1 updated.
- **DRY:** import `elapsedDays` / `MS_PER_DAY` from `rating/eligibility.ts` (don't re-derive); reuse the `Linking.openURL` fallback story from `rating/store-review.ts:48-64`.
- **Highest-blast-radius shared file:** `src/i18n/index.ts` is an eager-import barrel with a **17-arg positional `bundle()` factory** — the 18th namespace requires editing the signature + 5 imports + 5 call sites. Plus `App.js`, the Worker/shared-types barrels, `coverage.test.ts`, `no-literal-lint.test.ts` are shared-resource files for Phase-2 partitioning. §4/§10 updated.

**Domain (compliance + release engineering):**
- **Forced self-update is store-compliant on BOTH stores** — Apple Guideline 3.2.2(x) only bars forcing *rating/review/other-app downloads*, not updating your own app; WhatsApp/Signal precedent. (De-risks the feature; arm the owner with the citation.)
- **MUST-FIX (release engineering), added to the §6.5 runbook:** (a) the build *under review* must never force-gate itself (chicken-and-egg → rejection); (b) phased/staged rollout makes `latestVersion` a **moving regional target** — set **both** thresholds only after 100% rollout + ≥24h in all regions; (c) "Release to All Users" (iOS) / staged-rollout-to-100% (Android) is a **prerequisite** before any emergency `min` bump.
- **SHOULD-CONSIDER:** document why a custom gate over Google Play's first-party in-app-update flow (rationale: cross-platform, server-kill-switchable, OTA-independent). Added to §13.

**Library validation (API correctness):**
- **MUST-FIX: `accessibilityAutoFocus` is not a real RN core prop** — use `AccessibilityInfo.setAccessibilityFocus(findNodeHandle(titleRef))` in a mount effect. §11 updated.
- **Use RN core `Linking`** (`expo-linking` is not a dependency) with **`https://` store URLs**; skip `canOpenURL` for https (avoids the iOS `itms-apps`/`LSApplicationQueriesSchemes` trap where `canOpenURL` falsely returns false and kills the only Update button). Guard on the `openURL` rejection for the `openFailed` toast. §10 updated.
- **Kill-switch worst-case propagation ~2 min, not ≤60s** — Workers KV is eventually consistent (≤60s) and stacks with the `max-age=60` edge cache. Doc claims corrected to "≤2 min" in §6/§7. (Architecture unaffected: fail-open + degrade-to-soft already bound the blast radius.)
- **Confirmed OK:** Zod is v3 (3.25.76, `import { z } from 'zod'`), AppState subscription `.remove()` API + states + iOS `inactive` nuance, `AbortController`+`fetch({signal})` manual `setTimeout` pattern (no `AbortSignal.timeout` in Hermes 0.83), Workers KV `get(key,'json')`, `Cache-Control` on Response, all other a11y props correctly platform-scoped.

---

## 4. Section 1 — Module architecture & file layout (APPROVED)

Mirror the `lib/rating` split: a **pure core** (golden-testable) + an **impure shell** (I/O quarantined). New code is isolated under one directory; the only edits to existing files are integration points.

```
apps/mobile/src/lib/update-gate/
  semver.ts            // PURE. parseSemver(x) + compareSemver(a,b). Zero deps. Defensive.
  decision.ts          // PURE, TIME-FREE, TOTAL, FAIL-OPEN.
                       //   evaluateUpdateState(installed, policy, platform) → { state, reason }
  banner-policy.ts     // PURE, time-aware. shouldShowSoftBanner({state, latestVersion,
                       //   suppression, config, now}) → boolean  (rating suppression discipline)
  policy.ts            // RE-EXPORTS the VersionPolicy Zod schema + types FROM shared-types.
                       //   Schema is defined ONCE in shared-types; never duplicated here.
  update-store.ts      // IMPURE shell. fetchPolicy() (zod-parse, fail-open), native version read,
                       //   soft-dismissal storage keys, dev-override.
  use-update-gate.ts   // Hook. Wires fetch + AppState + while-gated poll + throttle; exposes
                       //   { state, recheck, ... } to App.js. Encodes the safety/reach contract.
  __tests__/
    semver.test.ts         // golden table
    decision.test.ts       // golden table — THE safety-critical file
    banner-policy.test.ts  // suppression/cooldown table
    use-update-gate.test.ts // fake-timer observable-contract tests (Section 9)

workers/api-proxy/src/
  routes/version-policy.ts   // GET /version-policy handler: KV read + zod-validate + coherence guard
                             //   (route registered in the index.ts if-ladder, per existing convention)
  routes/__tests__/version-policy.test.ts

apps/mobile/src/components/
  UpdateGateScreen.tsx     // root-level full-screen force gate (non-dismissible)
  UpdateBanner.tsx         // dismissible soft banner (Today only)

apps/mobile/src/locales/{en,de,fr,es-419,pt-BR}/update.json   // new CHROME namespace

packages/shared-types/   // VersionPolicy Zod schema (single source of truth)
```

**Shared-file edits the plan must account for (archaeology File-Touch Map):**
- `apps/mobile/src/i18n/index.ts` — eager-import barrel with a **17-arg positional `bundle()` factory**; adding `update` (18th ns) edits the signature + 5 imports + 5 call sites. Highest blast radius — likely a sequential Task-0 in partitioning.
- `apps/mobile/App.js` (force early-return + hook), `coverage.test.ts` (17→18), `no-literal-lint.test.ts`, `workers/api-proxy/src/index.ts` (route registration), the shared-types barrel, `wrangler.toml` (no new binding needed — reuse `CACHE`).

**Refinements (locked):**

1. **shared-types is the single schema source.** The client **`zod-parse`s** the fetched policy (never casts). **Parse-failure ≡ fetch-failure ≡ fail-open** (no gate). A malformed policy can **never** produce `'force'`. `policy.ts` re-exports from shared-types; the schema is defined exactly once.
2. `decision.ts` is **time-free** (see §5).
3. `decision.ts` is **total + fail-open on any malformed input** (see §5).
4. **`forceEnabled` kill-switch** lives in the schema (see §5 + §6).
5. `semver.ts` is **defensive** — unparseable input returns a sentinel (`null`) that routes into the fail-open path, never throws.

---

## 5. Section 2 — Pure decision fn (`decision.ts` + `semver.ts`) (APPROVED)

### 5.1 `semver.ts` — zero-dep, defensive

```ts
export type Semver = { major: number; minor: number; patch: number };

// Tolerant: trims, ignores a leading 'v', ignores any pre-release/build suffix
// after patch. Returns null on anything not readable as 3 non-negative integers.
// Callers MUST treat null as "unknown" → fail open. Never throws.
export function parseSemver(input: unknown): Semver | null;

// -1 | 0 | 1. Compares major, then minor, then patch.
export function compareSemver(a: Semver, b: Semver): -1 | 0 | 1;
```

- Parse to `{1,2,3}`: `"1.2.3"`, `"v1.2.3"`, `" 1.2.3 "`, `"1.2.3-beta.1"`, `"1.2.3+42"` (suffix ignored — store marketing versions are plain `x.y.z`).
- Parse to `null`: `"1.2"`, `"1"`, `""`, `"abc"`, `"1.2.x"`, `null`, `undefined`.
- **No implicit zero-fill** — a 2-part `"1.2"` is `null`/fail-open, not `1.2.0`. Defensive against a truncated config (`minVersion:"2"`) silently over-gating.
- **Note (accepted):** pre-release suffix stripping collapses beta<release ordering. Fine for store marketing versions.

### 5.2 `decision.ts` — time-free, total, fail-open

```ts
export type UpdateState = 'force' | 'soft' | 'none';
export type UpdateReason =
  | 'force'                  // installed < min (and forceEnabled, and min ≤ latest)
  | 'soft'                   // min ≤ installed < latest
  | 'up_to_date'             // installed ≥ latest
  | 'force_disabled'         // would force, but forceEnabled === false → degrade to soft
  | 'min_exceeds_latest'     // incoherent policy (min > latest) → never force
  | 'unparseable_installed'  // fail-open
  | 'missing_platform'       // fail-open
  | 'unparseable_policy';    // fail-open (min/latest not semver)

export function evaluateUpdateState(
  installed: unknown,          // nativeApplicationVersion (string | null)
  policy: VersionPolicy,       // already zod-validated by the shell
  platform: 'ios' | 'android',
): { state: UpdateState; reason: UpdateReason };
```

**Decision order (all comparisons via `compareSemver`):**

1. `parseSemver(installed)` → null ⇒ `{ none, unparseable_installed }`
2. `policy[platform]` missing ⇒ `{ none, missing_platform }`
3. `parseSemver(min)` or `parseSemver(latest)` → null ⇒ `{ none, unparseable_policy }`
4. **`min > latest`** (incoherent) ⇒ never force; `soft` if `installed < latest`, else `none`; reason `min_exceeds_latest`
5. `installed < min`:
   - `forceEnabled === true` ⇒ `{ force, force }`
   - else ⇒ `{ soft, force_disabled }` (here `installed < min ≤ latest` ⟹ always `< latest`)
6. `installed < latest` ⇒ `{ soft, soft }`
7. else ⇒ `{ none, up_to_date }`

**Safety contract (locked):**
- The fn is **total** — every malformed input returns a state, never throws.
- Its **only failure mode is `none`** ("let in"). It can never *throw* and can never *spuriously force*.
- **Force is unconditional and stateless** — it consults **no time, no cooldown, no suppression**. Flipping `forceEnabled` back to `true` **auto-re-forces** on the next successful fetch. Soft suppression (§6) never touches force.
- **Kill-switch degrades, never silences** — a killed force still surfaces as a **soft** nudge (`force_disabled`), so a dangerously-old user isn't left with zero signal.
- **`min_exceeds_latest`** is a client-side backstop duplicating the Worker's serve-time guard (defense in depth — the client is the lockout-capable side).

### 5.3 Golden table (TDD — write red first)

| installed | min | latest | forceEnabled | platform | → state / reason |
|---|---|---|---|---|---|
| 1.0.0 | 1.2.0 | 1.5.0 | true | yes | force / force |
| 1.3.0 | 1.2.0 | 1.5.0 | true | yes | soft / soft |
| 1.5.0 | 1.2.0 | 1.5.0 | true | yes | none / up_to_date |
| 1.6.0 | 1.2.0 | 1.5.0 | true | yes | none / up_to_date |
| 1.2.0 | 1.2.0 | 1.5.0 | true | yes | soft / soft (boundary ≥min, <latest) |
| 1.0.0 | 1.2.0 | 1.5.0 | **false** | yes | **soft / force_disabled** |
| 1.3.0 | 1.5.0 | 1.2.0 | true | yes | none / min_exceeds_latest |
| 1.0.0 | 1.5.0 | 1.2.0 | true | yes | soft / min_exceeds_latest |
| `null` | 1.2.0 | 1.5.0 | true | yes | none / unparseable_installed |
| "abc" | 1.2.0 | 1.5.0 | true | yes | none / unparseable_installed |
| 1.0.0 | "x" | 1.5.0 | true | yes | none / unparseable_policy |
| 1.0.0 | 1.2.0 | 1.5.0 | true | **no (ios key absent)** | none / missing_platform |

---

## 6. Section 3 — Worker (`GET /version-policy`) (APPROVED)

### 6.1 Endpoint & source of truth
- New route `GET /version-policy`, registered in the existing `index.ts` if-ladder; handler at `src/routes/version-policy.ts`. **No auth** (public, read-only, no secrets, no credit cost).
- **Source of truth: a single KV entry** at key **`version-policy`** in the **existing `CACHE` binding** (the one shared KV namespace; no new binding — matches the `health:upstream` reserved-key precedent). The entry holds the whole policy doc (both platforms + `forceEnabled`). Editing it is the **entire ops surface** — no deploy, no code change.

### 6.2 Serve-time validation (Worker = second safety layer)
Validate the KV doc against the **same shared-types Zod schema** before serving, plus a coherence check the schema can't express:

```
read KV → JSON.parse → VersionPolicySchema.safeParse
  ├─ parse fails ........................→ 503 + console.warn  (client fail-opens)
  ├─ any platform min > latest ..........→ neutralize whole doc to forceEnabled:false
  │                                         + console.warn
  └─ valid & coherent ...................→ 200 + the doc
```

An incoherent or corrupt KV doc can **never** leave the Worker as a force-capable response.

### 6.3 Caching / propagation — **`Cache-Control: public, max-age=60`**
Served from `CACHE` KV (globally replicated, cheap) with a **60s** edge cache (use `get('version-policy','json')`). Chosen over 300s for fastest emergency response. **Worst-case kill-switch propagation is ~2 minutes per region**, not ≤60s: Workers KV is **eventually consistent** (a recently-read key can serve stale for up to ~60s) and that stacks with the `max-age=60` edge cache. The §7.4 while-gated client poll mitigates client staleness but cannot beat server-side KV/edge staleness. (Acceptable — fail-open + degrade-to-soft bound the blast radius.)

### 6.4 Kill-switch — the documented emergency lever
Because the client can't be OTA-fixed, the runbook lever is editing one KV field:

```bash
# Emergency: stop ALL forced gating immediately (no deploy)
wrangler kv key put --binding=CACHE version-policy '<doc with "forceEnabled": false>'
# propagates within ~2 min worldwide (KV eventual consistency + 60s edge cache)
```
`forceEnabled:false` → decision returns `soft`/`none` only (the killed force degrades to a soft nudge, §5.2).

### 6.5 Validation runbook (human discipline the Worker can't auto-check)
Documented in this spec + as a comment on the KV handler. **No OTA escape exists — an operator error here is corrected only via this KV doc, so treat these as hard gates (consider two-person sign-off, see §13):**

1. **Never set `minVersion` above the actually-published, fully-rolled-out store version.** The Worker can't verify store state — human pre-flight. `min` above an unreleased version = mass lockout, no OTA escape.
2. **The build currently *under review* must never force-gate itself.** If the in-review binary's own version satisfies a live `min`, App/Play Review experiences the block → rejection under the "app stops working" clause. Verify the gate is a no-op for the version being submitted.
3. **`latestVersion` is a moving regional target under phased/staged rollout.** Apple ramps 1→100% over ~7 days; Android staged rollout is a %. Bumping `latestVersion` early sends a soft banner pointing at a build most users can't yet get (Android has no manual-download escape). **Set BOTH `min` and `latest` only after 100% rollout + ≥24h live in all regions.**
4. **Prerequisite before any emergency `min` bump:** "Release to All Users" (iOS) / advance staged rollout to 100% (Android) first — collapses the phased window and removes the chicken-and-egg.
5. **Lag the force behind full multi-region propagation** (store rollout is staggered) — otherwise late-region users are locked out of an app they cannot yet update.
6. `min ≤ latest` always (Worker enforces; author it correctly anyway).

### 6.6 `storeUrl` format (schema field)
`policy[platform].storeUrl` is an **`https://`** store URL:
- iOS: `https://apps.apple.com/app/id<APPLE_APP_ID>` (Apple App ID — TBD, §13).
- Android: `https://play.google.com/store/apps/details?id=<ANDROID_PACKAGE_NAME>` (package name — TBD, §13).

Rationale: `https` URLs open the store reliably without an iOS `LSApplicationQueriesSchemes` allowlist and need no `canOpenURL` precheck (§10.2). The Zod schema may additionally constrain `storeUrl` to `z.string().url()` so a malformed operator entry fails Worker validation (§6.2) → 503 → client fail-opens rather than rendering a dead button. Per-platform `itms-apps://` / `market://` schemes are **not** used (they require the allowlist and risk the OTA-unfixable lockout).

---

## 7. Section 4 — App fetch lifecycle (`use-update-gate.ts` + `update-store.ts`) (APPROVED)

### 7.1 Native version + fetch
- `installed = Application.nativeApplicationVersion` (sync), read once. OTA-independent (iOS `CFBundleShortVersionString` / Android `versionName`; **not** `nativeBuildVersion`). **Caveat:** inside Expo Go this returns *Expo Go's* version, not the app's — correct only in a standalone/dev-client build. This is exactly why the `__DEV__` simulator (§7.6) is **mandatory** for local testing. Do **not** substitute `Constants.expoConfig.version` (that's the JS-bundle version — wrong axis for a native force gate).
- `fetchPolicy()` wraps `GET <worker>/version-policy` in its **own ~5s `AbortController` timeout** — manual `setTimeout(() => c.abort(), 5000)` + `fetch(url,{signal})` (no `AbortSignal.timeout` in Hermes 0.83). Do **not** reuse `API_CONFIG.timeout` (60s — far too long for a fail-open gate fetch). Any failure — network error, timeout, non-200, JSON error, **Zod parse fail** — returns `null` ≡ fail-open.
- **Non-blocking.** The fetch does **not** gate the splash/boot. The app renders normally; the force overlay mounts only after a successful fetch resolves to `force`.

### 7.2 When it fires
- **On mount** (cold launch), once, after storage hydrate + locale resolve.
- **On `AppState` → `active`**, only on a true `background → active` transition (ignore `inactive → active` flicker: app-switcher peek, permission dialogs).
- **In-flight dedup:** a module-level "fetch in flight" guard so rapid foreground toggles don't fan out concurrent requests.

### 7.3 Gate-state persistence (the subtle footgun) — **entry/persistence asymmetry**
- **Entry:** force activates **only** on a **successful** fetch showing `installed < min` (& `forceEnabled` & coherent). A failed/absent fetch never creates a gate. (Pure fail-open on entry.)
- **Persistence (in-memory, per session):** once force is active, a subsequent **failed** re-fetch **keeps** it active — flaky network cannot be used as a bypass from an already-confirmed force.
- **Exit:** only a **successful** re-fetch re-evaluates. Still `force` → stays. Now `soft`/`none` (kill-switch flipped) → **gate clears live**.
- In practice the legitimate exit is: user updates → store kills & relaunches → cold boot reads new `nativeApplicationVersion` → fetch → `none`. "Return from store **without** updating" re-fetches, still `< min`, stays blocked.
- **No force is persisted to storage** (that would violate "force fires only on a fresh successful fetch"). State is in-memory only.
- **Residual risk (accepted + documented):** a user gated by operator error who then goes **permanently offline** stays stuck — but they can neither update nor use the Worker-dependent app offline anyway; reconnect resolves it within ~2 min (server propagation, §6.3).

### 7.4 Kill-switch reach (locked additions)
1. **While gated, poll** the policy every **~60s** (TTL-aligned) so a kill-switch flip reaches a user who sits on the locked screen and never backgrounds. Stop polling once cleared.
2. **Throttle re-checks only when NOT gated** (skip a re-fetch if the last check was `<~60s` ago; in-flight dedup handles concurrent). **When gated, never throttle** — re-check on every bg→active **plus** the poll. Gated users re-evaluate most aggressively so the kill-switch reaches them fastest.

### 7.5 Initial state
`update.state` initial value is **`'none'`** with an internal `pending` flag (distinguishes "not yet fetched" from "fetched → none"). **Never `'force'` pre-fetch** — the ladder cannot gate speculatively.

### 7.6 Dev-override (so we never self-lock) — simulator is **MANDATORY**
- In `__DEV__`, the gate is **disabled by default** — tests/local runs can never hard-lock. (`__DEV__` is compiled out in prod via babel `__DEV__=false` → dead-code-eliminated → no leak.)
- A `__DEV__` simulator toggle (a `StatePicker` row beside the existing `DevLocaleBar`) to force-render `force` / `soft` / `none` is **required, not optional**: because `nativeApplicationVersion` returns Expo Go's version in the dev environment (§7.1), the simulator is the **only** way to exercise the gate/banner locally. It's the documented local-QA entry point in §12.6.

---

## 8. Section 5 — Root-render integration & precedence (APPROVED)

### 8.1 The precedence ladder (top wins)
`App.js` actually has **3 boot/hydration guards** (fonts+storage, then activity-pref `loading`, then location-pref `loading`), each a bare `ActivityIndicator` **not** wrapped in `withProviders`. Insertion point: **immediately after the first (fonts+storage) boot guard** — the earliest point where storage is hydrated and locale is resolved (locale resolution is synchronous and coupled to `storageReady`; there is **no separate `localeReady` signal**, so `storageReady` *is* the locale-ready gate). The force return must **self-wrap** in `withProviders` (the bare-spinner guards don't, and §8.4 already self-wraps).

```
1. Boot          !fontsLoaded || !storageReady              → bare <ActivityIndicator/>   (existing)
2. FORCE GATE    update.state === 'force'  (storageReady ⟹ locale resolved)
                                                            → withProviders(<UpdateGateScreen/>)  (NEW — outranks all)
3. Pref-hydrate  hydrationStatus === 'loading'              → bare <ActivityIndicator/>   (existing)
4. Pref-hydrate  locationHydrationStatus === 'loading'      → bare <ActivityIndicator/>   (existing)
5. First-run     resolveLandingScreen(activity, location)   → onboarding / location       (existing)
6. Normal tree   Today/Calendar/Moments/You + TabBar        (existing)
                   └─ soft banner renders inside Today       (Section 6)
                   └─ rating requestReview fires inside result/detail (existing)
```

Placing the force return at step 2 (above the pref-hydrate spinners) means a too-old user is gated even before activity/location pref hydration resolves — force genuinely outranks everything.

### 8.2 Why this satisfies every precedence rule
- **Force > onboarding/location:** the force return sits above `resolveLandingScreen` — a too-old user never sees welcome/picker/location.
- **Force > rating:** rating isn't a root gate — it's `requestReview()` fired **inside** result/detail screens. Under force those screens never mount, so rating **structurally cannot fire**. No explicit coordination.
- **Force > soft banner:** the banner lives inside Today (#5), unreachable under force; belt-and-suspenders, `banner-policy` also returns false unless `state === 'soft'`.
- **Full-screen takeover:** early-return before the normal tree ⇒ no `TabBar`, non-dismissible by construction (no nav affordance exists).

### 8.3 Hook placement (Rules of Hooks)
`const update = useUpdateGate();` is called at the **top of `App()`**, alongside `useActivityPreference` / `useLocationPreference`, **above all conditional returns** — following the documented "Rendered more hooks than during the previous render" lesson.

### 8.4 `UpdateGateScreen` contents (copy §9-i18n, a11y §10)
- Full-screen, `bg-deep`, centered. Warm headline + one sentence + single primary **Update** → **RN core** `Linking.openURL(storeUrl)` for the current platform (storeUrl is an **`https://`** store URL from the policy — see §6.6). `expo-linking` is not a dep and not needed.
- **Retry** affordance (secondary, low-emphasis): calls `update.recheck()` — lets a reconnected user clear an operator-error gate without waiting for the ≤60s poll. **Bypass-proof:** a failed recheck persists the gate; success-still-force stays; only a successful non-force result clears.
- Wrapped by the existing `withProviders` (i18n, SafeArea, status bar, `__DEV__` locale bar).

### 8.5 Locked confirmations
1. Initial state non-force (§7.5) — ladder can't gate speculatively.
2. **Mid-session force activation** (operator raises `min` above the running build) abruptly unmounts the tree and takes over — intended emergency behavior; can't fire spuriously (`installed` is fixed per session).
3. **Locale is resolved by the time the gate can render** — `initI18n()` resolves the device locale **synchronously** inside the same hydrate effect that flips `storageReady`, so gating the force return on `storageReady` (step 2) already guarantees no English flash. There is no separate `localeReady` flag to add.
4. **Non-blocking flash accepted by design** — a too-old user may briefly see the app/onboarding before the gate mounts (fetch round-trip). **No grace-window / spinner-hold** — it would tax every cold start for a rare, dormant-until-v2 case; up-to-date users see no flash.

---

## 9. Section 6 — Soft banner (`banner-policy.ts` + `UpdateBanner.tsx`) (APPROVED)

### 9.1 Surface
Inline, dismissible banner at the **top of Today only** (inside `TodayScreen`, tree #5). Passive — never interrupts a flow. Clear **Update** + clear **dismiss (×)**, neutral copy, no dark patterns. Settings/You "Update available" row is **deferred** (trivially additive later; out of scope for v1).

### 9.2 `banner-policy.ts` — pure, time-aware (mirrors rating eligibility)

```ts
export type SoftSuppression = {
  dismissedForVersion: string | null;  // latestVersion captured at dismiss time
  dismissedAt: string | null;          // ISO
};
export type SoftBannerConfig = { cooldownDays: number };  // cooldownDays = 7

export function shouldShowSoftBanner(input: {
  state: UpdateState;
  latestVersion: string;
  suppression: SoftSuppression;
  config: SoftBannerConfig;
  now: Date;
}): boolean;
```

**Logic:**
```
if state !== 'soft'                                     → false
suppressed =
     dismissedForVersion === latestVersion              // this version silenced permanently
  OR elapsedDays(now, dismissedAt) < cooldownDays       // global N-day floor after any dismiss
return !suppressed
```

Encodes "after dismiss, stay quiet N days; re-show when latestVersion bumps again":
- **Same version, ever again** → `dismissedForVersion === latest` → suppressed → never nags.
- **Version bumps** → eligible, **but** held until the N-day floor elapses (a bump 2 days after a dismiss doesn't re-nag immediately).
- **Never dismissed** (`null`) → shows (if soft).
- **Future `dismissedAt`** (clock skew) → `elapsedDays` negative → `< cooldownDays` → suppressed (rating EC6 posture).
- `elapsedDays` reused from rating (native `Date` math, no date-fns).

### 9.3 Cooldown floor — **N = 7 days**
Per-version permanent-silence does the heavy anti-nag work; N is only the cross-bump floor. 7 = "at most weekly" — respectful, not silent. Post-launch dial (start at 7; loosen to 14 if telemetry shows annoyance).

### 9.4 Golden rows (TDD)
- soft + never-dismissed → true
- soft + same-version dismissed 1d ago → false
- soft + same-version dismissed 100d ago → false (sticky per version)
- soft + old-version dismissed 2d ago, new latest → false (floor)
- soft + old-version dismissed 30d ago, new latest → true
- **soft + dismissed exactly N (7) days ago, new latest → true** (logic is `< cooldownDays`; exactly N is not `<` N → shows. Locks `<` vs `≤`.)
- soft + future dismissedAt → false
- force → false; none → false

### 9.5 Storage & shell
- Keys in `update-store.ts`: `update.softDismissedVersion`, `update.softDismissedAt`.
- `recordSoftDismiss(latestVersion, now)` writes both (sync storage, rating pattern).
- `UpdateBanner` renders iff `shouldShowSoftBanner(...)`; **Update** → `Linking.openURL(storeUrl)`; **×** → `recordSoftDismiss`.

---

## 10. Section 7 — i18n (APPROVED)

### 10.1 New CHROME namespace: `update`
One file `update.json` in **all 5 locales**. This is **chrome** (Inter UI), not the astrology *voice* layer — needs owner tone-review + native translation review, **not** astrologer review.

### 10.2 Key set — **9 keys** (en source draft below)

```jsonc
// src/locales/en/update.json
{
  "force": {
    "title":        "An update is needed",
    "body":         "This version of Inceptio is no longer supported. Update to keep choosing your moments.",
    "action":       "Update",        // → Linking.openURL(storeUrl)
    "actionHint":   "Opens your app store",  // a11y hint, shared by gate + banner Update buttons
    "retry":        "Try again",     // → recheck only, never a bypass
    "retryOffline": "Couldn't reach the update server. Check your connection.", // failed recheck
    "openFailed":   "Couldn't open the store. Try again."  // toast if Linking.openURL fails
  },
  "soft": {
    "message": "A new version of Inceptio is ready.",
    "action":  "Update",
    "dismiss": "Dismiss"             // a11y label for the × control (not visible text)
  }
}
```

- `retryOffline` — shown only when a recheck fetch fails (during the attempt: button spinner, no copy). "Recheck succeeded but still force" needs no string (the screen already says it; gate persists).
- `openFailed` — toast when **`Linking.openURL` rejects** (bad `storeUrl` = operator error, no OTA fix → never leave a dead Update button). Guard on the `openURL` rejection, **not** `canOpenURL`: for `https` store URLs `canOpenURL` needs no allowlist and would only introduce the iOS `itms-apps`/`LSApplicationQueriesSchemes` trap (canOpenURL falsely returns false → suppresses a valid Update button, OTA-unfixable). Reuse the `Linking.openURL` fallback story from `rating/store-review.ts:48-64`.
- `actionHint` — generic, platform-neutral; reused by both Update buttons (vs. 2 store-specific strings).

### 10.3 Coverage
- All 9 strings translated in **all 5 locales** — **deferred-allowlist stays `[]`**, no exceptions.
- `coverage.test.ts`: bump `expect(CHROME_NS.length).toBe(17)` → **`18`** + add `expect(CHROME_NS).toContain('update')`. The existing all-5-file / every-key tests then auto-enforce full `update.json` coverage.
- `no-literal-lint.test.ts` continues to pass — all user-facing strings (incl. the `Dismiss` a11y label) come from `t('update:...')`, not literals.
- Forbidden-word check: copy avoids the locked banned list ("magic", "destiny", "align", "energy", etc.).

---

## 11. Section 8 — Accessibility (gate + banner) (APPROVED)

### 11.1 Force gate (`UpdateGateScreen`)
- **Modal isolation:** container `accessibilityViewIsModal` (iOS).
- **Focus on mount:** move screen-reader focus to the title via `AccessibilityInfo.setAccessibilityFocus(findNodeHandle(titleRef))` in a mount effect. (`accessibilityAutoFocus` is **not** a real RN core prop — do not use it.)
- **Title** `accessibilityRole="header"`.
- **Update button** `accessibilityRole="button"`, label `t('update:force.action')`, hint `t('update:force.actionHint')`.
- **Retry button** role button + label; during the in-flight recheck `accessibilityState={{ busy: true }}` + spinner.
- **`retryOffline`** rendered as `accessibilityRole="alert"` + `accessibilityLiveRegion="assertive"` (Android) **AND** `AccessibilityInfo.announceForAccessibility` (iOS — `accessibilityLiveRegion` is Android-only; without this the Retry failure is silent for VoiceOver).
- **Dynamic type:** default `allowFontScaling`; content wrapped so very large type **scrolls** rather than clipping the Update button off-screen.
- **Contrast:** cream `text-primary` on `bg-deep` (locked palette, AA in existing screens).
- **Reduce-motion:** no essential animation; any entrance fade honors reduce-motion.

### 11.2 Soft banner (`UpdateBanner`)
- **Announced on appear:** `accessibilityLiveRegion="polite"` (Android) + `AccessibilityInfo.announceForAccessibility` (iOS) — polite, never interrupts.
- **Banner body** one accessible element reading the message.
- **Update button** role button + label + the shared `force.actionHint`.
- **Dismiss (×)** `accessibilityRole="button"`, `accessibilityLabel = t('update:soft.dismiss')`, hit target padded to **≥44×44pt**.
- **Focus order:** message → Update → Dismiss.
- **Contrast (banner-specific):** verify AA against the **Today surface** the banner actually sits on (`bg-surface`/`bg-elevated`), for **both** the message text and the Update-label-on-fill — **do not inherit** the gate's cream-on-`bg-deep` check.

---

## 12. Section 9 — Testing strategy (APPROVED)

### 12.1 Pure layer — golden tables, **TDD-first** (the safety-critical core)
- **`semver.test.ts`** — parse table (valid `x.y.z`, `v`-prefix, whitespace, `-beta`/`+build` → `{x,y,z}`; reject `1.2`, `1`, `""`, `abc`, `1.2.x`, `null`, `undefined`) + compare table (ordering, equality, field precedence).
- **`decision.test.ts`** — the **full §5.3 table**: happy force/soft/none, boundary `installed==min → soft`, `forceEnabled=false → soft/force_disabled`, `min_exceeds_latest` rows, every malformed/fail-open row. **The** file — its only failure mode is "let in."
- **`banner-policy.test.ts`** — the **§9.4 table** incl. same-version-sticky, cross-bump floor, **exactly-N → true** boundary, future `dismissedAt`, force/none → false.

### 12.2 Shell / schema — mocked, not golden
- **`policy` Zod schema** (shared-types): accepts valid; rejects missing `forceEnabled`, missing platform fields, non-string versions, shape drift.
- **`update-store.fetchPolicy`**: mocked `fetch` → valid→parsed; non-200→null; timeout/abort→null; JSON error→null; **Zod parse-fail→null**. Asserts every failure routes to fail-open `null`.
- **`recordSoftDismiss`** writes both keys; round-trips into `banner-policy`.

### 12.3 Hook — **fake-timer observable-contract tests** (`use-update-gate.test.ts`)
The hook encodes the safety/reach contract, not just orchestration. Test the **observable** behavior (fetch fired/skipped, gate persists/clears) with fake timers + mocked AppState/fetch — **not** internal call details (keeps it non-brittle):
- **Fail-open entry** — a failed fetch never creates a gate.
- **Persistence-on-failed-recheck** — a confirmed force does NOT evaporate on a flaky recheck (bypass guard); only a successful non-force result clears it.
- **Throttle asymmetry** — gated → never throttle; not-gated → skip a re-check `<60s` after the last.
- **~60s gated poll** — fires while gated, stops once cleared.
- **AppState true-bg→active filtering** — `inactive→active` flicker does not re-fetch.
- **In-flight dedup** — concurrent triggers collapse to one request.
- **`__DEV__` bypass** — gate disabled by default in dev.

### 12.4 Worker — `version-policy.test.ts`
- Valid KV doc → 200 + doc + `Cache-Control: public, max-age=60`.
- Malformed KV → 503 (client fail-opens).
- `min > latest` on a platform → served doc **neutralized** to `forceEnabled:false`.
- Validates against the **same shared schema** (no second schema).

### 12.5 i18n
- `coverage.test.ts` floor 17→18 + `toContain('update')`; existing harness then enforces full `update.json` coverage automatically.

### 12.6 Documented manual QA matrix (timing/native — not automated; complementary, not either/or)
Dev-override simulate force/soft/none (mandatory entry point — Expo Go reports the wrong version, §7.6) · real-device/standalone-build bg→fg recheck · return-from-store-without-updating stays blocked · kill-switch flip clears within ~2 min (server propagation + poll/foreground) · offline-at-boot → no gate · bad `storeUrl` → `openFailed` toast · real StoreKit/Play update card · VoiceOver/TalkBack pass on gate + banner.

---

## 13. Open items / follow-ups

**Needs a human answer before/at implementation:**
- **Apple App ID** (numeric) + **Android package name** — required to build the `https` store URLs in §6.6. (App ID: TBD; package name: TBD.)
- **Worker prod `baseUrl`** — `https://api.inceptio.app` is assumed but TBD; the client `fetchPolicy` needs the confirmed origin.
- **KV-doc change ownership / two-person sign-off** — given there is **no OTA escape**, decide who may edit the `version-policy` KV doc and whether a `min` bump requires a second approver (recommended; the §6.5 runbook is the checklist).
- **Soft-tier rollout-timing policy** — confirm `latestVersion` is only bumped after 100% store rollout + ≥24h all regions (§6.5 #3).

**Resolved by audits (no longer open):**
- ~~KV binding name~~ → **`CACHE`** + reserved key `version-policy` (§6.1).
- ~~`expo-linking` vs core~~ → **RN core `Linking`**, no new dep (§10.2).
- ~~canOpenURL vs openURL~~ → **`openURL` + reject-guard**, https URLs, no `canOpenURL` (§6.6/§10.2).

**Decided / deferred:**
- **Branch name** — suggest `feature/force-update-gate`.
- **Owner tone-review + native translation review** of `update.json` (5 locales) before launch.
- **Why a custom gate over Google Play's first-party in-app-update flow** — documented rationale: cross-platform parity (one mechanism for iOS+Android), server kill-switch, OTA-independent. (Reviewer-anticipation note, not a blocker.)
- **Deferred:** Settings/You "Update available" row (additive later if telemetry warrants).
- **Worker deploy gate** — the new endpoint ships with the next Worker prod deploy (coordinate with existing deploy-gate discipline; additive, not part of the translations/library cache-version bump). The `version-policy` KV doc must be seeded (with `forceEnabled:false` or sane thresholds) before/at deploy so the endpoint returns 200, not 503.

**Compliance note (de-risks the feature):** a forced self-update gate is **store-compliant** on both stores — Apple Guideline 3.2.2(x) bars forcing *rating/review/other-app downloads*, not updating your own app; WhatsApp/Signal precedent. See `_knowledge-base/app-store-review.md`.

---

*Brainstorm complete, all 9 sections signed off section-by-section. Awaiting owner review of this spec before writing-plans.*
