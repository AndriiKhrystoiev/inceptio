# CLAUDE.md — Inceptio

This file gives Claude Code the project context for Inceptio. Read this completely before starting any task in this repo.

---

## What Inceptio is

A mobile app that helps people find the right moment to begin what matters — a wedding, a contract, a business launch, a journey. The product leads with user intent ("when is the best time to start?") and uses **electional astrology** as the method under the hood — present in the explanation, never the headline. The voice is a thoughtful friend who happens to know traditional astrology, never a fortune-teller or a data analyst.

The product is built on top of [astrology-api.io](https://astrology-api.io) v3, specifically the `/electional/search` endpoint, which returns scored time windows for a chosen activity within a chosen date range and location.

The MVP supports four activities: **wedding, contracts, business_launch, travel**. The API supports twelve total — surgery, legal, agriculture, building, investment, creative_launch, relocation, real_estate are deferred to later versions. Surgery in particular is parked to v1.4 due to App Store medical-content risk.

**Target user:** general consumer, not professional astrologer. The interface must be calm, warm, and dignified — never technical or doom-laden. Think Sanctuary or CHANI aesthetic, not a Bloomberg terminal for the cosmos.

---

## Naming & domain vocabulary

- **Inceptio** — Latin for "beginning, undertaking." The product name.
- **Activity** — the kind of event the user wants to choose a moment for (wedding, contracts, etc.). Maps directly to API's `activity` parameter.
- **Window** — a continuous span of time when the sky favors the activity. Returned by the API in `top_windows[]`. Can be as short as 1 minute or as long as several hours.
- **Score** — 0–100 numeric quality measure for a window. Higher is better.
- **Grade** — categorical label derived from score: `poor`, `caution`, `fair`, `good`. The API also reserves `strong` and `exceptional` for higher tiers but these are very rare in real data. (`good` was added by the upstream API mid-2026 — sits between `fair` and `strong`; downstream code currently treats it the same as `fair`.)
- **Moment** — the user-facing word for a specific recommended time. A moment may be a window or a single instant. The Moments tab is where saved ones live.
- **Heatmap** — per-day summary array showing the best score available each day in the search range, plus blocked-day reasons.
- **Excluded range** — a span of time the API explicitly removed from consideration (e.g. moon void of course, mercury retrograde). Comes with a `label` already in friendly-ish English.
- **Factor** — one component contributing to a window's score (e.g. "Venus is dignified and direct"). Each window has 7–10 factors.
- **Translation layer** — server-side dictionary that converts API's technical factor IDs and observations into Inceptio's warm tone of voice. Mandatory infrastructure (see Architecture).

---

## Visual direction (v2 — Mystical Premium)

The project pivoted from an earlier "Cosmic Brutalism" direction (Linear/Arc/Raycast aesthetic) after stakeholder feedback. **The current locked direction is Mystical Premium.** Do not reintroduce monospace, electric-bright accents, or technical typography. The earlier direction is preserved only inside the Level 3 ("Technical") view for users who want to see the math.

### Palette (locked)

| Token | Hex | Use |
|---|---|---|
| `bg-deep` | `#0F0A1F` | Primary background, deep midnight indigo |
| `bg-surface` | `#1F1838` | Cards, surfaces |
| `bg-elevated` | `#2A2247` | Modals, sheets, top of card stack |
| `text-primary` | `#F5EFE4` | Body text, cream |
| `text-muted` | `#B8B0CC` | Secondary text, captions |
| `accent-primary` | `#8B6FE8` | Primary CTAs, primary visual accent, warm mystical violet |
| `accent-gold` | `#E5C77D` | Excellence markers, premium pills, moonlight gold |
| `state-good` | `#6FE5C6` | Mint — used sparingly for confirmations |
| `state-caution` | `#E5C77D` | Same as gold — caution and gold share the warning palette |
| `state-bad` | `#D88E8E` | Muted rose for poor grade |

The violet is **warm**, not the cold Tailwind `violet-500`. Heatmap gradient runs violet → gold, never violet → red.

### Typography (locked)

- **Fraunces** (variable, italic axis available) — display, headlines, hero numbers. Used for the few warm, slightly editorial moments.
- **Inter** — UI, body, labels, all chrome.
- **No monospace** on consumer screens. Mono is reserved for the Technical view only.

### Tone of voice (locked)

Warm, dignified, poetic-but-specific. The reference is "a thoughtful friend who happens to know traditional astrology" — never a fortune-teller, never a data analyst.

**Approved patterns:**
- "A tender day for beginnings."
- "Venus brings warmth to this window."
- "The Moon is between signs today."
- "Mercury is sleeping."
- "Looking at the sky for you..."

**Forbidden words/phrases:** "magic", "destiny", "fortune", "stars align", "manifest", "energy" (as a noun), "vibes", "alignment" (in the new-age sense), "blessed".

---

## Progressive disclosure — three reading levels

The same data is presented at three depths. The user chooses which to engage with.

- **Level 1 — Friendly.** One-line status + warm sentence + concrete recommendation. Default on Today and Calendar.
- **Level 2 — Astrological summary.** Three to four short paragraphs in plain language, naming planets and aspects in everyday terms. Default on Moment Detail.
- **Level 3 — Technical.** Full factor breakdown with weights, dignities, exact degrees. This is where the original Cosmic Brutalism aesthetic lives (mono font, terminal feel). Tucked behind a "See the chart" affordance, never shown by default.

---

## Screen map

Tab bar (4 root tabs): **Today · Calendar · Moments · You**

Modal flows (no tab bar): **Onboarding**, **New Search (Activity → Date Range → Location → Loading → Results)**

| Screen | Default level | Notes |
|---|---|---|
| 00 Onboarding / Welcome | — | Single screen, no account |
| 01 Today | L1 | Three states: viable / caution-only / fully-blocked. See v2.1 design changes. |
| 02 Activity Picker | — | Four cards (Wedding / Business / Contracts / Travel) |
| 02b Date Range | — | Includes "About 2 months, 5 days" duration phrasing |
| 02c Location | — | Nominatim-style autocomplete, free OSM geocoding |
| 03 Calendar | L1 + glyphs | Heatmap with three cell states (blocked / viable / gold-ring excellent). Glyphs indicate blockers. |
| 03b No Viable Windows | — | New screen for `summary.no_viable_windows == true` — offers three escape routes. |
| 04 Moment Detail | L2 | Duration-aware time display (1 min / 5–10 min / 25 min / hours). Toggle to L3. |
| 05 Your Moments | L1 cards | Past moments shown at 70% opacity with subtle "Passed" label. |
| 06 Paywall | — | **Hidden via feature flag in MVP. See Paywall section.** |
| Settings | — | Build in RN directly, no design needed. Includes "Export my data". |

---

## Architecture

### Stack (locked)

**Mobile:**
- **Expo SDK 55** (New Architecture mandatory, no opt-out)
- **React Native 0.83**
- **TypeScript strict** mode, no `any` without comment
- **Expo Router** — file-based routing
- **TanStack Query** for server state (search results, glossary)
- **Zustand** for local UI state (current search draft, modal flow position)
- **Zod** for runtime validation of API responses — every request must validate
- **React Hook Form** + Zod resolvers for the Date Range / Location forms
- **NativeWind** — Tailwind for RN, using the locked palette as theme tokens
- **date-fns** + **date-fns-tz** for time math; **tz-lookup** for offline lat/lng → IANA TZ conversion
- **react-native-mmkv** for local persistence (saved moments, free-tier search counter, device identity)
- **expo-calendar** for "Add to phone calendar"
- **react-native-purchases** (RevenueCat SDK) — wired but disabled by feature flag (see Paywall)

**Backend:**
- **Cloudflare Worker** — single Worker handling:
  1. Proxy to astrology-api.io (hides the API key from the mobile bundle)
  2. KV cache (TTL 7 days) for repeated searches
  3. Rate limiter per device identity
  4. **Translation layer** — converts API responses to friendly tone (see below)
- API key stored in Worker secrets, never in mobile bundle
- Production key is in "From my backend only" mode (server-to-server); the existing `inceptio-dev-postman` key is "From anywhere" and is for development only

### Translation layer (mandatory infrastructure)

The astrology-api.io response uses technical `factor_id`s like `venus_dignified_direct_well_aspected` and observations like `"Venus in Leo 9.8° (term, direct)"`. These cannot be shown to users in the Mystical Premium tone.

The Cloudflare Worker post-processes API responses into a `displayable` field structure that the mobile app reads. The mobile app **never sees raw factor IDs** in production.

**Schema policy: permissive enums + logged fallbacks.** Three enum surfaces — `factor_id`, `reason_id`, `grade` — are validated with `z.string()` rather than `z.enum([...])`. The canonical known-values list lives in `@inceptio/shared-types` as `KNOWN_FACTOR_IDS`, `KNOWN_REASON_IDS`, `KNOWN_GRADES`. The translation layer (`workers/api-proxy/src/translations/translate.ts`) does a dictionary lookup keyed by the known list; on a miss it returns a neutral fallback phrasing and logs `[translate] unknown <field> from upstream:` via `console.warn`. This avoids a class of 502 outages we hit repeatedly mid-2026 when astrology-api.io added new enum values without notice (`good` grade, then `mercury_combust`, `mars_retrograde`, `jupiter_retrograde` reasons in the same week). When a new id appears in Worker logs: add it to the relevant `KNOWN_*` array AND the translation dictionary, in the same PR.

**Verified factor IDs** (from real API responses across wedding, contracts, business_launch, travel):

- `venus_dignified_direct_well_aspected`
- `moon_waxing_increasing_light`
- `moon_applying_to_benefic`
- `house_ruler_dignified_well_placed`
- `asc_and_house_ruler_in_reception_or_aspect`
- `jupiter_angular_or_aspecting`
- `planetary_hour_match`
- `fixed_star_conjunction`
- `house_free_of_malefic`
- `mercury_dignified_direct_not_combust`
- `asc_ruler_strong`
- `jupiter_aspecting_mercury_or_moon`
- `no_malefic_on_angle`
- `part_of_fortune_in_good_house`
- `moon_and_asc_ruler_in_good_aspect`

That's 15 unique factor IDs covering all 4 MVP activities. The translation layer needs an entry for each, with:

- `phrase_short` — under 8 words, for cards and lists
- `phrase_full` — 1–2 sentences, for narrative paragraphs
- `activity_overrides` — variants for wedding / business / contracts / travel where tone differs (Venus in wedding context vs Venus in business context)
- `polarity_aware` — different phrasing for `status: pass`, `partial`, `fail`

**Verified excluded range reason IDs** (already come with `label` field, but we soften them):

- `moon_voc` → API says "Moon void of course — the matter comes to nothing." → Inceptio: "The Moon is between signs — efforts begun now don't take root the way they do on other days."
- `mercury_retrograde` → "Mercury is sleeping — communication needs extra care this week."
- `mercury_combust` → "Mercury is hidden by the Sun's light — words don't carry far this stretch." *(added mid-2026 by upstream; draft phrasing pending astrologer review — Mercury within ~8° of the Sun, distinct from retrograde)*
- `venus_retrograde` → "Venus is resting — not a season for new commitments."
- `mars_retrograde` → "Mars is hesitating — bold moves don't carry the same force right now." *(added mid-2026 by upstream; draft phrasing pending astrologer review)*
- `jupiter_retrograde` → "Jupiter is turning inward — growth needs patience this stretch." *(added mid-2026 by upstream; draft phrasing pending astrologer review)*
- `saturn_retrograde` → "Saturn is turning inward — foundations need patience."
- `eclipse_window` → "An eclipse window — the sky asks for stillness, not new beginnings."
- `moon_via_combusta` → "The Moon walks the via combusta — a charged stretch worth waiting out."
- `malefic_on_angle` → "A difficult planet is on the angles — better to wait."
- `fixed_star_on_angle` → "A fixed star rests on the angles — a powerful but particular moment."

**File structure for translation layer:**

```
worker/src/translations/
  dictionary/
    factors.ts           // all 15 factor entries
    excluded-reasons.ts  // 8 reason entries
  activity-overrides/
    wedding.ts
    contracts.ts
    business-launch.ts
    travel.ts
  headlines/
    synthesizer.ts       // composes "A tender day for beginnings" from top factors
  translate.ts           // main entry point
  translate.test.ts      // golden-file tests against fixed API responses
```

The translation layer needs **astrologer review** after Claude Code generates the initial draft — book ~2 hours for this before launch. Don't ship machine-generated astrology phrases unreviewed.

### Identity strategy (MVP)

**No account, no login.** Device-only identity.

- Generate `device_id` (UUID) on first launch, store in MMKV
- All saved moments and search history live locally
- Anonymous identity abstraction (`DeviceIdentity` interface) so we can add `AccountIdentity` later without rewriting consumers
- "Export my data" feature in Settings: JSON dump of saved moments → share sheet
- v1.1 will add anonymous Cloudflare account + optional Sign in with Apple

### Rate limiting & costs

Each API search costs **5 credits**. The Worker enforces:

- Free tier (when paywall is enabled): 3 searches lifetime, then blocked
- **MVP (paywall hidden): 10 searches per device per 30 days** as a soft anti-abuse limit, no upgrade UI — see Paywall section
- Health check responses are not counted (they cost 1 credit but we don't expose them to users)
- Glossary is cached aggressively (it costs 0 credits but rarely changes)

**Environment-aware rate-limit ceilings** (Worker → `src/rate-limit.ts` `LIMITS` table):

- **Production limit: 10 / 30 days** — set via `wrangler.toml` `[env.production.vars]` `ENV = "production"`
- **Development limit: 1000 / 30 days** — automatically applied when running `wrangler dev` locally (`ENV = "development"` in top-level `[vars]`)
- Deploy with `wrangler deploy --env production` to use production limits
- Do NOT remove the dev-vs-prod distinction — local dev would block after 10 searches otherwise, stalling mobile work
- Unknown / missing `ENV` falls back to the production ceiling (fail-safe, not fail-permissive)

---

## Real API behavior — what we verified

This section captures what we learned from real Postman calls against `electional/search`. Treat as ground truth.

### Score distribution

In real Kyiv data across 7 queries (wedding/contracts/business_launch/travel, ranges from 7 days to 6 months), the highest score we ever saw was **72**. Most "best" results sit in **60–72** with grade `fair`. The 75+ "strong" and 90+ "exceptional" buckets are very rare for typical month-long searches.

**Calibrated grade buckets for display:**

| Score | Grade | UX framing |
|---|---|---|
| 90–100 | Exceptional | Celebrate — very rare |
| 75–89 | Strong | Excellent find |
| 60–74 | Fair / Good | Realistic "good day" — design's win-state. API now emits two distinct labels (`fair`, `good`) in this band; both treated as positives in downstream UI. |
| 40–59 | Caution | Fallback with caveats |
| 0–39 | Poor | Not recommended |

The design's emotional language must treat **60–74 as a win**, not as middling. "A tender day for beginnings" should fire at score 65.

### "No viable windows" is common

In a 7-day wedding search in June 2026, the API returned `viable_windows_count: 0` and `no_viable_windows: true`. The `top_windows[]` array still contains the best available windows but with `grade: caution`. **Short searches (< 14 days) regularly produce this state.** The 03b "No Viable Windows" screen is for this case.

### Most days in long searches are blocked

In a 6-month wedding search: 85 of 184 days fully blocked. Venus retrograde blocked all of October and November 2026 for wedding. The Calendar heatmap is dominated by blocked cells, not viable ones.

### Windows can be very short

Real `duration_minutes` values: 90, 25, 10, 5, **1**. The Moment Detail screen must handle single-minute windows gracefully (see design v2.1 — duration-aware time display).

### Latency is highly variable

Cold-cache calls range from 800 ms to 42 seconds. Cached responses return in ~8 ms. The Worker must have a timeout of at least 60 seconds for cold misses. The loading screen needs progressive messages (5 s, 15 s, 30 s+ thresholds — see design v2.1).

### Activity-dependent factor weights

The same `factor_id` has different `weight_class` across activities. Example: `moon_applying_to_benefic` is `high` for wedding, `critical` for contracts. The translation layer uses the API-returned `weight_class` to decide narrative priority, not a hard-coded order.

### Moon phase is not in the response

The main search response does not include moon phase. We compute it locally in the mobile app from the window's `start` timestamp using a deterministic algorithm — no extra API call.

### Cache hit detection

`metadata.cache_hit: true` and `calculation_time_ms: 8` together indicate KV cache served the response. We log these to a debug counter for free, no analytics needed.

---

## Paywall — hidden but wired

**Decision (stakeholder, current phase):** Hide the paywall UI from the MVP. Keep all paywall *infrastructure* in the codebase so it can be enabled by a single feature flag flip when product strategy changes. **Return timeline not specified by the stakeholder.**

### What stays in the code

- `react-native-purchases` (RevenueCat SDK) installed, initialized on app start
- Anonymous user identification with RevenueCat using `device_id`
- Search counter persisted to MMKV (`searches_used_count`, `searches_period_start`)
- Free-tier limit check before every search (currently 10 / 30 days)
- All Paywall screen components (`PaywallScreen`, `PaywallFeatureList`, etc.) are present in the codebase but not registered in any navigator
- RevenueCat dashboard is configured with the $4.99/mo and $29.99/yr products
- Product fetching code is present and runs silently in the background

### What's hidden

- No Paywall screen is reachable from any UI surface
- No "Upgrade" CTAs anywhere
- When the search counter hits the limit, the app shows a **soft block** message instead of a paywall:
  - "You've explored 10 moments this month. Inceptio is in early access — try again in a few days."
  - No upgrade CTA, just "OK"
- The 12-month range Pro-feature is **disabled for everyone in MVP** — all users get up to 12 months. (This is fine; rate limit handles abuse.)

### Feature flag

A single environment-level flag controls all of this:

```ts
// config/features.ts
export const FEATURES = {
  PAYWALL_ENABLED: false,  // ← single source of truth
  MAX_FREE_SEARCHES: 10,
  FREE_SEARCH_PERIOD_DAYS: 30,
  MAX_RANGE_MONTHS_FREE: 12,  // matches MAX_RANGE_MONTHS_PRO during MVP
  MAX_RANGE_MONTHS_PRO: 12,
} as const;
```

When the flag flips to `true`:
- Paywall screen registers in the navigator
- "Upgrade" CTAs become visible in soft-block message and Settings
- Free range tightens to 1 month (or whatever the product decision is at the time)

**Do not** remove the RevenueCat SDK, the Paywall screen files, or the search counter logic. They're load-bearing for the future enablement.

### Why this matters architecturally

Building RevenueCat into the codebase now and disabling it via flag is cheaper than:
1. Removing it and reinstalling later (data migration risk)
2. Keeping a parallel "no-paywall" build branch (forking risk)

Cost is minimal: a few hours of SDK init code + screen scaffolding that's already in design. The payoff is zero refactor when the flag flips.

---

## Coding standards

- **TypeScript strict** everywhere, no `any` without an inline comment justifying it
- **Zod schemas** for every API response — no destructuring raw JSON
- **Components < 200 lines.** If longer, split.
- **Hooks before classes** always, even where class would be marginally cleaner
- **Reuse-first.** When building a new component, search `components/` first. The 11 component primitives from the design system (ScoreNumber, WindowCard, FactorRow, TopBar, TabBar, Field, Tag, StatusLine, SectionLabel, Glyph, StarchartBg) should cover most needs.
- **Date-fns over native Date.** Never construct `new Date()` without a timezone helper.
- **Test golden files**, not implementation. Translation layer tests should snapshot real API responses → expected friendly output.
- **Comments explain why, not what.** Code should self-document the what.

---

## Project-specific Claude Code sub-agents

This repo uses three Claude Code sub-agents (already configured):

- **`react-developer`** — primary agent for component and screen work. Reuse-first philosophy: always check `components/` before building new.
- **`code-reviewer`** — runs after each meaningful change, catches drift from coding standards, palette, tone.
- **`test-engineer`** — writes golden-file tests for translation layer and Zod schema tests for API responses.

Invoke them with the standard `@react-developer`, `@code-reviewer`, `@test-engineer` mentions.

---

## What's already done

- Design fully approved (v2.1 — Mystical Premium with recalibration for real API data)
- 9 screens generated and signed off by stakeholder
- API verified end-to-end in Postman (7 real queries, all 4 MVP activities)
- Score distribution, latency, factor IDs, excluded reasons all captured from real responses
- Component primitives defined
- Microcopy locked

## What's next (build order)

1. **Cloudflare Worker scaffold** — proxy + KV cache + rate limiter (no translation yet)
2. **Translation layer dictionary** — 15 factor entries + 8 excluded reasons + 4 activity overrides + headline synthesizer (1.5–2 days with Claude Code, then 2 hours astrologer review)
3. **Worker integration of translation layer** — translated responses returned to mobile
4. **Expo project init** + folder structure + design system tokens in NativeWind
5. **Onboarding + Activity Picker + Date Range + Location** flow (modal stack)
6. **Loading screen** with progressive messages
7. **Today screen — three states**
8. **Calendar screen — heatmap with three cell states**
9. **Moment Detail — duration-aware**
10. **No Viable Windows screen (03b)**
11. **Your Moments + Settings**
12. **Paywall scaffolding hidden behind flag (Step 12 is wiring, not exposing)**
13. **Astrologer review of translation layer**
14. **Soft launch**

---

## Decision log (v1 → v2 → v2.1)

- **v1 → v2 pivot:** "Cosmic Brutalism" rejected after stakeholder feedback "too technical, who will use this?" Pivoted to "Mystical Premium" (Sanctuary/CHANI-adjacent), warm tone, no monospace on consumer screens.
- **B2C, not B2B:** electional astrology mobile is uncovered. Pro tools exist (Father Time III, AstroApp, Janus) but no consumer-facing app does election search.
- **No account in MVP:** privacy-first, faster shipping, expo-calendar export covers persistence needs.
- **Translation layer mandatory:** raw API output cannot be shown to consumers. Built on Cloudflare Worker, not in mobile bundle (centralizes content, allows non-deploy updates).
- **Moon phase computed locally:** not in API response, deterministic, no extra API cost.
- **4 MVP activities (wedding/contracts/business_launch/travel) validated:** all return 200, all factor IDs verified.
- **Excluded ranges have friendly labels from API:** translation layer only needs to soften tone, not translate from scratch.
- **Surgery deferred to v1.4:** App Store medical-content risk.
- **v2 → v2.1 recalibration:** real API data showed scores rarely exceed 72; "no viable" is common; windows often 1 minute long; cold latency hits 42s. Design recalibrated to make `fair` the win-state, add no-viable screen (03b), make Calendar handle blocked-cell dominance, and make loading progressive.
- **Paywall hidden in MVP (current decision):** stakeholder requested hiding payment UI. Infrastructure (RevenueCat, search counter, screen scaffolding) stays in codebase behind `PAYWALL_ENABLED=false` feature flag. Return timeline not specified.
- **Permissive enums for upstream-derived fields (post-`good`/`mercury_combust`/etc. drift):** `factor_id`, `reason_id`, `grade` schemas are `z.string()`, not `z.enum([...])`. Known values live in `KNOWN_FACTOR_IDS`/`KNOWN_REASON_IDS`/`KNOWN_GRADES`. Translation falls back to a neutral phrase + `console.warn` on unknowns. Rationale: upstream repeatedly added enum values without notice, causing 502s on every change. Defensive permissive parse trades narrower compile-time types for runtime resilience. See "Translation layer" section for the policy in full.

---

## Files & paths in this repo

```
/
├── apps/
│   └── mobile/          # Expo app
├── workers/
│   └── api-proxy/       # Cloudflare Worker (proxy + cache + translation)
├── packages/
│   ├── shared-types/    # Zod schemas + TS types shared between mobile and worker
│   └── translations/    # Translation layer dictionary (versioned, reviewable)
├── design/
│   └── tokens.json      # Design tokens exported from Claude Design
├── docs/
│   ├── design-v2.1.md   # Recalibration brief
│   ├── api-audit.md     # API ↔ design compatibility matrix
│   └── postman.json     # Verification collection
└── CLAUDE.md            # This file
```

---

*Last updated after Postman API verification, design v2.1 sign-off, and paywall-hidden decision. Maintain this file: when a decision changes, update the decision log section and the affected sections.*
