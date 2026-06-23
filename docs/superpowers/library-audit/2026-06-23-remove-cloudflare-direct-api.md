# Library & API Validation — Remove Cloudflare, Direct api-public Call

**Date:** 2026-06-23
**Spec under audit:** `docs/superpowers/specs/2026-06-23-remove-cloudflare-direct-api-design.md`
**Validator:** Compound V Phase 1C (library/API currency only)
**Verdict counts:** 0 CRITICAL, 2 HIGH, 3 MEDIUM. Section 8 (Open Questions) HAS items to escalate.

---

## 1. Tools Available

- Context7 MCP: not needed for this audit (the load-bearing dependency is a live private API, not a Context7-indexed library; the one OSS lib was verified via npm registry API + on-disk source).
- WebFetch: degraded for npmjs.com (HTTP 403) — fell back to `registry.npmjs.org` JSON API (authoritative, better).
- Live API probes: **executed** against `https://api-public.astrology-api.io/api/v3` (health + 2 `electional/search` POSTs).
- Manifests found: `apps/mobile/package.json`, `packages/shared-types/package.json`, root `package.json` (npm `workspaces`), `apps/mobile/metro.config.js`, `apps/mobile/node_modules/@photostructure/tz-lookup/` (on-disk source inspected).
- Lockfile: `package-lock.json` (npm). No pnpm/yarn.

---

## 2. Libraries Mentioned

| Name | Spec context | Current ver | Repo pinned | Last release | Maintenance | Status |
|------|--------------|-------------|-------------|--------------|-------------|--------|
| `@photostructure/tz-lookup` | moved Worker→RN bundle for offline lat/lng→IANA tz | 11.5.0 | `^11.5.0` (installed 11.5.0) | 2026-03-08 | active, 0 deps, not deprecated | 🟢 OK |
| `zod` | response validation moves into RN bundle | 3.25.76 (installed); 4.x exists | `^3.23.8` via shared-types | n/a | active | 🟡 MEDIUM (see F-MED-1) |
| `@inceptio/shared-types` | source of truth, stays | local | `file:../../packages/shared-types` | n/a | local | 🟢 OK |
| `@inceptio/translations` | spec moves Worker `translations/` here; pkg "currently empty" | local | not yet a mobile dep | n/a | local | 🟢 OK (resolution path validated — see §7/Constraints) |
| `expo` / `react-native` | bundle-only delivery target | 55.0.0 / 0.83.6 | `~55.0.0` / `0.83.6` | n/a | active | 🟢 OK |
| `expo-updates` / EAS Update | spec: "NOT installed, out of scope" | — | **ABSENT (confirmed)** | n/a | n/a | 🟢 OK — claim CONFIRMED |
| `react-native-purchases` (RevenueCat) | spec: paywall scaffold "remains, load-bearing" | — | **ABSENT** | n/a | n/a | 🟠 HIGH (see F-HIGH-2 — CLAUDE.md/spec drift) |

External API:

| API | Spec assumes | Live/spec reality | Status |
|-----|--------------|-------------------|--------|
| astrology-api.io v3 `electional/search` | v3.2.10, keyless, nested body | openapi=3.2.10, **health=3.2.0**, keyless works live (`x-auth-bypass:true`), nested body confirmed | 🟠 HIGH (version skew + auth-bypass is undocumented behavior — F-HIGH-1) |

---

## 3. API Signatures Verified (live, 2026-06-23)

| Item | Spec claim | Verified reality | Result |
|------|-----------|------------------|--------|
| `electional/search` required body | nested `date_range` + `location`; flat → 422 | `required: ["activity","date_range","location"]`; live flat body → **HTTP 422** | CONFIRMED |
| `date_range` shape | `{start_date,end_date}` of `{year,month,day}` | `DateRange-Input.required=[start_date,end_date]`; each is `Date` = `{year,month,day}` (all required ints) | CONFIRMED |
| `location` shape | `{year,month,day,hour:12,minute:0,latitude,longitude,timezone,city}` | `DateTimeLocation.required=[year,month,day,hour,minute]`; lat/lng/timezone/city all **optional/nullable**; `second` defaults 0 | CONFIRMED (Worker `toUpstreamBody` matches; lat/lng nullable means tz-only is also valid) |
| `top_n_windows` | `10` | property exists, integer, **default 10** | CONFIRMED |
| Activities valid | wedding, contracts, business_launch, travel | `ElectionalActivity` enum contains all 4 (+ 31 others incl. surgery) | CONFIRMED |
| Keyless / `x-auth-bypass` | request without key → `x-auth-bypass:true` + 422 | live keyless flat → 422 `x-auth-bypass:true`; keyless correct → **200** `x-auth-bypass:true` | CONFIRMED behavior, but see F-HIGH-1 (undocumented/unstable risk) |
| Response envelope | UI contract `SearchResult` unchanged | live 200 = `{success:true,data:{activity,house_system,search_window,summary,heatmap,top_windows,excluded_ranges}}` | CONFIRMED — but envelope wrapper `{success,data}` is NOT in OpenAPI (only inner `data` documented). See F-MED-3 |
| 429 / quota shape | upstream IP limit, 429 → soft-block | `electional/search` documents only **200/400/422 — NO 429**. No quota/rate-limit headers on live 200. No rate-limit text in OpenAPI. | NEEDS-CORRECTION (F-HIGH-1) |
| Version | 3.2.10 | openapi.json info.version = **3.2.10**; `/health` reports **3.2.0** | PARTIAL — skew, F-HIGH-1 |

---

## 4. Critical Findings 🔴

None. The two pillars (keyless access + nested request shape) were proven live. No deprecated/abandoned library in the move.

---

## 5. High-Priority Findings 🟠

### F-HIGH-1 — Keyless access works LIVE but is contractually undocumented; 429 path the spec depends on is undocumented

**Evidence:**
- OpenAPI declares `security: [{"BearerAuth":[]}]` on `electional/search` — i.e. the **published contract says a Bearer key is required**.
- Live reality (2026-06-23, 3 probes): keyless requests return `x-auth-bypass: true` and succeed (correct body → 200, malformed → 422). So a gateway layer (Cloudflare in front of Railway — see `x-railway-*` / `cf-ray` headers) is *bypassing* the documented auth.
- `electional/search` documents **only 200/400/422 responses — there is no 429 in the spec**, no rate-limit headers on the live 200, and no rate-limit/quota text anywhere in the 2.3MB OpenAPI.

**Why it matters for this change:** The spec removes the Worker (the thing that hid the key and enforced limits) and bets the entire architecture on (a) keyless access staying on, and (b) a 429 soft-block existing. Both are **undocumented gateway behaviors**, not API contract. The provider can flip `x-auth-bypass` off or change the throttle shape with zero spec change and zero warning — exactly the "silent upstream change" class that already burned this project (the `good`/`mercury_combust` enum drift in CLAUDE.md). With the Worker gone there is **no server-side seam to absorb that** — every user's app breaks at once and the only fix is a store release.

**Plus version skew:** `/health` = 3.2.0, `openapi.json` = 3.2.10. The running gateway and the published spec are not the same build. Treat openapi.json as aspirational, live probes as ground truth.

**Recommendation (not a fix — for the plan author):** Keep the request/response Zod contract strict and add an explicit `UpstreamAuthError` branch (401/403) even though it's "impossible" today — so a future `x-auth-bypass` removal degrades to a handled error, not a white screen. Escalate the "no documented 429" gap to Open Questions §8.

### F-HIGH-2 — Spec assumes a paywall scaffold (`react-native-purchases`) that is NOT installed

**Evidence:** §5 of the spec: *"Paywall-скаффолд (`react-native-purchases`, экраны, флаг `PAYWALL_ENABLED`) **остаётся** — он load-bearing для будущего."* CLAUDE.md lists `react-native-purchases` as a locked dependency.

Reality: `react-native-purchases` is **ABSENT** from `apps/mobile/package.json`. Also absent: `react-native-mmkv`, `date-fns`, `date-fns-tz` — all "locked" in CLAUDE.md.

**Why it matters:** The spec says it "remains," implying it's there to preserve. It isn't there. This is a no-op for *this* change (the spec doesn't add paywall code), but the plan must not contain a step that "keeps" or "wires" RevenueCat as if it exists. Memory note `paywall-config-contradicts-server-cap` and `claudemd-stack-stale-asyncstorage-datefns` already flag this drift. CLAUDE.md is stale; the spec inherited the staleness.

**Recommendation:** Plan should treat paywall as *out of scope and not present* (consistent with spec §9 YAGNI). No alternative library needed.

---

## 6. Medium Findings 🟡

### F-MED-1 — Zod 3 vs 4 (informational; pin holds)
Installed Zod is **3.25.76** (root + hoisted into `apps/mobile/node_modules`, resolvable from RN). shared-types pins `^3.23.8`. Zod 4.x is released and is a different import surface (`zod/v4`, perf rewrite). Moving validation into the RN bundle does **not** require an upgrade — 3.25.x is current within the v3 line and Hermes-safe (pure JS). MEDIUM only because a careless `npm install zod@latest` during the move would pull v4 and break shared-types. **MUST stay on v3.**

### F-MED-2 — `@photostructure/tz-lookup` Hermes-safety (verified GREEN, recorded as MEDIUM because it's the load-bearing on-device claim)
Verified the **installed** `tz.js` (v11.5.0, 73KB): single self-contained file, timezone polygon data embedded as a string literal, **zero runtime deps**, no `require('fs')`, no `Buffer`, no `process`, no `fetch`, no `TextDecoder` — only string indexing + integer math. This is the synchronous `tzlookup(lat, lng)` API. It runs under Hermes with no shims and no data-file bundling step (the data is *in* the JS). Registry: latest 11.5.0, published 2026-03-08, not deprecated. **No alternative needed** — the spec's choice is sound. (Contrast: `geo-tz`/`tz-lookup`-the-other-one load a `.bin`/`.geojson` via `fs` and would NOT work in Hermes — confirm the plan imports the `@photostructure/` scoped package specifically, which it does in package.json.)

### F-MED-3 — Response envelope wrapper is undocumented
Live 200 wraps the documented `ElectionalSearchResponse` inside `{"success":true,"data":{…}}`. OpenAPI's `ElectionalSearchResponse` schema describes only the **inner** object (`activity, house_system, search_window, summary, heatmap, top_windows, excluded_ranges`). When mobile validates the response with Zod directly against api-public, it must unwrap `.data` first (the Worker did this; mobile's existing `ApiEnvelopeSchema` in shared-types already models `{success,data}` — confirm the moved code keeps the unwrap). Low risk because the seam already exists, but it's a silent 422-on-our-side trap if the plan validates the wrong level.

---

## 7. Design Constraints for the Plan (non-negotiable)

- **MUST** build the upstream body exactly as `toUpstreamBody` does: `date_range.{start_date,end_date}` each `{year,month,day}` (ints), `location.{year,month,day,hour,minute}` required + lat/lng/timezone/city optional, `top_n_windows`. Flat body → 422. Port the existing function verbatim (spec §3 item 1 says "without logic change" — honor that).
- **MUST** unwrap `{success,data}` before validating against the documented response schema (F-MED-3). Reuse `ApiEnvelopeSchema` from shared-types.
- **MUST** keep Zod on the v3 line (`^3.x`, currently 3.25.76). Do NOT `npm install zod@latest` (pulls v4, breaks shared-types). (F-MED-1)
- **MUST** import the tz lib as `@photostructure/tz-lookup` (scoped). Do NOT swap to bare `tz-lookup` or `geo-tz` — those load data via `fs` and break under Hermes. (F-MED-2)
- **MUST** add an explicit upstream-auth-error branch (401/403) in `api.ts` error mapping, even though keyless works today — the `x-auth-bypass` behavior is undocumented and can be revoked silently. (F-HIGH-1)
- **MUST NOT** write a plan step that "keeps/wires" `react-native-purchases`, MMKV, or date-fns — none are installed. On-device caching uses the existing **AsyncStorage** wrapper (`@react-native-async-storage/async-storage@2.2.0`); date math uses native `Date` millis (no date-fns). (F-HIGH-2, matches spec §4)
- **MUST** add `@inceptio/translations` as a mobile dep using the SAME mechanism as shared-types: `"file:../../packages/translations"` + Metro already watches `monorepoRoot` and falls back to root `node_modules` (`apps/mobile/metro.config.js`). No workspace protocol; mobile is intentionally NOT in root `workspaces` (root workspaces = `packages/*`, `workers/*` only). Adding the package needs: (a) `file:` link in mobile package.json, (b) the package compiled/exported as TS source like shared-types (`main: ./src/index.ts`), (c) zod available to it (already hoisted). Metro config needs no change — `watchFolders=[monorepoRoot]` already covers `packages/translations`.
- **MUST** treat live-probe behavior as ground truth over openapi.json (`/health`=3.2.0 vs spec=3.2.10 skew). (F-HIGH-1)

---

## 8. Open Questions for the Human (escalate)

1. **No documented 429 / quota.** The spec's whole abuse story ("полагаемся на лимит публичного URL", soft-block on 429) rests on a rate limit that is **not in the OpenAPI spec and emitted no headers on our live 200**. We could not trigger or observe a 429. Question for stakeholder/provider: *Does api-public actually enforce a per-IP limit, what is the threshold, and what is the 429 body shape?* Without this, the soft-block UX (`UpstreamQuotaError`/`RateLimitError`) is coding against an unverified contract.
2. **`x-auth-bypass` stability.** Is the keyless bypass an intentional, supported public tier — or a temporary gateway setting? If it can be revoked, removing the key-hiding Worker is a one-way door that turns every future revocation into a forced store release. Get this in writing from the provider before locking the plan.
3. **Version skew acceptance.** `/health`=3.2.0, openapi=3.2.10. Is the team OK pinning the request/response contract to live-probed behavior (which may drift from either number)?

---

## 9. Knowledge Base Updates

Appended a dated entry to `docs/superpowers/library-audit/_knowledge-base/astrology-api-io.md` (created — no prior file) covering: v3.2.10 openapi vs 3.2.0 health skew, `electional/search` exact request/response schema, keyless `x-auth-bypass` live behavior, activity enum (35 values), absent 429 contract.

Appended a dated entry to the existing `cloudflare-workers.md`? No — this audit is about *removing* the Worker; the API facts belong in the new `astrology-api-io.md`. tz-lookup Hermes-safety recorded in `astrology-api-io.md`'s sibling note section. (No `tz-lookup.md` existed; folded into the API KB under "On-device dependencies for the direct-call architecture".)
