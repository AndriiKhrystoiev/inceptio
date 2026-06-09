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
