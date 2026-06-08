# Domain Audit — CHROME i18n + locale plumbing (Inceptio)

**Phase:** Compound V Phase 1B (domain-expert pre-flight)
**Spec:** `docs/superpowers/specs/2026-06-08-i18n-chrome-design.md`
**Date:** 2026-06-08
**Advisor scope:** DOMAIN reality (BCP-47/locale conventions, es-419/pt-BR translation conventions,
App-Store-4.3-under-localization, Intl/CLDR plural reality, traditional-astrology termbase).
NOT code-archaeology (1A) and NOT library-API-currency (1C) — those are separate passes; where this
audit touches Hermes/`Intl` it does so for **domain correctness**, flagged for 1C to confirm versions.

---

## 1. Domain(s) Identified

1. **i18n-localization** (primary) — BCP-47 tag handling, es-419/pt-BR/de/fr conventions, Intl/CLDR
   plural reality on Hermes/RN. New KB file created: `_knowledge-base/i18n-localization.md`.
2. **astrology-electional** (secondary) — the §7 termbase deliverable + 4.3 framing of onboarding L38.
   Reused existing KB `_knowledge-base/astrology-electional.md`.

---

## 2. Sources Consulted

**KB reused:** `_knowledge-base/astrology-electional.md` (2026-06-02 → 2026-06-06 passes — 4.3 posture,
forbidden-word list, traditional VOC/combust severity). **KB created:** `_knowledge-base/i18n-localization.md`.

**In-repo ground truth verified this pass:**
- `apps/mobile/package.json` — Expo `~55.0.0`; **`expo-localization` is NOT installed** (spec assumes it);
  no `i18next`/`react-i18next` present.
- `apps/mobile/src/lib/card/card-strings.ts` — confirmed `t(key)` seam shape (matches spec §5).
- `apps/mobile/src/lib/format-window.ts:39`, `apps/mobile/src/lib/cluster-windows.ts:56,61` — **module-level
  `new Intl.DateTimeFormat('en-US', …)` constants** (the Rule-2 trap, see §4).
- `apps/mobile/src/lib/format-date.ts:17` — `Intl.DateTimeFormat('en-US', …)`.

**Web searches (3 layers, parallel):** Expo getLocales tag semantics; i18next es-419 resolution / fallback /
`nonExplicitSupportedLngs` / `convertDetectedLanguage`; es-419-vs-es-ES vocab+voseo; pt-BR-vs-pt-PT;
CLDR plural categories (fr 0=one); App-Store-4.3 fortune-telling; Google Play astrology policy 2026; German
du/Sie premium tone; Hermes `Intl.PluralRules`/`DateTimeFormat` support; iOS-vs-Android es-419 device tag;
multilingual traditional-astrology glossaries. URLs in the KB file's source list.

**Authoritative primary links:**
[Expo Localization](https://docs.expo.dev/versions/latest/sdk/localization/) ·
[i18next config](https://www.i18next.com/overview/configuration-options) ·
[hermes#776](https://github.com/facebook/hermes/issues/776) ·
[CLDR plural rules](https://cldr.unicode.org/index/cldr-spec/plural-rules) ·
[Apple 4.3 / iMore](https://www.imore.com/apple-rejects-developers-horoscope-app-says-app-store-has-enough)

---

## 3. Domain Constraints the Brainstorm Probably Missed (MUST / MUST NOT / SHOULD)

### Detection / tag handling (spec §4)

- **MUST normalize on the primary language subtag (`languageCode`), not on `languageTag` string-stripping.**
  The spec's pseudocode does `primary = lowercase(language subtag)` — correct in intent — but should read
  `expo-localization`'s `deviceLocale.languageCode` directly (it already strips region), NOT hand-split
  `languageTag`. Hand-splitting `pt-Latn-BR` (script subtag) or `zh-Hant` on `'-'` breaks; `languageCode`
  is script/region-safe. [Expo Localization](https://docs.expo.dev/versions/latest/sdk/localization/).

- **MUST handle the device reporting `es-419` itself**, not only country tags. iOS returns `es-419` as the
  `languageTag` when the user picks "Español (Latinoamérica)"
  ([Apple forum](https://developer.apple.com/forums/thread/733906)). The spec's §4 problem statement says
  "devices report **country tags** (`es-MX`, …)" — true on Android, **incomplete**: iOS can report the
  variant tag directly. The algorithm survives this only because it keys on `primary == 'es'`; but the
  **detection unit tests (§11) MUST add `es-419` and `pt-BR` as device-reported inputs**, not just country
  tags, or the iOS path is untested. (Spec §11 lists `es-MX/es-AR/es-ES`, `pt-PT/pt-BR` — `es-419` as *input*
  is missing.)

- **SHOULD bypass i18next's own language matching entirely.** Because `supportedLngs` holds *only* variant
  tags (`es-419`, `pt-BR`) and no bare `es`/`pt`, i18next's region→base resolution is a known foot-gun
  ([i18next#2354](https://github.com/i18next/i18next/issues/2354), [#1505](https://github.com/i18next/i18next/issues/1505)).
  The spec's explicit-normalization decision is correct — make it load-bearing: resolve the device tag to one
  of the 5 bundle keys **in app code**, then `i18n.changeLanguage(resolvedKey)`. Do not rely on
  `nonExplicitSupportedLngs`/`load:'languageOnly'` to do it (they won't, for variant-only `supportedLngs`).

### Intl / plural / formatting reality (spec §6) — the biggest gap

- **MUST confirm `Intl.PluralRules` exists at runtime and ship `@formatjs/intl-pluralrules` (force entry).**
  The spec's §6 plural strategy and §4 "Provides … `Intl.PluralRules`-category plurals" assume a working
  `Intl.PluralRules`. **Hermes has historically not shipped `Intl.PluralRules`**, and i18next v21+ makes the
  Intl API mandatory with no internal fallback ([i18next FAQ/migration](https://www.i18next.com/misc/migration-guide),
  [FormatJS intl-pluralrules](https://formatjs.github.io/docs/polyfills/intl-pluralrules/),
  [react-i18next#1628](https://github.com/i18next/react-i18next/issues/1628)). If absent on the target Hermes,
  **every plural key silently mis-pluralizes or i18next falls to its compat-v3 path**. This is a hard
  dependency the spec never names. → **1C must verify** whether RN 0.83/Hermes on the target build exposes
  `Intl.PluralRules`; if not, polyfill is mandatory (import `/polyfill-force`, not the conditional entry —
  the detector is pathologically slow on Android per FormatJS).

- **MUST fix the module-load-time formatter trap (in-repo, confirmed).** `format-window.ts:39`,
  `cluster-windows.ts:56,61`, `format-date.ts:17` build `new Intl.DateTimeFormat('en-US', …)` as **module
  constants**. Even after §6 "stops hardcoding `'en-US'`," a module-scope formatter is locked at import time
  and won't reflect the resolved locale. **These must become per-call (or locale-keyed-memoized) formatters
  that take the resolved locale as an argument.** A find-and-replace of the locale string is insufficient.

- **MUST decide the `Intl` locale argument separately from the resource-bundle key.** `es-419` is a fine
  i18next *resource key* but a questionable *`Intl` argument* — Hermes delegates to OS ICU, and M49 region
  data (`419`) may be absent → `Intl.PluralRules('es-419')` / `DateTimeFormat('es-419')` can throw or
  silently fall back. **Use `'es'` (or the device's real country tag for formatting) as the `Intl` argument
  while keeping `es-419` as the bundle key.** Same for `pt-BR` → `'pt'`/`'pt-BR'` (pt-BR is well-supported;
  es-419 is the risky one). The spec's §6 conflates "resolved locale" as one value; it is two.

- **SHOULD make format golden-snapshots tolerant.** Hermes `Intl` output is the **device OS's ICU** output,
  which varies by OS version ([hermes#776](https://github.com/facebook/hermes/issues/776)). Byte-exact
  snapshots (spec §11 "Format snapshots … per locale") will be flaky CI-vs-device. Assert separators/order/
  category, not exact glyphs (e.g. assert comma-decimal + 24h shape, not `"14:30"` literal).

### Translation conventions (spec §10)

- **MUST treat es-419 as a register decision, not a neutral default.** "One es-419 file for all Latam" is the
  standard compromise but requires the translator to **avoid 2nd-person-singular verb forms** so voseo
  (Argentina/Uruguay: *vos*) and tuteo (Mexico/most: *tú*) both read naturally — prefer infinitive/imperative/
  impersonal constructions ("Buscar el mejor momento", not "Elige tu momento")
  ([Localizely es-419](https://localizely.com/locale-code/es-419/), [Quora es-419 guidelines](https://www.quora.com/What-are-the-guidelines-that-would-make-a-translated-text-LatAm-Spanish-es-419-as-opposed-to-plain-Spanish-es-or-a-country-specific-Spanish-es-XX)).
  This is a **translator brief item**, not a code constraint — but the plan's §10 "native review" gate must
  explicitly call for voseo-neutral register, or an MT draft will pick *tú* and read regional.

- **MUST prevent MT drift to es-ES / pt-PT.** es-419 must not carry *ordenador*/*vosotros* (Spain); pt-BR must
  use *você* and Brazilian verb forms, not pt-PT *tu*/clitic placement
  ([Labcodes](https://labcodes.com.br/blog/en-us/development/why-internationalization-and-localization-matters/),
  [ipfs/i18n#7](https://github.com/ipfs/i18n/issues/7)). The §10 native-reviewer brief MUST name the *exclusion*
  (reject European-variant vocabulary), not just "sanity-check."

- **SHOULD lock the German formality register (du vs Sie) up front as a brand decision.** German has no
  neutral 2nd-person; every CTA picks one. Premium/dignified positioning historically leans *Sie*, but
  consumer-app/lifestyle convention increasingly uses *du*; it is a **branding choice that must be decided
  before translation, not per-string** ([Kwintessential DE](https://www.kwintessential.co.uk/blog/german-game-app-localisation),
  [The Local du/Sie](https://www.thelocal.de/20220330/german-word-of-the-day-duzen-siezen)). French has the
  same tu/vous fork. → **Open question for the human (§8).**

- **SHOULD budget for de/fr string expansion.** German runs ~30% longer than English; the calm, spacious
  Mystical-Premium layout (single-line nav, hero numbers, card chrome) is the kind that breaks on German
  compounds. Layout/truncation review is part of "before launch," not after.

### Astrology termbase (spec §7)

- **MUST pre-seed the termbase with the conventional traditional rendering per locale**, not leave it to a
  generalist MT pass. Established renderings exist: PT *Lua Fora de Curso* (void of course), *Combustão*
  (combust), *Dignidade* (dignified); ES *retrógrado*, *exaltación*, the horary glossary tradition; DE/FR
  classical glossaries ([ES horary glossary](https://www.angelfire.com/ct/AnthonyLouis/glosesp.html),
  [PT combustão](https://www.astrolink.com.br/artigo/combustao), [DE classical dignities](https://www.astro.com/astrologie/in_classical_g.htm),
  [FR thésaurus astrologie](https://fr.wiktionary.org/wiki/Th%C3%A9saurus:astrologie/fran%C3%A7ais)). A
  generalist will calque "void of course" literally and produce a phrase a practitioner reads as wrong.
  Termbase review needs someone who **reads astrology** in each language — this is the chrome→VOICE bridge
  and should be scoped now even though VOICE copy is deferred.

---

## 4. Common Traps in This Domain

1. **The "es-MX falls to English" trap** — the spec correctly identifies and guards this (§4). Keep the guard;
   it's the single most important detection correctness property. Add the **iOS `es-419`-as-input** case to tests.
2. **Module-scope `Intl` formatter** — confirmed live in 3 files (§3). A string swap won't fix it.
3. **`Intl.PluralRules` missing on Hermes** — silent mis-pluralization; the spec assumes it exists.
4. **`Intl` argument `es-419` unsupported by OS ICU** — throw-or-silent-fallback; decouple bundle key from
   Intl locale.
5. **French `_one` must read for `0`** — `0 jour` is category `one`, not `other`. Any "X days ago"/"{count}
   viable windows" key whose `fr` `_one` form is written assuming `0` → `_other` will print "il y a 0 jours"
   (wrong) ([CLDR](https://cldr.unicode.org/index/cldr-spec/plural-rules)). Test the **zero case explicitly**
   in fr.
6. **es/pt `many` category** — `Intl.PluralRules('es'|'pt')` emits `many` for compact/large numbers; if a key
   omits the `_many` form it falls to `_other` (usually fine for small UI counts, but verify the resolver
   doesn't warn).
7. **Flaky format snapshots** — OS-ICU-dependent output; byte-exact assertions break across CI/device/OS.
8. **MT register drift** — es-ES vocab in es-419; pt-PT verbs in pt-BR; tú-instead-of-neutral; wrong du/Sie.
9. **Onboarding L38 4.3 wording drift under translation** — a target-language calque of "reads the sky" can
   land closer to *adivinación*/*Wahrsagerei*/*divination* (fortune-telling) than the intended
   timing-helper framing (§5).

---

## 5. Regulatory / Compliance Notes

- **App Store Guideline 4.3 (spam, saturated "fortune-telling" category)** is content-based and applies across
  **all** localizations of the binary + metadata; it does not reset but **expands** with each localized store
  listing a reviewer can read ([iMore](https://www.imore.com/apple-rejects-developers-horoscope-app-says-app-store-has-enough),
  [molfar.io](https://www.molfar.io/blog/apple-review), [Quora 4.3 fortune-telling](https://www.quora.com/My-app-got-rejected-by-the-App-Store-due-to-4-3-Spam-primary-function-of-fortune-telling-What-should-I-do-next-to-surpass-the-review)).
  The spec's §8 "translate L38 last, after positioning/4.3 framing is confirmed" is the right instinct.
  Constraint to add: **the per-locale L38 translation MUST preserve the *electional-timing-helper* framing and
  MUST NOT drift toward divination/fortune wording** (es *adivinación*/*vidente*, pt *adivinhação*, de
  *Wahrsagerei*, fr *divination*/*voyance*). The CLAUDE.md forbidden-word list needs **per-locale equivalents**
  so MT doesn't reintroduce a banned concept in translation (carries the 2026-06-06 KB Rule-1/4 posture into
  l10n).
- **Google Play:** astrology/horoscope apps are permitted and broadly localized; the April-15-2026 policy
  update did not surface astrology-specific restrictions in this search ([Play policy 2026](https://support.google.com/googleplay/android-developer/answer/16926792?hl=en)).
  *Isolated/under-determined:* no specific evidence found of a locale that *more heavily* regulates astrology
  content-rating at the store level — **flagged as not-found, not as "clear."** If France/Germany consumer-
  protection framing matters, that's a legal question outside this audit's evidence (→ §8).
- **No new PII/consent surface** introduced by CHROME i18n (device-locale read only, no account) — consistent
  with CLAUDE.md device-only identity. The `X-Locale` header is request-meta, not PII.

---

## 6. Recent Breaking Changes (last 12 months)

- **i18next made the `Intl` API mandatory** (v21+) — no internal plural fallback; `Intl.PluralRules` must
  exist or you get the compat-v3 path with a warning ([migration guide](https://www.i18next.com/misc/migration-guide),
  [react-i18next#1628](https://github.com/i18next/react-i18next/issues/1628)). Directly affects the spec's
  plural strategy. → **1C: confirm the chosen react-i18next major and its Intl expectation against Hermes.**
- **Expo `getLocales()` locale-object shape** is the current API (`languageTag`/`languageCode`/`regionCode` +
  `decimalSeparator`/`measurementSystem`/etc.) ([Expo docs](https://docs.expo.dev/versions/latest/sdk/localization/)).
  Note: `getLocales()[0].decimalSeparator`/`digitGroupingSeparator` are available **directly from the OS** —
  a cheaper source of truth for number formatting than constructing `Intl.NumberFormat` if Hermes ICU is
  thin. Worth considering in §6.
- **Google Play policy refresh April 15 2026** (30-day compliance window) — no astrology-specific item found,
  but the plan author should not assume the store-listing review is a no-op for a localized astrology app.
- Astrology-API upstream enum drift (`good`, `mercury_combust`, `mars_retrograde`, `jupiter_retrograde`) — out
  of scope for CHROME (server VOICE), noted only because the termbase (§7) must eventually cover the new
  reason_ids in each locale during the VOICE pass.

---

## 7. Design Constraints for the Plan (non-negotiable)

The plan author should treat these as MUSTs:

1. **Detection keys on `expo-localization` `languageCode`** (the OS-stripped primary subtag), not on
   string-splitting `languageTag`. Install `expo-localization` (not currently in `package.json`).
2. **Detection tests include `es-419` and `pt-BR` as *device-reported inputs*** (iOS path), in addition to the
   country tags already listed in §11.
3. **Resolve device tag → bundle key in app code, then `changeLanguage`** — do not delegate variant-tag
   matching to i18next's `supportedLngs`/`nonExplicitSupportedLngs`.
4. **`Intl.PluralRules` availability is a hard dependency** — verify on target Hermes; if absent, ship
   `@formatjs/intl-pluralrules` via the **force** entry. (Hand to 1C to confirm; treat polyfill as default-on
   until proven unnecessary.)
5. **The `Intl` locale argument is derived separately from the resource-bundle key.** Bundle `es-419`/`pt-BR`;
   `Intl` locale `es`/`pt` (or device country tag for formatting). Never pass `es-419` straight to
   `Intl.PluralRules`/`Intl.DateTimeFormat` without a fallback.
6. **No module-scope `Intl` formatters.** Convert `format-window.ts:39`, `cluster-windows.ts:56,61`,
   `format-date.ts:17` to per-call/locale-memoized formatters taking the resolved locale.
7. **Plural keys must define the `fr` `_one` form to read correctly for `0`**, and the test suite asserts the
   zero case in French.
8. **Format snapshots assert structure (separators/order/24h/comma-decimal), not byte-exact glyphs.**
9. **Translator brief (the §10 native-review gate) must specify, per locale:** (a) es-419 voseo-neutral
   register, no 2nd-person-singular verbs, no es-ES vocab; (b) pt-BR *você* + Brazilian forms, no pt-PT drift;
   (c) the chosen German du/Sie and French tu/vous register (see §8); (d) reject any drift of L38 toward
   divination/fortune wording.
10. **Termbase pre-seeded with conventional traditional-astrology renderings per locale**, reviewed by a
    locale-literate astrology reader, not a generalist MT pass.
11. **L38 translated last, framing-locked, 4.3-safe per locale** — preserve electional-timing-helper meaning;
    forbidden-word list extended with per-locale equivalents.

---

## 8. Open Questions for the Human (product/brand decisions)

1. **German register: du or Sie? French: tu or vous?** This is a brand/positioning decision that gates all
   de/fr translation and cannot be made per-string. Mystical-Premium "dignified friend" voice could go either
   way (Sie = dignified/premium; du = warm/intimate — both defensible). **Product must rule before translation
   starts.**
2. **es-419 neutral, or country-split later?** The plan ships one neutral es-419. Confirm Spain (`es-ES`) and
   Portugal (`pt-PT`) users receiving the Latam/Brazil variant is acceptable for MVP (spec §4 says yes;
   confirm it's a conscious product call, given premium positioning in those markets if they're ever targeted).
3. **Is a locale-literate astrology reviewer available for the termbase** (separate from the English astrologer
   review already budgeted), or does termbase review fold into the per-locale native-translator review? Affects
   §7/§10 resourcing.
4. **Store-listing localization scope:** are localized App Store / Play *listings* (description, keywords) in
   scope for these markets, or only in-app chrome? Localized *listings* re-open 4.3 review surface (§5) and are
   a separate copy/legal review — not covered by this spec, which is in-app chrome only.

---

## 9. Knowledge Base Updates

- **Created** `_knowledge-base/i18n-localization.md` with 11 reusable rules (Hermes OS-delegated Intl;
  module-load formatter trap; M49 sibling-tag normalization; resource-key vs Intl-arg decoupling; i18next
  region→base config; CLDR plural traps incl. fr-0=one; es-419 voseo register; pt-BR vs pt-PT; de/fr/es/pt
  formatting conventions; 4.3-under-localization; per-locale traditional-astrology lexicon). Fully sourced.
- **`_knowledge-base/astrology-electional.md`** — no edits needed; the 4.3 posture and forbidden-word findings
  it already holds are cited and reused here. (Per append-only policy, nothing struck.)

---

## Disclosures / honest gaps

- **Hermes `Intl.PluralRules` status on this exact RN 0.83 build is NOT confirmed** by this pass — the most
  authoritative source found (the Hermes Intl writeup) is dated 2022. The *domain risk* is real and the
  default-on-polyfill recommendation is safe; **1C should confirm the precise runtime behavior** before the
  plan removes the polyfill. Flagged rather than asserted.
- **No evidence found** of a specific market that regulates astrology *content-rating* more heavily at the
  store level (§5) — reported as not-found, not as "clear."
- Multilingual astrology glossary citations are **dictionary/practitioner-blog level**, sufficient to prove the
  conventions *exist* and differ from a literal calque; the *authoritative per-term rendering* is the
  locale-literate reviewer's call (§8 Q3), not this audit's.
