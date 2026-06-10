import { describe, it, expect } from 'vitest';
import {
  resolveLandingScreen,
  type ActivityHydrationStatus,
  type OnboardingLocationStatus,
} from '../onboarding-route';

// Single first-run routing authority. Pure: (default_activity status,
// location step status) → screen. Golden table — one row per flag combo —
// mirrors the rating eligibility table. This is the root-cause fix for the
// inverted onboarding routing (welcome skipped on first run; welcome shown
// every cold launch for returning users): the screen is now DERIVED from the
// two persisted flags instead of an ungated useState('onboarding') default.

const ACTIVITY: ActivityHydrationStatus[] = ['loading', 'unset', 'set'];
const LOCATION: OnboardingLocationStatus[] = ['pending', 'skipped', 'completed'];

describe('resolveLandingScreen — first-run state machine', () => {
  it('fresh install (activity unset) → welcome-first, for every location status', () => {
    // Welcome is the entry; the picker is a UI sub-step the welcome CTA
    // navigates to (both share the unset state, so the picker is not
    // flag-derivable here). Location status must not change this.
    for (const loc of LOCATION) {
      expect(resolveLandingScreen('unset', loc)).toBe('onboarding');
    }
  });

  it('returning user (activity set) + location done → Today', () => {
    expect(resolveLandingScreen('set', 'skipped')).toBe('today');
    expect(resolveLandingScreen('set', 'completed')).toBe('today');
  });

  it('activity set + location step still owed (pending) → onboarding location gate', () => {
    // A dedicated id, NOT the shared 'set-default-location' used by Settings /
    // Today-empty-state: the onboarding variant must render with "Skip for now"
    // + onDismissStatus="skipped" so a skip writes a terminal status. Routing it
    // through the shared id would leave status 'pending' → location gate on
    // every cold launch (the same bug class this change fixes).
    expect(resolveLandingScreen('set', 'pending')).toBe('onboarding-location');
  });

  it("fail-safe: 'loading' never skips onboarding → welcome, for every location status", () => {
    // App gates the boot spinner on 'loading', so this is defensive: a
    // corrupt/loading activity status must fall to the welcome, never silently
    // land an un-onboarded user on Today.
    for (const loc of LOCATION) {
      expect(resolveLandingScreen('loading', loc)).toBe('onboarding');
    }
  });

  it('never returns the picker (not flag-derivable) or any unknown screen', () => {
    const allowed = new Set(['onboarding', 'onboarding-location', 'today']);
    for (const a of ACTIVITY) {
      for (const loc of LOCATION) {
        expect(allowed.has(resolveLandingScreen(a, loc))).toBe(true);
      }
    }
  });
});
