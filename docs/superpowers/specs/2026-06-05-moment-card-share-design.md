# Shareable "Moment Card" + Native Share — Design Spec (Virality v1)

**Date:** 2026-06-05
**Status:** Brainstorm + Phase 0 capture spike complete (iOS-sim PASS, 2026-06-05). Build path: native `captureRef`, real-device gate deferred. Content decisions (§7c) RESOLVED. Proceeding to writing-plans.
**Branch:** dedicated feature branch (e.g. `feat/moment-card-share`)
**Pre-flight audits:** code-archaeology `docs/superpowers/expert/2026-06-05-…` · domain `docs/superpowers/expert/2026-06-05-moment-card-share-audit.md` · library `docs/superpowers/library-audit/2026-06-05-moment-card-share.md`

---

## 1. Why

Organic virality hook. Поток-0 research validated a shareable, "Instagram-ready" card as the #1 organic strength to emulate (Co-Star's most-praised trait). It serves the current "attract audience" goal and — unlike the usage-cap (pending owner decision) and translations-content (premature) — has **zero external blockers**.

## 2. Scope

**In (v1):** Generate a beautiful card **image** from an already-computed moment and hand it to the **native OS share sheet** (iOS + Android). The user posts it wherever they like (IG Stories/feed, WhatsApp, etc.).

**Explicitly OUT of v1:**

| Out of v1 | Why | How we leave room |
|---|---|---|
| Direct "Share to Instagram Stories" (branded sticker) | Needs a Meta App ID + finalized bundle/package ID + device testing — none exist; also App-Store-policy adjacent | Share action is a **pluggable provider** behind a config gate; `direct-stories` slots in later |
| Daily-note card | Phase 2 | View-model is moment-shaped, not hostile to a note variant later |
| Tappable "get the app" invite link | Needs a real landing domain (lesson: the other project's dead share URL) | Watermark is **image-only** (brand mark), zero deps |
| Real i18n library | Cross-cutting; rest of app isn't on it | Card copy routes through a **seam-ready strings module** (§8) |

**Hard rules:** No share-gating ever. Card generation/share is **quota-exempt** — confirmed: the search counter is incremented server-side only on the `/electional/search` route; the card makes no API call, so there is no counter path to touch. Card must **not over-expose** (§5).

## 3. Build path — DECIDED: native `captureRef`, spike-gated (server is the fallback)

The render architecture was an explicit fork; resolved after a comparison spike (see audits).

- **Chosen: on-device capture.** Render the card from the existing RN celestial primitives, capture the on-screen view with **`react-native-view-shot` pinned `^5.1.0`** (NOT the Expo-SDK-55-bundled `4.0.3`), share via **`expo-sharing`**. Rationale: honors the reuse-first mandate (single source of truth), keeps the moment **entirely on-device** (privacy), adds no Worker-prod coupling and no billing change.
- **`4.0.3` is unsafe** on this New-Arch-mandatory app: the README's "4.0+" only means it *builds* under New Arch (PR #543); the maintainer's first claim of working Fabric/TurboModule capture is **v5.0.0**. Expo's `4.0.3` pin is a stale carry-forward (identical across SDK 53/54/55), not an endorsement. → install with a version **override to `^5.1.0`**; `expo install` will warn it is off-pin (expected).
- **Dev-client cost (accepted):** `react-native-view-shot` is a third-party native module not in the bundled set → it forces a true **custom dev client** (`eas.json` + `expo-dev-client`), which the repo does **not** have today (no `eas.json`, no `app.config`, no dev-client dep). The app deliberately stayed within the bundled native set (see `storage.ts` MMKV→AsyncStorage note); this is the **first feature to break that discipline**. (Note: stock public Expo Go is already unusable here anyway — it is on SDK 54, the app is SDK 55.)
- **Server path = documented fallback provider.** If the Phase 0 spike fails, fall back to **server-side Satori render on the Worker** (app downloads the PNG and shares the file via `expo-sharing` + `expo-file-system`, both bundled). It is feasible-with-caveats but heavier: forces **Workers Paid + a CPU-limit bump on the production proxy**, **couples the launch to the Worker-prod deploy gate**, **duplicates the brand visual** in Satori (separate static Fraunces-Italic instance — Satori's variable-font weak spot), and **sends the moment to the backend** (a privacy regression). It slots behind the same pluggable share-action seam (§9), so the fork is not fully irreversible.

## 4. Phase 0 — Capture Spike (GO / NO-GO GATE) — do this FIRST

Before building the feature, prove the riskiest unknown: **bridgeless New-Arch iOS capture.** There are *open* issues (#653; fix-PR #657 merged 2026-05-27) where `captureRef` cannot resolve the native module under bridgeless New Arch, and the maintainer notes **full bridgeless iOS support remains unsolved.** RN 0.83 New Arch *is* bridgeless.

- **Setup:** stand up `eas.json` + `expo-dev-client`, install `react-native-view-shot@^5.1.0`, build a **development** dev client (`eas build --profile development -p ios`).
- **Probe:** on a **real bridgeless New-Arch iOS device build**, `captureRef` a trivial styled view → PNG, AND a view containing the **radial-gradient halo** (the capture-safe Moon mechanism, §7), and write/share the file.
- **Pass bar:** reliably produces a **clean, valid PNG** with the gradient halo present. **Marginal / flaky / intermittent-blank = FAIL.**
- **On FAIL:** fall back to the server-side Satori path (§3), accepting its costs.
- This is the existing "on-device view-shot smoke" discipline moved **earlier** — from acceptance gate to build-path go/no-go.

**RESULT — 2026-06-05 — iOS SIMULATOR: PASS (green pre-check).** Built a dev client via `expo run:ios` on a booted iPhone 15 sim (`ios · RN 0.83.6 · bridgeless=true`). `react-native-view-shot@^5.1.0` `captureRef` resolved and produced clean PNGs for both targets — the #657 "RNViewShot is undefined" bridgeless failure **did not reproduce**. The SVG radial-gradient halo **survived capture** (verified by reading the exported PNG), and Fraunces rasterized correctly. Standing up the dev client also surfaced a pre-existing gap: the app had never been built natively and was missing `react-native-worklets` (reanimated 4 split-out) — now installed at the bundled `0.7.4`. **Native path GREEN-LIT for the feature build**, with **real-device iOS capture as a deferred pre-ship gate** (blocked on a pending Apple Developer account — ownership / org-vs-individual decision with the owner; flip `eas.json` `simulator` back to `false` to run it).

**Content/privacy decisions (§7c) and the full implementation plan proceed from here on the native path.**

## 5. Entry point & flow

- **Entry:** the Share affordance on **Moment Detail** (`MomentDetailScreen.js`), replacing the current text-only `handleShare()` (lines ~188–207). Note there are **two** Share surfaces: the footer button (~346–351) and an **inert header `IconBtn`** (~224–226, currently no `onPress`) — reconcile to one working entry.
- **Flow:** tap **Share** → **Share Preview sheet** (bg-elevated) renders the live `MomentCard` + privacy toggles + **Share** button → on confirm, `captureRef(card)` → resolve share provider → native OS share sheet → success toast (reuse existing `showToast`, ~148–153).
- The on-screen card in the preview sheet **is** the capture source (ref'd) — toggles re-render it live; no hidden off-screen view.

## 6. Card content & data source

All fields derive from the in-scope window object `w`; no new API call.

| Element | Source | Notes |
|---|---|---|
| Warm voice line (hero) | `w.displayable.headline` | Server-translated; fallback `headline ?? rationale ?? 'A moment to consider.'` (matches screen line ~125). |
| Activity label | `ACTIVITY_LABELS` (`lib/activities.ts`) | Canonical label map — do NOT re-derive. Default visibility per §7c-1 (generic for sensitive activities, shown for wedding). |
| Tier phrase ("grade word") | **already-bucketed tier** → mood key → warm phrase | **No raw score number.** See §7. Consume the bucketed tier, **never the raw upstream `grade`** (enum drift could blank the phrase on a public PNG). |
| Date / time | `w.start` via time helpers | Default = **soft time-of-day band** (§7c-2, net-new `timeOfDayBand`); exact time + tz-abbrev only when location opted in. Existing `formatWindowTime` is 24-hour — the exact (opt-in) path can reuse or extend it; the default path does not show a clock. |
| Coarse city (opt-in only) | location in scope (`getLastLocation().city`) | City name only — **never** coordinates. |
| TZ abbreviation (opt-in only) | **net-new helper** | `Intl.DateTimeFormat(…, { timeZone, timeZoneName:'short' })` formatted against `w.start` (DST-correct). IANA id available; abbrev is not derived anywhere today. |
| Watermark | static brand mark "Inceptio" | Image-only, no link. Must reinforce non-fortune-telling positioning (App-Store 4.3 risk — see §13). |
| Moon + halo, starfield, gradient | capture-safe variant (§7) | Moon **phase** computed locally from `w.start` as the app already does. |

**Public-facing noun = "moment," never "window"** ("window" is in-app vocabulary). **Synthetic windows** (`w._synthetic`, `duration_minutes: null`, empty factors) must render gracefully from `headline` + tier alone.

## 7. Tier→mood, capture-safe halo, and HELD content decisions

### 7a. Tier → mood → warm phrase (net-new, must reconcile an ambiguity)
There is **no canonical score→mood helper** in the repo — three divergent mappings exist (`ScorePill` kind, inline `gradeToScorePill` on Moment Detail, `StatusLine` label; the daily-note `mood` is *server-provided*, not client-derived). So:
- Define a **new, single-source, golden-tested `gradeToMood(grade) → 'strong'|'good'|'mixed'|'closed'`** in `card-view-model`.
- It must **consciously land both `good` AND `fair` grades in the win tier** (Moment Detail currently splits them: `good→strong`, `fair→fair`).
- **Never route through `StatusLine`** — it hard-codes the literal `'FAIR · GOOD WINDOW'`, violating the "never emit Fair" rule.
- Map the mood key → a small **4-entry warm-phrase table** (keyed identically to `MOOD_TOKENS`), candidate wordings drafted by the domain pass (e.g. `good → "A tender moment for beginning."`), **pending astrologer review**, forbidden-word-clean, no grade words.
- Accept: the card's grade-derived mood may differ from Today's note mood (different data source — server `quality_bucket`). Documented, acceptable.

### 7b. Capture-safe halo (critical)
The daily-note halo is a **native shadow** in both `Moon.js` (~64–72) and `DailyHero.js` (~61–69); `view-shot` is documented to drop native shadows/elevation. Therefore:
- Build a **sibling `CaptureSafeMoon`** that renders the halo as an **`react-native-svg` `RadialGradient`** (mirroring the existing `HeroGradient` pattern), **not** a shadow. **Do NOT edit `Moon.js`** — it is shared by many screens and `DailyHero` relies on its `glow={false}` contract.
- Reuse `MOOD_TOKENS` **colors** (rgb triplets) but **re-derive the alphas** — the recalibrated `0.95/0.75/0.55/0.35` values are tuned for native shadow *blur* and will over-saturate as gradient stops.
- Capture requirements: `collapsable={false}` + **opaque background** on the card root (avoids transparency/text-border artifacts and the prior alpha-stripping bug).

### 7c. Content decisions — RESOLVED 2026-06-05 (post-spike, all domain-recommended)
The domain pass challenged three brainstorm choices; resolved at the build gate:
1. **Intent default → generic for sensitive intents.** Default to the neutral line for **contracts / business_launch / travel** (commercially-sensitive timing; travel = "home is empty"); show the activity by default **only for wedding**. Per-activity default; the toggle still lets any user reveal/hide. → `card-view-model` needs a per-activity `SENSITIVE_ACTIVITIES` set driving the default of the "show intent" option.
2. **Default (no-location) time → soft time-of-day.** When location is NOT opted in, show an evocative **time-of-day band** ("Saturday afternoon"), no precise minute, no zone. Exact time + tz-abbrev appear **only** when location is opted in. Moment Detail stays the to-the-minute action surface. → net-new `timeOfDayBand(w.start)` helper (morning/afternoon/evening/night buckets) alongside the exact `format-tz` path.
3. **Aspect ratio → ship 9:16 AND 1:1 in v1.** Both ratios at launch from the center-safe Composition A (1:1 effectively required for WhatsApp in Brazil/LatAm; 9:16 for Stories reach). → `MomentCard` takes an `aspect: '9:16' | '1:1'` prop; the Share Preview sheet offers a ratio choice; capture runs per selected ratio.

## 8. Privacy model (firm defaults; specifics in 7c)

The card is a **public image**; it must not leak location or sensitive intent.
- **Location:** none by default; opt-in coarse **city name** only (never coordinates).
- **Time zone / time:** default shows a **soft time-of-day band** (no clock, no zone); exact time + tz-abbrev appear only when location is opted in (§7c-2). **Moment Detail remains the tz-authoritative action surface.**
- **Intent:** **generic by default for sensitive activities** (contracts / business_launch / travel), activity shown by default for wedding (§7c-1); the toggle overrides either way.
- Opt-ins live as toggles in the **Share Preview sheet** (per-share, not global).
- **Headline trust (source-side constraint).** The card renders `w.displayable.headline` **verbatim** — it bypasses BOTH the intent-toggle and the soft-time logic. The card's privacy protections therefore only hold if headlines are **activity-neutral and time-neutral**, especially for sensitive activities (a headline naming the activity or embedding a clock leaks past every toggle — worst for the travel safety case). A build-time forbidden-word scan can't cover per-request headline content; this MUST be guaranteed at the **source** (translation-layer headline synthesizer + per-activity overrides, design decisions #7/#8). Folded into the pending astrologer/voice review (§12). The card documents this trust explicitly in `card-view-model.ts`.
- **Platform safe zone:** design to the **union** safe area (≈ bottom 400px clear for WhatsApp Status / Stories UI), opaque `bg-deep` base (no transparent edges — view-shot edge-halo trap).

## 9. Architecture (units & boundaries)

- **`card-view-model`** (pure) — `(w, privacyOptions) → CardViewModel`; hosts `gradeToMood`. No rendering/IO. **Golden-tested** across activities × tiers × privacy.
- **`card-strings`** (seam-ready i18n) — typed strings + `t()`-shaped accessor: tier→phrase table, generic-intent line; activity labels sourced from `ACTIVITY_LABELS`. English values, **no library** (swap accessor later).
- **`format-tz`** (net-new) — IANA → tz abbreviation against `w.start`.
- **`CaptureSafeMoon`** (new) — gradient-halo Moon variant (§7b); reuses `MOOD_TOKENS` colors + `react-native-svg`.
- **`MomentCard`** (presentational) — renders a `CardViewModel` in composition A (Centered Stack, center-safe) from celestial primitives + `CaptureSafeMoon`. Accepts a `ref`. Uses exact font family names from `theme.js` (a typo silently falls back and the fallback is what rasterizes).
- **`share-providers/`** — a `ShareProvider` interface (model the result on the existing `CalendarResult` discriminated union; mirror `handleAddToCalendar`'s reason→toast handoff). v1 impl: `nativeShareProvider` (`captureRef` → `expo-sharing`). Documented future slots: `direct-stories`, and `serverRenderProvider` (the §3 fallback).
- **`useMomentCardShare`** (hook) — orchestrates ref→capture→resolve provider (from config gate)→share; exposes `share()` + status; failures via toast.
- **Share Preview sheet** — hosts `MomentCard` + privacy toggles + Share button.
- **`config/features.ts`** — **created here** (does not exist; only `config/api.ts`). Flat `as const` (mirror `api.ts`); co-locate the documented paywall flags so there is one `features.ts`. Hosts `MOMENT_CARD_SHARE_PROVIDER` ('native-share' | 'server-render' | 'direct-stories').

**Reuse-first (no new visual primitives beyond `CaptureSafeMoon`):** `MOOD_TOKENS` colors, `Moon` glyph shapes, `Starfield`, `HeroGradient`, theme palette, `format-window`, local moon-phase, `showToast`, `ACTIVITY_LABELS`, the existing tier classification behind `ScorePill`.

**Dependencies:** add `react-native-view-shot@^5.1.0` + `expo-sharing` (native path); `expo-file-system` only on the server-fallback path. **Do NOT add `expo-media-library`** (capture→share never touches the camera roll). `react-native-view-shot` + `expo-sharing` are **not** currently installed (the spec's earlier "bundled" claim was wrong).

## 10. Composition

**A — Centered Stack**, essential content (headline · tier phrase · time) constrained to a **center-safe** region so platform crops don't destroy meaning. (Rejected: B lower-third — not center-safe without rework; C framed-card — reads as an app screenshot, least viral.) Ships **both 9:16 AND 1:1 in v1** (§7c-3) via an `aspect: '9:16' | '1:1'` prop on `MomentCard`; the Share Preview sheet offers the ratio choice and capture runs per selection.

## 11. Testing & acceptance

- **Phase 0 capture spike** (§4) — the **go/no-go gate**; precedes everything.
- **Golden tests** — `card-view-model` across the 4 activities, each tier (esp. 72 → win tier → warm phrase, **asserting "Fair" never appears**), and privacy combinations.
- **Unit tests** — `card-strings` accessor + tier→phrase; `format-tz`; provider resolution from the config gate; synthetic-window rendering.
- **On-device acceptance smoke** (same §12.3 real-data discipline): capture → valid PNG; **halo APPEARS in the exported PNG** (capture-safe) *before* intensity; tier-correct halo (alpha re-verify); privacy correctness **in the actual PNG** (default → no place / no precise-tz-less leak per 7c-2; opt-in → coarse city + tz-abbrev; generic → no activity name).

Browser mockups are layout sketches only — not acceptance. RN render ≠ browser render.

## 12. Flagged dependencies (not built now)

- **Server-render fallback provider** (Satori on Worker) — only if the Phase 0 spike fails; carries Workers-Paid + CPU bump + Worker-prod coupling + visual duplication + a privacy regression.
- **Direct IG Stories provider** — blocked on Meta App ID + finalized bundle/package ID + device testing. Config-gated slot.
- **Invite / get-the-app deep link** — blocked on a real landing domain. Watermark stays image-only.
- **App-wide i18n library** — later; seam only now.
- **Astrologer / voice review** before launch, covering BOTH: (a) the tier→phrase wordings, and (b) **headline neutrality** — confirm `displayable.headline` stays activity-neutral and time-neutral for sensitive activities (contracts/business_launch/travel), since the card renders it verbatim past every privacy toggle (§8 Headline trust).

## 13. Regulatory note

App-Store **4.3 (spam)** is the live app-wide risk for an astrology app; the card is a public surface, so its copy and watermark **must reinforce the non-fortune-telling positioning** — the forbidden-word rule now has a regulatory stake, not just a brand one. This is also why the direct-IG-Stories deferral is correct (and why it needs a Meta App ID regardless).

---

*Process: brainstorm → spec (this doc) → Phase 0 capture spike (go/no-go) → resolve held decisions (7c) → writing-plans → implement, with the full review chain (spec-reviewer + code-quality). Separate feature branch.*
