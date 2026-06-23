# Domain Audit — Remove Cloudflare, Direct keyless API + on-device translation/synthesis

**Date:** 2026-06-23
**Spec:** `docs/superpowers/specs/2026-06-23-remove-cloudflare-direct-api-design.md`
**Phase:** Compound V Phase 1B (Domain-Expert Advisor)
**Scope of change:** Delete the Cloudflare Worker; move the translation layer (technical `factor_id` → Mystical-Premium tone) and daily-note voice synthesis into a monorepo package (`@inceptio/translations`) compiled into the mobile bundle; point the app directly at the keyless public upstream `https://api-public.astrology-api.io/api/v3`.

This audit covers the DOMAIN reality only — astrology-content governance, App Store content policy, electional correctness, i18n/tone. Code structure is Phase 1A; library/API signatures are Phase 1C.

---

## 1. Domain(s) Identified

1. **astrology-electional** — electional-astrology correctness (tz-as-input, local moon-phase/daily-note synthesis, grade calibration).
2. **app-store-review** — content governance / Guideline 4.3 (fortune-telling spam) exposure, the astrologer-review gate, machine-generated phrasing risk.
3. **i18n-localization** — the upstream native multi-language (EN/RU/FR/DE/ES) "orthogonal" claim, and the forbidden-word/tone guardrail under translation.

All three already have current, well-sourced KB files. No domain gap required new web search this pass.

---

## 2. Sources Consulted

**KB files reused (all < 1 month old, all cite primary sources — treated as authoritative per the < 6-month rule):**
- `_knowledge-base/astrology-electional.md` (updated 2026-06-02, -03, -05, -06) — tradition-asymmetry matrix, tz-as-load-bearing-input (EC-19), surface-class distinction, computed-moment artifact rules, upstream enum-drift history.
- `_knowledge-base/app-store-review.md` (updated 2026-06-09, -11) — Guideline 4.3 citations, content-governance posture.
- `_knowledge-base/i18n-localization.md` (updated 2026-06-08) — Rules 10/11 (localizing astrology *increases* 4.3 surface; traditional-astro lexicon per locale).

**Repo evidence verified this pass (ground truth, not memory):**
- `workers/api-proxy/src/translations/translate.ts:149` → `console.warn('[translate] unknown factor_id from upstream:', factorId)` — the drift-detection signal the spec §6 admits losing. Confirmed real.
- `workers/api-proxy/src/translations/translate.ts:187` → `console.warn('[translate] unknown reason_id from upstream:', reasonId)` — same for excluded-reason enums. Confirmed real.
- `workers/api-proxy/src/translations/types.ts:14` → `export type Locale = 'en' | 'de' | 'fr' | 'es-419' | 'pt-BR'` — our tone layer's own 5-locale axis. **Load-bearing for the §4 orthogonality analysis below.**
- `workers/api-proxy/src/upstream.ts` — grep for `lang|language|locale` returns **nothing**: the upstream request body carries **no interpretation-language parameter today**. Confirmed.
- `packages/shared-types/src/api/{factor,response,excluded-range}.ts` — `KNOWN_FACTOR_IDS`/`KNOWN_REASON_IDS`/`KNOWN_GRADES` live here (the permissive-enum source of truth that travels into mobile). Confirmed.
- `apps/mobile/src/lib/grade.ts` — grade-bucket logic already consumes `KNOWN_GRADES` client-side.

**No web search dispatched:** the three KB files cover the spec's exact scope and are within the freshness window with primary-source citations. Padding with speculative searches would violate citation rigor. The one item that *would* warrant a fresh search — whether the public `api-public.*` endpoint's wire contract or rate behavior changed — is a **library/API-currency question owned by Phase 1C**, not domain.

---

## 3. Domain Constraints the Brainstorm Probably Missed

### 3.1 The astrologer-review gate is now a STORE-RELEASE-blocking gate, and several phrasings are still unreviewed (CLAUDE.md, Translation-layer section)

CLAUDE.md is explicit: *"Don't ship machine-generated astrology phrases unreviewed"* and *"The translation layer needs **astrologer review** after Claude Code generates the initial draft — book ~2 hours for this before launch."* CLAUDE.md also flags **four** excluded-reason phrasings as live drafts: `mercury_combust`, `mars_retrograde`, `jupiter_retrograde`, and (by the same mid-2026 batch) the `good` grade handling — each marked *"draft phrasing pending astrologer review."*

Pre-change, an unreviewed/wrong phrase could be hot-fixed server-side without a store release (the entire architectural rationale for the server-side translation layer per the v1→v2 decision log: *"Built on Cloudflare Worker, not in mobile bundle… allows non-deploy updates"*). **Post-change, every phrasing is bundle-only: a wrong or unreviewed astrology phrase can only be corrected by shipping a new app build through App Store + Play review.**

- **MUST**: complete the ~2h astrologer review of the *full* dictionary — all 15 factor entries, all activity-overrides, all severity-hints, the headline synthesizer output, AND the four pending-review excluded-reason drafts — **before** the first bundle that ships this architecture, not "before launch" loosely. The review is no longer a soft pre-launch task; it is a release-blocking gate, because the cheap escape hatch (server hot-fix) is being deleted.
- **MUST NOT**: ship any string still carrying a `pending astrologer review` marker in the bundled dictionary. Add a build-time lint/test that fails if any dictionary entry is tagged draft/pending. (Lint infrastructure already exists — `translations/__tests__/lint-library.test.ts` — so this is an assertion to add, not new tooling.)

### 3.2 Losing the `[translate] unknown …` server log is a domain-credibility risk specific to astrology, not just an ops nicety (spec §6; CLAUDE.md Schema-policy)

The spec §6 accepts that a new upstream enum will now *"молча покажет fallback-фразу без сигнала"* (silently show a fallback phrase with no signal). The KB documents that upstream **already did this twice in mid-2026** — `good` grade, then `mercury_combust`/`mars_retrograde`/`jupiter_retrograde` reasons "in the same week without notice" (astrology-electional.md, 2026-06-02 §"Recent breaking changes"). This is an **observed, recurring** upstream behavior, not a hypothetical.

Why this is worse for an astrology product than for a generic app: the fallback fires precisely on the **most astrologically-salient sky events** — a retrograde or combustion is *the* fact a user cares about. When `mars_retrograde` arrives and the dictionary hasn't been updated, the user sees a generic neutral phrase (e.g. "a stretch worth waiting out") instead of the specific, tradition-correct reason. The asymmetry matrix (astrology-electional.md, 2026-06-02) makes this concrete: for a **business-launch** user, Mars retrograde is `Severe` (Mars = initiative/drive); for a **contracts** user, Mercury combust is near-`Catastrophic` (Mercury IS the significator). Rendering those as a bland generic line is a **method-correctness regression visible to exactly the users who'd notice** — and there is now no server log to alert the team that it's happening.

- **MUST** preserve a drift-detection signal in some form before shipping. The spec defers "тихий лог в аналитику" (quiet log to analytics) to "later / Mitigation позже." Minimum acceptable for an astrology product: when `translate()` hits the unknown-enum fallback path, fire a lightweight client telemetry event (`translate_unknown_enum`, with the raw `factor_id`/`reason_id`/`grade` string). This is small — the fallback branch already exists at translate.ts:149/187; it currently `console.warn`s, which is invisible on-device. Without *any* signal, the team discovers upstream drift only via a user complaint or App Store review mentioning "weird/generic readings," at which point the fix requires a full store release (per 3.1).
- **SHOULD** at minimum, even if telemetry is genuinely deferred, keep the `console.warn` (it surfaces in dev/TestFlight device logs and is free) and add a golden-test that asserts every value in `KNOWN_FACTOR_IDS`/`KNOWN_REASON_IDS`/`KNOWN_GRADES` has a dictionary entry — so a *known-but-untranslated* enum can never ship silently (catches the class where the constant was updated but the dictionary wasn't). This converts "silent at runtime" into "loud at CI" for the catchable subset.
- **Domain note:** the bundle-only constraint means the *response* to detected drift is also slower (store release vs server edit). That makes the *detection* signal MORE valuable post-change, not less — the opposite of the spec's "accepted for MVP" framing suggests. Flagging for the human in §8.

### 3.3 The forbidden-word guardrail must travel with the dictionary into the bundle, including over the fallback phrases (CLAUDE.md Tone-of-voice; KB 2026-06-05 §"Public-artifact tone constraints", 2026-06-06 Rule 4)

CLAUDE.md locks a forbidden-word list: **magic, destiny, fortune, stars align, manifest, energy (noun), vibes, alignment (new-age sense), blessed.** Two on-device surfaces in this change can violate it:

1. **The neutral fallback phrases** that fire on unknown enums (translate.ts:15 "Generic fallback phrasings"). These are the phrases users will increasingly see as upstream drifts (per 3.2). They MUST be audited against the forbidden list — a generic fallback like "the energy isn't settled" or "the stars aren't aligned for this" would be a double failure (forbidden word + fires exactly when un-hot-fixable).
2. **The on-device daily-note synthesizer** (composer/picker, transfer item #6) composes free-form-ish sentences from parts. Composition can assemble a forbidden phrase from individually-clean parts.

- **MUST** carry the forbidden-word negative test into `packages/translations` as a golden/lint test that runs over **every** dictionary string, every activity-override, every severity-hint, **every fallback phrase**, and a representative sample of synthesized daily-note outputs. The KB already establishes this negative-set test as standard (2026-06-05 §"Public-artifact tone constraints" point 1). The spec §8 says golden tests "переезжают без изменения ожидаемых выходов" (move without changing expected outputs) — that preserves *positive* goldens but does NOT guarantee the forbidden-word *negative* test exists or moves. Verify it exists; if not, it is in-scope for this change because the strings are now un-hot-fixable.
- **MUST NOT** let the daily-note composer emit a forbidden word via part-assembly. Add the negative assertion to the composer's golden tests specifically (the composer is the highest-risk surface because output is assembled, not looked-up verbatim).
- **MUST** extend the negative test to the **ambiguous-noun class** (KB 2026-06-06 Rule 4): chrome/error strings about running out of searches must say "searches/lookups," never "moments/windows." This is relevant because the spec §5 changes the 429/rate-limit copy path (Worker per-device 429 branch removed, only upstream-quota branch remains) — the surviving soft-block string must still pass Rule 4. (KB notes the *live* `RateLimitError` copy already violated this — "You've explored 10 moments this month" — so the negative test must cover existing strings being moved, not just new ones.)

### 3.4 Grade calibration MUST be preserved verbatim on-device, and "fair is a win" framing must not regress (CLAUDE.md "Real API behavior"; KB 2026-06-05 §"Public-artifact" point 2)

CLAUDE.md "Calibrated grade buckets" is ground truth from real Postman data: highest score ever observed was **72**; most "best" results sit **60–74** with grade `fair`; the 75+ `strong` and 90+ `exceptional` buckets are "very rare." The design's emotional language *"must treat 60–74 as a win, not as middling… 'A tender day for beginnings' should fire at score 65."* The `good` grade (added by upstream mid-2026) sits in the 60–74 band and is treated as a positive, same as `fair`.

This calibration logic is moving from Worker into the bundle (transfer item #4; grade logic already partly in `apps/mobile/src/lib/grade.ts`). The risk: a re-implementation or relocation that subtly shifts a threshold (e.g. treats 60–74 as "caution" or maps `good` differently from `fair`) silently breaks the product's core emotional win-state — and is now bundle-only to fix.

- **MUST** preserve the exact bucket boundaries: `90–100 Exceptional / 75–89 Strong / 60–74 Fair-Good / 40–59 Caution / 0–39 Poor`, with **both** `fair` and `good` mapped to the win-state framing. The headline synthesizer's score→headline trigger (fires warm copy at 65) must move byte-identical.
- **MUST** keep the golden tests that snapshot the 60–74 → warm-headline mapping (these are the regression guarantee per spec §8). Confirm a golden specifically covers a score-65 / `fair` and a score-65 / `good` input both producing a win-framed headline.
- **MUST NOT** let any grade word (`fair`/`good`/`caution`/`poor`) or raw score leak into chrome that lacks the in-app calibration scaffolding — already a KB rule (2026-06-05 point 2), reaffirmed because on-device synthesis makes accidental `String(grade)` leakage easier.

### 3.5 Electional correctness — local synthesis + direct upstream call concentrates the tz-as-load-bearing-input risk on-device (KB 2026-06-03 EC-19; CLAUDE.md decision log "Moon phase computed locally"; MEMORY BUG-001)

This is the single biggest *correctness* (not governance) risk the spec underplays. KB 2026-06-03 (EC-19) established with primary Swiss-Ephemeris sourcing that **timezone is a load-bearing INPUT to the election chart, not a presentation hint** — wrong tz shifts the Ascendant ~15°/hour, moves all 12 house cusps, picks the wrong planetary-hour ruler, and can flip a VoC overlap from viable↔blocked. The detection invariant is:

```
∀ request to upstream:  request.timezone === tzLookup(request.latitude, request.longitude)
```

Three places this change concentrates the risk:

1. **The tz resolution moves into the client** (transfer item #2: "header → tz локации → UTC", now resolved locally in `api.ts`). Pre-change, the Worker route handler was the assertable chokepoint for the invariant. Post-change, the client builds the upstream body directly (spec §10 calls out reproducing the wire form exactly or getting a 422). The invariant assertion MUST move with it — the client must NOT send `device_tz` as the chart `timezone` for a picked location in a different zone. The KB's marquee personas (destination-wedding planners, nomads, expats, travel-activity users) are *definitionally* cross-tz and are exactly who this product courts.

2. **Daily-note becomes a fully-local search + synthesis** (transfer item #6). The daily-note already had a known device-tz hazard: **MEMORY BUG-001 (`cluster-windows.ts`)** renders the window DATE in device tz, not event tz, causing an off-by-one across the date line — "pre-launch credibility bug." Moving more synthesis on-device without fixing the tz-resolution discipline risks *propagating* this class. The daily-note's internal search must resolve `timezone = tzLookup(location)` for the chart reference, and any date *rendering* must use the event tz (BUG-001's fix: `parseLocalInstant + UTC`).

3. **Moon phase computed locally** (CLAUDE.md, already the case) is fine — it's deterministic from the window `start` timestamp and the KB surface-class table classifies a *display* of an already-computed moment as a presentation choice. But the daily-note's *election* computation (the upstream search it wraps) is an **election-computing surface** (KB 2026-06-05 surface-class table) and is bound by the tz-as-input invariant. Don't let the "moon phase is just local math" precedent bleed into treating the daily-note's chart tz as "just local math" — it is load-bearing input.

- **MUST** carry the tz invariant assertion into `apps/mobile/src/lib/api.ts`: before sending, assert/auto-correct `request.timezone === tzLookup(lat,lng)`; never silently forward `device_tz` for a cross-tz picked location. On violation: re-resolve from lat/lng (auto-correct) rather than reject, to avoid a hard error in the user flow.
- **MUST** include the KB's cross-tz QA pack (5 pairs: NYC↔Tokyo, Berlin↔Sydney, LA↔Dubai, London↔Buenos Aires, Mumbai↔SF) in the smoke/test plan — the spec §8 mentions a single smoke against `api-public` but not the cross-tz correctness dimension. The §10 "reproduce wire form exactly or 422" risk is about *shape*; this is about *semantic correctness of the tz value* — a request can be 200-valid and still astrologically wrong.
- **MUST NOT** consider BUG-001 out of scope here. The spec moves the daily-note synthesis on-device; that is the natural moment to ensure the date-rendering tz discipline is correct, because the cheap server-side fix path is being deleted.

---

## 4. Validation of the spec's "orthogonal" claim — upstream native multi-language (§9, §1.line-112)

**The spec's claim is CORRECT but its framing hides one real opportunity and one real trap.**

The spec §9/§1 says: upstream's native EN/RU/FR/DE/ES is *"the language of interpretations, orthogonal to our tone layer; not touched in this change."* Repo evidence confirms the two are genuinely different axes:

- Our tone layer has its own locale axis already: `Locale = 'en' | 'de' | 'fr' | 'es-419' | 'pt-BR'` (translate.ts/types.ts:14). Our layer does **tone translation** (technical `factor_id` → warm Mystical-Premium phrasing) from a reviewed dictionary, in our locales.
- Upstream's native languages produce **raw interpretive text** in those languages — which is exactly the technical/divinatory register CLAUDE.md says *cannot* be shown to consumers (the whole reason the translation layer is "mandatory infrastructure").
- The upstream request carries **no language param today** (grep of `upstream.ts` = no `lang`/`locale`). So nothing in this change touches it. ✔ Claim validated: keeping it out of scope is correct.

**However — two domain points the plan should record (not act on, but not lose):**

- **Trap if conflated later:** adopting upstream native interpretations as a *shortcut* to multi-language would **bypass the astrologer-reviewed tone dictionary AND the forbidden-word guardrail** — raw upstream text is unreviewed, in the wrong register, and per i18n KB Rule 10 *increases* App Store 4.3 (fortune-telling) surface in each new locale, with each localized binary a fresh review pass. The spec is right to wall it off; the plan MUST NOT let a future "we already have 5 languages from upstream, let's just use them" optimization quietly skip the review gate. Record this as a guardrail, because the *naming collision* (upstream offers the same 5 languages our tone layer targets) makes the shortcut tempting.
- **Note the mismatch:** upstream offers **ES** (generic) while our tone layer targets **es-419** (neutral Latam), and upstream offers **RU** while our `Locale` type does **not** include `ru` (it's `en/de/fr/es-419/pt-BR`). So upstream native languages are not even a drop-in match for our locale set. Per i18n KB Rule 11, traditional-astrology terms have established per-locale renderings a generalist (or a generic API) gets wrong — another reason raw upstream text isn't a substitute for the reviewed dictionary. This is an *opportunity-not-missed* finding: there is no shortcut here, the wall is correct.

---

## 5. Common Traps in This Domain

1. **Re-implementing grade buckets "cleanly" and drifting a threshold** — the calibration is empirical (max observed 72), not intuitive. A dev who expects astrology scores to span 0–100 may "fix" the 60–74 win-state as middling. (§3.4)
2. **Fallback phrase that reads as a verdict, not a neutral hold** — a generic fallback firing on `mars_retrograde` for a business-launch user understates a `Severe` condition; firing on `venus_retrograde` for a wedding user understates a `Catastrophic` one (asymmetry matrix). Neutral ≠ correct; it's just safe-from-crashing. (§3.2)
3. **Device-tz leaking into the chart `timezone`** for cross-tz picked locations — 200-valid, astrologically garbage, invisible without the invariant check. (§3.5)
4. **Forbidden word assembled by the composer** from clean parts — the daily-note synthesizer is the highest-risk surface for "energy/alignment/magic" leakage because output is composed, not looked-up. (§3.3)
5. **Treating "golden tests move unchanged" as sufficient governance** — positive goldens guarantee tone *didn't change*; they do NOT guarantee the forbidden-word negative test, the tz invariant, the drift signal, or the known-enum-coverage test exist. The governance that mattered most was partly *outside* the golden snapshots (it was the server log + server hot-fix capability). (§3.1–3.3)
6. **Conflating "moon phase is local math" with "daily-note chart tz is local math"** — the first is a deterministic presentation value; the second is load-bearing election input. (§3.5)

---

## 6. Regulatory / Compliance Notes

This product has no GDPR/HIPAA/PCI surface in *this* change (device-only identity, no PII transmitted, removing a server reduces data-handling surface). The binding compliance regime is **App Store / Play content policy**, specifically **Guideline 4.3 (spam / saturated fortune-telling category)** — astrology apps are actively rejected absent a "unique, high-quality experience" ([iMore](https://www.imore.com/apple-rejects-developers-horoscope-app-says-app-store-has-enough), [molfar.io](https://www.molfar.io/blog/apple-review)).

- The translation layer / Mystical-Premium tone IS the 4.3 defense — it's what makes Inceptio "an electional timing helper," not "a fortune teller." Moving it on-device does not weaken the defense **as long as the reviewed dictionary and forbidden-word guardrail ship intact** (§3.1, §3.3). A neutral fallback that drifts toward divination wording, or a forbidden word leaking via the composer, *directly* re-exposes 4.3.
- **Every fix to a content/tone defect is now a fresh review pass** (bundle-only). Under 4.3, each submission is re-read by a reviewer who can re-evaluate the fortune-telling positioning (i18n KB Rule 10). This raises the cost of getting the content wrong at launch — reinforcing §3.1's "review is now a release gate."
- Surgery remains deferred to v1.4 for medical-content risk (§1.4.1/§5.2.1) — unaffected by this change, noted for completeness.
- No new force-update / version-policy compliance issue: the spec drops the server `version-policy` gate (§6). Per app-store-review KB (2026-06-11), forcing your *own* update is not prohibited; dropping the gate is purely a capability loss, not a compliance change. Out of scope here.

---

## 7. Recent Breaking Changes (last 12 months)

- **Mid-2026 — upstream added enum values without notice, twice:** `good` grade (sits 60–74, treated as positive), then `mercury_combust` + `mars_retrograde` + `jupiter_retrograde` reason_ids "in the same week" (CLAUDE.md; astrology-electional.md 2026-06-02). This is the empirical basis for the permissive-enum policy AND for §3.2's drift-signal requirement. Combust ≠ retrograde (combust = within ~8° of Sun, distinct severity) — a fallback that conflates them is method-wrong.
- **Mid-2026 — `api-public.astrology-api.io/api/v3` (v3.2.10) keyless endpoint appeared** (spec §1). This is the enabling change. Domain-relevant only insofar as it is the *same Swiss-Ephemeris (DE431/JPL) engine* (per astrology-electional.md 2026-06-03) — so the tz-as-load-bearing-input contract is **unchanged**; the engine still interprets `hour:12 + timezone` as "noon in that tz at that lat/lng." Removing the Worker does not change the upstream's tz semantics. **(Wire-contract currency and the keyless-422-vs-401 behavior are Phase 1C's to verify — flagged, not owned here.)**
- **Venus Retrograde falls Oct–Nov 2026** (practitioner calendars, astrology-electional.md). Relevant as a launch-QA sample window: it blocks all of Oct/Nov 2026 for *wedding* (CLAUDE.md 6-month-search finding) and is the highest-asymmetry condition (Catastrophic for wedding, Mild for travel). Use a Venus-Rx date in the cross-tz QA pack to exercise both the asymmetry and the fallback paths.

---

## 8. Design Constraints for the Plan (non-negotiable)

The plan author treats these as MUST-satisfy:

1. **Astrologer-review gate is a release blocker.** No bundle ships this architecture until the full dictionary (15 factors + overrides + severity-hints + headline synthesizer + the 4 `pending astrologer review` excluded-reason drafts) is astrologer-reviewed. Add a build-time test that fails on any `pending`/`draft` marker in a bundled dictionary entry. (§3.1)
2. **Preserve a drift-detection signal before shipping.** Minimum: fire a client telemetry event on the unknown-enum fallback path (translate.ts:149/187), carrying the raw `factor_id`/`reason_id`/`grade`. If telemetry is genuinely deferred, keep `console.warn` AND add a CI test asserting every `KNOWN_*` value has a dictionary entry (catches known-but-untranslated drift loudly). (§3.2)
3. **Forbidden-word negative test travels into `packages/translations`** and runs over every dictionary string, every override, every severity-hint, **every fallback phrase**, and a sample of synthesized daily-note outputs. Confirm it exists; if the golden migration only moved positive snapshots, adding it is in-scope. (§3.3)
4. **Ambiguous-noun rule on the surviving soft-block/429 copy:** the quota/error string says "searches/lookups," never "moments/windows"; anchor any reset/expiry wording to "midnight" or omit a relative day (cross-tz personas). Covers the existing `error-messages.ts` string being moved, not just new copy. (§3.3)
5. **Grade buckets preserved byte-exact** with both `fair` and `good` → win-state, warm-headline fires at 65. Golden test must cover score-65 `fair` AND score-65 `good`. (§3.4)
6. **tz-as-load-bearing-input invariant moves into `api.ts`:** before every upstream call, `request.timezone === tzLookup(lat,lng)`; auto-correct (re-resolve from lat/lng) on mismatch, never forward `device_tz` for a cross-tz picked location. Same discipline in the local daily-note search. (§3.5)
7. **Cross-tz QA pack** (5 pairs from KB) in the test plan, including a Venus-Rx date — covering *semantic* tz correctness, not just the §10 wire-shape 422 risk. (§3.5)
8. **Daily-note date rendering uses event tz, not device tz** — do not propagate MEMORY BUG-001 (`cluster-windows.ts` off-by-one) into the on-device daily-note path; the on-device move is the moment to get this right. (§3.5)
9. **Upstream native multi-language stays walled off,** AND record the guardrail that a future "use upstream's 5 languages directly" must not bypass the astrologer-review gate or the forbidden-word guardrail (raw upstream text is wrong-register, unreviewed, and increases 4.3 surface per i18n KB Rule 10). (§4)

---

## 9. Open Questions for the Human (product/business decisions)

1. **Is "silent enum-drift on bundle-only" actually acceptable given the response is now also bundle-only?** The spec §6 accepts it "for MVP" — but the KB shows upstream drifts *recurrently* and unannounced, and post-change the *fix* requires a store release (days), while detection is currently zero-signal on-device. The advisor's domain read: the drift signal is MORE valuable after this change, not less. Recommend the human reconsider whether the lightweight telemetry event (§8.2) should be in-scope-now rather than "later." **Only product can weigh "ship faster" vs "fly blind on the product's core correctness surface."**
2. **Has the astrologer-review session been booked, and does it cover the 4 still-pending excluded-reason drafts** (`mercury_combust`, `mars_retrograde`, `jupiter_retrograde`, `good`-grade handling)? If these are still draft at bundle-freeze, the launch ships unreviewed astrology phrasing that can only be fixed by a re-release. Business decision: gate the release, or accept the drafts.
3. **Future paywall on the public-URL limit (spec §5):** stakeholder noted the future paywall builds "поверх лимита публичного URL." The IP-based upstream limit is weak under NAT/mobile-carrier (spec §6 accepts this). Not a domain-correctness question — flagged only because it interacts with the hidden-paywall content posture (KB 2026-06-06 Rule 1: soft-block copy must carry zero monetization signal under a hidden paywall). Confirm the surviving 429 soft-block copy still passes that rule.

---

## 10. Knowledge Base Updates

Appended a generalized pass to `_knowledge-base/astrology-electional.md` under **"Updated 2026-06-23 — server→bundle migration of the tone/synthesis layer."** Generalized findings (reusable for any future "move the governance/translation layer off-server" change): the **server-hot-fix-loss multiplier** on content-governance risk, the **drift-signal-becomes-more-valuable-when-fix-is-slower** principle, the surface-class reminder that a relocated election computation is still tz-bound, and the upstream-native-language-is-not-a-tone-shortcut wall. No prior entries deleted; nothing struck through (all prior findings remain valid and were reinforced, not contradicted).
