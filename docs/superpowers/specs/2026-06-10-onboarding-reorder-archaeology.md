# Onboarding Reorder — Code Archaeology

Audit before reordering the first-run flow. Conclusion up top: **the activity-picker-first order is an accidental routing artifact, not a designed sequence.** The brand welcome has zero gating wiring — it survives only as the static initial `screen` value, and a later-added gate pre-empts it on first run.

## 1. The two screens

| Screen | SCREENS key | Copy (onboarding ns) | CTA → |
|---|---|---|---|
| Brand welcome (`OnboardingScreen.js`) | `onboarding` | `headline` "Every beginning has its moment." + `subhead` (L38 craft-lineage para) + `cta` "Find your moment" + `noAccount` | `go('today')` |
| Activity picker (`FirstLaunchActivityPicker.js`) | `first-launch-activity` | `welcome` "Welcome to Inceptio" + `prompt` "What kind of moment…" + 4 ActivityOption cards + `common:continue` + `changeHint` | `setDefaultActivity(sel)` + `go('today')` |

Both are in `MODAL_SCREENS` → tab bar hidden for both. Good.

**The picker is NOT reached via the SCREENS map.** It renders only through the early-return gate at `App.js:221`. **Nothing anywhere calls `go('onboarding')` or `go('first-launch-activity')`** — grep confirms zero navigations target either. `OnboardingScreen` exists in the SCREENS map purely as the initial `useState('onboarding')` value (App.js:102).

## 2. Gating state — there is no dedicated onboarding-complete flag

The first-run decision is made entirely by two preference stores:

```
inceptio.default_activity        → activity-preference hydrationStatus: 'loading'|'unset'|'set'
                                    UNSET = first run. SET = returning. (de-facto onboarding gate)
inceptio.onboarding_location_step_v1 → OnboardingLocationStatus: 'pending'|'skipped'|'completed'
```

- `setDefaultActivity()` flips `unset → set` and persists. **This is the only "onboarding complete" signal that exists.** No `seenWelcome` / `onboarding_complete` key exists (grep clean).
- Location status init (D14, location-preference.ts:89): at first boot, if activity is `unset` → location status seeded `'pending'`; if activity already `set` → `'completed'`. So the location gate only fires for fresh installs.

### rating.* independence — CONFIRMED ✔
Rating keys live in a separate namespace: `rating.distinctDayCount`, `rating.lastActiveDay`, `rating.successfulSearches`, `rating.firstSaveDone`, `rating.lastAttemptAt`, `rating.attemptsInWindow`, `rating.lastFrustrationAt`. No overlap with `inceptio.default_activity` or `inceptio.onboarding_location_step_v1`. A rating "Reset" cannot touch onboarding state, and onboarding cannot touch rating state. The reorder will not introduce a cross-link.

## 3. Actual routing (App.js render order)

```
boot → hydrateStorage → initActivityPreference → initLocationPreference → setStorageReady(true)
render:
  if !storageReady               → boot spinner
  if hydrationStatus==='loading'  → boot spinner
  L221  if activity UNSET && screen!=='first-launch-activity'   → render FirstLaunchActivityPicker   (gate A)
  L233  if activity SET && locStatus==='pending' && screen!=='set-default-location' → SetDefaultLocationScreen (gate B)
  L250  else → SCREENS[screen] (default 'onboarding' = OnboardingScreen)
```

**Fresh install (activity unset):**
1. `screen='onboarding'`, activity `unset`. **Gate A fires → activity picker.** Brand welcome is shadowed — never rendered.
2. Pick + Continue → `setDefaultActivity` (→set), `go('today')`.
3. Gate B fires (loc status was seeded `pending`) → SetDefaultLocationScreen ("Skip for now").
4. Skip/confirm → Today.

Net first-run sequence: **activity-picker → location-gate → Today. Welcome NOT shown.**

**Returning user (activity set, location done):**
1. `screen='onboarding'`, activity `set`. Gate A skip, Gate B skip (status not `pending`).
2. `SCREENS['onboarding']` = **OnboardingScreen renders — every cold launch.** User must tap "Find your moment" to reach Today.

## 4. Verdict: artifact, not design

The welcome is **inverted** relative to intent — never shown when it should be (first run), always shown when it shouldn't be (every returning launch). This is structural, not cosmetic:

- The welcome has no completion flag and no inbound navigation. It is only the default `screen` value.
- The activity-picker gate (commits `4491b14` → `39f086d`, added after the welcome) early-returns *before* the default screen renders, so it pre-empts the welcome on first run.
- The two screens are wired by two different mechanisms (SCREENS-map default vs early-return gate) that never compose into a "welcome → picker → app" sequence.

So this task is **"fix a skipped-screen bug + add real first-run gating,"** not a pure reorder.

## 5. Regression surface

| Path | If reorder is wrong |
|---|---|
| Returning user cold launch | Today must be the landing. If `screen` stays initialized to `'onboarding'`, returning users keep seeing the welcome every launch (current bug must be fixed, not preserved). |
| Fresh install | Welcome must show once, then picker. Risk: gate A still pre-empting welcome, or welcome showing twice (no persisted "advanced past welcome" sub-state). |
| Location gate (B) | Currently part of the fresh-install chain after the picker. Reorder must not strand or double-fire it. **Scope question — see §7.** |
| Activity preference reset (You→Settings) | Reset flips activity → `unset`; first-run chain should re-fire welcome+picker. Verify reset path still routes correctly. |
| Rules of Hooks | All gate hooks are above the boot return (App.js:188–195). Any new sub-state must keep hook order stable — no hooks after a conditional return. |

## 6. DRY

No duplicate welcome/picker logic to refactor. Reuse the existing `hydrationStatus` (`unset`/`set`) as the first-run signal — do **not** introduce a new `seenWelcome` flag unless the welcome needs to be dismissible independently of the activity choice (open question §7).

## 7. Design decisions for the spec (blocking — confirm before implementing)

1. **Sequencing mechanism.** Welcome→picker during `unset`. Either (a) widen gate A to render welcome first then picker (welcome CTA `go('first-launch-activity')`, gate already lets that key through), or (b) drive both via `screen` and change the initial value off `'onboarding'`. (a) keeps the gate as the single first-run authority and is lower-risk.
2. **Returning-user landing.** Initial `screen` must resolve to `'today'` for `set` users (today, it's `'onboarding'`). Confirm the fix is "change the default landing," not "preserve welcome-every-launch."
3. **Location gate scope.** The described target ("welcome → picker → Continue → app") omits the existing SetDefaultLocationScreen step. Keep it in the chain (welcome → picker → location → Today) or is it out of scope for this branch?
4. **Picker header copy.** `welcome` = "Welcome to Inceptio" should be trimmed now that the welcome screen precedes it. Drop the greeting line entirely, or replace with a neutral header? Chrome string → all 5 locales (en, de, fr, es-419, pt-BR), allowlist stays 0. The L38 `subhead` copy itself does not change — only its position.

## Design constraints (MUST-HANDLE)

- First-run-only: welcome + picker appear iff activity `unset`; reuse `default_activity` as completion signal — no new flag.
- Returning users land on Today, never the welcome.
- Do not couple onboarding state to any `rating.*` key.
- Keep both screens in `MODAL_SCREENS` (no tab bar).
- Keep all gate hooks above the boot return (Rules of Hooks).
- Picker header copy change → all 5 locales, allowlist 0. L38 subhead position-only, copy unchanged.
- Don't strand or double-fire the location gate (B).
