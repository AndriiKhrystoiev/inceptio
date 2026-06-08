# i18n / Localization Knowledge Base

Maintained by Compound V Phase 1B advisor. Append at the bottom on each pass.

---

## Updated 2026-06-08 — RN/Expo CHROME localization (es-419/pt-BR/de/fr) — Inceptio i18n chrome pass

Generalized from the Inceptio CHROME i18n spec (`docs/superpowers/specs/2026-06-08-i18n-chrome-design.md`).
Reusable for any Expo/Hermes app localizing into Latin-variant tags with `Intl`-driven formatting.

### Rule 1 — `Intl` in Hermes is OS-delegated, not self-contained. Locale data is the *device's*, not bundled.

Hermes implements `Intl.DateTimeFormat` / `Intl.NumberFormat` by calling the **underlying OS's ICU**, not a
bundled CLDR dataset ([facebook/hermes#776](https://github.com/facebook/hermes/issues/776), [Hermes Intl writeup](https://medium.com/@iROOMitEng/hermes-intl-support-in-react-native-on-ios-134b487bcce7)).
Consequences that bite every multi-locale RN app:

- **`Intl.PluralRules` is the weak link.** Historically absent from Hermes; even where present, it is the
  most commonly-missing/needs-polyfill `Intl` constructor ([FormatJS intl-pluralrules](https://formatjs.github.io/docs/polyfills/intl-pluralrules/)).
  Any plural-key strategy MUST verify `typeof Intl.PluralRules === 'function'` on the **oldest supported
  device of each target OS**, and ship `@formatjs/intl-pluralrules` (use `/polyfill-force`, not the
  conditional entry — the detection path is pathologically slow on Android).
- **Output is device-dependent.** The same `Intl.DateTimeFormat('de', …)` can format differently across
  OS/ICU versions. **Golden snapshots must be tolerant** (assert structure/separators, not byte-equality) or
  they break across CI vs device.
- **Old Android (API ≤ 23) ignores the options object** for `DateTimeFormat` ([hermes#776](https://github.com/facebook/hermes/issues/776)).
  Decide a minSdk floor or polyfill-force universally.

### Rule 2 — Module-load-time `new Intl.*()` constants capture the WRONG locale.

A formatter built as a module-level `const FMT = new Intl.DateTimeFormat('en-US', …)` is locked at import
time — before locale resolution runs and immune to later locale changes. **Locale-sensitive formatters must
be created per-call (or memoized keyed by resolved locale), passing the resolved locale explicitly.** Never
hardcode `'en-US'`, never build the formatter at module scope.

### Rule 3 — UN M49 region tags (`es-419`) are siblings of country tags, not parents. Detection must normalize on the *primary subtag*, never exact-match.

- `es-419` (Latin America, UN M49) and `es-MX` are **sibling** tags; `es-MX` does NOT exact-match `es-419`,
  and strip-to-region yields bare `es`. If `supportedLngs` holds the *variant* (`es-419`) but the device
  reports a *country* (`es-MX`/`es-AR`) or bare `es`, naive matching falls through to fallback (English).
- **Devices report inconsistently:** iOS returns `es-419` directly when the user picks "Español
  (Latinoamérica)" ([Apple forum](https://developer.apple.com/forums/thread/733906)), but returns
  `es-MX`/`es-AR` for country settings; Android typically reports country tags (`es-MX`, `es-US`) and stores
  resources under `values-b+es+419`. **Detection must handle BOTH** the variant tag and the country tag for
  the same target bundle.
- **Correct normalization:** map on `languageCode` (the primary subtag), e.g. *any* `es-*` (and bare `es`,
  and `es-419`) → your `es-419` bundle. `expo-localization.getLocales()` gives `languageCode` (no region),
  `languageTag` (full BCP-47), `regionCode` separately ([Expo Localization docs](https://docs.expo.dev/versions/latest/sdk/localization/)) — prefer `languageCode` for the
  language decision; use `regionCode` only if you later split by country.

### Rule 4 — The resource-bundle key and the `Intl` locale argument are DIFFERENT identifiers. Decouple them.

`es-419` / `pt-BR` are fine as i18next **resource keys** (i18next treats the key as an opaque label).
But `es-419` is a *questionable `Intl` argument* on OS ICU that lacks M49 data — it may throw on strict
engines or silently fall back. **Pattern:** resource bundle keyed `es-419`, but derive the `Intl` locale
separately (`'es'` for PluralRules/DateTimeFormat where `es-419` is unsupported, or `'es-MX'`/the device's
real country tag for *formatting* so the user gets local conventions). The i18next plural-suffix resolution
and the `Intl` formatting locale need not be the same string.

### Rule 5 — i18next region→base fallback is NOT automatic; configure it explicitly.

i18next does **not** auto-fall `es-MX` → `es` unless told. Levers ([i18next config](https://www.i18next.com/overview/configuration-options),
[#2354](https://github.com/i18next/i18next/issues/2354), [#1505](https://github.com/i18next/i18next/issues/1505)):
`nonExplicitSupportedLngs: true` (treat variants as supported when base is), `load: 'languageOnly'` (strip
region), and `convertDetectedLanguage` (the reliable hook to canonicalize a detected tag before core logic).
For an app with *only* variant tags in `supportedLngs` (`es-419`, `pt-BR`) and no bare `es`/`pt`, the safest
design is **explicit resolution upstream of i18next** (resolve device tag → one of N bundle keys yourself,
then `i18n.changeLanguage(resolvedKey)`), bypassing i18next's matching ambiguity entirely.

### Rule 6 — CLDR plural-category traps per locale.

| Locale | Intl locale to use | Plural categories | Trap |
|---|---|---|---|
| en | `en` | one, other | none |
| de | `de` | one, other | none, but compound nouns inflate string length ~30% |
| **fr** | `fr` | **one, other** | **`0` is category `one`** ("0 jour", "1 jour", "2 jours") — the `_one` form must read correctly for zero ([CLDR](https://cldr.unicode.org/index/cldr-spec/plural-rules), [intlpull CLDR 2026](https://intlpull.com/blog/cldr-plural-rules-complete-guide-2026)) |
| es-419 | `es` | one, **many**, other | `many` exists in CLDR for compact/large numbers; UI count strings rarely hit it but PluralRules will emit it |
| pt-BR | `pt` | one, **many**, other | same `many` caveat as es |

`Intl.PluralRules(locale).resolvedOptions().pluralCategories` is the ground-truth check per locale.

### Rule 7 — es-419 "neutral Latam" is a real product decision, not a free default. Voseo + vocab + formality split.

One `es-419` file for all of Latin America is the **industry-standard neutral-Spanish compromise**, but it
is a *compromise*, not correctness ([Localizely es-419](https://localizely.com/locale-code/es-419/),
[Quora es-419 guidelines](https://www.quora.com/What-are-the-guidelines-that-would-make-a-translated-text-LatAm-Spanish-es-419-as-opposed-to-plain-Spanish-es-or-a-country-specific-Spanish-es-XX)):

- **vs es-ES:** "computer" = *computadora* (Latam) vs *ordenador* (Spain); no *vosotros* (use *ustedes*);
  drop Spain-only vocab. Getting es-ES vocab into an es-419 file reads as foreign.
- **Within Latam:** *voseo* (Argentina/Uruguay/parts of Central America use *vos* + distinct conjugation)
  vs *tuteo* (*tú*, Mexico/most). Neutral Spanish **avoids 2nd-person-singular verb forms where possible**
  (use infinitives/imperatives/`usted`-neutral) so a Mexican and an Argentine both read it as natural.
  Practical UI guidance: prefer *"Elegí" / "Elige"*-free constructions — e.g. impersonal "Buscar el mejor
  momento" over "Elige tu momento." The register choice is a **translator** decision, must be consistent.

### Rule 8 — pt-BR vs pt-PT for chrome: você default, comma decimal, DD/MM, but verb forms diverge sharply.

pt-BR uses *você* (informal-but-not-intimate, near-universal for consumer apps) where pt-PT prefers *tu*/
*o senhor*; verb conjugations and clitic placement differ ([Labcodes i18n](https://labcodes.com.br/blog/en-us/development/why-internationalization-and-localization-matters/),
[ipfs/i18n#7](https://github.com/ipfs/i18n/issues/7)). Both pt variants share **comma decimal, dot thousands,
DD/MM/YYYY** ([Freeformatter Brazil](https://www.freeformatter.com/brazil-standards-code-snippets.html)) — so
number/date *formatting* via `Intl` with `'pt'`/`'pt-BR'` is safe, but *copy* written for pt-PT reads
distinctly wrong to a Brazilian. Don't let an MT engine drift to European Portuguese.

### Rule 9 — Formatting conventions to expect across de/fr/es-419/pt-BR (all differ from en-US).

- **Decimal separator:** comma for de, fr, es-419, pt-BR (dot is en-US only). `1,5 h` not `1.5 h`.
- **Time:** 24-hour is the norm for de/fr/pt-BR and common in es-419 (vs en-US 12h AM/PM). A hardcoded
  AM/PM time formatter is an en-US artifact.
- **Date order:** DD/MM (or D MMMM) for all four; never MM/DD.
- **Duration unit abbreviations** ("h"/"m"/"min") are NOT universal — German "Std."/"Min.", French "h"/"min".
  Duration-unit strings belong in the resource bundle, not hardcoded next to a number.

### Rule 10 — Localizing astrology claims *increases* App-Store 4.3 surface, doesn't reset it.

App Store Guideline 4.3 (spam / saturated "fortune-telling" category) is content-based, applied per
binary/metadata across **all** localizations ([iMore](https://www.imore.com/apple-rejects-developers-horoscope-app-says-app-store-has-enough),
[Quora 4.3 fortune-telling](https://www.quora.com/My-app-got-rejected-by-the-App-Store-due-to-4-3-Spam-primary-function-of-fortune-telling-What-should-I-do-next-to-surpass-the-review)).
Adding localized listings = more locale-specific store copy a reviewer can read as fortune-telling, and each
new-locale submission is a fresh review pass. The "reads the sky the way astrologers have…" hero claim must
be translated to preserve the *method/positioning* framing (electional **timing helper**), never drift toward
divination/fortune wording in the target language — the forbidden-word list (magic/destiny/fortune/stars-align/
manifest/energy/vibes/alignment/blessed; CLAUDE.md) needs **per-locale equivalents** so MT doesn't reintroduce
a banned concept under translation.

### Rule 11 — Traditional astrology terms have established renderings in es/pt/de/fr; do not let a generalist translator improvise.

There is a real traditional-astrology lexicon in each language (e.g. PT *Lua Fora de Curso* for "void of
course," *Combustão* for "combust," *Dignidade* for "dignified"; ES *retrógrado*, *exaltación*; established
FR/DE glossaries exist) ([Anthony Louis ES horary glossary](https://www.angelfire.com/ct/AnthonyLouis/glosesp.html),
[astrolink.com.br combustão](https://www.astrolink.com.br/artigo/combustao), [Astrodienst DE classical dignities](https://www.astro.com/astrologie/in_classical_g.htm),
[fr.wiktionary astrologie](https://fr.wiktionary.org/wiki/Th%C3%A9saurus:astrologie/fran%C3%A7ais)). A
generalist translator will calque these literally and produce a term a practitioner recognizes as wrong.
**Termbase must be pre-seeded with the conventional traditional rendering per locale** and reviewed by someone
who reads astrology in that language — bridging the chrome glossary into the later VOICE pass.

### Sources (this pass)

- Expo: [Localization docs](https://docs.expo.dev/versions/latest/sdk/localization/) (getLocales → languageTag/languageCode/regionCode).
- Hermes/Intl: [hermes#776](https://github.com/facebook/hermes/issues/776), [Hermes Intl writeup](https://medium.com/@iROOMitEng/hermes-intl-support-in-react-native-on-ios-134b487bcce7), [FormatJS intl-pluralrules](https://formatjs.github.io/docs/polyfills/intl-pluralrules/).
- i18next: [config options](https://www.i18next.com/overview/configuration-options), [#2354 region→base](https://github.com/i18next/i18next/issues/2354), [#1505 regional fallback](https://github.com/i18next/i18next/issues/1505), [plurals](https://www.i18next.com/translation-function/plurals).
- Tags: [Apple es-419 device tag](https://developer.apple.com/forums/thread/733906), [Localizely es-419](https://localizely.com/locale-code/es-419/), [String Catalog es-419](https://stringcatalog.com/languages/es/es-419).
- CLDR plurals: [Unicode CLDR plural rules](https://cldr.unicode.org/index/cldr-spec/plural-rules), [intlpull CLDR 2026](https://intlpull.com/blog/cldr-plural-rules-complete-guide-2026).
- es/pt conventions: [Localizely](https://localizely.com/locale-code/es-419/), [Labcodes](https://labcodes.com.br/blog/en-us/development/why-internationalization-and-localization-matters/), [Freeformatter Brazil](https://www.freeformatter.com/brazil-standards-code-snippets.html), [ipfs/i18n#7](https://github.com/ipfs/i18n/issues/7).
- de formality: [Kwintessential DE app l10n](https://www.kwintessential.co.uk/blog/german-game-app-localisation), [The Local du/Sie](https://www.thelocal.de/20220330/german-word-of-the-day-duzen-siezen).
- 4.3: [iMore](https://www.imore.com/apple-rejects-developers-horoscope-app-says-app-store-has-enough), [molfar.io](https://www.molfar.io/blog/apple-review).
- Astro glossaries: [ES horary glossary](https://www.angelfire.com/ct/AnthonyLouis/glosesp.html), [PT combustão](https://www.astrolink.com.br/artigo/combustao), [DE classical dignities](https://www.astro.com/astrologie/in_classical_g.htm), [FR thésaurus](https://fr.wiktionary.org/wiki/Th%C3%A9saurus:astrologie/fran%C3%A7ais).

---
