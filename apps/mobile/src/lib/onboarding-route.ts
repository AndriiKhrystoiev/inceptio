// Single first-run routing authority. Pure: imports nothing native, touches no
// storage. Given the two persisted onboarding flags it returns the screen the
// app should land on at boot (and the screen the activity picker advances to
// after a selection).
//
// Root-cause fix for inverted onboarding routing. The old App.js used an
// ungated `useState('onboarding')` default plus an early-return gate; the two
// mechanisms didn't compose, so the brand welcome was skipped on first run yet
// shown on every cold launch for returning users. Deriving the screen from the
// flags here makes the first-run state machine verifiable instead of ad-hoc.

// Types are declared locally on purpose — this is a pure policy module (no
// native imports) so the golden test runs in plain Node, mirroring the rating
// eligibility module (eligibility.ts likewise defines its own Grade rather than
// importing it). They structurally match HydrationStatus / OnboardingLocationStatus
// in the preference modules; keep them in sync if those unions ever change.
export type ActivityHydrationStatus = 'loading' | 'unset' | 'set';
export type OnboardingLocationStatus = 'pending' | 'skipped' | 'completed';
// 'onboarding-location' is the onboarding variant of the location step — a
// distinct id from the shared 'set-default-location' (Settings / Today
// empty-state) because the onboarding variant renders with "Skip for now" +
// onDismissStatus="skipped" so a skip writes a terminal status.
export type LandingScreen = 'onboarding' | 'onboarding-location' | 'today';

/**
 * @param activity inceptio.default_activity hydration status
 * @param location inceptio.onboarding_location_step_v1 status
 *
 * Note: the activity PICKER ('first-launch-activity') is never returned — it is
 * not flag-derivable (it shares the `unset` state with the welcome). The
 * welcome CTA navigates to the picker as a UI sub-step; this function then
 * routes the picker's "next" once `activity` has flipped to 'set'.
 */
export function resolveLandingScreen(
  activity: ActivityHydrationStatus,
  location: OnboardingLocationStatus,
): LandingScreen {
  // Not yet onboarded → brand welcome first. 'loading' fails safe to the
  // welcome rather than risk landing an un-onboarded user on Today.
  if (activity !== 'set') return 'onboarding';
  // Onboarded but the location step is still owed → onboarding location gate.
  if (location === 'pending') return 'onboarding-location';
  // Fully onboarded → home.
  return 'today';
}
