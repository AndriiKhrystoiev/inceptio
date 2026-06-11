# Force-Update Gate — Code Archaeology (Compound V Phase 1A)

**Date:** 2026-06-11
**Spec audited:** `docs/superpowers/specs/2026-06-11-force-update-gate-design.md`
**Scope:** verify/correct every codebase assumption the spec makes. Flag-don't-fix (no code edited).
**Verdict summary:** spec is unusually accurate. 3 MISSING/CORRECTED items are load-bearing (Expo-Go version trap, KV binding name, Worker route convention). The rest CONFIRMED.

---

## 1. Verification table {spec claim → codebase reality (path:line) → verdict}

| # | Spec claim | Codebase reality (path:line) | Verdict |
|---|---|---|---|
| 1 | `expo-updates` / EAS Update absent → gate not OTA-hotfixable | `apps/mobile/package.json` has NO `expo-updates`. `node_modules/expo-updates` absent. Only `expo-updates-interface@55.1.6` appears as a transitive dep of `expo-dev-launcher` (`package-lock.json:5568`, iOS Podspec) — that is the *interface shim*, NOT the OTA package. `eas.json` has `build`/`submit` only; no `updates`/`runtimeVersion`/channel. `app.json` has no `updates` block. | **CONFIRMED** |
| 2 | `expo-application` present → `Application.nativeApplicationVersion` (sync, marketing version, OTA-independent) | `expo-application@~55.0.15` in `package.json`; imported and used in `apps/mobile/src/lib/device-id.ts:2,26,28` (uses `getIosIdForVendorAsync`/`getAndroidId`, NOT version). | **CONFIRMED** (with a critical caveat — see Hazard H1) |
| 3 | No `semver` dep — write zero-dep util | `grep semver apps/mobile` → no dep, no source usage. Native-`Date` ms math is the house style (`eligibility.ts:57`, `MomentDetailScreen.js:54`). | **CONFIRMED** |
| 4 | `AppState` unused anywhere in `src` | `grep -rn AppState apps/mobile/src apps/mobile/App.js` → **zero hits**. | **CONFIRMED** (genuinely new subscription) |
| 5 | Root gate = "single first-run authority"; hooks above all conditional returns; force inserts as a new early return | `App.js` — all hooks (`useFraunces`, `useState`×3, `useActivityPreference`, `useLocationPreference`) are called above the first conditional return; documented Rules-of-Hooks lesson in comments (`App.js` lines noted below). Early-return ladder: boot guard → `hydrationStatus==='loading'` → `locationHydrationStatus==='loading'` → `resolveLandingScreen` → normal tree. | **CONFIRMED** (exact ladder differs from spec §8.1 — see H2) |
| 6 | Pure/impure split precedent in `lib/rating` | `apps/mobile/src/lib/rating/eligibility.ts` = pure, injected `now`, golden-tested, `elapsedDays(now, iso)` native-Date, future-timestamp → negative → suppress (EC6). `rating-store.ts` = impure shell, `K.*` storage keys, `recordX(now=new Date())` recorders, sync-after-set discipline noted at `rating-store.ts:1-4`. | **CONFIRMED** (exact template) |
| 7 | Storage = AsyncStorage wrapper, sync in-memory cache after `hydrateStorage()`, `getString`/`set`/`delete`; CLAUDE.md MMKV claim stale | `apps/mobile/src/lib/storage.ts` — `Map<string,string>` cache, `hydrateStorage()` async fills it, `storage.getString/set/delete` sync; `set()` writes cache synchronously then fire-and-forget `AsyncStorage.setItem`. CLAUDE.md says MMKV — **stale** (file header explains the AsyncStorage swap). | **CONFIRMED** |
| 8 | No `date-fns`; reuse rating `elapsedDays` | `node_modules/date-fns` absent; no imports (only comments at `MomentDetailScreen.js:54`, `eligibility.ts:57` noting its absence). | **CONFIRMED** |
| 9 | i18n: 17 CHROME namespaces, all 5 locales, `nsSeparator:':'`, `keySeparator:false`, `TRANSLATION_DEFERRED=[]`; bump 17→18 + `toContain('update')` | `coverage.test.ts:` `expect(CHROME_NS.length).toBe(17)`; CHROME_NS = `readdirSync(en).filter(.json)` = the 17 files listed below (voice/ is a dir, excluded). `index.ts` init: `keySeparator:false`, `nsSeparator:':'`, `defaultNS:'common'`, `returnNull:false`. `TRANSLATION_DEFERRED` hardcoded `[]` and asserted length 0. | **CONFIRMED** — count is genuinely 17 |
| 10 | SUPPORTED = `en, de, fr, es-419, pt-BR` | `locale.ts:3` `SUPPORTED = ['en','de','fr','es-419','pt-BR']`. | **CONFIRMED** |
| 11 | Dev-pill pattern `DevLocaleBar` + `StatePicker`, `__DEV__`-only, prod-stripped | `App.js` `DevLocaleBar` renders `{__DEV__ && <DevLocaleBar/>}` inside `withProviders`; `StatePicker` at `apps/mobile/src/components/StatePicker.js`. `__DEV__` babel-inlined → dead-code-eliminated in prod. | **CONFIRMED** (reusable template) |
| 12 | shared-types is right home for `VersionPolicy` Zod schema | `packages/shared-types/` exists; `src/index.ts` barrel `export * from './api/...'`; convention = `XxxSchema = z.object(...)` + `export type Xxx = z.infer<typeof XxxSchema>` (see `api/daily-note.ts`, `api/request.ts`). `zod@^3.23.8`. Consumed by mobile (`api.ts:1-6`) and Worker (`cache.ts:1`, `package.json` dep). | **CONFIRMED** |
| 13 | New Worker route `GET /version-policy`; KV binding `POLICY` (illustrative) | Worker KV binding is **`CACHE`** (single namespace, shared by cache + rate-limit), defined `wrangler.toml [[kv_namespaces]] binding="CACHE"` and `env.ts:Env.CACHE: KVNamespace`. There is **no `POLICY` binding**. | **CORRECTED** (see H3) |
| 14 | Worker route file `workers/api-proxy/src/version-policy.ts` + register in entry | Convention is `src/routes/<name>.ts` exporting `handleXxx(req, env, ctx?)`, wired by an `if (url.pathname===... && req.method===...)` ladder in `src/index.ts`. Spec §4 puts the file at `src/version-policy.ts` (top of `src/`), inconsistent with `src/routes/`. | **CORRECTED** (place under `src/routes/`) |
| 15 | Worker imports shared-types Zod schemas | Yes: `cache.ts:1 import type { ElectionalSearchRequest } from '@inceptio/shared-types'`; worker `package.json` deps `@inceptio/shared-types` + `zod`. | **CONFIRMED** |
| 16 | `Linking` already imported somewhere; `canOpenURL`-guard precedent | `Linking` imported in `LocationPickerScreen.js:16` and `rating/store-review.ts:7`. `store-review.ts:48-64` (`openStoreListing`) is an exact `canOpenURL→openURL`, multi-candidate-fallback, never-throw store-link precedent — the model for the gate's Update button + `openFailed` toast. NOT imported in `App.js`. | **CONFIRMED** (strong reuse target — see DRY) |
| 17 | `withProviders` wraps i18n/SafeArea/StatusBar/`__DEV__` locale bar | `App.js withProviders` = `I18nextProvider > QueryClientProvider > SafeAreaProvider > View(root,onLayout) > StatusBar + {__DEV__ DevLocaleBar} + node`. | **CONFIRMED** |
| 18 | Locale resolves synchronously (`initI18n()` resolves device locale sync) — `localeReady` effectively immediate | `App.js` effect calls `initI18n()` synchronously before `setStorageReady(true)`; `index.ts initI18n` is sync (`lng: activeBundle()`, eager static `resources`, `if (i18n.isInitialized) return`). There is **no separate `localeReady` signal** — readiness is coupled to `storageReady`. | **CONFIRMED w/ caveat** (no distinct `localeReady` exists; see H4) |
| 19 | Initial `update.state` never `'force'` pre-fetch | n/a (new code). No conflicting existing state. Ladder cannot speculate. | **CONFIRMED** (design constraint, not a codebase fact) |
| 20 | `no-literal-lint.test.ts` continues to pass via `t('update:...')` | `no-literal-lint.test.ts:12-13` scans `src/screens` + `src/components` recursively; flags any space-containing ≥2-letter literal not in `ALLOWLIST`. New `UpdateGateScreen.tsx`/`UpdateBanner.tsx` will be auto-scanned. | **CONFIRMED w/ obligation** (see H6) |

### The 17 CHROME namespace files in `src/locales/en/` (verifies 17→18 bump)
`activity, calendar, card, common, daterange, errors, loading, location, moment, moments, nav, noviable, onboarding, paywall, settings, share, today` — plus `voice/` (a directory, NOT counted). Adding `update.json` makes 18. Each must also land in `de/fr/es-419/pt-BR` or `coverage.test.ts` "every CHROME ns file exists in all 5 locales" fails.

---

## 2. Integration hazards / must-changes (for writing-plans)

### H1 — `nativeApplicationVersion` returns **Expo Go's** version in Expo Go (the load-bearing trap)
`apps/mobile/src/screens/YouScreen.js:93-96` documents this verbatim:
> "Read from app.json (`expo.version`), NOT Application.nativeApplicationVersion — the latter returns Expo Go's own version (e.g. "55.0.34") when running inside Expo Go, which has nothing to do with our app."

The whole app currently has **no native build pipeline wired** (`eas.json` `production` profile is empty `{}`, no dev-client EAS build evidenced for release). The team plainly develops in Expo Go / a dev-client. **Consequences for the gate:**
- In Expo Go, `installed` = `"55.0.34"`-ish — far above any real `minVersion` → reads as `up_to_date`. The gate silently never fires in the dev harness. The §7.6 `__DEV__` simulator is therefore **mandatory, not optional** — it is the *only* way to exercise force/soft locally.
- In a real standalone/TestFlight build, `nativeApplicationVersion` IS the marketing version (correct). So the spec's runtime choice is right **for production** but the dev-harness reality diverges. The plan must state: `installed` is read from `Application.nativeApplicationVersion` **for prod correctness**, and the dev simulator is what's used in Expo Go (where that getter is meaningless).
- YouScreen reads version from `Constants.expoConfig?.version` instead. Two different version sources now coexist; the plan should explicitly NOT switch the gate to `expoConfig.version` (that is the JS-bundle/OTA-ish version, not the installed native binary — wrong axis for a force-update gate).

### H2 — The real ladder has THREE boot/hydration guards, not the spec's two; insertion point is more constrained
Spec §8.1 inserts FORCE GATE "immediately after the fonts/storage boot guard … before pref-hydration spinners." The actual `App.js` ladder:
1. `if (!fontsLoaded || !storageReady)` → `<ActivityIndicator/>`
2. `if (hydrationStatus === 'loading')` → `<ActivityIndicator/>`  *(activity pref)*
3. `if (locationHydrationStatus === 'loading')` → `<ActivityIndicator/>`  *(location pref)*
4. `resolveLandingScreen(hydrationStatus, onboardingLocationStatus)` → `screen ?? landing`
5. normal tree (`<Screen/> + TabBar`)

To outrank onboarding/location AND render localized full-screen UI, the FORCE return must sit **after guard #1** (so fonts + i18n + storage are ready) but the spec wants it **before** #2/#3. That is workable — but note guards #2/#3 return a **bare `<ActivityIndicator/>` NOT wrapped in `withProviders`** (no i18n, no SafeArea). If the force gate is inserted between #1 and #2, the plan must wrap the gate in `withProviders` itself (spec §8.4 already says this — good) and ensure `useUpdateGate()` is called above guard #1 (Rules of Hooks). Verdict: spec's intent is achievable; the plan must reckon with **three** existing guards, and that the existing loading guards are un-providered.

### H3 — KV binding is `CACHE`, not `POLICY`
The version-policy doc must be stored in the existing `CACHE` KV namespace (`wrangler.toml`, `env.ts:Env.CACHE`). Options for the plan:
- (a) Reuse `CACHE` with a reserved key like `version-policy` (cheapest; no `wrangler.toml` change; matches the `health:upstream` precedent at `routes/health.ts:5`).
- (b) Add a second binding `POLICY` to `wrangler.toml` **and** to the `[env.production.vars]`-adjacent `[[kv_namespaces]]` (note: env-scoped KV needs its own block; the existing comment in `wrangler.toml` flags that `[env.*]` does not inherit top-level config).
Recommendation for the plan: **option (a)** unless there is an isolation reason — it avoids a `wrangler.toml`/binding-id provisioning step and an `Env` interface change. Either way the spec's `--binding=POLICY` runbook command (§6.4) and `Env` type must be reconciled to the chosen binding. The kill-switch `wrangler kv key put` command in §6.4 currently names a non-existent binding.

### H4 — No distinct `localeReady` signal exists
Spec §8.5(3) wants the gate rendered "only after the locale is *resolved* (`localeReady`, not merely i18n initialized)." In the codebase, locale resolution is **synchronous and coupled to `storageReady`** (`initI18n()` runs in the same effect, before `setStorageReady(true)`; `activeBundle()` is sync). There is no separate boolean to gate on. Practically `storageReady === true` already implies locale resolved. The plan should either (a) treat `storageReady` as the de-facto `localeReady` (simplest, correct today), or (b) introduce a new explicit signal — but that is net-new state with no current source. Recommend (a) + a code comment so it "can't regress" per the spec's own intent.

### H5 — Worker route convention: handler in `src/routes/`, `if`-ladder registration, 404 fallthrough
- New file: `workers/api-proxy/src/routes/version-policy.ts` exporting `handleVersionPolicy(env)` (no `ctx` needed; no `req` body needed — but signature `(req, env, ctx)` is the house pattern; `handleHealth(env)` shows a slimmer one is acceptable).
- Register in `src/index.ts` with `if (url.pathname === '/version-policy' && req.method === 'GET') return handleVersionPolicy(env);` **before** the trailing `Response.json({error:'not_found'}, {status:404})`.
- `index.ts` is a **SHARED RESOURCE** (route registry; order matters, every route touches it).
- Precedent for KV-read-then-serve with TTL: `routes/health.ts` (`env.CACHE.get` → `env.CACHE.put(..., {expirationTtl})`). The spec's `Cache-Control: public, max-age=60` is an HTTP edge cache header — note existing routes use `Response.json(...)` and do **not** currently set `Cache-Control`; this is net-new behavior, fine.

### H6 — Lint + i18n test obligations (auto-enforced, must be satisfied or suite goes red)
- `no-literal-lint.test.ts` scans `src/screens` + `src/components`. Every user-facing string in `UpdateGateScreen.tsx`/`UpdateBanner.tsx` must come from `t('update:...')`. If the `__DEV__` simulator adds `StatePicker`-style labels ("force"/"soft"/"none"), those are dev-only literals and must be added to the `ALLOWLIST` in `no-literal-lint.test.ts:40-49` (precedent: the existing `__DEV__ StatePicker dev labels` allowlist entries). **`no-literal-lint.test.ts` is a SHARED RESOURCE.**
- `coverage.test.ts` bump `17→18` + `toContain('update')` — **SHARED RESOURCE** (also asserted indirectly by the all-5-locale and every-key sub-tests, which auto-enforce full `update.json` translation; deferred-allowlist must stay `[]`).
- `index.ts` (i18n) must register the new `update` namespace in **all 5 locale bundles** — it is an eager-static-import barrel with a `bundle(...)` positional factory taking 17 args. Adding an 18th namespace means editing the `bundle()` signature + all 5 call sites + 5 imports. **`apps/mobile/src/i18n/index.ts` is a SHARED RESOURCE** (barrel; positional factory — high blast radius; one task must own it).

### H7 — Worker base URL for the client fetch is unsettled
`apps/mobile/src/config/api.ts`: dev = `http://localhost:8787` (or `10.0.2.2` on Android emu); **prod = `https://api.inceptio.app` ("prod URL TBD")**. The gate's `fetchPolicy()` must hit `${API_CONFIG.baseUrl}/version-policy` (reuse `API_CONFIG`, do not hardcode a URL). Note the existing `API_CONFIG.timeout` is **60_000ms** (sized for cold upstream search); the spec wants a **~5s AbortController** for the policy fetch — so the gate must NOT reuse `API_CONFIG.timeout`; it needs its own 5s budget. Flag: prod base URL is a TBD that blocks real prod behavior (but the feature is dormant-until-v2, so non-blocking now).

### H8 — Headers: existing client sends `X-Device-Id` + `X-Locale` on every call
`api.ts:requestMetaHeaders()` attaches `X-Device-Id` (async, from `getDeviceId()`) + `X-Locale`. The spec says `/version-policy` is **public, no auth**. Decide explicitly whether the policy fetch sends these headers. Recommendation: send neither (avoids an async `getDeviceId()` on the boot-critical path and keeps the endpoint trivially cacheable at the edge — `Cache-Control: public` is incompatible with per-device variance). This is a divergence from the standard client request shape and should be stated.

---

## 3. DRY findings (reuse-first per CLAUDE.md)

| Capability the spec needs | Existing code that already does it | Decision |
|---|---|---|
| `canOpenURL → openURL`, multi-fallback, never-throw, `openFailed`-style soft-fail | `rating/store-review.ts:48-64` `openStoreListing()` | **Reuse the pattern** (not the function — that one targets the *review* listing with `?action=write-review`). The gate opens an operator-supplied `storeUrl`. Extract a small shared `openExternalUrl(url, {onFailed})` or mirror the loop. Do NOT write a third bespoke `Linking` path silently. |
| Injected-`now` + `elapsedDays` + future-timestamp-as-suppress | `rating/eligibility.ts:57` `elapsedDays`, `MS_PER_DAY` | **Reuse** — `banner-policy.ts` should import `elapsedDays`/`MS_PER_DAY` from rating (or a shared `lib/time.ts`), not re-derive. Spec §9.2 already says "reused from rating" — make it a literal import, not a copy. |
| Impure storage shell with `K.*` keys, sync-after-set, `getStr`/`setInt` helpers | `rating/rating-store.ts` | **Mirror the file shape** for `update-store.ts` (`update.softDismissedVersion`, `update.softDismissedAt`). Same `storage.getString/set/delete`. |
| `__DEV__`-gated `StatePicker` dev pill | `App.js DevLocaleBar` + `components/StatePicker.js` | **Reuse `StatePicker`** for the force/soft/none simulator row. |
| Zod schema + `z.infer` type + barrel re-export | `shared-types/src/api/*.ts` + `index.ts` | **Follow convention** for `VersionPolicySchema`. |
| KV read → validate → serve with TTL | `routes/health.ts` (`env.CACHE.get/put`) | **Mirror** for `version-policy.ts`. |

No true duplication risk found — all the above are *patterns to extend*, none are competing implementations of the same path. The only genuine "don't duplicate" is the `Linking.openURL` story (H/DRY row 1).

---

## 4. Regression surface (what breaks if the new code misbehaves)

| Path that works today | Regression if new code is wrong | One-line impact |
|---|---|---|
| `App.js` cold-boot ladder (boot → activity → location → landing) | A new early return above the existing guards that's reached with a stale/`pending` state, or a hook added below a conditional return | "Rendered more hooks than during the previous render" crash on every cold start (the exact lesson the file warns about) — or onboarding/location gates skipped/duplicated. |
| First-run authority (`resolveLandingScreen`) | Force gate that doesn't *truly* outrank it (e.g. rendered inside the tree) | A too-old user could still reach onboarding/search — defeats the gate's purpose. |
| Rating `requestReview()` firing inside result/detail | Force gate mounts the tree anyway | Rating could fire under a force lock (spec relies on those screens never mounting — structurally true only if force is a real root early-return). |
| i18n suite (`coverage.test.ts`, `no-literal-lint.test.ts`, per-ns coverage) | New namespace not in all 5 locales, or hardcoded literal, or count not bumped | CI red; blocks merge. (Auto-enforced — a feature, not a risk, if respected.) |
| i18n `index.ts` barrel + `bundle()` factory | Wrong arg position / missing locale import | Every `t()` for a whole namespace silently returns the key, or a build-time import error. High blast radius. |
| Worker `index.ts` 404 fallthrough + existing routes | New route registered after the 404, or method/path typo | `/version-policy` 404s → client fail-opens (safe), but the feature silently never works. |
| Worker `CACHE` KV (shared by search cache + rate-limit + health) | Storing the policy under a key that collides with `quota:`/`search:`/`health:` prefixes | Could corrupt rate-limit/cache reads. Use a clearly-namespaced reserved key (`version-policy`), never a `quota:`/`search:` prefix. |
| App boot latency | A blocking policy fetch on the boot-critical path | Slows every cold start. Spec §7.1 says non-blocking — must stay non-blocking (no `await` before splash hide). |

---

## 5. File Touch Map (for Phase 2 partitioning)

### New files (no contention)
- `apps/mobile/src/lib/update-gate/semver.ts` — pure.
- `apps/mobile/src/lib/update-gate/decision.ts` — pure, safety-critical.
- `apps/mobile/src/lib/update-gate/banner-policy.ts` — pure (imports `elapsedDays` from rating).
- `apps/mobile/src/lib/update-gate/policy.ts` — re-exports VersionPolicy from shared-types.
- `apps/mobile/src/lib/update-gate/update-store.ts` — impure shell.
- `apps/mobile/src/lib/update-gate/use-update-gate.ts` — hook.
- `apps/mobile/src/lib/update-gate/__tests__/{semver,decision,banner-policy,use-update-gate}.test.ts`.
- `apps/mobile/src/components/UpdateGateScreen.tsx` — new (scanned by no-literal-lint).
- `apps/mobile/src/components/UpdateBanner.tsx` — new (scanned by no-literal-lint).
- `apps/mobile/src/locales/{en,de,fr,es-419,pt-BR}/update.json` — 5 new files (all required by coverage).
- `workers/api-proxy/src/routes/version-policy.ts` — new handler.
- `workers/api-proxy/src/__tests__/version-policy.test.ts` — new.
- `packages/shared-types/src/api/version-policy.ts` — new schema file.

### Edited files (SHARED RESOURCE flags)
- `packages/shared-types/src/index.ts` — **SHARED RESOURCE** (barrel; add `export * from './api/version-policy'`).
- `workers/api-proxy/src/index.ts` — **SHARED RESOURCE** (route registry; insert `if` before the 404; order matters).
- `apps/mobile/src/i18n/index.ts` — **SHARED RESOURCE** (eager-import barrel + positional `bundle()` factory — add 18th ns: 5 imports + factory signature + 5 call sites; highest blast radius in this feature).
- `apps/mobile/src/i18n/__tests__/coverage.test.ts` — **SHARED RESOURCE** (test floor `17→18` + `toContain('update')`).
- `apps/mobile/src/i18n/__tests__/no-literal-lint.test.ts` — **SHARED RESOURCE** (only if the `__DEV__` simulator introduces dev-label literals → add to `ALLOWLIST`).
- `apps/mobile/App.js` — **SHARED RESOURCE** (root render ladder + hook placement; single owner; force-gate early return + `useUpdateGate()` call site above guard #1).
- `apps/mobile/src/screens/TodayScreen.js` — edited (mount `<UpdateBanner/>` at top); contention only with other Today work.
- `workers/api-proxy/wrangler.toml` — **SHARED RESOURCE** (only if a new `POLICY` KV binding is chosen over reusing `CACHE`; provisioning + env-block mirroring). Avoidable via H3 option (a).
- `workers/api-proxy/src/env.ts` — **SHARED RESOURCE** (only if a new KV binding is added to `Env`). Avoidable via H3 option (a).
- `apps/mobile/src/config/api.ts` — read-only reuse of `API_CONFIG.baseUrl`; edit only if a separate policy timeout constant is added here (recommended — see H7).

---

## 6. Net corrections the writing-plans step MUST fold in (non-negotiable)

1. **KV binding is `CACHE`, not `POLICY`.** Reuse `CACHE` with reserved key `version-policy` (H3 option a) OR provision a real `POLICY` binding + `Env` field + `wrangler.toml` env-block. Fix the §6.4 kill-switch command to name the real binding.
2. **Worker handler goes in `src/routes/version-policy.ts`** (not `src/version-policy.ts`), registered by `if`-ladder in `index.ts` before the 404.
3. **`nativeApplicationVersion` is meaningless in Expo Go** (returns Expo Go's version — `YouScreen.js:93-96`). The `__DEV__` simulator is therefore mandatory; do NOT substitute `Constants.expoConfig.version` (wrong axis). Production read is correct.
4. **The real ladder has 3 boot/hydration guards** (not 2); the un-providered `ActivityIndicator` guards (#2/#3) mean the force gate must self-wrap in `withProviders`.
5. **No `localeReady` signal exists** — treat `storageReady` as the de-facto locale-ready gate (locale resolution is synchronous, coupled to it).
6. **Don't reuse `API_CONFIG.timeout` (60s) for the policy fetch** — it needs its own ~5s AbortController; prod `baseUrl` is still TBD (`https://api.inceptio.app`).
7. **i18n `index.ts` is a high-blast-radius positional barrel** — adding the 18th namespace edits a factory signature + 5 call sites + 5 imports; one task must own it.
8. **Reuse, don't duplicate, the `Linking.openURL` fallback story** from `rating/store-review.ts`; import `elapsedDays`/`MS_PER_DAY` from rating rather than copying.
9. **`/version-policy` should send no `X-Device-Id`/`X-Locale`** (keep it edge-cacheable + off the async-`getDeviceId` boot path); a deliberate divergence from `requestMetaHeaders()`.

---

*Archaeology complete. Spec §3's self-audit table was independently re-verified against source and is accurate except for the KV binding name (illustrative `POLICY`) and the route-file location, both already flagged as open items in spec §13. No code edited.*
