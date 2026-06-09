# Inceptio — Backlog / Known Issues

## i18n layout-pass items (German-first, screen-soft — verify on device)

### LAYOUT-001 · StatusLine grade badge sized for short words, now holds phrasal canonical labels
The grade-vocab harmonization routed the canonical `voice:moment.grade.*` labels into the terse `StatusLine` badge via `.toUpperCase()`. Originals were short (STRONG/CAUTION/POOR, ≤7 chars); the canonical family is phrasal and uppercased German/Spanish run long: **de "MIT BEDACHT VORGEHEN" (20)**, es-419 "AVANZAR CON CUIDADO" (19), en "HIGHLY FAVORABLE" (16). The badge pill wasn't sized for phrase-length labels → likely overflow/wrap. Screen-soft (wraps, not a launch blocker) but **verify per locale on device (German first)** during the layout pass; resize the badge or shorten the badge form if it clips.

### LAYOUT-003 · onboarding:subhead German expansion (verify wrap on device)
L38's locked 4.3-final subhead is a long paragraph that already wraps ~4 lines in en (193 chars); German expands to **232 chars** (de "Inceptio liest die tatsächlichen Positionen der Planeten — …"). On the welcome screen it may push the wrap past the designed height. Screen-soft — **verify on device (German first)** during the layout pass; do not restyle pre-emptively.

### LAYOUT-002 · 30 screen-soft daily-note overflows (tracked allowlist)
The translated daily-note variants/fallbacks exceed the 48/140 screen budget in 30 spots (de/fr/es-419 heavy — `closed-eclipse-window`, `mixed-moon-steady-sky-thin` worst). Tracked in `KNOWN_LAYOUT_PASS_OVERFLOWS` (worker `lint-library.test.ts`); they wrap on the Today hero / 03b. Trim during the layout pass + native review; remove ids from the allowlist as fixed.

## Bugs

### BUG-001 · cluster-windows renders window DATE in device tz, not event tz (off-by-one across date-line) · **pre-launch candidate**

**Severity:** High for a timing product. The entire product premise is "when to begin X"; showing the wrong calendar date for a recommended window is a credibility bug, not cosmetic.

**Failure mode:** `apps/mobile/src/lib/cluster-windows.ts` formats the window date with `Intl.DateTimeFormat(..., FULL_DATE_OPTS)` where `FULL_DATE_OPTS` has **no `timeZone`**. `new Date(rep.start)` is the correct absolute instant, but Intl then renders it in the **device's** local timezone. For a window whose event-local date differs from the device-local date across a UTC/date-line boundary, the card shows the date off by one day. Example: event window `2026-06-20T00:30:00+03:00` viewed on a device in UTC−5 renders "Friday, June 19" instead of the event-local "Saturday, June 20".

**Why it exists:** the moment-card formatters (`lib/card/time-of-day.ts`) solve this with the API-authoritative offset via `parseLocalInstant(...).localAsUtc` + `timeZone:'UTC'` (the Hermes-safe local-as-UTC trick). `cluster-windows.ts` (list/heatmap cards) never adopted that pattern. Pre-existing; **not** introduced by the i18n work — surfaced during the Task A1 (locale-aware formatters) review, which deliberately left it out of scope (A1 = localize the locale arg only, not fix tz-display semantics).

**Fix:** apply the same pattern used in `time-of-day.ts` — render off `parseLocalInstant(rep.start).localAsUtc` with `{ ...FULL_DATE_OPTS, timeZone: 'UTC' }`. The `lib/card/iso-local.ts` `parseLocalInstant` helper already exists. Add a test with a window whose event-local date differs from UTC.

**Also affected:** `apps/mobile/src/screens/MomentDetailScreen.js` `windowDate` formats `new Date(w.start)` with no `timeZone`, same device-tz off-by-one class. Same fix applies. (Its `.replace`-based weekday-wrap was made locale-robust during i18n Wave 4, but the device-tz date issue remains.)

**Discovered:** 2026-06-08, during i18n-chrome branch Wave 3 review (A1). Independent reviewer flagged as W2.

## App-rating-prompt launch checklist (LG1–LG12) · **pre-launch, client-only feature**

The in-app rating prompt (merged 2026-06-09, branch `feature/rating`) is **complete and shippable-dormant** — all eligibility logic is unit-tested (Node), but the native review card and the store-account-dependent values cannot be exercised until launch. Full detail in `docs/superpowers/specs/2026-06-09-app-rating-prompt-design.md` §12. Nothing below blocks merge; everything below must clear before the rating feature is "live."

**Owner-provided-at-launch (the only code changes left — `// TODO(launch)` in `apps/mobile/src/lib/rating/launch-constants.ts`):**
- **LG5a** · Real **App Store ID** → `IOS_APP_STORE_URL` (currently `id000000000`). Until set, `StoreReview.storeUrl()` is null and "Rate Inceptio" falls back to web — works, but points nowhere real.
- **LG5b** · Real **Play package name** → `ANDROID_PLAY_STORE_URL` (currently `app.inceptio.placeholder`).
- **LG5c** · Real **support email** → `SUPPORT_EMAIL` (currently `support@inceptio.app`). NOT store-gated — can be a real inbox now for testing.

**Build / device prerequisites:**
- **LG4** · `expo-store-review` is a native module → a **dev-client rebuild** (`expo run:ios` / `expo run:android`) is required before the card or `isAvailableAsync()` behaves. Won't hot-reload.

**On-device smoke (the part not assertable in Node):**
- **LG1** · Confirm the system card **may appear** under forced-eligible (Debug "Force requestReview()"). *iOS:* a **development build on a real device** — NOT TestFlight (`isAvailableAsync()` is false there). *Android:* renders ONLY for a **Play-distributed build** (internal test track+); a sideloaded dev-client shows nothing (expected). Use **`FakeReviewManager`** for any Android automated test, never the real manager.
- **LG2** · Confirm it does NOT appear in suppression contexts (`no_viable`, cap/429, error/empty, paywall, onboarding, mid-flow) — via Debug "Force rating eval" showing `reason=suppressed_context`, and by live navigation.
- **LG3** · Confirm the eligibility floor blocks a brand-new profile: after Debug "Reset rating state", no prompt until ≥2 distinct days ∧ ≥2 searches ∧ not-first-save.

**Production-build & compliance gates:**
- **LG9** · On a **production build**, verify the 3 rating Debug rows are **absent** (file-presence ≠ runtime; `__DEV__` is compiled out, but verify — a leaked Force-requestReview would over-prompt → manipulation-flag risk).
- **LG11** · **Pre-submission compliance self-check** (spec §2): native API only; no sentiment pre-question anywhere; no incentive tied to rating; the Settings feedback row is independent (not a gate); "Rate" never pre-selects stars and never calls `requestReview`. Guideline anchors: **Apple §5.6.3** + Play Ratings/Reviews policy (NOT §1.1.7).
- **LG12** · **Accessibility smoke** on the 2 Support rows + the mailto clipboard-fallback toast (screen-reader announce, hit-target size).

**Post-launch dials (record, act only if review volume is low):**
- **LG7** · Top-3 grade-cut (`exceptional|strong|good`) is conditioned on the observed score distribution (real data rarely exceeds 72). If smoke-data shows `strong`/`exceptional` are actually frequent, revisit the cut.
- **LG8** · If review volume is too low: shorten `FRUSTRATION_COOLDOWN_DAYS` 14→7 **first**, then consider `MAX_ATTEMPTS_PER_365D` 2→3 (full OS allowance). Knobs in `apps/mobile/src/lib/rating/eligibility.ts` `RATING_CONFIG`.

**Resolved (no action):** LG6 — `emailSubject` strategy decided = plumbing constant (English + locale tag), `buildEmailSubject()` in `launch-constants.ts`.
