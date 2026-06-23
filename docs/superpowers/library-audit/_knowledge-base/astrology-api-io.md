# astrology-api.io v3 (api-public) Library Knowledge Base

Maintained by Compound V Phase 1C validator. Append at the bottom.

---

## Updated 2026-06-23 — direct-call (remove-Cloudflare) validation

Source of all claims below: live probes against `https://api-public.astrology-api.io/api/v3`
on 2026-06-23, plus `openapi.json` (HTTP 200, 2,312,076 bytes) fetched same day.

### Version (verify before trusting either number)
- `openapi.json` → `info.version = "3.2.10"`.
- `GET /api/v3/health` (keyless, 200) → `"version":"3.2.0"`.
- **Skew is real** — the running gateway and the published spec are different builds.
  Treat live-probed behavior as ground truth. (npm/registry style verification N/A — private API.)

### Auth — keyless works LIVE, but is undocumented
- OpenAPI declares `security: [{"BearerAuth":[]}]` on `electional/search` (key *required* per contract).
- Live keyless `electional/search`:
  - malformed/flat body → **HTTP 422**, header `x-auth-bypass: true`
  - correct nested body → **HTTP 200**, header `x-auth-bypass: true`
- Infra headers reveal Cloudflare → Railway (`cf-ray`, `x-railway-request-id`, `x-railway-edge: waw1`).
  The `x-auth-bypass` is a gateway setting, NOT an API contract guarantee. Can be revoked silently.

### Rate limit / 429 — NOT documented (open risk)
- `electional/search` documents only **200 / 400 / 422**. No 429 in the OpenAPI anywhere.
- Live 200 carried **no** `ratelimit*` / `retry-after` / `x-quota` headers.
- Could not observe or trigger a 429. Any client 429 soft-block codes against an unverified shape.

### `electional/search` request schema (POST /api/v3/electional/search)
`ElectionalSearchRequest.required = ["activity","date_range","location"]`
- `activity`: enum `ElectionalActivity` (35 values, below).
- `date_range`: `DateRange-Input.required=["start_date","end_date"]`; each is
  `Date = {year:int, month:int, day:int}` (all 3 required).
- `location`: `DateTimeLocation.required=["year","month","day","hour","minute"]`;
  optional/nullable: `second`(default 0), `latitude`, `longitude`, `city`, `country_code`, `timezone`.
  → lat/lng are nullable: a timezone-only or city-only location validates.
- Optional top-level: `house_system`(default "P"), `natal_chart`, `filters`, `extra_params`,
  `custom_criteria`, `granularity`, `top_n_windows`(default 10), `top_n_days`(default 30),
  `summary_mode`(false), `emergency_mode`(false), `language`(default "en").
- **A flat body (e.g. `{activity,start,end}`) returns 422.** Nested `date_range`+`location` mandatory.

### `electional/search` response
- Documented schema `ElectionalSearchResponse.required = ["activity","house_system","search_window",`
  `"summary","heatmap","top_windows","excluded_ranges"]`.
- **Live wraps it**: `{"success":true,"data":{…that schema…}}`. The OpenAPI documents only the inner
  `data`. Clients validating directly MUST unwrap `.data` first (shared-types `ApiEnvelopeSchema` models this).

### `ElectionalActivity` enum (35 values, 2026-06-23)
wedding, surgery, business_launch, contracts, real_estate, travel, legal, agriculture, building,
investment, creative_launch, relocation, conception, medication, purchase, sale, loan, planting,
harvesting, birth, exam, interview, study, hiring, firing, settling, lease, dental, product,
haircut, courtship, divorce, weaning, cosmetic, naming.
→ All 4 MVP activities (wedding, contracts, business_launch, travel) CONFIRMED valid.
→ Note: enum has GROWN well beyond CLAUDE.md's "twelve total" — permissive-enum policy remains correct.

### Other electional paths present
`/electional/glossary/activities`, `/electional/evaluate`, `/electional/planetary-hours`.

---

## On-device dependencies for the direct-call architecture (verified 2026-06-23)

### `@photostructure/tz-lookup` — Hermes/RN safe ✅
- Registry (`registry.npmjs.org`): latest **11.5.0**, published 2026-03-08, **0 deps**, not deprecated.
- Installed in `apps/mobile` = 11.5.0 (matches latest).
- `tz.js` (73KB) is a single self-contained pure-JS file: timezone polygon data embedded as a string
  literal, accessed via string indexing + integer math. **No** `fs`, `Buffer`, `process`, `fetch`,
  `TextDecoder`. Synchronous `tzlookup(lat,lng)`. Runs under Hermes with no shim, no data-file bundling.
- CAUTION: the unscoped `tz-lookup` and `geo-tz` packages load a data file via `fs` → would break in
  Hermes. The plan MUST use the `@photostructure/`-scoped package (it does).

### `zod` — stay on v3
- Installed 3.25.76 (root + hoisted into `apps/mobile/node_modules`, resolvable from RN). shared-types
  pins `^3.23.8`. Zod 4.x exists with a different import surface; `npm install zod@latest` would pull v4
  and break shared-types. **Pin to v3** when moving validation into the RN bundle.

### Monorepo resolution (for adding `@inceptio/translations`)
- Root `package.json` `workspaces = ["packages/*","workers/*"]`. `apps/mobile` is intentionally NOT a
  workspace; it consumes `@inceptio/shared-types` via `"file:../../packages/shared-types"` (npm symlink).
- `apps/mobile/metro.config.js` already sets `watchFolders=[monorepoRoot]` and
  `nodeModulesPaths=[mobile/node_modules, monorepoRoot/node_modules]`, `disableHierarchicalLookup=false`.
- → To add translations: same `file:` link + compile package as TS source (`main: ./src/index.ts`, like
  shared-types). Metro needs no change. `expo-updates`/EAS Update absent and not referenced (bundle-only
  is genuinely bundle-only — nothing secretly depends on OTA).

### CLAUDE.md drift confirmed (do not trust the "locked stack")
ABSENT from `apps/mobile/package.json` despite CLAUDE.md listing them: `react-native-purchases`,
`react-native-mmkv`, `date-fns`, `date-fns-tz`. Storage = `@react-native-async-storage/async-storage`
2.2.0. Date math = native `Date`. (Matches memory notes claudemd-stack-stale + paywall-config drift.)
