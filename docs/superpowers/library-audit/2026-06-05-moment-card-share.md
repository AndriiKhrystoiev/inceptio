# Library & API Audit — Moment Card Share (Virality v1)

**Date:** 2026-06-05
**Spec:** `docs/superpowers/specs/2026-06-05-moment-card-share-design.md`
**Validator:** Compound V Phase 1C (library currency + API signatures only)
**Stack:** Expo SDK 55.0.26, React Native 0.83.6, React 19.2.0, **New Architecture mandatory (no opt-out)**

---

## 1. Tools Available

- **Context7 MCP:** ✅ available. Used for `/gre/react-native-view-shot` (benchmark 90.57) and `/websites/expo_dev` (expo-sharing).
- **WebSearch:** ✅ used for npm version/maintenance + GitHub issue evidence (shadow capture, Fabric support).
- **Manifests found:** `apps/mobile/package.json`, `apps/mobile/node_modules/expo/bundledNativeModules.json` (SDK 55 canonical pins).
- Not DEGRADED — Context7 + registry both reachable.

---

## 2. Libraries Mentioned

| Library | Spec context | SDK 55 bundled pin | Currently in package.json? | npm latest | Last release | Maintenance | Status |
|---|---|---|---|---|---|---|---|
| react-native-view-shot | Capture card → PNG (`captureRef`), spec says `4.0.3` | `4.0.3` | ❌ NOT installed (new dep) | **5.1.0** | ~2026-05-29 (≈7d ago) | Active (gre/react-native-view-shot) | 🟠 HIGH |
| expo-sharing | Native share sheet, spec says `~55.0.20` | `~55.0.20` | ❌ NOT installed (new dep) | tracks SDK 55 | SDK 55 line | Active (Expo first-party) | 🟢 OK |
| React Native `Share` | Fallback sheet trigger | core (RN 0.83.6) | ✅ in core, already imported in MomentDetailScreen | n/a | n/a | Active | 🟢 OK (with scope caveat) |
| expo-media-library | Save-to-camera-roll? | `~55.0.17` | ❌ NOT installed | tracks SDK 55 | SDK 55 line | Active | 🟢 OK — **but NOT needed for this flow** |
| @expo-google-fonts/fraunces | Card hero font | n/a (Google Fonts pkg) | ✅ `^0.2.3` | already in use | n/a | Active | 🟢 OK |
| @expo-google-fonts/inter | Card UI font | n/a | ✅ `^0.2.3` | already in use | n/a | Active | 🟢 OK |

**Key correction to the spec's framing:** none of the three capture/share native modules are installed yet — view-shot, expo-sharing, and media-library are all *new* dependencies for this feature, not already-present libs being reused. The spec wording ("bundled `4.0.3`", "bundled `~55.0.20`") refers to the SDK 55 *expected* pin in `bundledNativeModules.json`, not to anything currently in `package.json`. The plan must `npx expo install react-native-view-shot expo-sharing`.

---

## 3. API Signatures Verified

| API | Current signature (verified) | Spec assumption | Drift? |
|---|---|---|---|
| `captureRef(ref, options)` | `captureRef(view, { format: 'png', quality, result: 'tmpfile'\|'base64'\|'data-uri', width?, height?, fileName?(Android), snapshotContentContainer?, useRenderInContext?(iOS) })` → `Promise<string uri>` | uses `captureRef(card)` | ✅ matches. Note: **no `pixelRatio` option** — high-DPI is handled via `width`/`height` (point→pixel resize). |
| `Sharing.shareAsync(url, options)` | `shareAsync(url: string /* local file:// */, { mimeType?, UTI?, dialogTitle? }): Promise<void>` | uses `expo-sharing` on temp file | ✅ matches. For PNG: `mimeType: 'image/png'`, `UTI: 'public.png'`. `dialogTitle` is **Android-only**. |
| `Sharing.isAvailableAsync()` | `(): Promise<boolean>` | implied gate before share | ✅ correct — must gate before calling shareAsync. |
| RN `Share.share(content)` | `Share.share({ message?, url?, title? })` — **text/url oriented; cannot carry an arbitrary image file payload reliably across iOS+Android** | spec proposes as fallback "if expo-sharing unavailable" | ⚠️ See §5 / Constraints — RN `Share` is NOT an image-payload fallback. |

**`captureRef` options for a high-quality PNG (verified, current):**
- `format: 'png'` (default; lossless — `quality` is ignored for png, only affects jpg/webm)
- `result: 'tmpfile'` (default) → returns a `file://` URI, which is exactly what `Sharing.shareAsync` requires
- For resolution: the snapshot is in **actual pixels**, not points; an unconstrained capture already yields device-DPI output. To force an exact export size (e.g. 1080×1920 for 9:16 Stories), pass `width`/`height` — but be aware forcing a downscale can soften the image. There is **no `pixelRatio` param** in the current API.
- `snapshotContentContainer` only matters for ScrollViews — the card is a fixed-size View, so leave it `false`.

---

## 4. Critical Findings 🔴

None. No abandoned/archived/24-month-stale library on this flow.

---

## 5. High-Priority Findings 🟠

### 5.1 — react-native-view-shot `4.0.3` predates real New Architecture (Fabric) support; the app has New Arch mandatory

This is the single most important finding and it cuts against the spec's pinned version.

- **Evidence:** view-shot **5.0** is described as "the first stable release of the 5.x line, marking a major version bump **covering the New Architecture migration**" and "New Architecture (Fabric + TurboModules) is supported across iOS, Android, Web, Windows," with **"full New Architecture compatibility starting with version 5.0.1"** and v5+ "dynamically detecting which rendering architecture is active." RN peer dep bumped to `>=0.76.0`, **tested up to RN 0.84.1**. (GitHub releases.)
- **The app's reality:** CLAUDE.md — *"Expo SDK 55 (New Architecture mandatory, no opt-out)"*, RN 0.83.6, React 19.2.0. So the app is squarely in the Fabric-only regime that 5.x targets and 4.0.3 predates.
- **The conflict:** SDK 55's `bundledNativeModules.json` still pins `react-native-view-shot: 4.0.3` (verified locally). So `npx expo install react-native-view-shot` will try to install 4.0.3 — the pre-Fabric version — on a Fabric-mandatory app. npm latest is **5.1.0** (published ~7 days ago, ~760k weekly downloads on npmtrends — actively maintained).
- **Why it matters here:** the entire acceptance gate is "the PNG actually renders." A 4.0.3 capture path on Fabric is exactly the regime where `captureRef` is reported to throw `Failed to capture view snapshot` / snapshot-view-tag errors. Shipping 4.0.3 risks the capture itself failing, not just the halo.

**Recommended action (for the plan, not decided here):** validate 4.0.3 capture on a real New-Arch build *first*; if it errors or is flaky, override the SDK pin to `5.x` (`npx expo install react-native-view-shot@^5.1.0`, or pin `5.0.1+`). This is an Open Question (§8) because overriding an Expo bundled pin is a scoping decision. Do **not** silently accept 4.0.3 just because it's the bundled number — the bundled pin lags the library's Fabric support.

### 5.2 — Native shadows / elevation are unreliably captured: the spec's core claim is CONFIRMED, mitigation is CORRECT

- **Evidence:** view-shot issue tracker — "additional layers with **elevation above certain components are ignored and not captured**." Compounded by upstream RN behavior: Android `elevation` on a transparent-ish view renders a visible shadow *background* (facebook/react-native#25093), and `<Image>` shadow props are unreliable (#25668). General guidance from the maintainers: **"prefer a background color on the view you rasterize to avoid transparent pixels"** and set `collapsable={false}` on snapshotted Views.
- **Verdict on spec §7.1:** The spec's claim ("`react-native-view-shot` may not capture native shadows into the exported PNG") is **real and documented**, not folklore. The mitigation — **render the Moon halo as a radial gradient layer (reusing `MOOD_TOKENS` colors) instead of a native shadow** — is the correct call and the industry-standard workaround for capture-safe glows. Keep it.
- **Two additional capture-safety items the plan MUST honor (from the same sources):**
  1. **`collapsable={false}`** on the `MomentCard` root View (and any wrapper that must appear), or RN may collapse it out of the native hierarchy and the capture fails/empties.
  2. **Opaque background** on the card root — do not rely on transparent pixels. The 9:16 card should paint `bg-deep` (#0F0A1F) edge-to-edge. This also de-risks the §7.2 alpha-stripping concern, since the gradient halo composites over a solid base.

### 5.3 — RN built-in `Share` is text/url-oriented and is NOT a valid image-payload fallback

- **Evidence:** RN core `Share.share({ message, url, title })` is documented for text/url. Community guidance: to share an image via core Share you must base64-encode and the behavior is inconsistent across iOS/Android; the dedicated `react-native-share` package exists precisely because core Share "is quite limited… you can't easily share other forms of data."
- **Verdict on spec §7 "RN `Share` API is acceptable as the fallback":** half-right and needs tightening. RN `Share` is fine as a **last-resort text/url fallback** (e.g. share a sentence if image capture/share fails entirely) — which is essentially what the *current* `handleShare()` already does (`Share.share({ message })`, MomentDetailScreen.js:188–207). It is **not** an alternate way to deliver the *PNG*. The image path must be `captureRef → Sharing.shareAsync(fileUri, { mimeType:'image/png', UTI:'public.png' })`. If `Sharing.isAvailableAsync()` is false (rare; mainly web), degrade to the existing text Share, not to "share the image some other way."

---

## 6. Medium Findings 🟡

- **6.1 — `expo-media-library` is NOT needed for this flow.** Verified: capture→share never saves to the camera roll. `Sharing.shareAsync` opens the OS sheet directly from a temp `file://`; media-library is only required if the product wants an explicit "Save to Photos" action (out of v1 scope). **Do not add `expo-media-library` as a dependency.** It's in the SDK bundle (`~55.0.17`) but adding it pulls a Photos permission prompt for no benefit here.
- **6.2 — expo-sharing version is correct.** Spec's `~55.0.20` matches the SDK 55 bundled pin exactly. `npx expo install expo-sharing` will resolve it. No API drift: `isAvailableAsync()` + `shareAsync(url, options)` are current. Android requires a real `file://` URI (view-shot `result:'tmpfile'` satisfies this).
- **6.3 — Fonts in capture: low risk given existing setup, but one guard needed.** App loads Fraunces + Inter via `useFonts` at root (`App.js:67`), holds the splash (`SplashScreen.preventAutoHideAsync` line 40 / `hideAsync` line 118), and **does not render any screen until `fontsLoaded` is true** (`App.js:136` gate). Because the Share affordance lives deep inside `MomentDetailScreen` — which can only mount *after* that gate — custom fonts are guaranteed loaded before any capture can occur. The documented "font not loaded → fallback glyph in PNG" race does **not** apply here. Guard to keep: the `MomentCard` must use the exact loaded family names from `src/theme.js` (`Fraunces_500Medium`, `Inter_400Regular`, etc.) — a typo'd family silently falls back and the *fallback* is what gets rasterized. No per-screen font-loading code needed.

---

## 7. Design Constraints for the Plan (non-negotiable)

**MUST:**
- MUST run `npx expo install react-native-view-shot expo-sharing` as new deps (neither is installed today).
- MUST verify `captureRef` succeeds on a **real New-Architecture device build** before trusting the bundled `4.0.3`; treat capture failure as a trigger to bump to `react-native-view-shot@^5.1.0` (5.0.1+ is the first Fabric-correct line). See §8.
- MUST render the Moon halo as a **radial gradient layer** (reuse `MOOD_TOKENS` colors), never a native shadow/`elevation` — confirmed capture-unsafe.
- MUST set `collapsable={false}` on the `MomentCard` capture root.
- MUST paint an **opaque** card background (`bg-deep`) edge-to-edge; no reliance on transparent pixels.
- MUST capture with `{ format: 'png', result: 'tmpfile' }` and feed the returned `file://` URI to `Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' })`.
- MUST gate the share call behind `await Sharing.isAvailableAsync()`.
- MUST use the exact loaded font family names from `src/theme.js` in `MomentCard`.

**MUST NOT:**
- MUST NOT add `expo-media-library` — not required for capture→share; it only adds a Photos permission prompt.
- MUST NOT use RN core `Share.share()` to deliver the **PNG image** — it's text/url-oriented. RN `Share` may remain only as the existing text/sentence last-resort fallback.
- MUST NOT pass a `pixelRatio` option to `captureRef` — it doesn't exist in the current API; control output size via `width`/`height` (or leave unset for native-DPI).
- MUST NOT treat the SDK-55 bundled pin (`4.0.3`) as proof of New-Arch fitness; the bundled number lags the library's Fabric support (5.0.1+).

---

## 8. Open Questions for the Human (escalate)

1. **view-shot 4.0.3 vs 5.1.0 — override the Expo bundled pin?** SDK 55 pins `4.0.3`, which predates real Fabric/New-Arch support (landed 5.0.1, current 5.1.0). The app is New-Arch-mandatory. Decision needed: accept 4.0.3 only if a real-device New-Arch capture smoke passes, otherwise pin `^5.1.0`. This is a "deviate from Expo's recommended version" call that's a scoping/risk decision, not the validator's to make. (Recommendation: run the smoke on 4.0.3 first; be ready to bump.)
2. **Export resolution for 9:16 (and the planned 1:1 fast-follow).** Do we force `width:1080,height:1920` on capture for predictable Stories sizing, or capture at native DPI and let the card's own layout dictate size? Affects file size and crispness; not a library-correctness issue but should be decided before the smoke so the acceptance PNG is the real target size.

---

## 9. Knowledge Base Updates

Created `docs/superpowers/library-audit/_knowledge-base/expo-rn-capture-share.md` (new topic file) with date-stamped, sourced entries for: react-native-view-shot version/Fabric timeline + shadow-capture limitation, expo-sharing `shareAsync` signature, RN `Share` image limitation, expo-media-library necessity, and the font-capture pattern.

---

### Sources
- Context7 `/gre/react-native-view-shot` — `captureRef(view, options)` signature, options table, png/quality semantics.
- Context7 `/websites/expo_dev` — `Sharing.shareAsync(url, options)` signature, local-file requirement, UTI/mimeType usage.
- GitHub gre/react-native-view-shot — Releases (5.0 / 5.0.1 New Architecture migration, RN >=0.76 tested to 0.84.1; latest 5.1.0); issue tracker (elevation layers ignored in capture; `collapsable={false}`; prefer opaque bg).
- npm `react-native-view-shot` — latest 5.1.0 (~7d old), ~760k weekly downloads (npmtrends).
- facebook/react-native #25093, #25668 — Android elevation/shadow + `<Image>` shadow unreliability.
- reactnative.dev/docs/share + react-native-share docs — RN core `Share` is text/url oriented; image sharing needs base64/3rd-party.
- Expo Sharing docs — Android requires `file://`; media-library only needed for camera-roll save.
- Local: `apps/mobile/package.json`, `apps/mobile/node_modules/expo/bundledNativeModules.json`, `apps/mobile/App.js`, `apps/mobile/src/theme.js`, `apps/mobile/src/screens/MomentDetailScreen.js`.
