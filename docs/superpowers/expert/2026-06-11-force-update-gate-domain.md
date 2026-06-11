# Domain Audit — Server-Driven Force-Update Gate + Soft Update Banner

**Date:** 2026-06-11
**Advisor:** Compound V Phase 1B (domain-expert pre-flight)
**Spec under audit:** `docs/superpowers/specs/2026-06-11-force-update-gate-design.md`
**Scope of this audit:** the user-facing and policy-sensitive surfaces — App Store / Play policy, the mass-lockout footgun class, store-version semver realities, update-prompt UX norms, and i18n of a force screen. NOT code review, NOT library currency (Phase 1A/1C own those).

---

## 1. Domain(s) Identified

1. **app-store-review** — Apple App Store Review Guidelines + Google Play policy on forced/mandatory updates (extends the existing KB, which was ratings-only).
2. **mobile-release-engineering** — store version propagation, phased/staged rollout timing, the "minVersion vs live store version" lockout class.
3. **i18n-localization** — force-screen copy across en/de/fr/es-419/pt-BR (existing KB covers most of this; see §5).

---

## 2. Sources Consulted

**KB reused (no re-verification needed — both < 6 months old, primary-sourced):**
- `_knowledge-base/app-store-review.md` (2026-06-09) — ratings regime; relevant for the §3.2.2 / §5.6 manipulation-guideline map. Does NOT cover force-update; this audit extends it.
- `_knowledge-base/i18n-localization.md` (2026-06-08) — Rules 9 (formatting), 11 (lexicon) directly apply; reused, not re-searched.

**Web — official / authoritative (Layer 1):**
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — fetched; §3.2.2(x), §4.2.3(i), §2.1, Design-section "stop working" clause.
- [Google Play — In-app updates](https://developer.android.com/guide/playcore/in-app-updates) — fetched; "immediate" (forced, blocking, fullscreen) update flow is an officially-supported, documented pattern.
- [Apple — Release a version update in phases](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases/) — fetched; 1/2/5/10/20/50/100% over 7 days; manual download always available; "Release to All Users" override exists.
- [iOS canOpenURL / LSApplicationQueriesSchemes (iOS 9 changes)](https://cromulentlabs.wordpress.com/2016/01/15/explanation-of-canopenurl-changes-in-ios-9/), [useyourloaf](https://useyourloaf.com/blog/querying-url-schemes-with-canopenurl/), [Apple forum "canOpenURL always false for itms-apps"](https://developer.apple.com/forums/thread/660021) — `itms-apps` must be in `LSApplicationQueriesSchemes` (without `://`) for `canOpenURL` to return true.

**Web — practitioner / community (Layer 2):**
- [Apple Developer Forums — "Best practice to force upgrade app"](https://developer.apple.com/forums/thread/107576) — the canonical practitioner thread.
- [Medium — Implementing App Version Control and Force Updates (Sohail Saifi, 2025-12)](https://medium.com/@sohail_saifi/implementing-app-version-control-and-force-updates-2b71a852f419).
- [Medium — Force Update & show new App Version is Available (Rajkumar, 2024-06)](https://sabapathy7.medium.com/force-update-show-new-app-version-is-available-ae97fee706b3).
- [DEV — Redirect Users to the App Store or Play Store in React Native](https://dev.to/amitkumar13/how-to-redirect-users-to-the-app-store-or-play-store-in-react-native-2hjd).
- [HN — Android developers can now force app updates](https://news.ycombinator.com/item?id=19915891).

**Web — audience / precedent (Layer 3):**
- [Quora — Why does WhatsApp force users to update](https://www.quora.com/Why-does-WhatsApp-forces-its-users-to-update-their-Application), [SiliconRepublic — WhatsApp persistent update messages](https://www.siliconrepublic.com/enterprise/whatsapp-policy-update-persistent) — establishes that hard/forced self-update is normalized for major apps without store rejection.
- [inconceptlabs — How to force update a mobile app](https://www.inconceptlabs.com/blog/force-update-mobile-app-when-new-version-available) — "wait one day before forcing" community guidance.

**Searches that returned nothing usable (stated honestly per citation rules):**
- `site:reddit.com force update ... locked out staggered rollout mistake` — **no links found.** No verifiable Reddit corpus on this exact failure. I therefore make NO "founders on Reddit report…" claim for the lockout footgun; it is sourced to official phased-release mechanics + isolated practitioner posts only.
- `site:stackoverflow.com itms-apps canOpenURL false` — no SO links surfaced; the LSApplicationQueriesSchemes claim is instead sourced to the Apple forum + two iOS-internals blogs above.

---

## 3. Domain Constraints the Brainstorm Probably Missed

### 3.1 Store-policy compliance — the good news (FYI, with one MUST)

**FYI — A forced self-update gate is NOT prohibited on either store, and is established practice.** The spec correctly assumes this but never cites why it's safe; here is the defensible basis so a reviewer/owner can sign off:

- Apple's only "force users to" prohibition is **Guideline 3.2.2(x)**: *"Apps must not force users to rate the app, review the app, download **other** apps, or other store-related actions in order to access functionality."* ([guidelines](https://developer.apple.com/app-store/review/guidelines/)). Updating **your own** app is not "downloading another app" and is not a "store-related action" in the 3.2.2 sense. This guideline does **not** bar a self-update gate.
- Precedent: WhatsApp and Signal ship hard "Update required to continue" gates; WhatsApp moved to persistent/limiting prompts without account deletion ([SiliconRepublic](https://www.siliconrepublic.com/enterprise/whatsapp-policy-update-persistent), [Quora](https://www.quora.com/Why-does-WhatsApp-forces-its-users-to-update-their-Application)). Banking and many consumer apps do the same. No evidence of rejection for forcing one's own update.
- **MUST be aware of the one real Apple soft-risk:** the Design-section clause *"Apps that stop working or offer a degraded experience may be removed from the App Store at any time"* ([guidelines](https://developer.apple.com/app-store/review/guidelines/)). This is about apps that are broken on the *current* store build, not about a server flag — but it means **the force gate MUST NOT be reachable in the build state a reviewer sees.** See §4.1 (the reviewer-lockout trap). The spec's "dormant until release #2 / no prior published version" framing (line 6) already mostly covers this, but it is not stated as a *review-safety* requirement — make it one.

### 3.2 Google Play — there is an official mechanism the spec didn't weigh (SHOULD-CONSIDER)

Google Play ships a first-party **Immediate in-app update** flow (Play Core / `AppUpdateManager`) — *"fullscreen UX flows that require the user to update and restart the app… blocks further use until the update finishes"* ([Play docs](https://developer.android.com/guide/playcore/in-app-updates)). This is exactly the spec's FORCE behavior, but Google-native: the update downloads **inside** the app, no store round-trip, and Google explicitly blesses it for "critical fixes like security issues or breaking API changes."

- The spec's design (`Linking.openURL(storeUrl)` → user leaves to Play Store → comes back) is **policy-allowed** and simpler/cross-platform, but it is the *less-preferred* path on Android. Google "recommends using the Play Core libraries API." Not a blocker, just a known divergence.
- **SHOULD-CONSIDER documenting the deliberate choice**: the spec uses a custom gate (one code path for both platforms, server-driven, OTA-independent, kill-switchable) over Play's immediate-update API (Android-only, can't be server-kill-switched the same way, needs `expo-in-app-updates` or a config plugin not currently in the stack). The custom gate is defensible — but record *why* Play's native flow was passed over, because a reviewer or future maintainer will ask. (Play's immediate flow also won't help iOS, so a custom gate is needed regardless; using both would mean two divergent code paths for the safety-critical surface — arguably worse.)

### 3.3 The store-URL scheme is under-specified and has a real canOpenURL trap (MUST-FIX)

The spec says only `Linking.openURL(storeUrl)` with `storeUrl` from the policy doc. Two domain facts the plan must encode:

- **MUST use the correct per-platform scheme.** Community-standard ([DEV](https://dev.to/amitkumar13/how-to-how-to-redirect-users-to-the-app-store-or-play-store-in-react-native-2hjd), [Expo into-other-apps](https://docs.expo.dev/linking/into-other-apps/)):
  - iOS: `itms-apps://apps.apple.com/app/id<APPLE_ID>` (opens the App Store app directly, no Safari bounce), with `https://apps.apple.com/app/id<APPLE_ID>` as fallback.
  - Android: `market://details?id=<PACKAGE>` (opens Play app directly), with `https://play.google.com/store/apps/details?id=<PACKAGE>` as fallback.
  - The spec lets the **Worker** supply `storeUrl` per platform. That's fine — but the policy doc/schema MUST carry the *scheme-correct* URL per platform, and an operator typo there is unfixable client-side (no OTA). The spec's `openFailed` toast (§10.2) is the right safety net; keep it.
- **MUST-FIX — `canOpenURL` gate for `itms-apps`/`market` requires LSApplicationQueriesSchemes.** The spec's §10.2 says `openFailed` "mirrors rating's `canOpenURL` guard." If the Update button calls `Linking.canOpenURL(storeUrl)` first (as the rating feature does), then on iOS **`itms-apps` must be declared in `LSApplicationQueriesSchemes`** (in `app.json` → `ios.infoPlist.LSApplicationQueriesSchemes: ["itms-apps"]`) or `canOpenURL` **always returns false** and the Update button dies for every user — a silent, OTA-unfixable lockout-with-no-exit. **Critical detail: list `itms-apps` WITHOUT the `://`** — including `://` makes `canOpenURL` return false too ([cromulentlabs](https://cromulentlabs.wordpress.com/2016/01/15/explanation-of-canopenurl-changes-in-ios-9/), [Apple forum 660021](https://developer.apple.com/forums/thread/660021)). Android 11+ similarly needs the Play intent visible, but `https://` Play URLs sidestep this. **Recommendation:** either (a) declare `itms-apps` in LSApplicationQueriesSchemes AND `market`/Play intent visibility, or (b) **skip `canOpenURL` entirely and `openURL` the `https://` store URL directly** (https never needs the query-schemes allowlist and always resolves to the store app on both OSes). Option (b) is the lower-risk default for a gate that cannot be hot-fixed — note the rating feature's pattern may not transfer cleanly here.

---

## 4. Common Traps in This Domain

### 4.1 The reviewer-lockout / chicken-and-egg trap (MUST-FIX awareness)

The spec's "dormant until release #2" (line 6) is the right instinct but the *reason* matters and a future bump can reintroduce the trap:

- **App Review reviews the NEW build on a device that does not yet have it as the "latest" store version.** If `minVersion` is ever set such that the build currently *under review* would itself be force-gated (e.g. operator bumps `min` to the version being submitted before it's live), the reviewer sees a non-dismissible "you must update" wall with no way forward → **near-certain rejection** under the "stop working / degraded experience" clause (§3.1). This is the classic chicken-and-egg.
- **MUST-FIX rule for the runbook (extends spec §6.5):** `minVersion` must always be `≤` the version that is **already live and fully propagated**, and **strictly less than** any version currently in review/phased rollout. The spec's rule #1 ("never set min above the published store version") covers the steady state; add the **in-review** case explicitly: *never set `min` to a version that is submitted-but-not-yet-Ready-for-Distribution.*

### 4.2 Phased / staged rollout makes "latestVersion" a moving, regional target (MUST-FIX)

This is the largest gap. Apple phased release ramps **1% → 2% → 5% → 10% → 20% → 50% → 100% over 7 days** ([Apple phased-release help](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases/)); Google staged rollout is operator-set % per track. Consequences the spec's §6.5 rule #2 names but under-specifies:

- **`latestVersion` (soft tier) MUST lag the rollout, not just `minVersion`.** The spec only mandates lagging *force* behind propagation. But if `latestVersion` is bumped on day 1 of a phased release, **99% of users** get a soft "update available" banner pointing at a version their auto-update hasn't delivered yet. They tap Update → land on the store → see no update (their % wave hasn't hit) → confusion. *Mitigant in Apple's favor:* "apps in phased release can be **manually downloaded by anyone at any time**" ([phased-release help](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases/)) — so iOS users *can* force the manual download. Android staged rollout does **not** offer this universal manual-download escape to the gated %. **MUST: set `latestVersion`/`minVersion` only after the build is at or near 100% rollout in all regions** (or, for soft, accept that early-bumped soft banners send some users to a store page with no visible update on Android — likely acceptable for soft, never for force).
- **Regional staggering is real and slow.** Store data replicates to hundreds of servers; propagation can lag up to ~24h and varies by region ([Apple forums via search](https://developer.apple.com/forums/thread/70511)). A `min` bump that's safe in the US can lock out a user in a late-propagating region. The spec's rule #2 says "all regions" — **good, keep it, and add a concrete wait (≥24h after Ready-for-Distribution + rollout at 100%) to the runbook** rather than the vague "full propagation."
- **Operator escape hatch worth documenting:** Apple's **"Release to All Users"** button collapses a phased rollout to 100% instantly ([phased-release help](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases/)). The force-bump runbook should say: *if you must force quickly, first hit "Release to All Users" (iOS) / set staged rollout to 100% (Android), confirm propagation, then bump `min`.* This converts the chicken-and-egg into a safe sequence.

### 4.3 The "user returns from store without updating" loop (covered — FYI)

Spec §7.3 handles this correctly (re-fetch on `active`, still `< min`, stays blocked; only a new `nativeApplicationVersion` after a real update clears it). No gap. FYI only.

### 4.4 The permanently-offline-after-operator-error case (accepted — FYI)

Spec §7.3 documents this residual risk and the reasoning (Worker-dependent app is unusable offline anyway). Domain-sound; no change. The ≤60s kill-switch is the right primary lever given no OTA.

---

## 5. Regulatory / Compliance Notes

- **No GDPR/privacy surface.** `GET /version-policy` is unauthenticated, read-only, carries no PII, sets no cookie, runs no analytics. The native version read (`nativeApplicationVersion`) is device-local. Nothing to disclose. (Consistent with the ratings-KB GDPR note.)
- **No accessibility *regulation* trigger** for a consumer app at this stage, but EN 301 549 v4.1.0 (→ WCAG 2.2) is finalizing Q3 2026 and is the direction of travel for EU public-sector/large-vendor apps ([CatDoes 2026](https://catdoes.com/blog/app-design-best-practices)). The spec's a11y section (§11) already targets WCAG-level behavior (focus management, live regions, 44×44 targets, AA contrast, reduce-motion). **No gap** — the spec is ahead of the requirement.
- **App Store policy is the only binding "regulation" here**, covered in §3.1: forced self-update is allowed; the only live risk is a reviewer hitting the wall (§4.1).

---

## 6. Recent Breaking Changes (last 12 months)

- **No 2026 store-policy change affecting forced updates.** Google's 2026 policy cycle is billing / US app-store-bill compliance (unrelated); Apple's recent guideline edits removed a *duplicative* "forcing users" passage but did not add any new self-update restriction ([Apple news](https://developer.apple.com/news/?id=ey6d8onl) referenced via search). The 3.2.2(x) / 4.2 regime is stable.
- **Android sideloading lockdown (in progress, 2025→2026)** ([HN 45575483](https://news.ycombinator.com/item?id=45575483), [HN 45908938](https://news.ycombinator.com/item?id=45908938)) — Google's developer-verification / sideloading restrictions are tightening but are **orthogonal** to in-app force-update logic; no action for this feature. FYI only.
- **`itms-apps` / `canOpenURL` behavior unchanged since iOS 9** — the LSApplicationQueriesSchemes requirement (§3.3) is long-standing, not new, but is a perennial trap. Not a "recent" change; flagged because it's easy to miss.

---

## 7. Design Constraints for the Plan (non-negotiable)

The plan author should treat these as MUST/MUST-NOT additions/confirmations to the spec.

**MUST-FIX (compliance / lockout risk):**

1. **MUST declare `itms-apps` in `ios.infoPlist.LSApplicationQueriesSchemes` (string `"itms-apps"`, no `://`) IF the Update button calls `Linking.canOpenURL` before `openURL`.** Otherwise iOS `canOpenURL` returns false for every user and the only Update affordance is dead — an OTA-unfixable lockout. **Preferred alternative:** use `https://apps.apple.com/...` / `https://play.google.com/...` URLs and skip `canOpenURL` (https never needs the allowlist). Do not assume the rating feature's `canOpenURL` pattern transfers. (§3.3)
2. **MUST carry scheme-correct, per-platform store URLs in the policy schema** (iOS `itms-apps://`/`https`, Android `market://`/`https`). An operator typo here is unfixable without a native release — keep the `openFailed` toast as the last-resort net. (§3.3)
3. **MUST extend the §6.5 runbook with the in-review case:** never set `minVersion` to a version that is submitted-but-not-yet-Ready-for-Distribution (the build under review must never force-gate itself → rejection). (§4.1)
4. **MUST set BOTH `minVersion` and `latestVersion` only after the target build is at 100% rollout AND ≥24h past Ready-for-Distribution in all regions** (phased release ramps over 7 days; regional propagation lags ~24h). For `force`, this is absolute. For `soft`, document the accepted edge (early-bumped soft banner may point Android users to a store page with no visible update). (§4.2)
5. **MUST add the "Release to All Users" / staged-rollout-to-100% step to the force runbook** as the prerequisite before any emergency `min` bump — it collapses the phased window and removes the chicken-and-egg. (§4.2)

**SHOULD-CONSIDER:**

6. **SHOULD document why the custom gate was chosen over Google Play's first-party Immediate in-app update flow** (cross-platform single path, server kill-switch, OTA-independence vs. Google's recommended Android-native API). A reviewer/maintainer will ask; the rationale is sound but currently unstated. (§3.2)
7. **SHOULD keep the force-screen copy framed as "needed," not "broken."** Apple's "apps that stop working" clause is about the app's own health; copy that says the app *is broken* could invite scrutiny. The current en draft ("This version of Inceptio is no longer supported. Update to keep choosing your moments.") is well-judged — preserve that "no longer supported / to keep using" framing across all 5 locales. (§3.1)

**i18n (mostly covered by the i18n KB — confirmations):**

8. **MUST NOT translate the store names as common nouns.** "App Store" and "Google Play" are proper nouns with official localized forms — but the spec's `actionHint` is deliberately generic ("Opens your app store") and avoids naming either store, which **sidesteps the whole problem cleanly**. Keep it generic; do not let a translator introduce "App Store"/"Google Play" literals that then need per-locale proper-noun handling. (Apple/Google do localize their store *brand* in some markets, but the generic phrasing is the safer, lower-maintenance choice. — FYI/SHOULD)
9. **MUST follow the existing i18n KB Rule 9** for any version/number rendering if a version string ever appears in copy (it currently does not — good; keep version numbers out of localized strings so no decimal-separator/format issue arises). (`i18n-localization.md` Rule 9)
10. **SHOULD apply i18n KB Rules 7–8** (es-419 neutral voseo-avoidance, pt-BR *você*) to the force/soft copy — these are chrome strings, owner-tone-reviewed, no astrologer review needed (spec §10.1 correct). The imperative "Update" / "Atualizar" / "Aktualisieren" / "Mettre à jour" / "Actualizar" forms are neutral and safe. (`i18n-localization.md` Rules 7, 8)

**Confirmations (spec already correct — no change needed):**

11. Fail-open contract, kill-switch-degrades-to-soft, force-is-time-free, in-memory-only persistence, dev-override, 60s TTL + while-gated poll, precedence ladder — all domain-sound. No gaps. (spec §5, §6, §7, §8)
12. UX anti-nag discipline: 7-day soft floor + per-version permanent silence is **sane and on the right side of the dark-pattern line** ([Bejamas dark patterns](https://bejamas.com/blog/10-dark-patterns-in-ux-design): "nagging = not accepting no"). Per-version permanent silence is the key non-dark-pattern move (a real, durable "no"). The soft banner having a true Dismiss (not "Later"/"Maybe") is correct. (spec §9)

---

## 8. Open Questions for the Human (product/business only)

1. **Apple App ID and Android package name for the store URLs** — needed to author the policy doc's `storeUrl` per platform. (Operational; not a design decision but blocks the runbook.)
2. **Is the `canOpenURL`-then-`openURL` pattern intended, or direct `openURL`?** This decides whether LSApplicationQueriesSchemes config is mandatory (§3.3, constraint #1). Engineering can decide, but it's a config-plugin change to `app.json` that touches the native build — flag early.
3. **Soft-tier rollout policy:** is product OK with the accepted edge that an early `latestVersion` bump during an Android staged rollout sends some users to a store page with no visible update? Or should `latestVersion` always wait for 100% rollout too? (§4.2 constraint #4). Recommend: wait for 100% for both, simpler mental model.
4. **First force event readiness:** the runbook (§4.1/§4.2) is human discipline with no automated guard against the in-review / phased-rollout lockout. Who owns the pre-bump checklist, and is a second-person sign-off required before any `min` bump? (Given no OTA escape, a two-person rule is cheap insurance.)

---

## 9. Knowledge Base Updates

Appended a new dated section to `_knowledge-base/app-store-review.md` — **"Force-update / mandatory-update gates"** — generalizing: the 3.2.2(x) scope clarification (forcing *own* update ≠ prohibited), the WhatsApp/Signal precedent, Google's Immediate in-app update flow, the phased/staged rollout `latestVersion`/`minVersion` lockout matrix, the chicken-and-egg in-review trap, and the `itms-apps`/`market` + LSApplicationQueriesSchemes store-URL rules. No prior entries deleted. (The i18n KB needed no update — Rules 7–9 already cover this feature's copy surface; this audit only references them.)
