# Expo / React Native i18n Library Knowledge Base

Maintained by Compound V Phase 1C validator. Append at the bottom.

---

## Updated 2026-06-08 — CHROME i18n pre-flight (Expo SDK 55 / RN 0.83 / React 19 / Hermes)

**Current versions (verified 2026-06-08):**
- `i18next` **26.3.1** — published ~4 days before audit; 7.8k+ npm dependents; actively maintained. Source: https://www.npmjs.com/package/i18next , https://github.com/i18next/i18next/releases . Context7 indexes `/i18next/i18next` (v26.0.2).
- `react-i18next` **17.0.8** — published ~22 days before audit; 6.3k+ dependents; active. Source: https://www.npmjs.com/package/react-i18next .
- `expo-localization` **55.0.13** — SDK-55-matched (SDK 55+ uses SDK-major versioning, so SDK 55 ⇒ `^55.0.0`). Install with `npx expo install expo-localization`. Source: https://docs.expo.dev/versions/latest/sdk/localization/ , https://www.npmjs.com/package/expo-localization .

**Peer-dependency coupling (verified 2026-06-08):**
- `react-i18next@17` declares `peerDependencies`: `i18next >= 25.6.2`, `react >= 16.8.0`. Install a matched pair (`i18next@^26` + `react-i18next@^17`). React 19.2.0 satisfies the React peer. Source: https://github.com/i18next/react-i18next/blob/master/package.json .

**CRITICAL evergreen Hermes gotcha — `Intl.PluralRules` is NOT in Hermes (verified 2026-06-08, still true 2024→2026):**
- Hermes does not natively implement `Intl.PluralRules`. i18next v4 plurals are derived from `Intl.PluralRules`, so on Hermes plurals silently break for non-English locales without a polyfill.
- Fix: add `@formatjs/intl-pluralrules` + `@formatjs/intl-locale`; import `…/polyfill-force` (NOT `/polyfill` — auto-detect is very slow on Android) + per-locale `locale-data/{en,de,fr,es,pt}` ONCE at app root before `i18next.init()`.
- Sources: https://formatjs.github.io/docs/polyfills/intl-pluralrules/ ; https://github.com/facebook/hermes/discussions/1211 .

**`Intl` locale-tag gotcha — no `es-419` / `pt-BR` CLDR/plural data:**
- `@formatjs/intl-pluralrules/locale-data` ships `es` and `pt` (and `pt-PT`), not `es-419`. Spanish plural rules are language-level → use `es`.
- For `Intl.DateTimeFormat`/`NumberFormat`, passing raw `es-419` risks silent en-US fallback. Map app-locale → Intl-locale before any `Intl.*` call: `es-419`→`es`, `pt-BR`→`pt-BR`(or `pt`), `de`/`fr`/`en` identity. i18next *resource keys* can stay `es-419`/`pt-BR` (opaque strings — fine).
- es-419 = Spanish (Latin America), valid BCP-47. Source: https://localizely.com/locale-code/es-419/ .

**`Intl.DateTimeFormat` on Hermes — supported but verify locale data on-device:**
- Expo guide says Hermes lets you "use the Intl API on all platforms" but does not enumerate per-locale data. DateTimeFormat is generally supported; NumberFormat historically partial. Verify `new Intl.DateTimeFormat('de'|'fr'|'es'|'pt-BR').format()` renders localized (not en-US) on device; if gaps, add `@formatjs/intl-datetimeformat/polyfill-force` + locale-data. Source: https://docs.expo.dev/guides/localization/ .

**i18next v26 breaking changes relevant to RN i18n (verified 2026-06-08):**
- Plural JSON defaults to **v4** suffixes (`_one`/`_other`/`_few`/`_many`, Intl-aligned). Do NOT set `compatibilityJSON:'v3'` if you want Intl-category plurals.
- Monolithic `interpolation.format` removed → use `i18next.services.formatter.add(name, fn)`.
- `skipOnVariables` defaults `true`; `initImmediate`→`initAsync` mapping removed; optional `enableSelector:true` for TS perf.
- Source: https://www.i18next.com/misc/migration-guide .

**API shapes confirmed current (verified 2026-06-08):**
- `expo-localization.getLocales()` — synchronous, returns array in device-preference order (always ≥1), entries carry `languageTag`/`languageCode`/`regionCode` (+ `textDirection`, separators, currency). Current recommended API; legacy `Localization.locale` string / `getLocalizationAsync` deprecated.
- `i18next.init({ fallbackLng (string|array|object-map-with-default), supportedLngs, load:'currentOnly'|'languageOnly'|'all' })` — all current/valid.
- `react-i18next` `useTranslation(ns?,opts?) -> {t,i18n,ready}`, `Trans` — unchanged in v17. Suspense default-on; set `react.useSuspense:false` for synchronous bundled-resource RN init.

**Verdict for this codebase:** i18next + react-i18next + expo-localization all 🟢 current/maintained, pure-JS i18n core ⇒ no New-Arch/worklets friction. The real risk is the **missing FormatJS PluralRules polyfill + es-419/pt-BR → Intl-locale mapping**, which the spec's plural/date plan silently assumes Hermes provides.
