# Usage-Cap — Code Archaeology (Compound V Phase 1A)

**Date:** 2026-06-06
**Spec audited:** `docs/superpowers/specs/2026-06-06-usage-cap-design.md`
**Scope:** existing-code reality for the exemption refactor, counter/key reshape, telemetry seam reuse, config, and the mobile 429 surface. No design proposed — findings only.

---

## 1. Matrix — the search/metering paths the new code branches by

| Entry path | `meter` (post-refactor) | Needs `X-Device-Id`? | Counts against cap (today) | Counts (post-refactor) | `ctx` available today |
|---|---|---|---|---|---|
| `index.ts:16-18` `POST /electional/search` (public) | default `true` | yes | yes | yes | **NO** (see RISK-1) |
| `daily-note.ts:353` internal fan-out | explicit `false` | header still passed (vestigial) | **yes — THE BUG** | **no** (fixed) | yes (`index.ts:23` threads it to the route) |
| cache HIT on metered search (`search.ts:66-75`) | n/a | — | yes (meter-before-cache) | yes (spec §5.4 keeps) | as above |
| cache MISS → upstream (`search.ts:77-90`) | n/a | — | yes | yes | as above |
| validation-fail (`search.ts:31-40`) | — | — | no (parse precedes meter) | no (ordering preserved, spec §5.2.1) | — |

Confirmed: exactly **two** callers of `handleSearch` (`index.ts:17`, `daily-note.ts:353`), matching spec §5.3. `grep` across `workers/**` finds no third caller. `checkAndIncrement` has a single call site (`search.ts:43`). The spec's caller enumeration is accurate.

The bug is real and exactly as described: `daily-note.ts:342-353` constructs `internalReq` with `X-Device-Id: deviceId` and calls `handleSearch(internalReq, env)`, whose body runs `checkAndIncrement(env, deviceId)` at `search.ts:43`. The retention hook consumes the per-user counter today. The mobile doc-comment at `api.ts:238-240` confirms the intent ("shares the per-device counter since /daily-note internally fans out").

---

## 2. Shared state

### `deviceId` (read in both `search.ts:13` and `daily-note.ts:130`)
- `search.ts:13-19`: required unconditionally; 400 `missing_device_id` if absent. **Spec moves this requirement to the metered branch only** (§5.2). Safe — daily-note still passes the header (`daily-note.ts:349`), and daily-note independently requires it at its own gate (`daily-note.ts:138-143`), so the only `meter:false` caller never reaches the relaxed branch without a deviceId anyway. No path is left without identity where one is needed.
- After refactor the daily-note `X-Device-Id` pass-through (`daily-note.ts:346-350`) is vestigial for metering. Spec §5.2 says leave + document. Note: daily-note's OWN top-level deviceId gate (`daily-note.ts:138-143`) is NOT vestigial — it must stay or the route regresses to the silent-502 failure mode its own comment warns about.

### `rl` / `RateLimitResult` (set at `search.ts:43`, read at `search.ts:44,51,56-59,71-72,87-88`)
- Drives the 429 body (`limit`, `reset_at_unix`) and the success-path headers (`X-RateLimit-Remaining = rl.limit - rl.count`). The new `meterSearch` return shape `{ allowed, count, limit, used, reset_at_unix }` is a **superset** of today's `RateLimitResult` (`allowed, count, limit, period_start_unix, reset_at_unix`) minus `period_start_unix`. **`period_start_unix` is read nowhere outside rate-limit.ts itself** (grep confirms) except the test file — dropping it is safe in product code; see RISK-3 for the test.
- The success-path `X-RateLimit-Remaining` header math (`search.ts:72,88`) must be re-derived from the new return shape. `rl.limit - rl.count` still works if `count` keeps "post-increment count" semantics. Spec's `used` should equal `count`; confirm the impl makes `X-RateLimit-Remaining = limit - used`.

### `nowUnix` injectable seam (`checkAndIncrement` param, `rate-limit.ts:47`)
- Default `Math.floor(Date.now()/1000)`. Spec preserves this in `meterSearch(env, deviceId, tz, now?)`. The DST/local-date tests depend on it. Carry forward verbatim.

---

## 3. Sibling code (read in full)

### Sibling A — `daily-note.ts` telemetry pattern (`bumpCounter` 64-81, callers 194/255/257)
The spec's telemetry (§8) should clone this exactly. Verified properties to mirror:
- **NaN-guard on read-modify-write** (`daily-note.ts:67-75`): a corrupt KV value would otherwise stick at `'NaN'` for the full TTL. The admin reader has the matching guard (`admin.ts:67-75`). **Any new `bumpCounter`-style writer MUST include the `Number.isFinite` guard** or it inherits the stuck-counter latent bug class.
- **Errors swallowed** (`daily-note.ts:77-80`) — a metric write must never 5xx a user request. Spec §8 says this; the existing code is the template.
- **`ctx.waitUntil(bumpCounter(...))`** keeps the RMW off the response critical path.
- Date key is **UTC** here (`todayUtc = new Date().toISOString().slice(0,10)`, `daily-note.ts:169`) — deliberately, because it's a rate metric where the boundary is irrelevant. **Spec §8 `metrics:search-*:{date}` should likewise be UTC-dated** to match the admin reader's `isoDate` (UTC, `admin.ts:59-65`). Do NOT use the user-local date for telemetry keys or the admin reader's 14-day UTC window won't line up.

### Sibling B — `admin.ts` `handleActivityMissingRate` (1-132)
The spec's `/admin/cap-metrics` mirrors this. Reusable structure:
- Auth gate `admin.ts:81-84`: `if (!token || token !== env.ADMIN_TOKEN) return 401`. **Fail-closed on missing secret** is a property of `&&`/strict-equality here (empty `ADMIN_TOKEN` + any header → 401). Spec §8 requires this; copy the exact pattern, not a re-derivation.
- 14-day UTC window, newest-first, `Promise.all` parallel reads, missing-key→0 coercion (`readCounter` 67-75).
- **Latent coupling to flag:** `KEY_COUNT = 3` (`admin.ts:54-57`) and the `flatMap` (`admin.ts:103-107`) are manually kept in lockstep, with index math `reads[idx*KEY_COUNT + n]`. This is a known fragility documented in-file. The new `/admin/cap-metrics` reads a **different key family** (`search-metered`/`search-capped`/`search-reach:{N}`) — do NOT extend `handleActivityMissingRate`'s flatMap; write a **separate handler** (spec §8 says "mirror", which is correct — clone, don't extend, to avoid touching the activity-missing gate query that Checkpoint 3 depends on).
- Note `search-reach:{date}:{N}` is a **2-dimensional** key family (date × N). The activity-missing reader is 1-D (date × fixed 3 counters). The cap-metrics reader needs a different read strategy for the reach curve (N is unbounded up to `limit`, so read `N = 1..limit`). This is more than a copy-paste of the flatMap — flag for the plan.

### Sibling C — `search.ts` 429 construction (44-62)
Body keys today: `error`, `message`, `limit`, `reset_at_unix`. Headers: `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining: '0'`, `X-RateLimit-Reset`. Spec §6 adds **only** `used` to the body — additive, non-breaking. The mobile parse sites (`api.ts:140-149`, `api.ts:259-269`) read only `error`, `reset_at_unix`, `upstream.*`; they will silently ignore the new `used` until `api.ts` is updated to read it. No coordination ordering required between the two diffs.

---

## 4. External APIs

No third-party HTTP API is touched by this feature. The cap is pure-Worker (KV + `Intl`). `@photostructure/tz-lookup` is already a dependency (`daily-note.ts:14`) but is **coordinates→tz only** — it does NOT compute local dates, exactly as spec §7 states. The local-date bucket must use `Intl.DateTimeFormat('en-CA', { timeZone, ... })`, which is **already proven in this codebase** at `daily-note.ts:437-446` (`formatDateInTz`). **DRY opportunity, see §6.** `Intl` timezone support requires full-ICU; the Worker runtime provides it (the existing `formatDateInTz` relies on it in production today), so no compatibility risk. No context7 lookup warranted — no library API surface in question.

---

## 5. Regression surface

| Path | If new code misbehaves, what breaks |
|---|---|
| `daily-note.ts:353` fan-out → `handleSearch` | If the new `searchCore`/`meter` split changes the **Response shape**, daily-note's `searchPayload.data?.top_windows` read (`daily-note.ts:363-378`) breaks → every Today-screen daily note 502s. The split must keep `searchCore` returning the identical translated envelope. The e2e regression test (`daily-note-route-e2e.test.ts`) guards this. |
| `daily-note` 200 contract | If `meter:false` path accidentally still meters, dev `ENV` (limit 1000) hides it in tests but **production** retention hook would burn the cap — the exact bug being fixed, re-introduced. The mandated must-#2 exemption test is the guard. |
| Public `/electional/search` 429 body | Mobile `api.ts:149` reads `body.reset_at_unix`. If the reshape renames it (spec forbids rename — §6), mobile shows generic copy + loses "tomorrow". Keep `reset_at_unix` snake_case. |
| Success-path `X-RateLimit-Remaining` header (`search.ts:72,88`) | Mobile `api.ts:130-131,194` surfaces `rateLimitRemaining` in `SearchResult`. If the reshape drops the header or breaks the `limit - count` math, `rateLimitRemaining` goes null/wrong. Currently unused in UI (deferred hint, spec §2/§9) but the field is on the public `SearchResult` interface (`api.ts:82-86`) — keep emitting it. |
| `query-client.ts:18` `if (error instanceof RateLimitError) return false` | Adding fields to `RateLimitError`'s constructor preserves `instanceof`. Safe — but if the constructor signature changes from positional `(resetAtUnix)` to an options object, both throw sites (`api.ts:149,269`) must update together or it throws wrong. |
| `friendlyMessage` (5 surfaces) | If the `RateLimitError` branch copy or the `instanceof` ladder order changes such that `UpstreamQuotaError` (a sibling, NOT a subclass — both extend `ApiError`, `api.ts:33,47`) is shadowed, upstream-quota users get the wrong message. Order is currently RateLimit-before-UpstreamQuota (`error-messages.ts:20-23`); keep distinct branches. |
| daily-note `getDailyNote` 429 branch (`api.ts:259-270`) | Post-refactor this never fires for the **per-user cap** (daily-note is exempt), only for upstream-quota 429. Spec §9 documents leaving it. No code change needed; it's harmless dead-for-cap, live-for-upstream-quota. |

---

## 6. DRY findings

1. **Local-date-in-tz computation already exists.** `daily-note.ts:437-446` `formatDateInTz(d, tz)` is *exactly* the `Intl.DateTimeFormat('en-CA', { timeZone, year, month, day })` the spec §7 describes for the `quota:{deviceId}:{localDate}` key. **Decision for the plan: extract/share, do not write a third copy.** `formatDateInTz` is currently a non-exported module-local in `daily-note.ts`. Recommend lifting it to a shared helper (e.g. `src/lib/local-date.ts`) and importing in both `daily-note.ts` and `rate-limit.ts`. (The "next local midnight → unix" offset helper for `reset_at_unix`/TTL is genuinely new — no existing equivalent.)

2. **Counter primitive already exists.** `bumpCounter` (`daily-note.ts:64-81`) and `readCounter` (`admin.ts:67-75`) are duplicated-by-design today (one in each file, each with its own NaN-guard). The telemetry work adds a third writer and a second reader. **Decision: extract a shared `bumpCounter`/`readCounter` pair** (e.g. `src/lib/kv-counter.ts`) and have daily-note, the new search telemetry, and both admin readers import it — folds three copies into one and guarantees the NaN-guard can't be forgotten on the new writer. If the plan prefers minimal blast radius, the fallback is "clone with the guard" — but flag that as conscious duplication, not silent.

3. **429 emission is single-source** (`search.ts:44-62`). No duplicate 429 builder. Additive `used` lands in one place.

---

## 7. Design constraints for the spec (MUST-HANDLE — non-negotiable)

1. **MUST thread `ctx` to the public search path.** `index.ts:17` calls `handleSearch(req, env)` with **no `ctx`** today (unlike daily-note at `:23`). The telemetry (§8) requires `ctx.waitUntil`. Either (a) change `index.ts:17` → `handleSearch(req, env, ctx, { meter })` and the signature accordingly, or (b) replicate daily-note's `NOOP_CTX` default (`daily-note.ts:107-117`) so non-ctx callers (the daily-note internal fan-out, which won't pass ctx) don't crash. **Both callers' arity must be reconciled in the same change.** This is the single biggest unstated gap in the spec — §8 assumes `ctx.waitUntil` on the search path but §5.2's `handleSearch(req, env, { meter })` signature has no `ctx` slot.

2. **MUST keep `searchCore` returning the byte-identical translated envelope** today's `handleSearch` returns (the `{ data: { top_windows, excluded_ranges, summary } }` shape daily-note reads at `daily-note.ts:363-378`). The cache HIT and MISS branches (`search.ts:66-90`) both return `Response.json(<translated>)` with `X-Cache`/`X-RateLimit-*` headers — `searchCore` owns these; `handleSearch` owns only parse+meter+429.

3. **MUST move parse/validate BEFORE meter** (already the order at `search.ts:31-43`) — spec §5.2.1 preserves it; the plan must not let the meter-flag refactor reorder it (invalid requests must not burn quota).

4. **MUST use UTC date for telemetry keys** (`metrics:search-*:{date}`), not user-local, so the `/admin/cap-metrics` 14-day UTC window (mirroring `admin.ts:59-96`) aligns. The user-local date is ONLY for the `quota:{deviceId}:{localDate}` enforcement key.

5. **MUST include the NaN-guard** (`Number.isFinite`) on any new counter writer — see `daily-note.ts:67-75`. Non-negotiable; its absence is a 14-day stuck-counter bug.

6. **MUST keep 429 body snake_case `reset_at_unix` and additive-only `used`** — two mobile parse sites (`api.ts:149,269`) read `reset_at_unix`; no rename (spec §6 already locks this).

7. **MUST keep `RateLimitError` `instanceof`-able and constructor-compatible with both throw sites** (`api.ts:149,269`). If adding `{ limit, used, resetAtUnix }`, update both throw sites in the same diff and keep the class a direct `ApiError` subclass so `query-client.ts:18` and the `friendlyMessage` ladder still match.

8. **MUST clone (not extend) the admin reader** — `/admin/cap-metrics` is a separate handler; do not touch `handleActivityMissingRate`'s `KEY_COUNT`/flatMap (Checkpoint-3-gating code). The reach-curve key `search-reach:{date}:{N}` is 2-D and needs a read loop over `N = 1..limit`, not the 1-D flatMap pattern.

9. **MUST drop `period_start_unix` from the return shape only after confirming the test is updated** — it's read in `rate-limit.test.ts:116` (`reset_at_unix === periodStart(now) + PERIOD_SEC`). Product code reads it nowhere else.

10. **MUST decide `FEATURES.FREE_SEARCH_PERIOD_DAYS` disposition.** It is referenced ONLY by `rate-limit.ts:3` (and its test, `rate-limit.test.ts:38`) on the Worker side. Once the daily key replaces `PERIOD_SECONDS`, this constant is orphaned. The plan should remove it from `env.ts:23` (and the test) OR explicitly leave it documented-dead. **It is NOT shared with mobile** — mobile has its own independent `FEATURES.FREE_SEARCH_PERIOD_DAYS` in `apps/mobile/src/config/features.ts:8` (a separate object, not imported from the Worker). Removing the Worker constant does not touch mobile.

---

## 8. File Touch Map (for Phase 2 partitioning)

| File | Change | Shared? |
|---|---|---|
| `workers/api-proxy/src/rate-limit.ts` | reshape → `meterSearch`, `quota:{deviceId}:{localDate}` key, local-date + next-midnight helpers, ENV override, drop `PERIOD_SECONDS`/`periodStart`/`rateLimitKey`/`checkAndIncrement`/`LIMITS` | SHARED RESOURCE — sole module export consumed by `search.ts:5`; rename strands that import. Renamed exports must land with the `search.ts` import update in the same task. |
| `workers/api-proxy/src/env.ts` | add `TIERS`/`Tier`/`resolveTier`; remove or document-dead `FREE_SEARCH_PERIOD_DAYS` | SHARED RESOURCE — `Env` type + `FEATURES` consumed by `rate-limit.ts`, `daily-note.ts`, all admin/route files and every test's `makeEnv`. Type-declaration file other tasks read; edits here ripple. |
| `workers/api-proxy/src/routes/search.ts` | `handleSearch(req, env, ctx?, { meter })` + private `searchCore`; additive `used` in 429; ctx for telemetry | SHARED RESOURCE — `handleSearch` is imported by `index.ts:3` AND `daily-note.ts:13` AND mocked by 5 test files via `vi.mock('../routes/search')`. Any export-name/signature change is cross-task. |
| `workers/api-proxy/src/routes/daily-note.ts` | one-line: `handleSearch(internalReq, env, { meter:false })` (+ ctx arg if signature gains ctx slot — see constraint 1) | Touches the SHARED `handleSearch` call; keep top-level deviceId gate (`:138-143`). |
| `workers/api-proxy/src/routes/admin.ts` | NEW `handleCapMetrics` (clone of `handleActivityMissingRate`); do NOT edit existing handler | Barrel-ish: `index.ts` imports from here; additive export only. |
| `workers/api-proxy/src/index.ts` | mount `/admin/cap-metrics`; thread `ctx` into `handleSearch` call (`:17`) | SHARED RESOURCE — route registry / order-sensitive dispatch; the `handleSearch(req, env)` → `handleSearch(req, env, ctx, ...)` edit at `:17` is load-bearing for telemetry. |
| `workers/api-proxy/src/lib/local-date.ts` (NEW, recommended) | extract `formatDateInTz` from `daily-note.ts:437-446` for reuse | SHARED RESOURCE — new shared helper imported by `rate-limit.ts` + `daily-note.ts`. |
| `workers/api-proxy/src/lib/kv-counter.ts` (NEW, recommended) | extract `bumpCounter`/`readCounter` (DRY §6.2) | SHARED RESOURCE — new shared helper imported by daily-note, search telemetry, both admin readers. |
| `workers/api-proxy/src/__tests__/rate-limit.test.ts` | rewrite for daily semantics: drop `periodStart`/`rateLimitKey`/`PERIOD_SECONDS`/`period_start_unix` assertions, add local-date/DST/TTL/tier tests | Test file — currently asserts removed exports (`:4-6,38,82,116,150`); will not compile until updated. Sequence after rate-limit.ts. |
| `workers/api-proxy/src/__tests__/` (new files) | exemption (must-#2), fail-safe-default, `meterSearch` unit, DST, tier/param, telemetry, admin cap-metrics auth/shape | — |
| `apps/mobile/src/lib/api.ts` | `RateLimitError` gains `{ limit, used, resetAtUnix }`; read `limit`/`used` from 429 body at both parse sites (`:149,269`) | Two throw sites must change together (constraint 7). |
| `apps/mobile/src/lib/error-messages.ts` | reshape RateLimitError copy → "searches", drop "10 moments"/"month"; derive "tomorrow" | One chokepoint, 5 render surfaces inherit it. No test asserts current string (safe). |
| `packages/shared-types` | **NO CHANGE NEEDED** — verified: 429 body / `reset_at_unix` / `rate_limited` are typed nowhere in `packages/shared-types/src` (grep clean). Spec's "verify during impl" resolved to no-op. | — |

---

## Top findings (summary)

- **RISK-1 (biggest, unstated in spec):** the public search route does **not** receive `ctx` today — `index.ts:17` is `handleSearch(req, env)`, while daily-note gets ctx at `:23`. Telemetry (§8) needs `ctx.waitUntil`, but the §5.2 signature `handleSearch(req, env, { meter })` has no ctx slot. Plan MUST add a ctx parameter (with a `NOOP_CTX` default like `daily-note.ts:107-117`) and reconcile **both** call-site arities.
- **MOCK TESTS ARE SAFE:** 5 daily-note test files mock `handleSearch` via `vi.mock('../routes/search', () => ({ handleSearch: vi.fn() }))`. None assert handleSearch's call **arguments** (only `toHaveBeenCalledTimes`); the `toHaveBeenCalledWith` assertions target `warn`/`env.CACHE.put`. Adding a private non-exported `searchCore` and a 3rd options arg does **not** break them. The e2e test (`daily-note-route-e2e.test.ts`) runs REAL `handleSearch` under `ENV:'development'` and asserts 200 + envelope shape — it guards constraint 2 and will catch any `searchCore` shape regression.
- **STRANDED IMPORTER:** `rate-limit.test.ts:4-6` imports `periodStart`, `rateLimitKey`, `LIMITS` and asserts `period_start_unix` (`:116`) — all removed by the reshape. The only product importer is `search.ts:5` (`checkAndIncrement`). Rename must update `search.ts` in the same task; the test file must be rewritten for daily semantics.
- **DRY:** the exact `Intl` local-date formatter the spec needs already exists at `daily-note.ts:437-446` (`formatDateInTz`); the counter primitive exists at `daily-note.ts:64-81` / `admin.ts:67-75`. Extract both into shared helpers rather than writing third copies.
- **NO COLLISIONS:** existing KV namespaces are `metrics:dn-*` and `ratelimit:*`; the spec's `quota:*` and `metrics:search-*` don't collide. (But the old `ratelimit:*` keys become orphaned post-rename — they self-expire via their TTL, no migration needed.)
- **MOBILE NON-BREAKING confirmed:** 5 `friendlyMessage` render surfaces (`LoadingScreen`, `MomentDetailScreen`, `NoViableScreen`, `CalendarScreen`, `DailyHero`) — matches spec's claim of 5. `location-storage.ts` only mentions `friendlyMessage` in a comment, not a call. No test asserts the current copy. `query-client.ts:18` depends only on `instanceof RateLimitError` (preserved). `shared-types` has zero 429 typing — no change needed there.
- **CONFIG:** Worker `FEATURES.FREE_SEARCH_PERIOD_DAYS` is referenced only by `rate-limit.ts:3` + its test; it becomes orphaned and should be removed/document-dead. It is independent of mobile's same-named constant.
