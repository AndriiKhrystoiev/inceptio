# Library & API Audit — Static Branded Splash Screen

**Date:** 2026-06-24
**Spec:** `docs/superpowers/specs/2026-06-24-splash-screen-design.md`
**Phase:** Compound V 1C — Library/Documentation Validator
**Verdict summary:** 0 CRITICAL · 0 HIGH · 1 MEDIUM · 3 design constraints · 2 open questions

---

## 1. Tools Available

- **Context7 MCP:** ✅ available. `/thx/resvg-js` resolved (High reputation, benchmark 93.06, 86 snippets). Full resvg API confirmed from Context7 + upstream README.
- **WebSearch / WebFetch:** ✅ used for npm currency, Expo SDK 54/55 changelog, Android developer docs. (npmjs.com returned 403 to WebFetch; version data sourced from WebSearch npm index + GitHub releases instead.)
- **Manifests found:** `apps/mobile/package.json` (relevant), plus root, `packages/shared-types`, `packages/translations`.

Not DEGRADED — Context7 fully available for the load-bearing library (resvg-js).

---

## 2. Libraries Mentioned

| Library | Spec context | Current ver | Repo pinned | Last release | Maintenance | Status |
|---|---|---|---|---|---|---|
| `@resvg/resvg-js` | dev-time SVG→PNG rasterizer w/ custom font | **2.6.2 stable** (Mar 2024); `2.7.0-alpha.2` on `next` (28 Jan 2026) | NOT installed (proposed new devDep) | 2.6.2 stable ~2yr ago; alpha activity Jan 2026 | Quiet-but-alive (alpha in 2026, prebuilt binaries maintained) | 🟡 MEDIUM |
| `expo-splash-screen` | native splash via config plugin | tracks SDK 55 (`~55.0.21`) | `~55.0.21` ✅ | current w/ SDK 55 | Expo first-party, actively maintained | 🟢 OK |
| `@expo-google-fonts/fraunces` | source of Fraunces .ttf for wordmark | `^0.2.3` ✅ installed | `^0.2.3` | current | Expo-adjacent, maintained | 🟢 OK |
| Node ESM runtime | `build-splash.mjs` (ESM) | — | — | — | — | 🟢 OK |

No external network APIs are introduced by this spec (asset generation is fully local/offline).

---

## 3. API Signatures Verified

| Claim in spec | Verified signature (current) | Verdict |
|---|---|---|
| `new Resvg(svgString, options)` | `new Resvg(svg: string \| Buffer, options?)` — string accepted | ✅ CONFIRMED |
| `options.font.fontFiles = [ttfPath]` | `font.fontFiles: string[]` (array of local paths) | ✅ CONFIRMED |
| `options.font.loadSystemFonts = false` | `font.loadSystemFonts: boolean` (default true; false = faster) | ✅ CONFIRMED |
| `.render().asPng()` → PNG buffer | `resvg.render()` → `RenderedImage`; `.asPng()` → PNG Buffer; also `.width/.height/.pixels` | ✅ CONFIRMED |
| SVG `<text>` rendered with custom font | Supported — README "text.svg" example renders `<text>` via `fontFiles` + `loadSystemFonts:false` | ✅ CONFIRMED |
| Embedded base64 `<image>` in SVG | Supported — resvg renders embedded raster `<image>`; `imageRendering` option exists (0 quality / 1 speed) | ✅ CONFIRMED |
| expo plugin: `image`/`imageWidth`/`resizeMode`/`backgroundColor`/`dark` | All current keys; plus optional `android`/`ios` platform nesting | ✅ CONFIRMED |
| `SplashScreen.preventAutoHideAsync()` / `hideAsync()` | Still the current SDK 55 runtime API | ✅ CONFIRMED |

**Note on `defaultFontFamily`:** resvg matches the SVG `<text>` `font-family` against the *internal* family name embedded in the .ttf, not the filename. If the SVG's `font-family` doesn't match Fraunces' real family name, resvg silently falls back / drops the glyphs (a recurring class of resvg-js issue — see #210 "text is not added"). Recommend setting `font.defaultFontFamily` to Fraunces' actual family name AND making the `<text font-family>` match it. This is an implementation detail for the plan, not a blocker.

---

## 4. Critical Findings 🔴

None.

---

## 5. High-Priority Findings 🟠

None.

---

## 6. Medium Findings 🟡

### 6.1 `@resvg/resvg-js` stable release is ~2 years old (2.6.2, Mar 2024)

The latest **stable** is `2.6.2`, published ~2 years ago. There IS 2026 activity (`2.7.0-alpha.2` on the `next` tag, 28 Jan 2026; `2.6.3-alpha.x` prereleases), and the platform prebuilt binary packages are maintained, so this is **not abandoned** — it is a mature/slow-cadence native library, not a dead one. No deprecation notice, repo not archived.

- **Classification rationale:** quiet stable cadence + live alpha = 🟡, not 🟠. Evidence of life: alpha publish Jan 2026.
- **Impact:** low. It's a **dev/CI-only devDependency** (the spec correctly scopes it as devDep, asset baked to PNG and committed). It never enters the RN/Hermes bundle, so there is zero runtime risk to the app. A stale-but-working rasterizer at build time is acceptable.
- **Recommendation:** Pin to `2.6.2` (the stable), NOT `next`/alpha. Do not adopt `2.7.0-alpha.*` for a production build pipeline.
- **Viable alternatives if rasterization proves flaky** (all render SVG `<text>` + custom fonts at dev time; ranked by fit):
  1. **`satori` + `@resvg/resvg-js`** (Vercel) — satori does HTML/JSX→SVG with robust font handling; still needs resvg to rasterize, so it doesn't remove the dependency. Better for complex text layout, overkill here.
  2. **`sharp`** — extremely well-maintained (weekly downloads in the millions, releases ~monthly). `sharp` rasterizes SVG via librsvg/resvg internally and composites PNGs. Strong fit: the spec already needs auto-trim of the transparent foreground + compositing the symbol over the wordmark — `sharp` does trim + composite natively and could do the whole job. **`sharp` is the strongest fallback** and arguably a cleaner primary for the trim+composite steps; resvg is only strictly needed for the `<text>` rasterization.
  3. **`@napi-rs/canvas`** — actively maintained napi-rs canvas; `registerFont` + `fillText` renders the wordmark, `drawImage` composites the symbol. Avoids the SVG layer entirely. Good fit, maintained, but more imperative code.
  - `node-canvas` (`canvas`): works but heavier native build (Cairo/Pango system deps); not recommended over `@napi-rs/canvas`.

**Sources:** [npm @resvg/resvg-js](https://www.npmjs.com/package/@resvg/resvg-js) · [GitHub thx/resvg-js releases](https://github.com/thx/resvg-js/releases) · [Context7 /thx/resvg-js] · [resvg-js #210 (text not added)](https://github.com/thx/resvg-js/issues/210)

---

## 7. Design Constraints for the Plan (MUST / MUST NOT)

- **MUST** pin `@resvg/resvg-js` to the stable `2.6.2` (or `^2.6.2`), **MUST NOT** use the `next`/`2.7.0-alpha.*` tag in a committed pipeline.
- **MUST** install `@resvg/resvg-js` as a **devDependency** only (spec already says so) — it is a platform-specific prebuilt native binary; that is normal and fine for a dev/CI tool and must never be a runtime `dependency`.
- **MUST** ensure the SVG `<text font-family="...">` matches Fraunces' *internal* font family name (not the filename) and set `font.defaultFontFamily` accordingly, or text glyphs will silently drop (resvg behavior, issue #210). The bundled file is the italic axis variant under `node_modules/@expo-google-fonts/fraunces` — confirm the exact family name of the chosen .ttf at build time.
- **MUST** migrate off the legacy top-level `expo.splash` block to the `expo-splash-screen` **config plugin** — CONFIRMED correct for SDK 55. The `splash` field is deprecated (announced SDK 52, still auto-mapped for now but Expo explicitly tells CNG users to migrate). The plugin **MUST be explicitly listed** in `plugins` — it is NOT auto-applied.
- **MUST** treat the config change as native (prebuild / `expo run`), NOT OTA — spec already notes this. CONFIRMED.
- **MUST NOT** expect the wide "Inceptio" wordmark to appear on **Android 12+**. CONFIRMED against Android developer docs: the system SplashScreen API centers the app icon masked to a circle (icon-with-background 240×240dp inside a 160dp circle; icon-without-background 288×288dp inside a 192dp circle; "everything outside the circle turns invisible"). The spec's "Variant A" (symbol-only on Android 12+, full lockup on iOS + Android ≤11) is the correct, accurate decision — keep it documented in code so it's not later mistaken for a bug.

---

## 8. Open Questions for the Human

1. **resvg vs sharp for the build script.** `sharp` is far more actively maintained and already does the auto-trim + composite the spec needs in §4.1/§8 (foreground padding trim). resvg is only strictly required for rasterizing the `<text>` wordmark. Acceptable to keep resvg (verified working, dev-only), but if you'd prefer a single maintained dependency doing trim+composite+text, `@napi-rs/canvas` or `sharp`+text-as-path is an option. **Scoping decision — not a blocker.** Default: proceed with resvg as specced.

2. **Android 12+ `imageWidth`/icon source.** The plugin's `image` on Android 12+ is masked to the circle. The spec relies on the *adaptive icon* (`icon-android-foreground.png`) showing the symbol there. Confirm whether the splash on Android 12+ should reuse the existing adaptive icon foreground (recommended; already a transparent symbol) and what `imageWidth` value keeps the symbol inside the circle without clipping. This is a per-platform config nuance the plan should pin down; the spec's intent (symbol-only) is sound.

---

## 9. Knowledge Base Updates

Created `docs/superpowers/library-audit/_knowledge-base/expo-rn-splash-screen.md` (new topic) and appended a resvg-js section. Recorded: resvg-js current versions + dev-only scoping + custom-font gotcha; expo-splash-screen SDK 55 config-plugin migration (legacy `expo.splash` deprecated, plugin must be explicit); Android 12+ circle-mask specs. All claims date-stamped 2026-06-24 with sources.
