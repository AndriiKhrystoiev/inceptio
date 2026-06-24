# Expo / React Native Splash Screen Library Knowledge Base

Maintained by Compound V Phase 1C validator. Append at the bottom.

---

## Updated 2026-06-24 — static branded splash (resvg-js asset pipeline + SDK 55 config plugin)

Context: spec `docs/superpowers/specs/2026-06-24-splash-screen-design.md` generates a branded splash PNG at dev time (symbol + "Inceptio" wordmark in Fraunces) and configures the native splash via the `expo-splash-screen` config plugin. App is Expo SDK 55, RN 0.83, New Architecture.

### `@resvg/resvg-js` (dev-time SVG → PNG rasterizer)

- **Versions (2026-06-24):** stable `2.6.2` (published ~Mar 2024, ~2yr old); `next` tag `2.7.0-alpha.2` (28 Jan 2026); `2.6.3-alpha.x` prereleases also exist. Repo `thx/resvg-js` NOT archived, NO deprecation notice. Platform prebuilt binary subpackages (`@resvg/resvg-js-{linux,darwin,win32}-*`) maintained. Verdict: mature/slow-cadence, **not abandoned**. Source: [npm](https://www.npmjs.com/package/@resvg/resvg-js), [GitHub releases](https://github.com/thx/resvg-js/releases).
- **Recommendation:** pin stable `2.6.2`; do NOT use `next`/alpha in a committed pipeline. Install as **devDependency** only — it's a platform-specific prebuilt native binary; never ships in the RN/Hermes bundle, so zero app runtime risk.
- **API (verified via Context7 `/thx/resvg-js` + upstream README, 2026-06-24):**
  - `new Resvg(svg: string | Buffer, options?)`
  - `options.font.fontFiles: string[]` — array of local .ttf/.otf paths (CONFIRMED custom-font load).
  - `options.font.loadSystemFonts: boolean` (default `true`; set `false` to load only your fonts, faster).
  - `options.font.defaultFontFamily`, `fontDirs`, `defaultFontSize`, `serifFamily`, etc. also exist.
  - `options.fitTo: { mode: 'original'|'width'|'height'|'zoom', value }`, `background`, `dpi`, `crop`, `imageRendering` (0 quality / 1 speed), `textRendering`, `shapeRendering`, `logLevel`.
  - `resvg.render()` → `RenderedImage`; `.asPng()` → PNG `Buffer`; also `.width`, `.height`, `.pixels` (raw RGBA).
  - SVG `<text>` rendering with custom font: **supported** (README ships a `text.svg` example using `fontFiles` + `loadSystemFonts:false`).
  - Embedded base64 `<image>` (raster) in SVG: **supported**.
- **GOTCHA (recurring resvg-js issue):** `<text font-family="X">` must match the .ttf's *internal* family name, NOT the filename. Mismatch → glyphs silently dropped / fallback. Set `font.defaultFontFamily` to the real family name and match `<text font-family>`. See [resvg-js #210](https://github.com/thx/resvg-js/issues/210). For Fraunces, confirm the family name of the specific variant .ttf in `node_modules/@expo-google-fonts/fraunces` at build time.
- **Alternatives if resvg proves flaky (all dev-time, render text + custom fonts):** `sharp` (most maintained; also does the trim+composite the splash pipeline needs — strongest fallback); `@napi-rs/canvas` (`registerFont`+`fillText`+`drawImage`, avoids SVG layer, maintained); `satori`+resvg (overkill); `node-canvas` (heavier native deps, not preferred).

### `expo-splash-screen` config plugin (Expo SDK 55)

- **Pinned in repo:** `~55.0.21` (matches SDK 55). First-party Expo, actively maintained. 🟢 OK.
- **Legacy `expo.splash` top-level app.json block:** DEPRECATED in favor of the `expo-splash-screen` config plugin. Deprecation announced SDK 52; as of SDK 54 the plugin auto-maps old `splash` config "for now," but Expo explicitly tells Continuous-Native-Generation users to migrate to the plugin. On **Android**, Expo says to migrate away from a full-screen splash image to a smaller icon-sized image. Source: [Expo SDK 54 changelog](https://expo.dev/changelog/sdk-54), [Expo splash docs](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/).
- **Plugin registration:** MUST be explicitly listed in `expo.plugins` — NOT auto-applied.
- **Plugin keys (current):** `image`, `imageWidth`, `resizeMode`, `backgroundColor`, `dark: { image, backgroundColor }`, plus optional `android` / `ios` platform-nested objects (each can override `image`/`backgroundColor`/`resizeMode`/`imageWidth`).
- **Runtime API still current in SDK 55:** `SplashScreen.preventAutoHideAsync()` and `SplashScreen.hideAsync()`. CONFIRMED.
- **Config change is NATIVE** (prebuild / `expo run`), not OTA.

### Android 12+ system splash circle mask

- CONFIRMED against [Android developer docs](https://developer.android.com/develop/ui/views/launch/splash-screen): Android 12+ uses the system SplashScreen API which centers the app icon **masked to a circle**.
  - Icon WITH background: 240×240 dp, fits within a **160 dp** circle.
  - Icon WITHOUT background: 288×288 dp, fits within a **192 dp** circle.
  - "Everything outside the circle turns invisible (masked)"; one-third of the foreground is masked (same as adaptive icons).
- **Consequence:** a wide wordmark in the splash image will NOT render on Android 12+ — only the centered symbol survives the mask. iOS and Android ≤11 (via `expo-splash-screen`'s legacy splash window) can show the full symbol+wordmark lockup.
- `windowSplashScreenBrandingImage` (bottom-positioned branding) exists but Android design guidelines recommend against it; Expo does not surface it as a first-class plugin key.
- The Inceptio spec "Variant A" (symbol-only on Android 12+, full lockup elsewhere) is the correct, accurate decision — keep documented so it's not mistaken for a bug.
