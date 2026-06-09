# Expo / React Native — Store Review & In-App Rating Library Knowledge Base

Maintained by Compound V Phase 1C validator. Append at the bottom.

---

## Updated 2026-06-09 — expo-store-review under Expo SDK 55 (rating-prompt feature)

Audit: `docs/superpowers/library-audit/2026-06-09-app-rating.md`. App = Expo SDK 55, RN 0.83.6, New-Arch-mandatory, custom dev-client (`expo-dev-client ~55.0.35`), `expo-store-review` NOT yet installed.

**`expo-store-review` versions (as of 2026-06-09):**
- npm "latest" = **56.0.3** (SDK 56 line). 221 versions published.
- SDK-55-compatible = **`~55.0.x`** — install via `npx expo install expo-store-review` (Expo aligns each SDK pkg's major to the SDK number since SDK 55). Do **NOT** `npm i expo-store-review` (pulls 56.x, mismatches SDK 55).
- First-party Expo module, actively maintained, New-Arch compatible. Status 🟢.
- Source: [npm](https://www.npmjs.com/package/expo-store-review), [Expo SDK 55 changelog](https://expo.dev/changelog/sdk-55).

**Public API surface (verified against `expo/expo` `packages/expo-store-review/src/StoreReview.ts` master + Expo docs):**
- `requestReview(): Promise<void>` — fire-and-forget; **no outcome/callback** (resolves void whether card shows or user rates). Silent no-op when iOS quota (≤3/365d) exhausted.
- `isAvailableAsync(): Promise<boolean>` — `false` on Web always; `false` on edge/old OS; historically `false` under iOS TestFlight (docs inconsistent — treat TestFlight as best-effort). Android `true` for 5.0+.
- `hasAction(): Promise<boolean>` — impl `!!storeUrl() || (await isAvailableAsync())`.
- `storeUrl(): string | null` — reads `Constants.expoConfig.ios.appStoreUrl` / `.android.playStoreUrl`; **`null` if those app.json fields are absent.**
- Signatures **stable across SDK 54→56**; none deprecated/renamed/removed.
- Source: [StoreReview.ts (master)](https://github.com/expo/expo/blob/master/packages/expo-store-review/src/StoreReview.ts), [Expo StoreReview docs](https://docs.expo.dev/versions/latest/sdk/storereview/).

**Platform behavior:**
- iOS: shows reliably in dev/Debug; TestFlight = best-effort; production gated by OS 3/365 quota (persists at StoreKit level across reinstall). No way to detect if shown or rated.
- Android: wraps **Play In-App Review API** (Play Core review flow). Card renders **only** for Play-distributed builds (internal test track+); **sideloaded dev-client shows nothing** (expected). Android has its own undocumented quota.
- **`FakeReviewManager`** = Google's documented test seam for Play In-App Review — native Android/instrumented tests only, NOT the Node/vitest unit layer.

**Config / native requirements:**
- **No** config-plugin entry, **no** iOS entitlement, **no** Info.plist key required for `requestReview`.
- Only app.json fields it reads: `expo.ios.appStoreUrl` + `expo.android.playStoreUrl` — consumed by `storeUrl()` / link fallback only; the in-app card works without them.
- **Adding it requires a dev-client rebuild** (`npx expo run:ios`/`run:android`, pod-install on iOS) — autolinked native module, won't hot-reload.

**Known issue — iOS 26 modal dismissal ([expo#41116](https://github.com/expo/expo/issues/41116), opened 2025-11-19):** on iOS 26 the SKStoreReviewController modal can't be tap-dismissed outside; "Not Now" greyed until interaction; Submit/Cancel after star pick. OS-level change, NOT an expo bug, NOT blocking.

**Supporting libs (this app, verified installed):**
- `expo-clipboard ~55.0.13` — installed AND already used (`YouScreen.js` → `Clipboard.setStringAsync`). Good for mailto fallback.
- `expo-constants ~55.0.16`, `expo-application ~55.0.15` — installed (diagnostic footer app version).
- `Linking` (RN core, 0.83.6) — `canOpenURL('mailto:...')` on iOS has false-negatives with spaces/quotes in subject/body and needs `mailto` in `LSApplicationQueriesSchemes`; pair with clipboard fallback. Sources: [RN Linking](https://reactnative.dev/docs/linking), [RN#25722](https://github.com/facebook/react-native/issues/25722), [RN#36680](https://github.com/facebook/react-native/issues/36680).

**⚠️ date-fns drift (important):** CLAUDE.md "Stack (locked)" lists `date-fns` + `date-fns-tz`, but **NEITHER is installed** (not in any `package.json`, not in node_modules, zero imports in `apps/mobile/src` as of 2026-06-09). Same stale-CLAUDE.md drift class as the documented MMKV→AsyncStorage drift. The codebase does date math with **native `Date.getTime()` arithmetic** (e.g. `now.getTime() + 30*24*60*60*1000`; a local `addDays` in `DatePickerScreen.js`). **Do not assume date-fns is available** — implement elapsed-duration cooldowns with native `Date` subtraction (`(now.getTime() - new Date(stored).getTime()) / 86_400_000`). date-fns-tz is genuinely irrelevant for elapsed-instant cooldowns.
