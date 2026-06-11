# App Store Review / In-App Ratings Knowledge Base

Maintained by Compound V Phase 1B advisor. Append at the bottom on each pass.
Domain: Apple `SKStoreReviewController` / StoreKit `requestReview`, Apple Review Guidelines + HIG; Google Play In-App Review API + Play policy; `expo-store-review` wrapper.

---

## Updated 2026-06-09 — in-app rating prompt (consumer mobile, Expo/RN, iOS+Android)

### Compliance matrix (reusable across any in-app-rating feature)

| Constraint | Apple | Google Play | Source |
|---|---|---|---|
| Native API only; no custom star UI | Required since iOS 11 / 2017; custom prompts disallowed (manipulation) | "Surface the card as-is… no overlay, no resize/opacity/shape change" | [9to5Mac 2017](https://9to5mac.com/2017/06/09/app-rating-custom-prompts-app-store-banned/), [Play guide](https://developer.android.com/guide/playcore/in-app-review) |
| Review gating / sentiment steering | Prohibited (steering = manipulation; rejection cause) | Prohibited (ratings policy) | [RevenueCat](https://www.revenuecat.com/blog/engineering/how-to-hack-your-app-store-ratings/), [AppReply 2026](https://appreply.co/blog/app-store-reviews-101) |
| Don't call `requestReview` from a button | Explicit; no-op makes button look broken | `launchReviewFlow` likewise not a "rate us" button | [Expo](https://docs.expo.dev/versions/latest/sdk/storereview/) ("Don't call from a button") |
| Manual "rate us" route | Deep-link `?action=write-review` on product URL | Open Play listing | [Airship](https://support.airship.com/hc/en-us/articles/360033591811-iOS-App-Review-Deep-Link) |
| Prompt frequency cap | **3 / 365 days, rolling, per user/app** | **Undocumented, time-bound throttle** (≈once/month-ish; not published) | [Apple ratings](https://developer.apple.com/app-store/ratings-and-reviews/), [Play guide](https://developer.android.com/guide/playcore/in-app-review) |
| Outcome callback (shown? rated?) | **None** | **None** (flow completes regardless) | both above |
| Incentivize / penalize rating | Banned (paid/incentivized/filtered/fake → expulsion); symmetric | Banned | Apple Review Guidelines Intro + §3 + §5.6 |
| When to fire | After completed positive action, at a natural break; NOT first launch / onboarding / mid-task / after error; "a week or two" min between | "after user experienced enough of the app" | [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/ratings-and-reviews) |

### The "two independent peers" safe shape (avoids gating)
- A feedback channel and a Rate link may coexist **as long as neither is conditioned on sentiment and neither gates who reaches the native card.** Gating = sentiment decides *who is asked* (prohibited). Suppression-on-action (e.g. delay next prompt after user opens feedback, without reading sentiment) is **allowed** — it withholds, never routes.
- Recommended-by-blogs "pre-prompt satisfaction gate / are-you-enjoying step" is the **gating anti-pattern** when tied to the store card. Treat as non-compliant for that purpose.

### Guideline-ID map (cite correctly)
- Manipulation home: **Apple Review Guidelines Introduction** + **§3 (Business)** + **§5.6 Developer Code of Conduct → 5.6.3 App Store Reviews** (5.6.1–5.6.4 added to expand the Code of Conduct).
- **§1.1.7 is Safety / harmful content — NOT ratings.** Common mis-citation. Don't use 1.1.7 for rating manipulation.
- Google: **Play Developer Program Policy — Ratings, Reviews, and Installs** (spam/manipulation) + In-App Review API design rules.

### `expo-store-review` gotchas (wrapper behavior that changes smoke/policy conclusions)
- `isAvailableAsync()` → **`false` on iOS TestFlight** and on Web; `true` on iOS dev/prod build and Android 5+. **TestFlight suppresses the card — do not smoke the iOS card on TestFlight.** Use a development build on a real device.
- StoreKit `requestReview` is **best-effort even when eligible** — may show nothing. Smoke = "card MAY appear; absence ≠ failure."
- `storeUrl()` returns `Constants.expoConfig.ios.appStoreUrl` / `android.playStoreUrl` = the **plain listing**, NOT the `action=write-review` page. For a manual write-review deep link, hardcode `?action=write-review` on iOS yourself.
- `hasAction()` = true if `requestReview` is available **or** a `storeUrl` is configured.
- Android in-app card renders **only for a Play-installed build (internal track+)**; sideloaded dev-client shows nothing (expected). Test with **`FakeReviewManager`**, never the real manager.

### Recent-changes watch (as of 2026-06)
- No 2026 policy change to the ratings-prompt regime. Google's 2026 cycle = billing / US app-store-bill compliance (Apr-15-2026), unrelated. Custom-prompt ban (2017), 3/365, gating ban all unchanged.

### GDPR note
- A "send feedback" mailto footer limited to **app version / OS / locale**, user-initiated send (user sees body before sending), is **out of GDPR scope** — none are personal data, no silent transmission. No DPA/consent needed.

---

## Updated 2026-06-11 — Force-update / mandatory-update gates (server-driven version gate, Expo/RN, iOS+Android)

Generalized from the Inceptio force-update-gate spec (`docs/superpowers/specs/2026-06-11-force-update-gate-design.md`). Reusable for any app shipping a "you must update" hard gate + soft "update available" banner keyed on native marketing version.

### Rule 1 — Forcing the user to update YOUR OWN app is NOT prohibited on either store. Don't confuse it with 3.2.2(x).

- Apple's only "force users to" bar is **Guideline 3.2.2(x)**: *"Apps must not force users to rate the app, review the app, download **other** apps, or other store-related actions in order to access functionality"* ([Apple guidelines](https://developer.apple.com/app-store/review/guidelines/)). Self-update is neither "another app" nor a "store-related action" in scope. A mandatory self-update gate does not violate 3.2.2(x).
- **Precedent (established practice):** WhatsApp + Signal ship hard "Update required to continue" gates; WhatsApp uses persistent/limiting prompts without deleting accounts ([SiliconRepublic](https://www.siliconrepublic.com/enterprise/whatsapp-policy-update-persistent), [Quora](https://www.quora.com/Why-does-WhatsApp-forces-its-users-to-update-their-Application)). No evidence of rejection for forcing one's own update.
- **The one live Apple soft-risk:** Design-section clause *"Apps that stop working or offer a degraded experience may be removed from the App Store at any time"* ([Apple guidelines](https://developer.apple.com/app-store/review/guidelines/)). This is about the build a reviewer sees being broken — see Rule 3. Keep force copy framed "no longer supported / update to keep using," NOT "the app is broken."

### Rule 2 — Google Play has a first-party Immediate in-app update flow; a custom store-link gate is allowed but is the less-preferred Android path.

- Play Core / `AppUpdateManager` "**immediate**" flow = *"fullscreen UX… requires the user to update and restart… blocks further use until the update finishes"* ([Play in-app updates](https://developer.android.com/guide/playcore/in-app-updates)) — Google's blessed pattern for "critical fixes / security / breaking API changes." Update downloads in-app, no store round-trip.
- A custom gate that `Linking.openURL(storeUrl)`s out to the Play listing is **policy-allowed** and cross-platform, but Google "recommends using the Play Core libraries API." Trade-off: custom gate = one code path for iOS+Android + server kill-switch + OTA-independence; Play native = Android-only, not server-kill-switchable, needs a config plugin. Document the deliberate choice. (Play native won't help iOS, so a custom gate is needed regardless — running both means two divergent safety-critical paths.)

### Rule 3 — The chicken-and-egg reviewer-lockout trap. `minVersion` must NEVER gate a build that isn't 100%-live.

- App Review reviews the **new build** on a device where it is not yet the "latest" store version. If `minVersion` ≥ the version under review, the reviewer hits a non-dismissible "must update" wall with no exit → **near-certain rejection** (the "stop working" clause). 
- **Runbook rule:** `minVersion` MUST be `≤` a version that is **already live and fully propagated**, and **strictly less than** any version submitted-but-not-yet-Ready-for-Distribution.

### Rule 4 — Phased/staged rollout makes "latest store version" a moving, regional target. Lag BOTH min and latest behind 100% rollout.

- Apple phased release: **1 / 2 / 5 / 10 / 20 / 50 / 100 % over 7 days** ([Apple phased-release help](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases/)). Google staged rollout: operator-set % per track. Store data replicates to hundreds of servers; regional propagation lags up to ~24h.
- Bumping `latestVersion` on day 1 of a phased release sends a soft "update available" banner to ~99% of users whose auto-update wave hasn't arrived. iOS mitigant: *"apps in phased release can be manually downloaded by anyone at any time"* ([phased-release help](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases/)) — so iOS users CAN force the manual download. **Android staged rollout has NO such universal manual-download escape** for the un-rolled %.
- **Rule:** set BOTH `minVersion` and `latestVersion` only after the target build is at **100% rollout AND ≥24h past Ready-for-Distribution in all regions**. For `force` this is absolute.
- **Emergency-force escape hatch:** Apple's **"Release to All Users"** button collapses a phased rollout to 100% instantly; set Android staged rollout to 100%. Do this + confirm propagation BEFORE any emergency `min` bump — converts the chicken-and-egg into a safe sequence.

### Rule 5 — Store-URL schemes + the `itms-apps` canOpenURL trap (perennial, unchanged since iOS 9).

- Correct per-platform schemes ([DEV](https://dev.to/amitkumar13/how-to-redirect-users-to-the-app-store-or-play-store-in-react-native-2hjd), [Expo into-other-apps](https://docs.expo.dev/linking/into-other-apps/)):
  - iOS: `itms-apps://apps.apple.com/app/id<APPLE_ID>` (direct, no Safari bounce); fallback `https://apps.apple.com/app/id<APPLE_ID>`.
  - Android: `market://details?id=<PACKAGE>` (direct); fallback `https://play.google.com/store/apps/details?id=<PACKAGE>`.
- **TRAP:** if the Update button calls `Linking.canOpenURL` before `openURL`, iOS requires `itms-apps` in `LSApplicationQueriesSchemes` — listed **without `://`** (including `://` makes canOpenURL return false too) ([cromulentlabs iOS9 canOpenURL](https://cromulentlabs.wordpress.com/2016/01/15/explanation-of-canopenurl-changes-in-ios-9/), [Apple forum 660021](https://developer.apple.com/forums/thread/660021)). Otherwise canOpenURL is always false → dead Update button → OTA-unfixable lockout-with-no-exit.
- **Lower-risk default for a non-OTA-fixable gate:** use `https://` store URLs and `openURL` directly without `canOpenURL` — https never needs the query-schemes allowlist and resolves to the store app on both OSes. A `canOpenURL`/`openURL` failure path (toast) is still worth keeping in case the operator supplied a bad URL (no native fix).

### Rule 6 — UX/dark-pattern line for update prompts.

- Soft "update available" banner: per-version **permanent silence after dismiss** is the key non-dark-pattern move (a durable "no"), plus an N-day cross-version floor (7d = "at most weekly" is respectful; dial to 14 on annoyance telemetry). Dismiss must be a true Dismiss, not "Later"/"Maybe" ([Bejamas dark patterns](https://bejamas.com/blog/10-dark-patterns-in-ux-design): "nagging = not accepting no").
- Blocking force screen a11y (WCAG 2.2 / EN 301 549 v4.1.0 direction, finalizing Q3 2026): focus-to-title on mount, title `role=header`, modal isolation (`accessibilityViewIsModal` iOS), live-region announce of retry-failure (Android `accessibilityLiveRegion` is Android-only → also `AccessibilityInfo.announceForAccessibility` for iOS/VoiceOver), 44×44 dismiss target, AA contrast verified against the *actual* surface, reduce-motion honored.

### Rule 7 — Store-name copy: keep the Update affordance's store reference generic.

- "App Store" / "Google Play" are proper nouns with official localized forms in some markets; a generic platform-neutral hint ("Opens your app store") sidesteps per-locale proper-noun handling entirely. Don't let a translator inject "App Store"/"Google Play" literals. Keep version numbers OUT of localized strings (avoids the decimal-separator/format problem; see i18n KB Rule 9).

### Marketing-version semver realities (for a client-side comparator).

- iOS `CFBundleShortVersionString` and Android `versionName` are both *conventionally* SemVer `x.y.z` but **not guaranteed**: iOS allows up to 3 integer components and rejects letters; Android `versionName` is a free string (accepts `2.3.1-beta`, two-part `1.2`, anything) ([uxcam](https://uxcam.com/blog/app-versioning-best-practices/), [appypie](https://www.appypie.com/blog/app-versioning-guide), [egeniq](https://egeniq.com/blog/app-version-numbering/)). A defensive parser MUST handle 2-part / non-numeric / suffixed inputs by returning a fail-open sentinel (null), never throwing, never zero-filling a truncated `"1.2"` (that would silently over-gate). Stripping pre-release/build suffixes is safe for *store marketing* versions (always plain `x.y.z` in practice) but loses beta<release ordering — acceptable for this use.

### Sources (this pass)
- Apple: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (3.2.2(x), 4.2.3(i), "stop working" clause), [Phased release help](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases/), [forum: best practice to force upgrade](https://developer.apple.com/forums/thread/107576), [forum: canOpenURL false for itms-apps](https://developer.apple.com/forums/thread/660021).
- Google: [In-app updates (immediate flow)](https://developer.android.com/guide/playcore/in-app-updates).
- iOS canOpenURL: [cromulentlabs](https://cromulentlabs.wordpress.com/2016/01/15/explanation-of-canopenurl-changes-in-ios-9/), [useyourloaf](https://useyourloaf.com/blog/querying-url-schemes-with-canopenurl/).
- Versioning: [uxcam](https://uxcam.com/blog/app-versioning-best-practices/), [appypie](https://www.appypie.com/blog/app-versioning-guide), [egeniq](https://egeniq.com/blog/app-version-numbering/).
- Precedent / practitioner: [WhatsApp persistent updates (SiliconRepublic)](https://www.siliconrepublic.com/enterprise/whatsapp-policy-update-persistent), [Medium force update (Saifi 2025-12)](https://medium.com/@sohail_saifi/implementing-app-version-control-and-force-updates-2b71a852f419), [DEV store redirect RN](https://dev.to/amitkumar13/how-to-redirect-users-to-the-app-store-or-play-store-in-react-native-2hjd).
- Dark patterns / a11y: [Bejamas](https://bejamas.com/blog/10-dark-patterns-in-ux-design), [CatDoes 2026 a11y](https://catdoes.com/blog/app-design-best-practices).

---
