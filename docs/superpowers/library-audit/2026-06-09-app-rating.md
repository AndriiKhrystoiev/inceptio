# Library Audit — In-App Rating Prompt (CLIENT-ONLY)

**Date:** 2026-06-09
**Topic:** `expo-store-review` + supporting libs for the rating-prompt feature
**Spec:** `docs/superpowers/specs/2026-06-09-app-rating-prompt-design.md`
**Phase:** Compound V Phase 1C — Library & Documentation Validation
**Verdict:** Spec's `expo-store-review` API assumptions are **correct**. ONE hard blocker: **`date-fns` is not installed** — §5/§6 must not import it.

---

## 1. Tools Available

- **Context7:** ❌ for `expo-store-review` / `expo` — `resolve-library-id` returned only `/hyochan/expo-iap` (unrelated). Expo SDK packages are not individually indexed in Context7. **Fell back to WebSearch + GitHub source + npm + Expo docs.** Mode: partially DEGRADED (WebSearch + first-party GitHub source for the API surface).
- **Manifests inspected:** `apps/mobile/package.json` (read), repo-wide `package.json` grep, `apps/mobile/node_modules` + root `node_modules` direct listing.
- **Source-of-truth used for API surface:** `expo/expo` GitHub `packages/expo-store-review/src/StoreReview.ts` (master) + official Expo StoreReview docs.

---

## 2. Libraries Mentioned

| Library | Spec context | Current ver (npm) | Repo pinned | SDK-55 line | Maintenance | Status |
|---|---|---|---|---|---|---|
| `expo-store-review` | Native in-app review (§9 prereq, §6 wrapper) | **56.0.3** (latest = SDK 56) | **NOT installed** (new dep) | **`~55.0.x`** via `npx expo install` | First-party Expo, actively maintained | 🟢 OK — add it |
| `date-fns` | §5/§6 cooldown math (`isAfter`,`addDays`,÷24) | 4.4.0 | **NOT installed anywhere** | — | active | 🔴 **NOT PRESENT — see Finding 1** |
| `date-fns-tz` | §5 "note if relevant" | — | **NOT installed** | — | active | 🟢 Not needed (cooldowns are tz-agnostic) |
| `expo-clipboard` | §7 mailto fallback | 56.x (latest) | **`~55.0.13` ✅ installed** | matches | first-party | 🟢 OK — already a dep, already used |
| `Linking` (react-native) | §7 mailto + canOpenURL | n/a (RN core) | RN `0.83.6` ✅ | n/a | core | 🟢 OK |
| `expo-constants` | §7 diagnostic footer (app version) | — | `~55.0.16` ✅ installed | matches | first-party | 🟢 OK |
| `expo-application` | (alt for version) | — | `~55.0.15` ✅ installed | matches | first-party | 🟢 OK |

**Install command (confirmed correct):** `npx expo install expo-store-review` — resolves the SDK-55-pinned version (`~55.0.x`), NOT bare `npm i expo-store-review` (that pulls 56.0.3 and mismatches the SDK).

---

## 3. API Signatures Verified

Source: `expo/expo` `packages/expo-store-review/src/StoreReview.ts` (master) + Expo docs. Signatures are **stable across SDK 54→56**; the SDK-55 surface matches the spec exactly.

| Spec assumption | Verified signature | Match? |
|---|---|---|
| `StoreReview.requestReview(): Promise<void>` | `requestReview(): Promise<void>` | ✅ exact |
| `StoreReview.isAvailableAsync(): Promise<boolean>` | `isAvailableAsync(): Promise<boolean>` | ✅ exact |
| `StoreReview.hasAction(): Promise<boolean>` | `hasAction(): Promise<boolean>` | ✅ exact |
| `StoreReview.storeUrl(): string \| null` | `storeUrl(): string \| null` | ✅ exact |

No method on the spec's wrapper surface is renamed, deprecated, or removed. The wrapper plan in §6 (`store-review.ts` thin wrapper around these four) is sound as written.

**Semantics (verified, drives EC1/D8 logic):**
- `hasAction()` implementation = `!!storeUrl() || (await isAvailableAsync())` — true when EITHER a configured store URL exists OR native review is available. So the spec's §7 "`hasAction()===false` → soft no-op" is the right guard for the manual "Rate" row.
- `isAvailableAsync()` resolves `false` on Web always; on iOS historically `false` under TestFlight in older docs (see §4 caveat — docs are inconsistent; treat TestFlight as best-effort). On Android `true` for Android 5.0+.
- `storeUrl()` returns the URL composed from `Constants.expoConfig.ios.appStoreUrl` / `.android.playStoreUrl`. Returns **`null` when those are absent** — directly relevant to the spec's owner-provided-at-launch App Store ID / Play package (§3 below).

---

## 4. Behavior Caveats (verified against docs/issues, not assumption)

**iOS:**
- `requestReview()` is the system `SKStoreReviewController.requestReview` path. It **silently no-ops when the OS quota is exhausted** (iOS ≤3 prompts / 365 days) — confirmed; the spec's EC2 ("API silently no-ops; undetectable") is correct.
- **No callback / no outcome signal** — confirmed. The promise resolves `void` whether or not the card showed or the user rated. Spec compliance guardrail §2.4 ("no outcome detection") is grounded in real API behavior, not an over-assumption. ✅
- **It DOES show in dev/Debug builds** on iOS (unlike Android). Under TestFlight, behavior is historically flaky/suppressed per older docs — treat TestFlight as "may not show," which the spec already does (LG1 says "iOS shows it in dev/TestFlight" — soften that: **dev = reliable, TestFlight = best-effort**).
- ⚠️ **iOS 26 behavior change (issue #41116, opened 2025-11-19):** on iOS 26 the system modal cannot be dismissed by tapping outside; "Not Now" is greyed out until interaction; after a star is picked it becomes Submit/Cancel. This is an **OS-level SKStoreReviewController change, not an expo bug** and **not blocking** — but worth noting for the on-device smoke (LG1) so the tester doesn't file it as a wrapper defect. No code change needed.

**Android:**
- The in-app card renders **only for Play-distributed builds (internal test track or higher)**. A sideloaded dev-client shows **nothing** — confirmed. Spec LG1-Android ("sideloaded dev-client shows nothing — expected, not a broken wrapper") is correct. ✅
- expo-store-review **does wrap the Play In-App Review API under the hood** on Android (Google Play Core review flow). ✅
- **`FakeReviewManager`** is the Google-documented test seam for the Play In-App Review API. The spec's §11 "use FakeReviewManager, never the real Play review manager in tests" is the correct Google guidance — **BUT note:** `FakeReviewManager` is a native Android/Play-Core construct exercised in **native/instrumented Android tests**, not in the Node/vitest unit layer. The spec's unit tests (eligibility.test.ts) never touch it, which is correct; FakeReviewManager only applies if/when native Android instrumented tests are added (none in this client-only scope). Treat §11's FakeReviewManager line as a note for any future native test, not a Phase-1 deliverable.

**`isAvailableAsync` / `hasAction` / `storeUrl` edges:**
- `isAvailableAsync()` → `false`: Web always; older/edge OS versions; (historically) TestFlight on iOS. On `false`, spec EC1 "no-op, burn no attempt slot" is correct.
- `storeUrl()` → on each platform returns the configured store URL **or `null`** if `appStoreUrl`/`playStoreUrl` not set in app config. **This is exactly the owner-provided dependency the spec flags** (App Store ID / Play package). Until those exist, `storeUrl()` returns `null`, so the §7 "Rate Inceptio" row's layered fallback (storeUrl → hardcoded native URL → hardcoded web URL) is **required**, not optional. ✅ spec already plans this.

---

## 5. App Config / Native Requirements

- **No config-plugin entry required.** `expo-store-review` is an autolinked native module with **no `plugins: []` array entry** in `app.json`. Confirmed against Expo docs + app-config schema.
- **No iOS entitlement, no `Info.plist` key** required for `requestReview` itself (StoreKit review is not gated by an entitlement or a queries scheme).
- **App config it DOES read:** `ios.appStoreUrl` and `android.playStoreUrl` in `app.json` — only consumed by `storeUrl()` / the fallback link path, NOT by the in-app `requestReview()` card. These are the owner-provided-at-launch values (§3 spec / LG5). Card works without them; the manual "Rate" link needs them (or the hardcoded fallbacks).
- **Dev-client rebuild REQUIRED — spec is correct (LG4).** Adding a new autolinked native module changes the native project; it will **not** hot-reload into the existing dev-client binary. Must run `npx expo run:ios` / `run:android` (or EAS build) to produce a new dev-client. `npx pod-install` runs as part of `expo run:ios`. ✅ confirmed.
- **`mailto:` caveat (§7) — iOS `LSApplicationQueriesSchemes`:** `Linking.canOpenURL('mailto:...')` on iOS can return `false` if the `mailto` scheme isn't declared in `LSApplicationQueriesSchemes`, AND there are known RN issues where `canOpenURL` returns `false` for `mailto` URLs **containing spaces/quotes in subject/body**, and differs sim-vs-device. **Design constraint:** the §7 fallback (canOpenURL → else clipboard) is the right shape, but (a) don't pass an un-encoded subject/body to `canOpenURL` — test against a bare `mailto:address` first, then `openURL` the full encoded URL; and (b) consider adding `mailto` to `LSApplicationQueriesSchemes` in `app.json` iOS `infoPlist` if `canOpenURL` proves unreliable on device. The clipboard fallback already covers the false-negative, so this is a robustness note, not a blocker.

---

## 6. Critical Findings 🔴

### Finding 1 — `date-fns` is NOT installed; §5/§6 must not import it. **CORRECTION TO SPEC.**

The spec §5 "Two day-semantics" and §6 explicitly say: *"Use duration-based date-fns helpers (`isAfter(addDays(...))` / hours÷24), **not** `differenceInCalendarDays`."* This presumes `date-fns` is a dependency.

**It is not.** Verified three ways:
- Not declared in `apps/mobile/package.json`, the repo-root `package.json`, or any `package.json` in the repo (grep returned nothing).
- Not present in `apps/mobile/node_modules/date-fns` or root `node_modules/date-fns`.
- Zero `import ... from 'date-fns'` anywhere in `apps/mobile/src`.

(CLAUDE.md lists `date-fns` + `date-fns-tz` under "Stack (locked)", but the **actual installed manifest does not include them** — CLAUDE.md is stale on this point, same class of drift as the MMKV→AsyncStorage drift the spec §3 already flagged.)

**The spec's *approach* is still 100% correct** — the codebase already does elapsed-duration math with **plain `Date.getTime()` arithmetic**, which is the house idiom:
- `MomentDetailScreen.js:52` / `NoViableScreen.js:37` / `CalendarScreen.js:96`: `now.getTime() + 30 * 24 * 60 * 60 * 1000`
- `cluster-windows.ts:106`: `(new Date(b).getTime() - new Date(a).getTime()) / 60000`
- `DatePickerScreen.js:38`: a **local** `addDays(date, n)` helper (not imported from date-fns).

**Resolution (no new dependency):** implement the cooldown elapsed-duration checks with native `Date` arithmetic:
```ts
const elapsedDays = (now.getTime() - new Date(stored).getTime()) / 86_400_000;
return elapsedDays < cooldownDays;   // < ⇒ exact threshold passes, per D6 guard 5/6
```
This satisfies every D5/D6 requirement (elapsed-instant, not calendar-day; BUG-001-safe; `<` boundary), keeps the pure fn dependency-free (which the spec WANTS for "Node, zero mocks"), and adds **no** library. **Do NOT `npx expo install date-fns` for this** — it would be a new dependency added solely to replace a one-line subtraction the codebase already does everywhere.

**date-fns-tz:** correctly irrelevant — cooldowns are elapsed-instant comparisons, not tz-bound. The spec's own §5 note ("device-local is correct here; no date-line hazard") holds; no tz library needed.

---

## 7. High-Priority Findings 🟠

None. (The date-fns issue is 🔴 corrected-to-no-dep, not 🟠.)

---

## 8. Medium Findings 🟡

### M1 — `npx expo install`, not `npm i`, for expo-store-review
npm "latest" is **56.0.3** (SDK 56). Bare `npm i expo-store-review` would install 56.x against an SDK-55 app → version-mismatch warnings / potential native-incompat. **Must use `npx expo install expo-store-review`** to get the `~55.0.x` pin. (Spec §9 already says `npx expo install` — confirmed correct, flagged so the plan doesn't regress to `npm i`.)

### M2 — iOS 26 modal dismissal change (issue #41116)
Not a blocker, not a wrapper bug. Note in the LG1 smoke checklist so the tester recognizes the new dismissal UX as an OS change.

### M3 — New Architecture compatibility
App is New-Arch-mandatory (Expo SDK 55, RN 0.83). `expo-store-review` is a first-party Expo module maintained in lockstep with the SDK and is New-Arch compatible at the SDK-55 line. No bridgeless/New-Arch issue found for this module. 🟢 effectively, logged as M3 for traceability.

### M4 — `mailto` canOpenURL false-negatives (see §5)
Robustness note on the §7 fallback: probe `canOpenURL('mailto:addr')` bare (not with encoded subject/body), and rely on the clipboard fallback for the false-negative case. Optionally declare `mailto` in iOS `LSApplicationQueriesSchemes`.

---

## 9. Design Constraints for the Plan (MUST / MUST NOT)

- **MUST** add the dep via `npx expo install expo-store-review` (gets `~55.0.x`); MUST NOT `npm i expo-store-review` (pulls SDK-56 56.0.3).
- **MUST** rebuild the dev-client after adding it (native module; no hot-reload). LG4 confirmed.
- **MUST NOT** import `date-fns` / `date-fns-tz` — neither is installed. Implement cooldown elapsed math with native `Date.getTime()` subtraction (the existing house idiom), keeping the pure fn dependency-free.
- **MUST** keep the §7 "Rate Inceptio" layered fallback (`storeUrl()` → native URL → web URL): `storeUrl()` returns `null` until owner supplies `ios.appStoreUrl` / `android.playStoreUrl`.
- **MUST** treat `requestReview()` as fire-and-forget with `.catch(()=>{})` — it returns `Promise<void>` with no outcome signal (verified); spec §2.4/EC2/EC8 are grounded in real API behavior.
- **MUST** guard the in-app card on `isAvailableAsync()` and **burn no attempt slot** when it is `false` (EC1) — correct given Web/sideload/edge-OS `false` returns.
- **MUST NOT** add a config-plugin entry or iOS entitlement/Info.plist key for `requestReview` itself — none is required.
- **SHOULD** probe `canOpenURL` with a bare `mailto:` (no spaces/quotes) and lean on the clipboard fallback for the iOS false-negative case.
- **NOTE for smoke (LG1):** iOS dev = card shows reliably; TestFlight = best-effort (soften the spec's "dev/TestFlight"); Android sideload = nothing (expected); iOS 26 modal dismissal differs (#41116, not a bug).

---

## 10. Spec Assumptions: Confirmed / Corrected

| # | Spec assumption | Verdict | Note |
|---|---|---|---|
| 1 | `requestReview(): Promise<void>` | ✅ Confirmed | exact |
| 2 | `isAvailableAsync(): Promise<boolean>` | ✅ Confirmed | exact |
| 3 | `hasAction(): Promise<boolean>` | ✅ Confirmed | `!!storeUrl() \|\| isAvailableAsync()` |
| 4 | `storeUrl(): string \| null` | ✅ Confirmed | `null` until app config has store URLs |
| 5 | `npx expo install expo-store-review` (SDK-55 ver) | ✅ Confirmed | `~55.0.x`; npm latest is 56.0.3 — use expo install |
| 6 | iOS: no callback / no outcome signal; silent no-op on quota | ✅ Confirmed | EC2/§2.4 grounded |
| 7 | Android card only on Play-distributed builds; sideload = nothing | ✅ Confirmed | LG1-Android correct |
| 8 | `FakeReviewManager` is the test seam | ✅ Confirmed (native Android only) | N/A to the Node unit layer; only for future instrumented tests |
| 9 | Dev-client rebuild required | ✅ Confirmed | new native module, no hot-reload |
| 10 | No config-plugin / entitlement / Info.plist for requestReview | ✅ Confirmed | only `ios.appStoreUrl`/`android.playStoreUrl` for storeUrl/fallback |
| 11 | expo-clipboard available for §7 fallback | ✅ Confirmed | `~55.0.13` already installed + already used in `YouScreen.js` |
| 12 | `Linking.canOpenURL('mailto:')` works under RN 0.83 | ⚠️ Mostly | iOS false-negatives w/ spaces/quotes + `LSApplicationQueriesSchemes`; clipboard fallback covers it (M4) |
| 13 | **date-fns helpers (`isAfter`,`addDays`) available; avoid `differenceInCalendarDays`** | ❌ **CORRECTED** | **date-fns is NOT installed.** Approach is right; implement with native `Date.getTime()` math, no new dep. (Finding 1) |
| 14 | date-fns-tz relevant? | ✅ Confirmed irrelevant | cooldowns are elapsed-instant, not tz-bound |
| 15 | New-Arch compatibility | ✅ Confirmed | first-party SDK-55 module, New-Arch OK |

---

## 11. Install + Config Steps

1. `npx expo install expo-store-review` (from `apps/mobile/`) → adds `~55.0.x`. **Do not** `npm i expo-store-review`.
2. **Rebuild the dev-client:** `npx expo run:ios` and/or `npx expo run:android` (runs pod-install on iOS). Native module — required before the wrapper works on device (LG4).
3. **No** `plugins` entry, **no** entitlement, **no** Info.plist key needed for `requestReview`.
4. When owner supplies them (launch): add to `app.json` → `expo.ios.appStoreUrl` and `expo.android.playStoreUrl` so `StoreReview.storeUrl()` returns non-null. Until then, the §7 hardcoded native/web URL fallbacks carry the manual "Rate" row.
5. **Cooldown math:** native `Date.getTime()` subtraction — **no `date-fns` install**.
6. `expo-clipboard` / `expo-constants` / `Linking`: already present, no install.
7. (Optional, M4) declare `mailto` in `app.json` → `expo.ios.infoPlist.LSApplicationQueriesSchemes` if device `canOpenURL` proves unreliable.

---

## 12. Open Questions for the Human (escalate)

1. **date-fns policy decision (the one real escalation):** Spec §5/§6 + CLAUDE.md both reference date-fns, but it is **not installed**. Recommended: implement cooldowns with native `Date` math, **no new dep** (matches the existing house idiom). Confirm we are NOT adding date-fns just to satisfy the spec's wording. *(Also: CLAUDE.md "Stack (locked)" lists date-fns/date-fns-tz that aren't actually installed — flag-don't-fix; same drift class as MMKV→AsyncStorage.)*
2. (Already owner-tracked, not new) App Store ID + Play package + support email are owner-provided-at-launch (LG5) — `storeUrl()` returns `null` until then; fallbacks required.

---

## 13. Knowledge Base Updates

Appended to `docs/superpowers/library-audit/_knowledge-base/expo-rn-store-review.md` (created — no prior file for this topic).
