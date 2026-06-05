# Expo / RN View-Capture & Native Share Library Knowledge Base

Maintained by Compound V Phase 1C validator. Append at the bottom.

---

## Updated 2026-06-05 — Moment Card share (capture RN view → PNG → OS share sheet)

Context: Expo SDK 55.0.26, RN 0.83.6, React 19.2.0, **New Architecture mandatory**.

### react-native-view-shot
- **SDK 55 bundled pin:** `4.0.3` (from `expo/bundledNativeModules.json`). **npm latest:** `5.1.0` (published ~2026-05-29, ~760k weekly downloads — actively maintained). Source: npm + GitHub releases.
- **Fabric / New Architecture:** v5.0 is the first stable 5.x and is the release that "covers the New Architecture migration"; **full New-Arch compatibility starts at 5.0.1** (v5+ dynamically detects active rendering architecture). RN peer dep `>=0.76.0`, tested to RN 0.84.1. **=> 4.0.3 predates real Fabric support.** On a New-Arch-mandatory app the SDK-55 bundled pin lags the library; validate 4.0.3 capture on-device or bump to `^5.1.0`. Source: GitHub gre/react-native-view-shot Releases.
- **API (current):** `captureRef(viewRef, { format:'png'|'jpg'|'webm', quality(0–1, jpg only), result:'tmpfile'(default)|'base64'|'data-uri', width?, height?, fileName?(Android), snapshotContentContainer?(ScrollView only), useRenderInContext?(iOS) }) => Promise<uri>`. **No `pixelRatio` option** — snapshot is in actual pixels; control output size via `width`/`height`. `result:'tmpfile'` returns a `file://` URI (what expo-sharing needs). Source: Context7 `/gre/react-native-view-shot`.
- **Native shadow / elevation is NOT reliably captured** — confirmed real limitation: "layers with elevation above certain components are ignored and not captured"; Android elevation on transparent views misbehaves (facebook/react-native#25093); `<Image>` shadow props unreliable (#25668). **Workaround = render glows/halos as gradient layers, not shadows.** Also: set `collapsable={false}` on the captured root and prefer an **opaque background** (avoid transparent pixels). Source: view-shot issue tracker + RN core issues.

### expo-sharing
- **SDK 55 bundled pin:** `~55.0.20`. First-party, active.
- **API (current, unchanged):** `Sharing.isAvailableAsync(): Promise<boolean>` and `Sharing.shareAsync(url: string /* LOCAL file:// only */, { mimeType?, UTI?, dialogTitle? /* Android only */ }): Promise<void>`. For PNG: `mimeType:'image/png'`, `UTI:'public.png'`. Android requires a real `file://` URI (copy out of assets if needed). Gate with `isAvailableAsync()` first. Source: Context7 `/websites/expo_dev` + Expo Sharing docs.

### RN core `Share` (built-in)
- `Share.share({ message?, url?, title? })` is **text/url oriented**. It is NOT a reliable cross-platform way to deliver an arbitrary **image file**; image sharing via core Share requires base64 and is inconsistent. The `react-native-share` 3rd-party pkg exists for this reason. **=> Use expo-sharing for the PNG; keep core `Share` only as a text/sentence last-resort fallback.** Source: reactnative.dev/docs/share + react-native-share docs.

### expo-media-library
- **NOT required** for capture→share. `Sharing.shareAsync` opens the OS sheet from a temp file directly. media-library is only needed to *save to the camera roll* (adds a Photos permission prompt). Don't add it unless a "Save to Photos" feature is in scope. SDK 55 pin would be `~55.0.17`. Source: Expo Sharing docs.

### Custom fonts in captured PNGs (Fraunces / Inter)
- Inceptio loads fonts via `useFonts` at app root (`App.js`), holds the splash (`SplashScreen.preventAutoHideAsync`/`hideAsync`), and gates all screen render on `fontsLoaded`. Any capture target mounts only after fonts are ready, so the documented "font-not-loaded → fallback glyph in PNG" race does not apply. **Guard:** the captured component must reference the exact loaded family names (`Fraunces_500Medium`, `Inter_400Regular`, … from `src/theme.js`) — a typo silently falls back and the fallback is what rasterizes. Source: local App.js / theme.js review.
