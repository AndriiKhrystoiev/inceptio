# Spec: VOICE phase — localize server-composed astrology copy

**Date:** 2026-06-08
**Status:** Approved-in-principle (owner activated VOICE phase); pending plan-shape review + partition gate
**Branch:** extend `i18n-chrome` (build + test locally; nothing ships until launch)
**Predecessor:** CHROME phase (this branch) plumbed `X-Locale` end-to-end (accept+validate+ignore) and extracted `voice.*` keys en-only. This phase activates them — the planned server-only follow-up, now run without the astrologer gate (translation is a language task; the astrologer's role — the English ruling + astrology-literate review — is substituted by the glossary termbase + best-effort community review).
**Archaeology:** see the composer audit (Phase-1A) — exact counts, call-path, hazards.

---

## 1. Scope

Localize the **VOICE layer** into de/fr/es-419/pt-BR:
1. **Server:** thread the (currently ignored) `X-Locale` into the composition path so the Worker composes astrology copy in the request locale.
2. **Cache keys (load-bearing):** thread locale into BOTH `computeCacheKey` (cache.ts) and `keyOf` (daily-note-cache.ts), or cross-locale cache poisoning. Flip the cache test to the strong form (two requests differing only in `X-Locale` → **different** keys).
3. **Client:** fill the non-en `voice/*.json` (grade labels / blocker copy).
4. **Guard flip:** `voice.*` keys must now exist in ALL 5 locales (was en-only; absence is now the failure). Keep `onboarding:subhead` as the separate CHROME 4.3-framing exception (unchanged).

**Out of scope:** the 31 unwired status-line/empty-state strings (deferred — see §7); merging server↔client blocker phrasing (three independent surfaces, reconciled via termbase only); any change to the response/output SHAPE (only string *values* change per locale — the mobile decoder treats a shape parse-failure as fatal).

---

## 2. Localization mechanism — leaf `Record<Locale, string>`

The dictionaries are rich keyed objects carrying selection/merge logic (polarity, activity-overrides, horizon_class, variant pools, `pending_astrologer_ruling`). Per-locale *files* or JSON-by-ID would shred that. **Decision: the user-facing leaf string field becomes `Record<Locale, string>`** (a `Localized<string>` alias in `types.ts`). The deep-merge and selection logic stays **locale-agnostic**; resolve `[locale]` exactly once at the end of each terminal function (`translateFactor`, `translateExcludedReason`, `pickTagline`, `synthesizeHeadline`, picker `finalize`, `getSeverityHint`). `pending_astrologer_ruling` and other structural metadata stay at the entry level, *above* the localized leaf, so a locale's pending string re-translates independently.

`Locale = 'en' | 'de' | 'fr' | 'es-419' | 'pt-BR'`. Routes resolve `X-Locale → Locale (default 'en')` **once** at the top and thread a **non-optional** `Locale` downward (an `'en'`-default-per-signature invites a silently-English branch).

---

## 3. Task 0 — the locale-threading spine (sequential; RESERVED owner diff-review)

This is the cross-locale-poisoning correctness boundary — same weight as the A2 worker seam. It lands first, reviewed, before any dictionary translation.

- **Routes:** `search.ts` capture locale → thread into `searchCore` → `computeCacheKey` + `translate(upstream, activity, locale)`. `daily-note.ts` capture locale → thread into the `DailyNoteCacheKey` + `synthesizeDailyNote` + `composeDisplayable`.
- **Composer fan-out** (every signature gains `Locale`): `translate`, `translateFactor`, `translateExcludedReason`, `translateExcluded`, `pickTagline`, `contextualTag`, `synthesizeHeadline`, `synthesizeDailyNote`, picker (`pickClosedEntry`/`pickByDominantFactor`/`useFallback`/`finalize`), `composeDisplayable`, `getSeverityHint`.
- **Both cache keys (same change-set):** `computeCacheKey` → locale in the prefix segment (`search:v1:t${V}:${locale}:`); `keyOf` + `DailyNoteCacheKey` → appended `:${locale}` segment + thread `locale` into the `cacheKey` object at `daily-note.ts`. Bump `TRANSLATIONS_VERSION` and `LIBRARY_VERSION`.
- **Strong-form cache test:** locale-A vs locale-B (same everything else) → **different** keys, on BOTH search and daily-note. (Inverts the CHROME-phase "identical keys" guard.)
- A `resolveLocale(raw): Locale` helper in `lib/locale.ts` (default `'en'`), imported by both routes.

Task 0 lands with the dictionaries still English (every leaf `Record` initially holds `{ en: <existing>, de: en, fr: en, es-419: en, pt-BR: en }` or resolves with an en fallback) so the spine is correct and green before translation fills the locales.

---

## 4. Char budgets — CARD-bound (hard) vs SCREEN-bound (soft)

Char-budget approach **(A): fit existing budgets, server-only.** But the protection differs by render surface, and the trace corrected a common assumption:

### Card-bound — overflow CANNOT ship (fixed shareable image, no wrap/scroll rescue)
- **The window headline** (`MomentCard.js:36`, `vm.headline` = `displayable.headline`) renders on the fixed 360×640 / 360×360 share image with **no `numberOfLines`**. Its source is the **synthesizer**: `HEADLINES` (10), `GENERIC_HEADLINE_STEMS` (4), `NO_VIABLE_HEADLINES` (4). **It currently has NO char budget.** German overflow here breaks the shareable image.
- **The tier phrase** (`MomentCard.js:38`, client `voice/card.json` TIER_PHRASES, 4) — short, in a pill; card-bound.
- **`intentText`** is CHROME (activity label) — already localized.

**Treatment (non-negotiable card correctness):** add an explicit char/line budget for the window headline derived from the card's capacity (26px display-italic / 360px width / centered, ~2 lines max), enforced as a test for **all 5 locales**. German window-headlines MUST fit. Irreducible German card-bound strings are resolved **before launch** by: concise rewrite, OR holding that specific string English, OR (out-of-scope here) a card auto-shrink affordance. **NOT** deferred to the layout pass. If MANY card-bound strings prove irreducible (not just a few), that is the signal to revisit toward approach (C) — start with (A).

### Screen-bound — overflow degrades gracefully (wraps/scrolls) → softer layout-pass item
- Daily-note `headline ≤48` / `supporting_line ≤140` (`DailyNoteBody`, Today hero — wraps within `max-w 300/318`).
- `severity_hint ≤150` (screen).
- Factor `phrase_full`, excluded-reason phrases (MomentDetail — scrolls).

**Treatment:** the existing 48/140/150 budget gate **runs on all 5 locales** (it is the layout protection AND the German-overflow detector — do NOT scope it to en). Overflow on these is a soft German-layout-pass item, not a launch blocker. Screen-only strings need NOT be contorted down to 48/140 if a faithful translation fits comfortably — don't compress for its own sake.

### lint split (resolves the en-only confusion)
- **Language-content checks** (forbidden-word list, forbidden-horizon, English `.includes()`, 3-day rule in `lint.ts`): run on **en source ONLY** — meaningless on translated copy.
- **Structural / char-budget checks**: run on **ALL locales** — this is the layout gate and the overflow detector.

---

## 5. Grammar hazards — re-architected, NOT per-string translated

1. **`GENERIC_HEADLINE_STEMS`** (`headlines.ts:56-61`): `` `A tender day — ${lowerFirst(lead)}.` `` embeds a translated `phrase_short` mid-sentence with English `lowerFirst` lowercasing + em-dash frame. **Kill `lowerFirst`** — German nouns stay capitalized (same class as the date-lowercase bug). Make each stem a **locale-authored template** with an interpolation slot, per locale, not an English string + interpolation.
2. **`contextualTag`** (`translate.ts:128-136`): builds English literals by hour band inline. Move into the locale dictionary.
3. **`status-lines.ts` `{activity_noun}` casing**: deferred scaffolding (§7) — not touched this phase; note the `.toLowerCase()` hazard for when the saved-search fan-out lands.

---

## 6. Ruling-pending strings — provisional, per-locale markers

7 string-groups have provisional English (`pending_astrologer_ruling: true` already typed): `mercury_combust` / `mars_retrograde` / `jupiter_retrograde` (excluded-reasons), `closed-mercury-retrograde` / `closed-venus-retrograde` (daily-notes), `closed-mercury-retrograde-vague` (fallbacks), 4× `moon_voc_intraday` (severity-hints). Translate **provisionally** to match the current English; carry the `pending_astrologer_ruling` flag at the entry level (above the localized leaf) so **only those** re-translate if the English ruling changes. `moon_voc_intraday` are runtime-hidden today — translate speculatively (cheap, keeps the set complete).

---

## 7. Deferred — named, non-growable exemption set

The 31 unwired **status-lines (27) + empty-state (4)** strings are dead scaffolding for the unbuilt saved-search fan-out (no live route imports them). **Do NOT translate them.** Express as a SPECIFIC NAMED SET (like the length-1 `onboarding:subhead` allowlist) in the coverage guard — `VOICE_DEFERRED = { 'status-lines', 'empty-state' }` — tied to a code comment: **"translate when the saved-search fan-out ships."** The guard asserts the set's membership is exactly these two sources so it can't silently grow or be forgotten.

---

## 8. Permissive-enum fallback strings — localize

3 English fallback strings surface verbatim on upstream enum-drift (a recurring event): `FALLBACK_REASON_PHRASE` and `FALLBACK_FACTOR_PHRASING.{phrase_short,phrase_full}` (`translate.ts:18-22`). Localize to `Record<Locale,string>` — they are the only guaranteed-rendered string for an unknown id; leaving them English means a non-en user sees English on every drift event.

---

## 9. Guard flip + quality

- **Coverage guard flip:** `voice.*` keys must exist in ALL 5 locales (was en-only). `onboarding:subhead` stays the CHROME 4.3 exception (unchanged). Server-side: a test asserts every localized leaf `Record` has all 5 locale keys (no missing locale).
- **Glossary-guided translation:** feed the per-locale termbase (pt-BR *Lua Fora de Curso*, *Combustão*, retrograde forms, etc.) as constraints to every dictionary translation — the main quality lever without astrology-literate review. Mark traditional terms for the (best-effort community) review.
- **Server↔client blocker copy:** three independent surfaces — server `excluded-reasons` (11), client `reason.json` (22), client `calendar.json` (2). Reconcile renderings via the shared termbase, NOT a code merge (different shapes).

---

## 10. Volume & partition

| Unit | Strings/locale | Notes |
|---|---|---|
| factors.ts | 90 | largest; 15 IDs × 3 polarity × 2 |
| daily-notes.ts | 42 | 21 × {headline, supporting} |
| daily-note-variants.ts | 36 | variant pools |
| activity-overrides (4 files) | 36 | 6/12/10/8 |
| severity-hints.ts | 16 | ≤150 budget; 4 pending |
| excluded-reasons.ts | 11 | 3 pending |
| headlines.ts (HEADLINES+stems+no-viable) | 18 | **card-bound** |
| daily-note-fallbacks + contextualTag + enum-fallbacks | ~14 | |
| **server live total** | **~260** | |
| client `voice/*.json` × 4 locales | 41/locale | reason 22, moment 10, card 4, calendar 2, moments 3 |
| **deferred (status-lines+empty-state)** | 31 | NOT translated |

Partition: **Task 0 spine first (sequential, reserved review)** → then dictionaries parallel by file (factors / daily-notes / variants / overrides / severity / excluded-reasons / headlines+fallbacks) + client voice fill (parallel) → guard flip + per-locale char-budget tests. `types.ts` / `index.ts` (version bumps) / both cache files are SHARED RESOURCES in Task 0.

---

## 11. Delivery

Extend `i18n-chrome`; TDD; full suite + tsc green both packages; nothing ships until launch. Card-bound budget correctness is a launch gate; screen-bound overflow folds into the German layout pass.

**DEPLOY NOTE (record on the Worker-prod deploy gate, for the accumulated undeployed Worker set):** bumping `TRANSLATIONS_VERSION` + `LIBRARY_VERSION` places a new version in the cache-key prefix → **invalidates the ENTIRE existing KV cache** → cold-start on first prod deploy (compute + an upstream astrology-api.io request spike as the cache refills). Not a plan issue; sequence/announce the deploy accordingly and check upstream-quota / cap-metrics headroom for the refill spike.
