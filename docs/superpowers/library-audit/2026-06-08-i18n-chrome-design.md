# Library Audit — CHROME i18n + locale plumbing

**Date:** 2026-06-08
**Spec:** `docs/superpowers/specs/2026-06-08-i18n-chrome-design.md`
**Validator:** Compound V Phase 1C (library/version currency only)
**Stack under test:** Expo SDK 55, React Native 0.83.6, React 19.2.0, New Architecture (no opt-out), TypeScript strict, Expo Router, Hermes.

---

## 1. Tools Available

- **Context7 MCP:** ✅ available. Resolved `/i18next/i18next` (v26.0.2 indexed) and `/i18next/react-i18next`. Queried i18next v26 config surface.
- **WebSearch / registry pages:** ✅ used for current versions, peer deps, Hermes Intl status (npm, GitHub, FormatJS docs, Expo docs, React Native docs).
- **Manifests found:** `apps/mobile/package.json` (read), plus `packages/shared-types`, `workers/api-proxy`, root. No lockfile present at repo root.
- **NOTE:** `react-i18next`, `i18next`, and `expo-localization` are **not yet in `apps/mobile/package.json`** — these are greenfield additions. There is no pinned version to drift from; the audit validates the versions the plan will install.

---

## 2. Libraries Mentioned

| Library | Spec context | Current stable | Repo pinned | Last release | Maintenance | Status |
|---|---|---|---|---|---|---|
| `i18next` | core i18n engine | **26.3.1** (~4 days ago) | not present | active | 7.8k+ dependents, releases within days | 🟢 OK |
| `react-i18next` | React bindings, `t()`/`useTranslation`/`Trans` | **17.0.8** (~22 days ago) | not present | active | 6.3k+ dependents | 🟢 OK |
| `expo-localization` | device locale detection (`getLocales()`) | **55.0.13** (SDK-55-matched) | not present | ~1 month ago | Expo-maintained, SDK-versioned | 🟢 OK |
| `@formatjs/intl-pluralrules` | **REQUIRED polyfill (not in spec)** — Hermes lacks `Intl.PluralRules` | current FormatJS line | not present | active | FormatJS, widely used in RN | 🟠 see §4 |
| `@formatjs/intl-locale` | polyfill dep that PluralRules needs on RN | current | not present | active | FormatJS | 🟠 see §4 |
| `@formatjs/intl-datetimeformat` | conditional — only if Hermes DateTimeFormat locale gaps surface | current | not present | active | FormatJS | 🟡 verify on-device |

All three named libraries are 🟢 actively maintained and current. **No abandonment, no archived repos, no version drift to flag.** The risk is not library currency — it is a **missing dependency** (the polyfill the spec's Intl claim silently depends on) and a **peer-dependency coupling** (below).

---

## 3. API Signatures Verified

| Surface | Spec assumption | Verified current behavior | Verdict |
|---|---|---|---|
| `expo-localization.getLocales()` | returns array in device-preference order; each entry has `languageTag`, `languageCode`, `regionCode` | Confirmed: returns ordered list (always ≥1 entry), each with `languageTag` (`"es-MX"`), `languageCode` (`"es"`), `regionCode` (`"MX"`), plus `textDirection`, `decimalSeparator`, `currencyCode`, etc. `regionCode`/others can be `null` per platform. | ✅ PASS |
| `getLocales()` vs legacy `Localization.locale` string / `getLocalizationAsync` | spec uses `getLocales()` | `getLocales()` is the current recommended synchronous API. The old `Localization.locale` string and `getLocalizationAsync` are legacy. | ✅ PASS |
| `i18next.init({ fallbackLng, supportedLngs, load })` | object-map `fallbackLng`, `supportedLngs` array, `load:'currentOnly'` | All three are current, documented v26 options. `load:'currentOnly'` loads only the exact resolved language (no `languageOnly` stripping) — matches the spec's intent. | ✅ PASS |
| `fallbackLng` as a per-language **object map** with a `default` key | spec §4.2 map shape | Object-map form with per-key arrays + `default` is valid current config (long-standing, unchanged in v26). | ✅ PASS |
| Non-standard resource key `'es-419'` | arbitrary language key | i18next treats language keys as opaque strings; any BCP-47-shaped key (incl. `es-419`, `pt-BR`) is a valid resource bucket and `supportedLngs` entry. | ✅ PASS (with Intl caveat — §4 / §5) |
| `useTranslation()` / `Trans` | hook + component | Signatures unchanged in react-i18next 17. `useTranslation(ns?, opts?)` returns `{ t, i18n, ready }`. Suspense on by default; set `useSuspense:false` (or `<I18nextProvider>` config) to opt out — relevant on RN where you usually init synchronously with bundled resources. | ✅ PASS (see §5 Suspense note) |
| `t('key', { count })` plural resolution | relies on `Intl.PluralRules` categories per locale | **i18next v4 JSON plural suffixes are derived FROM `Intl.PluralRules`.** On Hermes `Intl.PluralRules` is absent → categories collapse/throw without polyfill. **This is the load-bearing gap — see §4.** | 🔴 FAIL without polyfill |

---

## 4. Critical Findings 🔴

### 🔴 C1 — Hermes does NOT implement `Intl.PluralRules`; the spec's plural + es-419 plan requires a polyfill the spec never lists

This is the single highest-risk claim in the spec (§6: counts authored as i18next plural keys "so each locale's `Intl.PluralRules` categories apply"; §4: "Provides … `Intl.PluralRules`-category plurals").

**Evidence (multiple independent, current sources):**
- FormatJS official polyfill docs, `Intl.PluralRules`: *"Since React Native uses Hermes which does not support `Intl.PluralRules`…"* — recommends importing `@formatjs/intl-pluralrules/polyfill-force` on RN (the auto-detect `/polyfill` "runs very slowly on Android"). https://formatjs.github.io/docs/polyfills/intl-pluralrules/
- Confirmed still true across 2024→2026 reporting; no Hermes release has shipped native `Intl.PluralRules`. https://github.com/facebook/hermes/discussions/1211
- Callstack RN best-practices guidance corroborates polyfilling PluralRules on Hermes. https://github.com/callstackincubator/agent-skills/blob/main/skills/react-native-best-practices/references/native-sdks-over-polyfills.md

**Why this bites i18next specifically:** i18next v4 JSON plural form (`key_one`, `key_other`, plus `_few`/`_many` for some locales) maps **directly onto `Intl.PluralRules.select()`**. With no `Intl.PluralRules`, i18next cannot resolve the plural category — German/French/Spanish/Portuguese counts will fall back to wrong/English forms or throw. The spec explicitly chose i18next *because* it does "Intl.PluralRules-category plurals" — that capability is inert on Hermes until polyfilled.

**Required (the plan MUST add an install + import task):**
```ts
// polyfill entry — imported ONCE, before i18next.init(), at app root
import '@formatjs/intl-locale/polyfill-force';            // PluralRules depends on Intl.Locale
import '@formatjs/intl-pluralrules/polyfill-force';
import '@formatjs/intl-pluralrules/locale-data/en';
import '@formatjs/intl-pluralrules/locale-data/de';
import '@formatjs/intl-pluralrules/locale-data/fr';
import '@formatjs/intl-pluralrules/locale-data/es';        // NB: 'es', not 'es-419' (see C2)
import '@formatjs/intl-pluralrules/locale-data/pt';        // NB: 'pt', not 'pt-BR' (see C2)
```
Packages to add: `@formatjs/intl-pluralrules`, `@formatjs/intl-locale`. Use `/polyfill-force` (not `/polyfill`) on Hermes for startup-time reasons.

### 🔴 C2 — `Intl` has no `es-419` / `pt-BR` locale data; the resolved app locale must be mapped to the base Intl locale before any `Intl.*` / plural call

The spec's resolver (§4) returns app-locale tags `'es-419'` and `'pt-BR'` as the i18next language. That is correct **for i18next resource lookup** (opaque key — §3 PASS). But it is **wrong as an argument to `Intl.PluralRules` / `Intl.DateTimeFormat`**:
- `@formatjs/intl-pluralrules/locale-data` ships `es` and `pt` (and `pt-PT`), **not** `es-419`. Plural categories for Spanish are language-level, so `es` is the correct data bucket; `es-419` has no plural-data file.
- For `Intl.DateTimeFormat`/`NumberFormat`, `es-419` and `pt-BR` are valid BCP-47 but the resolved CLDR data on Hermes is best obtained from `es` / `pt-BR` / `es-MX`. Passing the raw app tag risks a silent fallback to the default (often en-US) calendar/number format — exactly the bug §6 is trying to kill.

**Required:** the plan MUST add a **mapping seam** from app-locale → Intl-locale, e.g.
```
'es-419' -> 'es'      // for both PluralRules data and DateTimeFormat/NumberFormat
'pt-BR'  -> 'pt-BR'   // pt-BR locale-data exists; pt is also fine
'de'/'fr'/'en' -> identity
```
Drive every `Intl.DateTimeFormat(...)` / `Intl.NumberFormat(...)` / plural call off the **mapped** locale, never the raw `es-419`. The spec's §6 (`format-date.ts`, `cluster-windows.ts`, `format-window.ts`) must consume this mapped value, not `i18n.language` directly. Without this, es-419 users get the same en-US dates §6 set out to fix.

> CAVEAT downgrade note: C1+C2 are 🔴 **as written** because the spec asserts the capability works on Hermes with no polyfill/mapping task. They are cheap to resolve (one polyfill entry file + one mapping function). They are blockers only in the sense that shipping the spec verbatim produces wrong plurals/dates for the four non-English locales — the exact markets this work targets.

---

## 5. High-Priority Findings 🟠

### 🟠 H1 — Spec §4 "pure JS, no native module → lowest New-Arch risk" is TRUE for the named libs, but the claim is incomplete

- `i18next` and `react-i18next` are pure JS, no native module, no New-Arch/TurboModule surface, no Reanimated/worklets interaction. **The worklets/Reanimated New-Arch friction this app has hit does NOT apply here.** PASS on the New-Arch-risk rationale.
- `expo-localization` **does** have a native module (it reads OS locale settings) but is Expo-maintained and SDK-55-matched (`55.0.13`), New-Arch-compatible by SDK contract, installed via `npx expo install expo-localization`. Low risk, but it is not "no native module." Minor wording correction, not a blocker.
- **The understated risk is the polyfill (C1), not the i18n libs.** `@formatjs/*` polyfills are pure JS too — so the New-Arch story stays clean — but they add ~tens-to-hundreds of KB and run at startup. Use `/polyfill-force` to avoid the slow Android auto-detect path. The spec's "lowest New-Arch risk" conclusion survives; its "no extra dependency needed" implication does not.

### 🟠 H2 — Peer-dependency coupling: `react-i18next@17` requires `i18next >= 25.6.2`

react-i18next 17.0.8 declares `peerDependencies`: `i18next >= 25.6.2`, `react >= 16.8.0`. Current `i18next` is 26.3.1 — satisfies it. **But the plan must install a matched pair** (e.g. `i18next@^26` + `react-i18next@^17`); pinning `i18next@23/24` against `react-i18next@17` will throw a peer-dep error. React 19.2.0 (repo) satisfies `react >= 16.8.0`. ✅ on React 19; just don't under-pin i18next.

### 🟠 H3 — i18next v26 is a major with breaking changes that touch this spec's config

If the plan installs `i18next@26` (current), these v26 breakings are relevant:
- **Plural JSON is v4 format by default** (`_one`/`_other`/`_few`/`_many` — derived from `Intl.PluralRules`). This is what §6 wants — good — but it makes the C1 polyfill mandatory and means any hand-authored plural keys must use v4 suffixes, not the legacy v3 `_plural`. (Escape hatch `compatibilityJSON:'v3'` exists but defeats the Intl-category rationale — do not use it.)
- `interpolation.format` monolithic function removed → use `i18next.services.formatter.add(...)`. Relevant if §6 wires custom number/date formatters through i18next rather than calling `Intl` directly. The spec leans on direct `Intl.DateTimeFormat`, so likely unaffected — but flag it for the formatter seam.
- `skipOnVariables` now defaults `true`; `initImmediate`→`initAsync` mapping removed; optional `enableSelector:true` for TS perf.

Sources: https://www.i18next.com/misc/migration-guide ; https://github.com/i18next/i18next/releases

---

## 6. Medium Findings 🟡

### 🟡 M1 — `Intl.DateTimeFormat` locale data on Hermes: verify on-device for de/fr/es/pt before declaring it free

Expo's localization guide states only: *"If you're using Hermes … you can use the `Intl` API on all platforms."* It does **not** enumerate which locales carry data. Reporting on Hermes Intl is consistent that **`Intl.DateTimeFormat` is supported**, but `Intl.NumberFormat` has been only **partial** and locale-data completeness varies by platform/version. The spec relies on non-en DateTimeFormat (de/fr/es/pt + es-419 routed to es) in `format-date.ts` / `cluster-windows.ts`.

**Action:** add a quick on-device verification task (the `__DEV__` locale override the spec already plans is the perfect harness) asserting `new Intl.DateTimeFormat('de').format(...)` and `'es'`/`'pt-BR'`/`'fr'` render localized, not en-US. **If any fail, add `@formatjs/intl-datetimeformat/polyfill-force` + its `locale-data/{de,fr,es,pt}` and (for relative dates) confirm number formatting.** Treating it as "free" without the device check is the residual risk.

### 🟡 M2 — react-i18next Suspense default vs RN synchronous init

`useTranslation` triggers Suspense when not ready by default. On RN with **bundled** resources you typically init i18next synchronously (resources inlined, `initImmediate`/async off), so components are ready on first render. To avoid an accidental Suspense boundary requirement, set `react: { useSuspense: false }` in `i18next.init` (or ensure resources are bundled and init is sync). Low risk; call it out so the plan picks one model explicitly.

---

## 7. Design Constraints for the Plan (non-negotiable)

**MUST:**
- **MUST** add `@formatjs/intl-pluralrules` + `@formatjs/intl-locale` and import their `/polyfill-force` + per-locale `locale-data/{en,de,fr,es,pt}` **once at app root, before `i18next.init()`** — or i18next plurals are wrong on Hermes for all four non-English locales (C1).
- **MUST** add an **app-locale → Intl-locale mapping** (`es-419`→`es`, `pt-BR`→`pt-BR`/`pt`, others identity) and feed every `Intl.PluralRules` / `Intl.DateTimeFormat` / `Intl.NumberFormat` call the **mapped** locale, never the raw `es-419` (C2). i18next resource lookup keeps the raw `es-419`/`pt-BR` keys (those are fine — opaque).
- **MUST** install a **matched i18next + react-i18next pair** (`i18next@^26` with `react-i18next@^17`; minimum `i18next >= 25.6.2`) (H2).
- **MUST** author plural keys in i18next **v4** suffix format (`_one`/`_other`/`_few`/`_many`); **MUST NOT** set `compatibilityJSON:'v3'` (H3 / C1).
- **MUST** install `expo-localization` via `npx expo install expo-localization` to get the SDK-55-matched `55.0.13`, not a hand-pinned npm version.

**MUST NOT:**
- **MUST NOT** pass `'es-419'` or `'pt-BR'` to any `Intl.*` constructor (no CLDR data → silent en-US fallback) (C2).
- **MUST NOT** claim "no extra dependency" — the Intl plan is not free on Hermes (C1).
- **MUST NOT** rely on `Intl.PluralRules` existing on Hermes without the polyfill (C1).

---

## 8. Open Questions for the Human (escalate)

1. **DateTimeFormat polyfill scope (M1):** do we accept a one-time on-device check (cheap, uses the planned `__DEV__` override) as the gate, or pre-emptively bundle `@formatjs/intl-datetimeformat` + locale-data for safety (bigger bundle, guaranteed correctness)? This is a bundle-size vs. risk call the owner should make. **It is the only item that could change task count materially.**
2. **i18next major line:** install `i18next@26` (current, v4 plurals — aligns with §6 rationale) vs. pin `@25` (also fine, less churn)? Recommend 26; confirm no other workspace package constrains i18next.

(Items 1–2 are scoping decisions, not blockers — defaults are clear; flagging for the owner.)

---

## 9. Knowledge Base Updates

Created `docs/superpowers/library-audit/_knowledge-base/expo-rn-i18n.md` (new topic file) with date-stamped, cited entries for:
- i18next 26.3.1 / react-i18next 17.0.8 / expo-localization 55.0.13 current versions + peer-dep coupling.
- Hermes lacks `Intl.PluralRules` → `@formatjs/intl-pluralrules/polyfill-force` + `intl-locale` required (RN evergreen gotcha).
- `Intl` has no `es-419`/`pt-BR` data → map to base locale before `Intl.*`.
- i18next v26 v4-plural default + removed `interpolation.format`.
```
