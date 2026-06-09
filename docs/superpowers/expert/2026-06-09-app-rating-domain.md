# Domain Audit — In-App Rating Prompt (Apple + Google policy reality)

**Date:** 2026-06-09
**Advisor:** Compound V Phase 1B (domain-expert)
**Spec audited:** `docs/superpowers/specs/2026-06-09-app-rating-prompt-design.md`
**Domain:** App Store ratings/reviews policy (Apple `SKStoreReviewController` / StoreKit `requestReview`, Apple Review Guidelines §1.1.7 / §5.6, Apple HIG; Google Play In-App Review API + Play policy) as wrapped by `expo-store-review`.
**Verdict headline:** Spec's compliance reasoning is **substantially correct** — among the most policy-careful rating designs I've audited. **Zero must-change compliance items.** One **must-change factual correction** (TestFlight smoke claim, LG1) and a handful of nice-to-know hardening notes.

---

## 1. Domain(s) Identified

1. `app-store-review` — Apple Review Guidelines + StoreKit ratings API + HIG
2. `play-in-app-review` — Google Play In-App Review API + Play Developer Program Policy
3. `expo-store-review` (library wrapper) — overlaps Phase 1C; flagged here only where its behavior changes a **policy/smoke** conclusion.

No KB file exists for this domain (existing KB = astrology, i18n only). A new KB file was **created** (see §9).

---

## 2. Sources Consulted

KB reused: none (no matching domain file existed).

Primary / authoritative:
- [Apple — Ratings, reviews, and responses](https://developer.apple.com/app-store/ratings-and-reviews/) — "You can prompt for ratings up to three times in a 365-day period."
- [Apple — App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — Introduction + §5.6 Developer Code of Conduct (subsections 5.6.1–5.6.4; 5.6.3 = App Store Reviews) + §3 Business.
- [Apple — SKStoreReviewController](https://developer.apple.com/documentation/storekit/skstorereviewcontroller) and [requestReview()](https://developer.apple.com/documentation/storekit/skstorereviewcontroller/requestreview())
- [Apple HIG — Ratings and reviews](https://developer.apple.com/design/human-interface-guidelines/ratings-and-reviews) (prose retrieved via secondary index; see below)
- [Google — In-App Reviews API guide](https://developer.android.com/guide/playcore/in-app-review) — design/quota/"surface as-is" rules.
- [Expo — StoreReview SDK doc](https://docs.expo.dev/versions/latest/sdk/storereview/) — `isAvailableAsync` / `hasAction` / `requestReview` / `storeUrl` behavior incl. TestFlight.

Practitioner / community (Layer 2):
- [9to5Mac — App Store now requires the official API, disallows custom prompts (2017)](https://9to5mac.com/2017/06/09/app-rating-custom-prompts-app-store-banned/) — origin of the custom-prompt ban.
- [RevenueCat — How to "hack" your app-store ratings](https://www.revenuecat.com/blog/engineering/how-to-hack-your-app-store-ratings/) — gating-vs-targeting framing.
- [ASO Maniac — App Store Review Popup Guide (2026)](https://asomaniac.com/blog/app-store-review-popup) — pre-prompt pattern "genuinely controversial."
- [Critical Moments — SKStoreReviewController guide](https://criticalmoments.io/blog/skstorereviewcontroller_guide_with_examples) and [improve app ratings](https://criticalmoments.io/blog/improve_app_ratings)
- [AppReply — App Store Reviews 101 (2026)](https://appreply.co/blog/app-store-reviews-101); [Apptweak (2026)](https://www.apptweak.com/en/aso-blog/how-to-get-more-app-reviews); [Braze dos/don'ts](https://www.braze.com/resources/articles/app-rating-campaign-dos-and-donts)

Search queries run (10, parallel): Apple guideline IDs for ratings; "must not call requestReview from button"; Play In-App Review policy; sentiment-gate/steering rejection; iOS `action=write-review` deep link; SKStoreReview 3/365 + no callback; r/iOSProgramming rejection (no hits); r/<play> FakeReviewManager (no hits); best-practice gotchas 2026; expo-store-review SDK 55 API.

**Honesty note:** the two `site:reddit.com` Layer-2 queries returned **no results** — I have **no Reddit corroboration** to offer. The community claims below rest on developer-blog/vendor sources, not a ≥10-thread forum corpus, and are labeled accordingly. No citation in this audit is fabricated; where I could not retrieve verbatim Apple HIG prose from the JS-rendered page, I attribute the wording to the secondary index that surfaced it and mark it as such.

---

## 3. Findings — confirm/challenge the 8 questions (PASS / CONCERN per item)

### Q1 — Native-API-only, no custom UI (§2.1) → **PASS (correct and effectively required)**
- Apple has **required the official API and disallowed custom rating prompts since iOS 11 / June 2017** ([9to5Mac](https://9to5mac.com/2017/06/09/app-rating-custom-prompts-app-store-banned/)). The enforcement hook is the Developer Code of Conduct manipulation language: per the [Review Guidelines Introduction](https://developer.apple.com/app-store/review/guidelines/), *"If you attempt to cheat the system (for example, by trying to trick the review process… manipulate ratings or App Store discovery) your apps will be removed."* Custom star UIs that pre-collect a rating are read as manipulation of the official flow.
- Google is equally explicit: *"Surface the card as-is, without tampering or modifying the existing design in any way, including size, opacity, shape, or other properties. Don't add any overlay on top of the card or around the card."* ([Play guide](https://developer.android.com/guide/playcore/in-app-review)). The spec's "never modify, resize, or overlay the system card" maps 1:1.
- **Nuance the spec already has right:** there is **no custom star UI even as a pre-step** — that is the line. Spec is clean.

### Q2 — No sentiment gate / no Yes→store-No→feedback steering; independent feedback row (§2.2) → **PASS, and the spec's two-independent-rows pattern is the correct compliant shape**
- Review **gating** (route happy→store, unhappy→form) is the canonical prohibited pattern. The widely-cited form is the "Are you enjoying [app]?" Yes/No that branches to the store only on Yes. Apple treats this as steering/manipulation of the rating system; it is a known rejection cause ([AppReply 2026](https://appreply.co/blog/app-store-reviews-101); [RevenueCat](https://www.revenuecat.com/blog/engineering/how-to-hack-your-app-store-ratings/)).
- **Critical clarification the spec must hold the line on:** several 2026 ASO blogs ([ASO Maniac](https://asomaniac.com/blog/app-store-review-popup), [Apptweak](https://www.apptweak.com/en/aso-blog/how-to-get-more-app-reviews)) actively *recommend* a "pre-prompt satisfaction gate" / "How's your experience?" two-step. **That advice is exactly what §2.2 forbids, and the spec is right to forbid it.** The blogs' "it's allowed if it's internal feedback, not tied to the App Store" carve-out is a **gray zone that depends on the gate not deciding who reaches the native card.** The spec's design sidesteps the gray zone entirely: feedback and Rate are **two peers in Settings, neither conditioned on the other, and neither sits in the automatic prompt's path.** That is the safe-harbor shape — not steering, because nothing branches.
- **Verdict:** independent, always-available feedback row that is **not a gate before the prompt** = compliant and is the recommended pattern. PASS.

### Q3 — Manual "Rate Inceptio" row must NOT call `requestReview`; opens store write-review URL (§7 D8 Row 2) → **PASS (this is the textbook-correct distinction)**
- Apple/StoreKit guidance is explicit that `requestReview` is **not** for button taps: *"It is not appropriate to call [it] in response to a button tap… If you put request review in [a] button callback, iOS might decide not to show anything… the user might think your app is not functioning."* Expo's own doc repeats it verbatim: **"Don't call `StoreReview.requestReview()` from a button."** ([Expo StoreReview](https://docs.expo.dev/versions/latest/sdk/storereview/)).
- The correct manual route is a deep link to the **write-a-review** page: append **`?action=write-review`** to the product URL — `https://apps.apple.com/app/id<APP_ID>?action=write-review`, or `itms-apps://…?action=write-review` to skip the Safari hop. Confirmed convention ([716 Labs](https://www.716-labs.com/startupappinfo_subdomain/improve-your-chance-of-getting-ios-app-reviews-by-deep-linking-to-the-review-page-in-the-app-store/), [Airship](https://support.airship.com/hc/en-us/articles/360033591811-iOS-App-Review-Deep-Link)).
- The spec's fallback chain `StoreReview.storeUrl()` → hardcoded native URL → web URL is sound. **One refinement (nice-to-know):** `expo-store-review.storeUrl()` returns the URL from `Constants.expoConfig.ios.appStoreUrl` / `android.playStoreUrl` — that is the **plain listing**, *not* the `action=write-review` page. To actually land on the write-review screen (the spec's intent in Row 2), the **hardcoded iOS URL should carry `?action=write-review`**; don't rely on `storeUrl()` for the write-review deep link. Spec already says "hardcoded native/web URL" — just make sure the iOS one includes the query param.

### Q4 — Fire on save-success + qualifying result-view at a natural break (§4) → **PASS; the save-tap concern is correctly neutralized**
- This is the platform-recommended pattern. Apple HIG: *"Make the request when users are most likely to feel satisfaction… such as when they've completed an action… and make sure not to interrupt their activity"*; *"Never ask for a rating on first launch or during onboarding"*; *"Look for logical pauses or stopping points"* (HIG prose surfaced via [Appbot's HIG index](https://appbot.co/blog/prompting-for-app-reviews-ratings-ios-android-ultimate-guide/) and corroborated by [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/ratings-and-reviews)). Google: *"Trigger the in-app review flow after a user has experienced enough of your app or game to provide useful feedback"* ([Play guide](https://developer.android.com/guide/playcore/in-app-review)).
- **On the "save is a user tap → is this button-triggered?" worry:** the prohibition is specifically about wiring `requestReview` to a button **whose purpose is to request a review** (a "Rate us" button), because the no-op makes the button look broken. Firing **after a save *succeeds*, at the natural break that follows** — where the user's tap purpose was "save," not "review" — is precisely the HIG "after a completed action" pattern, not a review-button. The distinction the spec draws (prompt is a consequence of a completed positive action, not the button's function) is **sufficient and correct.** PASS.
- Minor reinforcement: this is *why* the firing must be **post-success only** (spec already requires it) — firing on a *failed* save would be the tone-deaf "after an error" anti-pattern the HIG warns against.

### Q5 — OS quotas + no outcome callback (§2.5, §5) → **PASS (both facts confirmed)**
- **iOS: ≤3 prompts / 365 days, rolling, per user per app.** Apple states it directly: *"You can prompt for ratings up to three times in a 365-day period."* ([Apple ratings page](https://developer.apple.com/app-store/ratings-and-reviews/)).
- **Android: undocumented, time-bound, throttled quota.** Google does **not** publish a number: *"Google Play enforces a time-bound quota… calling `launchReviewFlow` more than once during a short period of time (for example, less than a month) might not always display a dialog."* ([Play guide](https://developer.android.com/guide/playcore/in-app-review)). Spec's "Android has its own (undocumented) quota" is exactly right.
- **No outcome callback on either platform — confirmed.** iOS: *"there's no programmatic way to know if your `requestReview` call displayed a prompt or not… no way to determine if the user rated your app or what rating they gave."* Android's `launchReviewFlow` completes **regardless of whether the dialog was shown or the user acted**, and by design tells you nothing about the outcome ([Play guide](https://developer.android.com/guide/playcore/in-app-review)). The spec's §2.4 "no outcome detection" and the absence of any `hasRated` key are **policy-correct, not just convenient.** PASS.

### Q6 — Local conservative policy (90d between, 2/365, 14d frustration) → **PASS (directionally correct, aligned with Apple's intent)**
- Layering your **own** cooldown *under* the OS cap is explicitly the recommended posture. Apple HIG: *"Don't be a pest… Allow at least a week or two between rating requests and only prompt again after the user has demonstrated additional engagement."* Practitioner consensus echoes "90-day cooldown + lifetime cap of 2–3" as the standard guardrail ([Apptweak 2026](https://www.apptweak.com/en/aso-blog/how-to-get-more-app-reviews), [Braze](https://www.braze.com/resources/articles/app-rating-campaign-dos-and-donts)).
- Defaults are **conservative in the right direction:** 90d ≫ the HIG "week or two" floor; 2/365 sits under the iOS hard 3. Nothing here is wrong directionally. The post-launch dial order in LG8 (loosen frustration→7d first, then attempts→3) is the right sequence — relax the *self-imposed* clamp before approaching the *OS* ceiling.

### Q7 — Frustration cooldown written on a feedback-channel **tap** (action-only, no sentiment) (§5 Layer 2) → **PASS (sound and compliant; does NOT edge into sentiment-gating)**
- The bright line for the prohibited pattern is **reading or asking sentiment to decide who gets the native prompt.** The spec does neither: it records `lastFrustrationAt` on the *action* of opening the feedback channel and never asks "do you like the app," never branches the prompt on an answer. It is a **suppression heuristic, not a gate** — it can only *withhold* a future prompt, never *route* a user toward or away from the store based on inferred mood.
- One subtlety worth stating plainly so the plan author doesn't over-read it: this is the inverse of gating. Gating uses sentiment to **select who is asked**; this uses an action to **delay everyone's next ask after a have-something-to-say moment.** No store treats "we asked fewer people, more gently" as a violation — the violations are *steering* and *manipulation*, both of which require a sentiment branch this design lacks. **Domain verdict: compliant.** Keep the "action-only, never read sentiment" comment in the code as the load-bearing rationale.

### Q8 — What the spec missed / extra domain notes
- **(must-change, factual) TestFlight smoke claim is wrong.** Spec **LG1** says *"iOS shows it in dev/TestFlight."* Expo's doc states `isAvailableAsync()` **resolves `false` on TestFlight** ([Expo StoreReview](https://docs.expo.dev/versions/latest/sdk/storereview/)), and the underlying StoreKit `requestReview` is **suppressed in TestFlight builds** — the card does **not** reliably appear there. The reliable iOS smoke surface is a **Debug/development build on a real device** (and even there StoreKit may decline). **Fix LG1's iOS leg** to: "iOS card is testable on a development build on a real device; **TestFlight suppresses it** — do not treat TestFlight non-appearance as a wrapper bug." This mirrors the Android caveat the spec already got right (Play card only shows for a Play-installed/internal-track build).
- **(nice-to-know) `requestReview` is best-effort even when eligible.** The system may show nothing at all for reasons outside the quota (StoreKit's own "if appropriate" logic). The spec's fire-and-forget `.catch(()=>{})` and "record our own call, not the outcome" already handle this — just make sure LG1 doesn't assert "card MUST appear," only "card MAY appear; absence is not a failure."
- **(nice-to-know) Guideline citation for the LG11 self-check.** The right numbers to cite in the pre-submission self-check: Apple **§5.6 Developer Code of Conduct** (subsection **5.6.3 App Store Reviews**) + the **Introduction** manipulation clause + **§3** business clause on incentivized/fake reviews; Google **Play Developer Program Policy — "Ratings, Reviews, and Installs"** (spam/manipulation) plus the In-App Review API design rules. §1.1.7 is **Safety/harmful-content**, *not* ratings — if the dispatch text cited 1.1.7 for manipulation, that's a mis-citation; the manipulation home is **§5.6 / Intro / §3**, not 1.1.7.
- **(nice-to-know) Incentive ban is absolute and symmetric** — confirmed and already in §2.3. Apple: *"manipulate reviews, inflate your chart rankings with paid, incentivized, filtered, or fake feedback"* → expulsion. You may **not** reward *or* penalize, and may not gate features on rating. Spec's §2.3 covers both directions; no change.
- **(nice-to-know) GDPR / mailto diagnostic footer.** Restricting the footer to **app version / OS / resolved locale** and explicitly excluding user IDs and saved-moment data is **fine and the right call** — none of those three are personal data under GDPR, and the user is the one composing/sending the mail (they see the body before send), so there's no silent transmission. No DPA concern. Keep it as specified.
- **(nice-to-know) Accessibility.** The native cards are OS-rendered and inherit VoiceOver/TalkBack — nothing to do there. **Your** two Settings rows must be reachable by screen reader and meet hit-target size; the mailto-fallback "copy to clipboard + toast" must announce via the live region (the toast should be accessibility-announced, not visual-only). Add to the on-device smoke.
- **(nice-to-know) No 2026 policy reversal found.** No 2026 change loosens or tightens the in-app-review rules in a way that affects this design. Google's 2026 policy updates ([appsonair roundup](https://www.appsonair.com/blogs/2025-mobile-app-store-policy-updates), [Play announcement Apr-15-2026](https://support.google.com/googleplay/android-developer/answer/16926792?hl=en)) concern billing/US-state app-store-bill changes and unrelated content policy — **nothing on ratings prompts.** The 3/365 + custom-prompt-ban + gating-ban regime is unchanged.
- **(nice-to-know) Play Console prerequisite for the Android smoke** (spec LG1 already notes this): the in-app review card renders **only for an app installed via Google Play** (internal test track or higher) and **never for a sideloaded dev-client**; tests must use **`FakeReviewManager`** (spec §11 has this). Correct as written.

---

## 4. Design Constraints for the Plan (treat as non-negotiable)

These are domain boundaries the plan must satisfy. The first is a **must-change to the spec text**; the rest confirm constraints already present — keep them.

1. **MUST correct LG1 (must-change):** iOS in-app card is **not** reliably shown in **TestFlight** (`isAvailableAsync → false` there); smoke the iOS card on a **development build on a real device**, and treat absence as "system declined," never as a wrapper failure. ([Expo](https://docs.expo.dev/versions/latest/sdk/storereview/))
2. **MUST** use only the native card (`expo-store-review` → StoreKit / Play In-App Review). No custom star UI, no overlay, no resize. ([Play guide](https://developer.android.com/guide/playcore/in-app-review))
3. **MUST NOT** ask any sentiment question or branch any flow (Settings or otherwise) on inferred/asked sentiment to decide who reaches the native card. Feedback and Rate stay **two independent peers**, neither gating the other. ([RevenueCat](https://www.revenuecat.com/blog/engineering/how-to-hack-your-app-store-ratings/))
4. **MUST NOT** call `requestReview` from any button (including the `__DEV__` "Force `requestReview()`" row in production — verify the prod-strip, LG9). The manual "Rate Inceptio" row **MUST** deep-link to the store, and the iOS URL **MUST** carry `?action=write-review`. ([Expo](https://docs.expo.dev/versions/latest/sdk/storereview/), [Airship](https://support.airship.com/hc/en-us/articles/360033591811-iOS-App-Review-Deep-Link))
5. **MUST** fire only after a **completed positive action at a natural break** (save-success, qualifying result-view) — never first launch, onboarding, mid-task, or after an error. ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/ratings-and-reviews))
6. **MUST** stay fire-and-forget with **no outcome detection** (no platform reports shown/rated). No code path may depend on "did they rate." ([Apple ratings](https://developer.apple.com/app-store/ratings-and-reviews/), [Play guide](https://developer.android.com/guide/playcore/in-app-review))
7. **MUST** respect OS quotas (iOS 3/365 rolling; Android undocumented throttle) and keep self-imposed caps (90d / 2-per-365 / 14d) **under** them. ([Apple ratings](https://developer.apple.com/app-store/ratings-and-reviews/))
8. **MUST NOT** incentivize or penalize rating in any direction, or gate any app functionality on it. (Apple §5.6 / §3; Play ratings policy)
9. **LG11 self-check SHOULD cite the correct guideline IDs:** Apple **§5.6.3 + Intro + §3** (not §1.1.7) and Play **Ratings/Reviews/Installs** policy.
10. **SHOULD** include the two Settings rows + the mailto clipboard-fallback toast in the accessibility pass of the on-device smoke (screen-reader announce, hit-target).

---

## 5. Common Traps in This Domain
- **Trap: "pre-prompt satisfaction gate" is widely recommended in 2026 ASO blogs** — and is the exact gating pattern Apple rejects when it decides who reaches the store card. The spec avoids it; the plan must not "add a quick are-you-happy step" later thinking it's best practice. It isn't safe.
- **Trap: wiring `requestReview` to a "Rate us" button** — looks fine, no-ops silently, looks broken to users, and conflates the manual path with the automatic one. Spec correctly splits them.
- **Trap: assuming TestFlight = production rendering for the card** — it doesn't; TestFlight suppresses it. (This is the spec's one factual slip.)
- **Trap: trying to detect/branch on outcome** — impossible by design on both platforms; any "if they didn't rate, ask again" logic is both unbuildable and against the throttle intent.
- **Trap: `storeUrl()` returns the listing, not the write-review page** — for a manual rate link you must add `?action=write-review` yourself on iOS.

## 6. Regulatory / Compliance Notes
- Not a regulated domain in the GDPR/HIPAA sense; the "regulation" here is **platform policy** (Apple Review Guidelines §5.6/§3/Intro; Google Play Developer Program Policy). Violation consequence is **app removal / developer-program expulsion**, not a fine.
- GDPR touchpoint is only the mailto footer; restricting to version/OS/locale and user-initiated send keeps it out of scope. No DPA, no consent banner needed.

## 7. Recent Breaking Changes (last 12 months)
- **None affecting this feature.** Google's 2026 policy cycle (billing / US app-store-bill compliance, Apr-15-2026 announcement) and Apple's periodic guideline refreshes did **not** change the ratings-prompt regime (custom-prompt ban since 2017, 3/365, gating ban) ([appsonair 2026 roundup](https://www.appsonair.com/blogs/2025-mobile-app-store-policy-updates), [Play announcement](https://support.google.com/googleplay/android-developer/answer/16926792?hl=en)). `expo-store-review` latest is **56.x** while the app targets SDK 55 — confirm the SDK-55-pinned version's `hasAction`/`storeUrl` surface in Phase 1C (library validator), not here.

## 8. Open Questions for the Human (product/owner)
1. **(LG5) Real store IDs / write-review URL** — App Store ID + Play package name don't exist until the app is created in the stores. Until then Row 2 ships dormant. Owner must supply at launch. *(spec already flags)*
2. **(LG6) `emailSubject` strategy (a) plumbing vs (b) localized key** — owner sign-off pending. *(spec already flags)*
3. **(LG5) Support email address** — placeholder `support@inceptio.app`; owner to confirm. *(spec already flags)*
4. **Distinct-days floor ≥2 vs ≥3** — owner-tunable conservatism knob; default ≥2. Pure product call. *(spec already flags)*
These are all already surfaced in the spec; no *new* human-only blockers emerged from the domain review.

## 9. Knowledge Base Updates
Created **`docs/superpowers/expert/_knowledge-base/app-store-review.md`** (no prior file). Captured a reusable matrix: native-API-only rule, gating prohibition + the "two-independent-peers" safe shape, `requestReview`-not-from-button + `action=write-review` convention, iOS 3/365 + Android-undocumented quotas, no-outcome-callback, TestFlight-suppresses-card, Expo `storeUrl()`-returns-listing-not-write-review, guideline-ID map (§5.6.3 / §3 / Intro; §1.1.7 is NOT ratings). All entries source-cited.
