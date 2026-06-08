# Spec: CHROME i18n + locale plumbing

**Date:** 2026-06-08
**Status:** Approved (brainstorm) — pending pre-flight audits + written-spec review
**Branch:** dedicated i18n branch (build + test locally; nothing ships until launch)

---

## 1. Context & the two-layer model

Inceptio has two localizable layers with different readiness:

- **CHROME** — client UI strings (nav/labels, buttons, capped/rate-limit copy, moment-card chrome,
  errors, settings, onboarding, form labels, loading copy, number/date/duration formatting). Stable,
  ruling-independent → **translate now** (de / fr / es-419 / pt-BR).
- **VOICE** — the astrologer-reviewed differentiator: Worker-composed astrology copy (headlines, tier
  grade-words, daily-note voice, picker phrasing) **plus** ruling-dependent client astrology strings
  (grade-words, blocker phrasing). English is not final (gated on the astrologer ruling). Translating
  now is churn → **out of scope** this phase. Extracted to `voice.*` keys (en-only) so the VOICE phase
  is a translation-file drop, not a call-site change.

**Investigative finding that set the scope (composer/translate audit):** user-facing astrology *prose* is
composed voice almost everywhere. The only raw-API *text* surface is the **Level-3 "Technical" view**
(degrees/dignities/positions, mono aesthetic, hidden by default). Consequence: the "localize API
passthrough cheaply via the upstream `lang` param" lever buys almost nothing in MVP scope, so we do
**not** wire it. The CHROME/VOICE split holds cleanly; the anticipated third (passthrough) bucket is
effectively empty.

### Classification test (canonical)

> The astrologer ruling governs astrology **JUDGMENT** — grade-words, blocker phrasing, the meaning of
> planetary states. **Description-of-computation, duration-UX guidance, and brand/positioning copy are
> astrology-*flavored*, not astrology-*judgment*** → CHROME. Astrology-flavored chrome needs
> register-aware *translation* (a translator concern), not the VOICE/astrologer pass.

---

## 2. Scope

**In scope (this phase):**
- i18n library + locale detection in the Expo app.
- Back the existing `t()`-shaped seams (`card-strings`, `error-messages`) and extract remaining chrome.
- Translate CHROME into de / fr / es-419 / pt-BR.
- Extract VOICE strings to `voice.*` keys, **en-only**.
- A minimal **locale-accept seam** on the Worker (`X-Locale`: accept + shape-validate + ignore).
- Shared astrology-term glossary (termbase) as a deliverable.

**Out of scope:**
- Translating any VOICE string (Worker-composed copy or ruling-dependent client astrology strings).
- Wiring the upstream API `lang` param / localizing the L3 Technical view.
- Touching server-composed copy (`excluded_ranges.displayable.phrase`, headlines, daily-notes, factors).
- Putting locale into the Worker cache key (deferred to the VOICE phase — see §3 forward note).
- An in-app user-facing language picker (device-locale only; YAGNI).

---

## 3. Locale transport & Worker seam

- The client sends **`X-Locale`** (BCP-47, e.g. `pt-BR`) on **both** `/search` and `/daily-note`. Both
  endpoints emit composed voice, so both must carry locale for the future VOICE phase.
- **Code-reality correction (archaeology):** `/daily-note` is a **GET** that today carries timezone as a
  **query param (`?tz=`)**, not an `X-Timezone` header — there is **no request-meta header precedent on
  that route besides `X-Device-Id`**. So `X-Locale` is *new* there, not a mirror of an existing header.
  The plan must explicitly add `X-Locale` as a **header** on the GET (do not assume parity with `/search`).
  Header logic is duplicated inline in `api.ts` (`searchElectional` ~L124, `getDailyNote` ~L262); prefer a
  shared `requestMetaHeaders()` helper over a third inline copy — see Open Question O2 on whether that
  helper also back-fills `X-Timezone` onto `/daily-note`.
- Worker behavior this phase: **accept + shape-validate + ignore.**
  - Validation = well-formed locale token (charset, length cap, BCP-47 regex), **not** membership.
    Unknown/unsupported locales pass validation (forward-compat); malformed garbage is rejected
    defensively (clear **400**, not 500); **absent header is valid** (treated as unset). New validator
    mirrors the *structure* of `local-date.ts` `isValidTz` but with a regex body, not an `Intl` probe.
  - **Placement (binding):** validate `X-Locale` **unconditionally** — *before* the `if (meter)` block in
    `search.ts` and *independently* in `handleDailyNote`. Do **NOT** inherit `X-Timezone`'s placement:
    `X-Timezone` is read only inside the metered path and only after the device-id gate; `X-Locale` has no
    device-id dependency and must be accepted on unmetered requests too. A too-strict new gate would
    regress every current production client (none send the header yet) — absent must stay valid.
  - Locale does **not** affect the response and does **not** enter either cache key this phase (response is
    locale-invariant while VOICE is English-only). It rides as a **header only** — never in the request
    body: `ElectionalSearchRequestSchema` is `.strict()`, so a body field would 400 the request *and*
    fragment the cache.
- **Forward note (VOICE phase — record in code comments + Appendix A):** once voice is translated the
  response varies by locale, so the `X-Locale` value **must** be threaded into the cache key, or locale-A's
  cached voice is served to locale-B (cross-locale poisoning). **There are TWO key surfaces** —
  `computeCacheKey` (`cache.ts`, search) **and** `keyOf` (`daily-note-cache.ts`, daily-note). Both must be
  updated in the VOICE phase. **Server-only change**; no mobile release required (the entire reason the
  client sends locale from the chrome/launch release).

---

## 4. Library & locale resolution

### Library (versions pinned by doc-validator)
**`react-i18next` + `expo-localization`.**
- Pure-JS (no native module) → lowest New-Architecture risk of the candidates; the app's prior
  worklets/Reanimated New-Arch friction does **not** apply. `expo-localization` is Expo-maintained.
- The existing `t(key)` seam maps 1:1 onto i18next's `t` → re-point, not rewrite.
- Rejected: **LinguiJS** (babel-macro + Hermes/New-Arch friction; DX churn from the `t()` seam);
  **custom `t()`** (reinvents plurals / fallback chains / missing-key handling for a 5-locale app with
  non-standard variant tags).
- **Verified current versions (install as a matched set):** `i18next 26.3.1`, `react-i18next 17.0.8`
  (peer-requires `i18next >= 25.6.2`), `expo-localization 55.0.13` (install via `npx expo install`).
- **i18next v26 config:** defaults to **v4 plural suffixes** — do **NOT** set `compatibilityJSON:'v3'`;
  author plural keys as `_one`/`_other`/`_few`/`_many`. Set `react.useSuspense:false` (synchronous
  bundled-resource init in RN). `getLocales()` is the current API and returns `languageTag` /
  `languageCode` / `regionCode` in device-preference order.

### 🔴 Hermes `Intl` gap — MUST be handled (doc-validator C1/C2, domain-expert)
The single highest-risk technical claim. Hermes (RN 0.83 / Expo SDK 55) does **not** implement
`Intl.PluralRules`, and i18next v4 plurals derive from it → **every de/fr/es/pt plural key silently
mis-pluralizes** without a polyfill. Two binding requirements for the plan:

1. **Polyfill task (new):** install `@formatjs/intl-pluralrules` + `@formatjs/intl-locale`; import
   `/polyfill-force` + `locale-data/{en,de,fr,es,pt}` **once at app root, before `i18n.init()`**. Add a
   one-time on-device check that `Intl.DateTimeFormat` has data for the four non-English locales
   (it is supported by Hermes but ICU-data presence must be confirmed for de/fr/es/pt).
2. **App-locale → Intl-locale mapping seam (new, distinct from i18next resolution):** the resource-bundle
   key (`es-419`, `pt-BR`) is **fine for i18next** (opaque string) but **invalid as an `Intl` argument** —
   Hermes/ICU has no M49 `419` data and may throw or silently fall back. Before **any** `Intl.*` call,
   map `es-419 → es`, `pt-BR → pt` (de/fr/en pass through). Without this seam, es-419 users get exactly
   the en-US dates §6 set out to kill. Keep the two resolutions separate: **bundle key** (i18next) vs
   **Intl locale arg** (formatters).

### Supported locales & fallback
```
supportedLngs: ['en', 'de', 'fr', 'es-419', 'pt-BR']
fallbackLng:   { 'es-419': ['en'], 'pt-BR': ['en'], 'de': ['en'], 'fr': ['en'], default: ['en'] }
load: 'currentOnly'
```
There are no bare `es` / `pt` bundles, so no `es`/`pt` intermediates appear in the chains (they would be
no-ops). `de`/`fr` fall straight to `en`.

### Locale detection (explicit normalization — do NOT rely on i18next implicit matching)

**Problem this guards against:** `supportedLngs` uses **variant tags** (`es-419`, `pt-BR`) but devices
report **country tags** (`es-MX`, `es-AR`, `pt-PT`, …). `es-MX` does **not** exact-match `es-419` (they
are sibling tags, not parent/child), and strip-to-primary yields `es`, which is not in `supportedLngs` →
falls to `en`. A Mexican/Argentine device would get **English instead of Spanish**, defeating the exact
Latam market the localization is for. This is specific to the variant tags; `de`/`fr` are fine because
`de-DE`/`fr-FR` strip to the bare primaries normally.

**Resolution algorithm** (run over `expo-localization.getLocales()` in device-preference order; first
match wins):

```
for each deviceLocale in getLocales():           // ordered by user preference
  tag = deviceLocale.languageTag                  // e.g. "es-MX", "pt-PT", "de-AT", "fr"
  primary = lowercase(language subtag)            // "es", "pt", "de", "fr", ...
  if primary == 'es'  -> return 'es-419'          // ANY Spanish device    -> Latam variant
  if primary == 'pt'  -> return 'pt-BR'           // ANY Portuguese device -> Brazil variant
  if primary == 'de'  -> return 'de'              // de-* strip-to-primary
  if primary == 'fr'  -> return 'fr'              // fr-* strip-to-primary
  if primary == 'en'  -> return 'en'
  // else: not a supported language; continue to next device locale
return 'en'                                        // no supported language found
```

- **Spain/Portugal** (`es-ES`, `pt-PT`) intentionally receive the Latam/Brazil variant — far better than
  English; revisit if `es-ES`/`pt-PT` become explicit markets.
- **iOS reports `es-419`/`pt-BR` directly** (Android reports country tags like `es-MX`). The algorithm
  handles both — `es-419`'s primary subtag is `es` → maps to `es-419` — but the §11 detection tests must
  include `es-419` and `pt-BR` as *device inputs*, not only country tags, so the iOS path is covered.
- A **`__DEV__`-only locale override** (mirroring the existing `TodayScreen` `__DEV__` StatePicker) lets us
  exercise all five locales locally without changing device settings. Not shipped to users.
- **App mount reality (archaeology):** the app root is **`apps/mobile/App.js`** with a hand-rolled
  `SCREENS` map — **not** an Expo Router `_layout` (CLAUDE.md is stale on this). `i18n.init()` + polyfills
  must run in the `App.js` boot sequence **before the boot gate lifts** (same lifecycle slot as
  `hydrateStorage()`), and the `I18nextProvider` must wrap the provider stack that is **re-declared in
  three return branches** — hoist above the conditional returns or wrap all three.

---

## 5. Seam architecture

- **Extract every user-facing client string to a key** (en authoritative). CHROME keys are translated
  into all five locales; **VOICE keys stay en-only** this phase.
- **Namespaces** (per-key, because the CHROME/VOICE line cuts *through* some files):
  `common`, `nav`, `onboarding`, `search`, `calendar`, `moment`, `settings`, `errors`, `paywall`,
  `format`, and a dedicated **`voice`** namespace for all deferred strings.
- **Re-point existing seams (re-point, not rewrite):**
  - `lib/card/card-strings.ts` — `t(key)` delegates to i18next. `STRINGS` (genericIntent, band words
    morning/afternoon/evening/night, "Inceptio" watermark) → CHROME keys; `TIER_PHRASES` → `voice.*`
    (en-only). "Inceptio" routes through the seam but remains untranslated (brand).
  - `lib/error-messages.ts` — `friendlyMessage(err)` keeps the error-type switch, returns `t('errors.*')`.
    Includes the **capped-state copy** ("You've used today's searches. A new set opens at midnight.") →
    CHROME (functional, ruling-independent).
  - `components/Glyph.js` `FRIENDLY_REASON` → `voice.reason.*` (en-only).
- **Guard (lint + test):** every CHROME key must exist in all five locale files; every `voice.*` key must
  be **en-only** (its presence in a non-en file is a failure). Catches both a forgotten translation and an
  accidentally-early VOICE translation.

### Re-point foot-guns (binding — from archaeology)
- **Dotted keys collide with i18next's nesting default.** Existing keys like `card.band.morning` and the
  `errors.*` family will be read by i18next as nested paths (`card → band → morning`). Either set
  `keySeparator:false` (treat keys as flat literals) or author the JSON nested. Verify a **missing key
  returns the key string** (preserving the current `STRINGS[key] ?? key` behavior).
- **Capped-state invariant must survive the re-point.** `error-messages.test.ts` asserts the
  `RateLimitError` copy contains "midnight", contains no "moment", and carries no monetization wording (a
  domain negative-test locked by the usage-cap merge). The **en** value must keep this property; the test
  must be updated to assert against resolved `t()` output; the CHROME guard must not let this key drift.
- **`Glyph.FRIENDLY_REASON` has exactly one current consumer** (`CalendarScreen.js` blocked-day sheet) —
  the "Today pause card" consumer named in CLAUDE.md does not import it today. Don't block on a
  second call-site that isn't there.
- **The Calendar legend splits within one JSX block** (`CalendarScreen.js` L578/586 VOICE, L597/601
  CHROME) and the legend↔sheet copy is intentionally coupled (code comment ~L570). Split across
  namespaces in one coordinated edit so legend and sheet can't drift.

---

## 6. Number / date / duration / plurals

Locale-sensitive formatting must stop hardcoding `'en-US'` — but with two traps the naive fix misses:

- **Module-scope formatter trap (confirmed live):** `format-window.ts`, `cluster-windows.ts`,
  `format-date.ts` build `new Intl.DateTimeFormat('en-US', …)` as **module constants**, locked at import
  time — before locale resolution runs. They must become **per-call or locale-memoized** (a function of
  the resolved Intl-locale), not a swapped constant.
- **Display vs key/ISO formatters — do NOT localize the latter.** Some `en-CA`/`en-US` formatters produce
  **date keys**, not display text — e.g. `useDailyNote.ts` uses `en-CA` to emit `YYYY-MM-DD` for the
  query/cache key. These **must stay** `en-CA`/`en-US` (localizing them would corrupt cache keys). The
  plan must classify each of the ~11 `Intl` sites as display (localize) vs key (leave), and pass the
  **mapped Intl-locale** (§4 seam: `es-419→es`, `pt-BR→pt`), never the raw bundle key.
- **Plurals:** relative dates ("X days ago", "in X weeks") and counts ("{count} viable windows") authored
  as i18next v4 plural keys (`_one`/`_other`/`_few`/`_many`). Requires the `Intl.PluralRules` polyfill
  (§4). Note French `_one` covers **0** (`0 jour`) — §11 tests must assert this explicitly.
- Prefer extending **one** locale-aware date-format helper over editing `'en-US'` in ~11 places (each edit
  site is a regression surface); at minimum, add no new ad-hoc formatter.

---

## 7. Astrology-term glossary (deliverable)

A shared termbase (sky, planets, window, moment, void, retrograde, sign, angle, …) with an agreed
rendering per locale. The **chrome pass** uses it for astrology-flavored chrome (loading copy, onboarding
positioning); the **VOICE pass** reuses the same termbase. Without it, shared terms (e.g. "sky") diverge
across loading copy vs. headlines. Astrology-flavored chrome is a **translator/register** concern, not an
astrologer one, and ships in the chrome pass.

**Domain caveat (domain-expert):** several terms have *established traditional-astrology renderings* a
generalist MT will get wrong — e.g. PT *Lua Fora de Curso* (void of course), *Combustão* (combust); the
conventional forms exist in each target language. The termbase entries for these must be set by a
**locale-literate astrology reader**, not improvised. This is the bridge that keeps the later VOICE pass
consistent with shipped chrome, so getting the shared terms right now pays off twice.

---

## 8. Classification (closed)

### CHROME — translate this phase
- Nav / tabs (`TabBar`): Today, Calendar, Moments, You.
- Buttons / CTAs across screens.
- Activity / date / location flow chrome (`ActivityPicker`, `DatePicker`, `LocationPicker`,
  `SetDefaultLocation`), incl. preset labels and duration hints.
- Location-flow error/feedback copy.
- `errors.*` (`error-messages.ts`) **incl. capped-state**.
- Settings / About (`YouScreen`): rows, reset dialogs, toasts.
- Paywall (`PaywallScreen`) — present-but-hidden; translated for completeness.
- Moment-card **frame** strings (`card-strings` `STRINGS`).
- **Loading progress copy** (`LoadingScreen` STAGES): "Looking at the sky for you…", "Reading the
  planets' positions…", "Considering each window…", "Almost there — the sky takes its time…"
  (description-of-computation; flavored, not judgment).
- **format-window duration-UX hints**: "A single, pristine moment. Be ready.", "A precise window — set a
  reminder.", "Approximate time — focused searches show the exact window."
- **All onboarding** (`OnboardingScreen`) — see special handling for L38 below.
- **Calendar legend functional lines** (`CalendarScreen` L597/L601): "Outside your search range",
  "Filled cells show available windows. Gold rings mark the strongest."
- Number / date / duration / plural formatting (§6).

**Special handling — onboarding L38** ("Inceptio reads the sky the way astrologers have for centuries — and
helps you find the right time to start what matters: a wedding, a launch, a journey, a fresh page."):
brand-positioning hero **and** App-Store-**4.3-sensitive** (the "reads the sky … for centuries" claim is
exactly what 4.3 scrutinizes for fortune-telling). It is CHROME (flavored, not judgment), but **translate
it last in the chrome pass**, after the positioning/4.3 framing is confirmed stable. Highest-churn,
highest-stakes chrome string; a shift is a cheap one-string re-translate.

### VOICE — extract to `voice.*` (en-only now), translate later
- Tier grade-words: `card-strings` `TIER_PHRASES` ("A tender moment", …); grade labels in
  `MomentDetailScreen` ("Highly favorable", "Move with care", …), `ResultsListView`, `YourMomentsScreen`
  status pills.
- `Glyph.FRIENDLY_REASON` — 11 × {title, body} blocked-reason copy.
- **Calendar legend astrology one-liners** (`CalendarScreen` L578/L586): "Moon void of course — the sky is
  between rooms", "A difficult planet rises — move with care" (blocker meaning + malefic judgment, same
  register as `FRIENDLY_REASON`).
- API-composed copy (DailyNote headline/supporting, search headlines, factor phrases) — already
  server-side VOICE, untouched by definition.

---

## 9. Opportunistic DRY cleanup (client-only)

The moon-void/malefic blocker phrasing exists in **three** places: `Glyph.FRIENDLY_REASON` (client),
the calendar legend one-liners (client), and the Worker's `excluded_ranges.displayable.phrase` (server).
Collapse the **two client copies** into shared `voice.*` keys, with guards:
1. **Merge to one key only where strings are genuinely identical.** `FRIENDLY_REASON` is {title, body}
   pairs; legend lines are one-liners — **do not force-merge different shapes**. Where they differ, keep
   separate `voice.*` keys but **co-locate/link** them in the `voice` namespace so they can't silently
   drift.
2. **Behavior-preserving** — legend and glyph render exactly as before.
3. **Do NOT touch the server copy** (`excluded_ranges.displayable.phrase`) — that's the VOICE/server
   boundary; touching it is scope expansion.

Because these are VOICE keys (deferred), the merged source stays English this phase and is translated once
in the VOICE pass (one source, not two).

---

## 10. Translation production & review

- CHROME translations drafted (AI/MT, glossary-guided) → **native / register-aware translator review per
  locale before launch.** This is the chrome-pass analog of the mandatory astrologer-review gate for
  VOICE. Nothing ships until launch.
- **Resourcing flag (owner's call):** AI-draft-only without a native check is a real market-entry quality
  risk — machine-translated UI reads awkwardly or wrong, undermining the premium positioning in the exact
  Latam/Brazil/DE/FR markets the localization targets. At minimum, a native speaker per locale
  sanity-checks before launch (same constraint shape as the astrologer for VOICE).
- VOICE translation is a **later, separate pass** gated on the astrologer ruling (out of scope here).

---

## 11. Testing

- **Key-coverage test:** every CHROME key present in all five locale files; every `voice.*` key present in
  **en only**.
- **No-hardcoded-literal lint** over `apps/mobile/src/screens/` + `components/`: user-facing JSX text must
  route through `t()` (allowlist for non-string/brand exceptions).
- **Format snapshots** for plural/date/duration formatting per locale.
- **Worker `X-Locale` tests:** well-formed header passes validation and is ignored; malformed header
  rejected; absent header OK; **cache key unaffected** by `X-Locale` (the inverse of the VOICE-phase
  guard — asserts locale is currently out of the key).
- **Detection unit tests:** `es-MX`/`es-AR`/`es-ES`/**`es-419`** → `es-419`; `pt-PT`/`pt-BR` → `pt-BR`;
  `de-AT` → `de`; `fr` → `fr`; `it-IT`/`ja` → `en`; preference-ordering respected. Include the iOS-style
  variant tags (`es-419`, `pt-BR`) as device *inputs*, not just country tags.
- **Plural/Intl tests:** French `_one` covers `0` (`0 jour`); de/es/pt plural categories resolve via the
  FormatJS polyfill; `Intl.DateTimeFormat` renders non-en dates with the **mapped** Intl-locale
  (`es-419→es`) and a smoke test asserts es-419 does **not** fall back to en-US dates.
- **Layout / text-expansion verification (manual, German-first).** Not covered by the seam/library/domain
  pre-flights: longer translations overflow tight RN layouts. German runs ~30% longer than English
  (compounds) and will truncate/overflow buttons, single-line `numberOfLines` labels, and the tab bar.
  Step: via the `__DEV__` locale override, switch to **`de`** and eyeball every screen for
  overflow/truncation/clipping; fix layouts (wrap, shrink, ellipsis-by-design) before launch. Cheap, and
  catches a class the automated tests miss. Spot-check `fr` (also long) after `de` is clean.

---

## 11b. Open questions for the owner (raised by pre-flights)

Resolved by the owner (2026-06-08). Recorded here; the **register ruling (O1) must be set in the glossary
before any translation work begins.**

- **O1 — Register/formality (RESOLVED, brand call).** The warm/intimate companion voice drives the
  default:
  - **de → `du`** (Sie reads corporate, clashes with the voice).
  - **fr → `tu`** for consistency with `du` — but this is the **contested** one (French defaults more
    formal; `vous` is safer-but-cooler, `tu` risks reading presumptuous). **A French native confirms
    before fr translation starts.** Until confirmed, fr register is *provisional `tu`*.
  - **es-419 → voseo-neutral** — avoid 2nd-person-singular verb forms so one file serves Mexico +
    Argentina.
  - **pt-BR → `você`.**
  The glossary records the ruling per locale; translation does not start for a locale until its register
  is locked (fr gated on the native confirm).
- **O2 — tz consolidation (RESOLVED: locale-only this phase).** The shared `requestMetaHeaders()` helper
  adds **`X-Locale`** (+ the shared `X-Device-Id`); `/daily-note` keeps its existing **`?tz=`** query
  param untouched. Moving tz query→header on a hot endpoint is an unrelated behavior change and
  unnecessary risk to bundle into an i18n phase. tz-transport consolidation is a separate later cleanup.
- **O3 — Review resourcing (REAFFIRMED, launch-readiness dependency, not a build blocker).** Per locale,
  pre-launch review must be **native AND astrology-literate** — the chrome-pass analog of the astrologer
  gate. The **glossary especially** needs a locale-literate astrology reader: traditional terms (PT *Lua
  Fora de Curso*, *Combustão*, etc.) have established forms a generalist MT gets wrong. Build the infra
  now; plan the review resource as a launch dependency.

## 12. Delivery

Dedicated branch; build + test locally; nothing ships until launch. The Worker change is the minimal
`X-Locale` accept/validate/ignore seam only — the Worker is otherwise untouched this phase.

---

## Appendix A — Forward notes for the VOICE phase (do not lose)

1. **Cache keys (BOTH):** thread `X-Locale` into `computeCacheKey` (`cache.ts`, search) **and** `keyOf`
   (`daily-note-cache.ts`, daily-note) — server-only; prevents cross-locale cache poisoning. The
   accept-and-ignore seam plus in-code forward-note comments at both key sites are the hooks for this.
2. **Translate `voice.*`** into de/fr/es-419/pt-BR — drop-in translation files, no call-site change
   (guaranteed by the extract-everything-now seam).
3. **Astrologer ruling** governs the VOICE translations (judgment), reusing the §7 glossary for term
   consistency with the already-shipped chrome.
4. Pending-ruling items already noted upstream: `mercury_combust`, `mars_retrograde`, `jupiter_retrograde`
   phrasing; `moon_voc_intraday` severity hint.
