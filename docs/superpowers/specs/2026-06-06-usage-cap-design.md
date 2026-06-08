# Usage-Cap (per-user search quota) — Design Spec

**Date:** 2026-06-06
**Status:** Brainstorm complete; decisions locked; Compound V pre-flights folded in. Proceeding to writing-plans.
**Branch:** dedicated feature branch (e.g. `feat/usage-cap`)
**Pre-flight audits:** code-archaeology `docs/superpowers/expert/2026-06-06-usage-cap-archaeology.md` · domain `docs/superpowers/expert/2026-06-06-usage-cap-domain.md` · library `docs/superpowers/library-audit/2026-06-06-usage-cap.md`
**Gate:** build + test locally (Vitest + `wrangler dev`) only. The cap ships **with** the Worker-prod deploy as one conscious gated event — the cap is part of what makes that deploy safe. **Do NOT deploy.**

---

## 1. Why

A per-user **daily search cap**, enforced in the Cloudflare Worker, for **cost-shaping** of astrology-api.io credits (each `/electional/search` = 5 credits). It is **layered with, not a replacement for**, the host's coarse IP/fingerprint backstop:

- The host's IP/fingerprint cap is an abuse/throughput backstop. It structurally **cannot** express "N/day/**user**" — CGNAT over-blocks shared egress IPs, IP-churn/VPN under-enforces, and a native-app fingerprint is per-**build**, not per-user. It also cannot express the daily-note exemption.
- The **Worker is the only place** with identity (`X-Device-Id`), the exemption logic, and the API key. So the per-user cap lives here. Complementary layers, not duplicated work.

This work **reshapes the existing limiter** — it is not greenfield. `workers/api-proxy/src/rate-limit.ts` is already a KV-backed fixed-window counter wired into `routes/search.ts` at 10 / 30 days. This spec changes it to a **parameterized, tier-keyed, calendar-day-local daily cap**, and — the core of the work — **fixes the daily-note exemption** (which is currently broken; see §5).

## 2. Scope

**In:**
- Reshape `rate-limit.ts` → calendar-day-local daily counter, tier-parameterized limit (no hardcoded number).
- Exemption refactor: meter only the public `/electional/search` entry; daily-note's internal fan-out bypasses metering (§5).
- Additive `used` field on the existing 429 body (no rename) (§6).
- Aggregate-only cap-hit telemetry via the existing admin-metric seam (§8).
- Distinct mobile **capped-state copy** through the existing `friendlyMessage` chokepoint, + suppress DailyHero's retry on the cap branch (§9).
- New cheap mobile header carrying the **device tz** for the quota bucket (§3, §7).

**Out / deferred (with the seam that keeps them cheap later):**

| Deferred | Why | Seam left |
|---|---|---|
| 429 contract rename (`quota_exceeded`/`resetsAt`) | Cosmetic churn; breaking on two mobile parse sites; client already treats 429 terminally | `used` added **additively**; rename remains possible later |
| Proactive picker hint ("X of 5 left") | Value depends on cap-hit frequency we don't yet know — premature (dead code if rare) | Telemetry (§8) is designed to **answer** this; `X-RateLimit-Remaining` already returned |
| Durable Object exact enforcement | KV fixed-window is adequate for cost-shaping | `meterSearch` is one function; DO swap is contained |
| App Attest + Play Integrity | Hard anti-abuse not needed for cost-shaping | Identity resolution is one seam (§3) |
| Real entitlement tiers (pro) | No accounts in MVP | `resolveTier` stub + `TIERS` table (§4) |
| 10/month period flexibility | Superseded by the daily cap; no second period needed | — (intentionally **not** built; see §4 FIX) |
| Surfacing the count in copy ("5 of 5") | Hardcodes the mutable limit into UX; reads as a broken paywall tease under App-Store 4.3 scrutiny | `used`/`limit` ship additively for telemetry + future hint/tiers; just not in terminal copy |

## 3. Identity & device timezone

**Identity** = the client-generated, MMKV-persisted device UUID already sent as the `X-Device-Id` header (`apps/mobile/src/lib/device-id.ts`; Worker reads it in `routes/search.ts`).

**Honest caveat:** a reinstall resets the UUID and the header is spoofable. This is **acceptable for cost-shaping, not hard anti-abuse**. The upgrade path (App Attest + Play Integrity) is a future seam: device-identity resolution is a single concern at the Worker edge and can be hardened without touching the counter logic.

**Device timezone (new, for the quota bucket).** The mobile client adds a cheap header carrying the **user's own** tz — `Intl.DateTimeFormat().resolvedOptions().timeZone` — e.g. `X-Timezone: America/Sao_Paulo`. This is read **only** on the metered search path and used to bucket the daily quota to the *user's* midnight (§7). Rationale in §7.1.

## 4. Cap model — parameterized, tier-keyed

- **Tier resolution:** `resolveTier(env, deviceId) → Tier` — a **stub that returns `'free'` for everyone** (no accounts yet). The seam exists so a `'pro'` tier slots in later without touching call sites.
- **`TIERS` table, trimmed to only wired fields:**

  ```ts
  // env.ts
  export const TIERS = {
    free: { limit: 5 },   // ← the cap value; the boss's parameter, single source
  } as const;
  type Tier = keyof typeof TIERS;
  ```

  **No hardcoded number at any call site** — the limit lives only in `TIERS.free.limit`.

  **Why only `{ limit }` (FIX, 2026-06-06):** earlier drafts carried `periodDays` and `exemptPaths`. Both are dropped because **nothing wires them**:
  - `periodDays` would be a **lying knob** — the KV key is `YYYY-MM-DD` (inherently one calendar day) and the TTL is "to next local midnight"; both ignore `periodDays`, so setting `7` would still reset daily with no error. The cap is daily by construction. (The superseded 10/month needed period flexibility; the daily cap does not.)
  - `exemptPaths` is **redundant with the chosen exemption mechanism** — Approach B exempts via the call-site `meter` flag (§5), not a path-table lookup. Two mechanisms for one concern invites drift. Single mechanism: the flag.

  If a future need genuinely wires either field, add it back **with** its consumer in the same change — never as config that lies.

- **ENV override (preserved from today's `LIMITS` split):** local dev needs headroom or `wrangler dev` / mobile testing would block after a few searches. Resolution order:
  - `development` → high headroom (e.g. `1000`), regardless of tier.
  - `production` → `TIERS[tier].limit`.
  - unknown / missing `ENV` → **production ceiling** (fail-safe, matching the existing rate-limiter rule).
- **Reset = calendar day, in the USER's (device) timezone** (§7.1). Rationale: Inceptio's market — Brazil, LatAm, US, EU — is far from UTC, and the marquee personas are cross-tz (destination weddings, nomads, expats), so a UTC (or remote-search-location) reset makes the daily promise wrong.

## 5. Exemption refactor — the core (must #1 & must #2)

### 5.1 The bug being fixed

The exemption is **not** structurally true today — it is currently **broken**. `routes/daily-note.ts` (line ~353) builds an internal `Request` (passing `X-Device-Id`) and calls `handleSearch`, whose body runs `checkAndIncrement`. The mobile client documents this at `api.ts:238` — *"shares the per-device counter since /daily-note internally fans out to /electional/search."* **So the retention hook currently consumes the cap.** It must not.

### 5.2 Design — Approach B (fail-safe meter flag) + hybrid private core

Chosen over route-layer-only (Approach A) because for a **cost-control boundary** the safe default is *"meter unless explicitly exempted"* (fail toward protection). The failure-mode asymmetry is decisive:
- **B's failure** (forgetting `meter:false` on an exempt caller) is caught **loudly at dev-time** by the mandated exemption test.
- **A's failure** (a future internal caller reaching an unmetered core — e.g. a later push/SavedSearch feature copying daily-note's pattern) is caught by **nothing** and surfaces as a **production cost spike**.
- An enforced default (you must actively pass `meter:false` to escape) beats an advisory doc-comment.

**Shape:**
- `handleSearch(req, env, ctx, { meter = true } = {})` — the **single exported, reachable entry**. Default `meter:true`.
  - **`ctx` is threaded (archaeology RISK-1).** Today `index.ts:17` calls `handleSearch(req, env)` with **no `ctx`**, but the telemetry (§8) needs `ctx.waitUntil`. The signature takes `ctx: ExecutionContext`; `index.ts` passes the real `ctx` from `fetch(req, env, ctx)`; daily-note passes the `ctx` it already receives. Use a `NOOP_CTX` default (mirroring `daily-note.ts:107-117`) so non-request callers/tests need not fabricate one. **Both call-site arities are reconciled in this change.**
- Extract a **private, NON-exported `searchCore(...)`** holding cache → upstream → translate (returns a `Response`). It has **no external call surface**, so there is no exposed unmetered path. Clean meter/core separation **and** fail-safe default **and** no hole.
- `handleSearch` body:
  1. **parse + validate** the request (400 on failure) — **before** metering, so invalid requests never burn quota (preserves current ordering).
  2. if `meter`: require `X-Device-Id` (it is the counter key); run `meterSearch`; on `!allowed` return the 429 (§6).
  3. delegate to `searchCore`.
- **daily-note** changes its one call to `handleSearch(internalReq, env, ctx, { meter: false })`. Everything else in daily-note (the `internalReq` construction, reading the `Response`) is unchanged — smallest diff. Its `X-Device-Id` pass-through is now **vestigial** for metering; left in place + documented (harmless, removing it is out of scope).
- **deviceId requirement** moves to the **metered path only**. On `meter:false` it is not required.

### 5.3 Caller enumeration (must #1)

Exactly **two** callers of `handleSearch`, both audited:

| Caller | `ctx` | `meter` | Metered? |
|---|---|---|---|
| `index.ts` → `POST /electional/search` (public) | real `ctx` | default `true` | **yes** |
| `routes/daily-note.ts` (internal fan-out) | passed-through `ctx` | explicit `false` | **no** |

`meterSearch` has a single call site (inside `handleSearch`). No other path increments the counter. (Five daily-note test files mock `handleSearch` but assert only `toHaveBeenCalledTimes`, never argument shape — the added `ctx` arg and `searchCore` extraction are invisible to them; archaeology confirmed.)

### 5.4 meter-before-cache (consciously kept)

Metering happens **before** the cache read, so a **cache hit still counts** against the cap. Re-justified for the cost-shaping purpose (not carried as "unchanged"):

- A cache hit costs **zero** upstream credits, so counting it is **not** strictly cost-aligned.
- **Kept anyway** because: (a) predictable *"every search counts"* UX beats *"your remaining count depends on whether someone searched this before"*; (b) the soft cap makes the cache-hit effect minor; (c) it preserves the clean gate→core split — metering on cache-**miss** would push metering down **into** `searchCore`, reintroducing the very coupling §5.2 removes.
- **Flip to meter-on-cache-miss** only if strict cost-alignment is later wanted; documented as a conscious, reversible decision.

## 6. 429 contract — no rename, additive only

Keep the existing body and headers (both mobile parse sites — `searchElectional` and `getDailyNote` in `api.ts` — untouched):

```jsonc
// 429 body
{ "error": "rate_limited", "message": "...", "limit": 5, "reset_at_unix": 1717718400, "used": 5 }
```
- **`used` is the only addition** (non-breaking). It ships for telemetry + a future hint/tiers; it is **not** surfaced in terminal copy (§9, §2).
- Headers unchanged: `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

## 7. Counter, key & `meterSearch`

### 7.1 Bucket by DEVICE tz (not search-location tz)

A per-**user** quota must reset on the *user's* day. The search request's `timezone` is the **picked location's** tz (derived from lat/lng) — bucketing on it lets a remote-location search shift the user's counter to a foreign midnight, and multiple cross-tz searches in one day split across date buckets. So the quota buckets on the **device tz** from the new `X-Timezone` header (§3).

**Fallback chain** for the bucket tz: `X-Timezone` header → request `timezone` (search-location) → `UTC`. The header is the common, correct case; the chain is defensive against an older client or malformed input. (Note: this is distinct from the *search* `timezone`, which still drives the upstream chart math — unchanged.)

### 7.2 Key, TTL, helper

- **KV key:** `quota:{deviceId}:{localDate}`.
  - `localDate` = `YYYY-MM-DD`, computed **server-side** from `now` + the bucket tz via the **existing** `Intl` formatter `formatDateInTz` (`daily-note.ts:437-446`) — **extract it to a shared helper** and reuse (DRY; archaeology). The client supplies tz; the **server computes the date**, so the bucket is **not client-fabricable per request**. The date bucket is **exact** via `Intl`. (workerd has full ICU + arbitrary IANA `timeZone`; `'en-CA'` → `YYYY-MM-DD` — library-audit CONFIRMED.)
  - **UTC-date fallback** per §7.1.
- **TTL:** `Math.max(60, secondsToNextLocalMidnight + buffer)` (**library-audit H1 — required fix**). KV's `expirationTtl` minimum is **60 s** and `put` *throws* below it; in the last minute before local midnight the raw to-midnight value drops under 60. The clamp is on the **counter write (request path)**, not a swallowed metric, so it must not throw. Harmless side effect: a key written in the last ~60 s lingers slightly into the next day, but keys are date-stamped so the new day uses a different key. **Test:** write at 23:59:30 local → assert `put` received `expirationTtl >= 60`.
- **`meterSearch(env, deviceId, bucketTz, now?) → { allowed, count, limit, used, reset_at_unix }`:**
  - `now` injectable (default `Math.floor(Date.now()/1000)`) — **necessary, not just convenient**: vitest fake timers do **not** reach the KV/Intl-tz simulators (library-audit M3), so determinism comes from injecting `now`. Test TTL by asserting the `put` argument, not by observing expiry.
  - read count → if `>= limit`: `{ allowed:false, ... }` (no increment); else write `count+1` with the clamped TTL, return `{ allowed:true, ... }`.
  - `reset_at_unix` = next device-local-midnight as unix. **DST-correct technique (library-audit M1):** read the zone offset **at the candidate instant** (`Intl.DateTimeFormat(..., { timeZoneName:'longOffset' })` / `formatToParts`) with one settle iteration — do **not** subtract "today's offset" from a naive tomorrow-midnight. Display/`Retry-After` only, so minor drift is non-fatal — but it gets an explicit DST-boundary test. Intl-only is sufficient; **no date library warranted** (library-audit confirms the "no date lib in Worker" stance).
- **Concurrency:** read-modify-write is **non-atomic** (KV has no atomic increment). KV is eventually consistent: a single device usually hits the same PoP so read-after-write is usually fresh, but the worst case is **~2× burst per concurrently-stale PoP** during the ≤~60 s cross-PoP propagation window — *not* a hard global 2× guarantee (library-audit M2). Acceptable for a cost-shaping soft cap. DO seam if exact enforcement is ever needed for paid tiers.

## 8. Telemetry — aggregate-only, admin-metric seam reuse

Reuses the established pattern: best-effort KV counters via the **existing** counter primitive (`daily-note.ts:64-81` + `admin.ts:67-75` NaN-guard — **extract to a shared helper** and reuse; DRY, archaeology), written under `ctx.waitUntil` (now available, §5.2) with **errors swallowed** (a metric write must never 5xx a user request), keyed `metrics:{name}:{YYYY-MM-DD}`, surfaced by an admin GET behind `x-admin-token`.

**Aggregate-only — NO metric key contains `deviceId`.** Counts by date and by `{N}`, never a per-user usage log.

- `metrics:search-metered:{date}` — total metered attempts.
- `metrics:search-capped:{date}` — cap-hits (429s). → **cap-hit rate** = `capped / metered`.
- `metrics:search-reach:{date}:{N}` — bumped at the **resulting count `N`** on each *allowed* metered search → a **survival curve** (devices reaching ≥ N that day). `reach:1` vs `reach:{limit}` reveals whether usage **clusters near 1 or near the cap** — validating **both** the limit value **and** whether the deferred proactive hint (§2) earns its code.

**Admin endpoint:** `GET /admin/cap-metrics`, mirroring `handleActivityMissingRate` — `x-admin-token` auth (fail-closed on missing secret), 14-day window newest-first, missing keys coerced to 0. Mounted in `index.ts`. The metric date uses the **same device-tz/UTC-fallback** date as the bucket so rate and counter align. Telemetry is only meaningful in prod, so it **rides the Worker-prod gate**. No KV-key collision with existing `ratelimit:*` / `metrics:dn-*` (archaeology).

## 9. Mobile capped state — copy only, + DailyHero retry suppression

The trigger-time 429 is the **mandatory authoritative floor** — the server is the source of truth; a client-side "remaining" count can never *be* the enforcement (stale/drift/spoof). No proactive pre-disable in this scope.

- **Single copy chokepoint:** reshape the `RateLimitError` branch in `apps/mobile/src/lib/error-messages.ts`. It is rendered by **five** surfaces (`LoadingScreen`, `MomentDetailScreen`, `NoViableScreen`, `CalendarScreen`, `DailyHero`), so one edit gives the distinct capped state everywhere — **no new screen, no new client state**.
- **Live bug to overwrite (domain):** the *current* string says *"You've explored 10 **moments** this month."* — it already violates NOTE #4 and the stale 10/30 framing. The reshape overwrites it.
- **Copy rules:**
  - Say **searches** (never "moments" — overloaded with the astrological windows; *"used today's moments"* misreads as "the good moments are gone"). NOTE #4.
  - Anchor to **"midnight," not "tomorrow"** — reset is the user's local midnight; "tomorrow" can be off by a calendar day for cross-tz users, and is plain wrong near midnight.
  - **Count-free** — do not surface "5 of 5" (don't hardcode the mutable limit; avoid the App-Store-4.3 "free searches implies a paid tier" tease; the count's value at block-time is marginal).
  - **Zero monetization signal** — no "upgrade / Pro / unlock," consistent with the hidden-paywall posture (domain CONFIRMED).
  - Mystical Premium tone, forbidden-word-clean. **Draft (domain Option A):** *"You've used today's searches. A new set opens at midnight."* Final wording in implementation; not gated on astrologer review (chrome string) but kept forbidden-word-clean.
- **Reads as a state, not an error** — distinct from no-viable (a different result branch) and real API errors (different error classes); never a crash.
- **DailyHero retry suppression (Decision 1):** `DailyHero.js:~97` pairs `friendlyMessage` with a **retry button**. On a terminal daily cap, retry just re-hits the 429. Suppress/hide the retry affordance on the **cap branch** (`err instanceof RateLimitError`) — a small in-scope conditional; the distinct capped state is precisely *not* retryable, and the UI should reflect that.
- **`RateLimitError` carries `{ limit, used, resetAtUnix }`** — `api.ts` already parses `reset_at_unix`; add `limit`/`used` from the additive 429 body (for telemetry parity + future hint/tiers; **not** rendered in v1 copy). Stays **terminal** (no retry-backoff). `query-client.ts:18` already keys retry behavior on `instanceof RateLimitError` (archaeology) — unchanged.
- **Send `X-Timezone`** (§3) from `searchElectional` in `api.ts`.
- **Consequence:** post-refactor, daily-note never emits the **per-user-cap** 429, so the mobile `getDailyNote` `RateLimitError` branch is now unreachable for the cap (upstream-quota 429 still maps to `UpstreamQuotaError`). Left in place, harmless, documented.
- **Deferred sweetener (not built):** "X left today" from `X-RateLimit-Remaining` — revisit if telemetry shows frequent cap-hits.

## 10. Testing (local — the gate)

Vitest (`@cloudflare/vitest-pool-workers`) + `wrangler dev` smoke. **No deploy.** Determinism via injectable `now` (fake timers don't reach KV/Intl sims — library-audit M3). Required assertions:

- **must #2 — exemption (the assertion that *is* the feature):** a `/daily-note` request does **NOT** increment the counter; a direct `/electional/search` **DOES**.
- **fail-safe default (locks §5.2):** `handleSearch` with **no options** increments; `{ meter:false }` does not.
- **`meterSearch` unit:** under limit → allow + increment; at limit → block (`allowed:false`) with correct `reset_at_unix`; correct local-date bucket per **device** tz; **bucket-tz fallback chain** (`X-Timezone` → request tz → UTC); TTL set.
- **KV TTL floor:** write at 23:59:30 device-local → `put` receives `expirationTtl >= 60` (library-audit H1).
- **DST:** `reset_at_unix` = next device-local midnight across a DST-boundary tz (offset read at the candidate instant).
- **tier/param:** limit comes from `TIERS` (not a literal); dev ENV override; unknown ENV → prod ceiling.
- **429 body:** includes additive `used`; rewrite the existing `rate-limit.test.ts` (it imports the removed `periodStart`/`rateLimitKey`/`LIMITS` and asserts `period_start_unix` — rename + test rewrite land together; archaeology).
- **DRY behavior-preservation:** extracting `formatDateInTz` + the KV counter primitive out of `daily-note.ts` must be behavior-preserving — daily-note's existing tests guard this; keep them green.
- **telemetry:** counters bump best-effort under `ctx.waitUntil`; **no metric key contains `deviceId`**; admin endpoint auth (401 on missing/mismatched token, fail-closed on missing secret) + 14-day shape.
- **mobile:** capped copy via `friendlyMessage` — **negative test asserting the string never contains "moment"** (domain); anchors to "midnight"; no monetization words. `RateLimitError` carries `limit`/`used`/`resetAtUnix`. **DailyHero suppresses retry** on the `RateLimitError` branch. `searchElectional` sends `X-Timezone`.

## 11. Files touched

| File | Change |
|---|---|
| `workers/api-proxy/src/rate-limit.ts` | reshape → `meterSearch`, device-tz local-date key, `Math.max(60,…)` TTL, DST-correct `reset_at_unix`, `TIERS`-driven limit, ENV override |
| `workers/api-proxy/src/env.ts` | `TIERS` table (`{ free: { limit } }`), `resolveTier` stub; orphan `FEATURES.FREE_SEARCH_PERIOD_DAYS` (independent of mobile's same-named constant — remove or leave, decide in plan) |
| `workers/api-proxy/src/routes/search.ts` | `handleSearch(req, env, ctx, { meter })` + private `searchCore`; read `X-Timezone`; additive `used` in 429; telemetry bumps |
| `workers/api-proxy/src/routes/daily-note.ts` | call `handleSearch(internalReq, env, ctx, { meter:false })`; use the extracted shared helpers |
| `workers/api-proxy/src/lib/` (new shared helpers) | extract `formatDateInTz` + the KV counter primitive (DRY; behavior-preserving) |
| `workers/api-proxy/src/routes/admin.ts` | `GET /admin/cap-metrics` (mirror existing) |
| `workers/api-proxy/src/index.ts` | pass `ctx` to `handleSearch`; mount `/admin/cap-metrics` |
| `workers/api-proxy/src/__tests__/*` | exemption, fail-safe-default, `meterSearch`, TTL-floor, DST, tier/param, telemetry, bucket-tz-fallback tests; rewrite `rate-limit.test.ts` |
| `apps/mobile/src/lib/error-messages.ts` | distinct capped copy (searches, midnight-anchored, count-free, no monetization) |
| `apps/mobile/src/lib/api.ts` | `RateLimitError` carries `limit`/`used`/`resetAtUnix`; read additive `used`; send `X-Timezone` |
| `apps/mobile/src/components/daily-note/DailyHero.js` | suppress retry on the `RateLimitError` branch |
| `packages/shared-types` | none expected — no 429 body typing exists (archaeology); verify during impl |

## 12. Process

Brainstorm (this doc) + Compound V pre-flights (folded above) → writing-plans → implement with the **full review chain** (spec-reviewer + code-quality).

**PAUSE for owner diff-review** at: the **`meterSearch` helper** + the **exemption refactor** (the daily-note → `{ meter:false }` change together with the **must-#2 exemption test** and the **fail-safe-default test**). These are the load-bearing changes — review the diff before proceeding past them.

---

*Decisions locked in brainstorm 2026-06-06: device-UUID identity (spoofable, cost-shaping only); KV fixed-window (DO seam); calendar-day reset in the **device** tz (`X-Timezone` header → search-tz → UTC fallback; server-computed date); single parameterized tier-keyed limit (`TIERS.free.limit`, no hardcoded number, no `periodDays`/`exemptPaths`); **no 429 rename**, `used` added additively (not surfaced in copy); exemption via **fail-safe `meter` flag** (Approach B) + private `searchCore`; `ctx` threaded for telemetry; meter-before-cache (consciously kept); aggregate-only telemetry (no `deviceId` in keys); trigger-time capped state, proactive hint deferred pending telemetry; copy says "searches" not "moments", midnight-anchored, count-free, zero monetization signal; DailyHero retry suppressed on the cap branch. Pre-flight fixes folded: ctx/NOOP_CTX, `Math.max(60,…)` KV floor, DST settle-iteration, DRY reuse of `formatDateInTz` + KV primitive, live-copy overwrite + negative "moment" test. Local build+test gate; cap ships with the Worker-prod deploy as one gated event.*
