import type { Activity } from '@inceptio/shared-types';
import type { StatusLineTemplate } from '../types';

/**
 * Activity-noun mapping for status lines — see spec §6.3. Each activity gets
 * one noun; the template `{activity_noun} window — {temporal_phrase}.`
 * interpolates these.
 */
export const ACTIVITY_NOUNS: Record<Activity, string> = {
  wedding: 'Wedding',
  contracts: 'Contract',
  business_launch: 'Launch',
  travel: 'Travel',
};

/**
 * Status-line templates. The picker selects one based on temporal state
 * (pre-window N days out, in-window, alert, post-window) and interpolates
 * the activity noun from ACTIVITY_NOUNS. See spec §6.3.1-§6.3.4.
 *
 * NOTE the §5.3 asymmetry: the 3-day horizon rule does NOT apply to these
 * (surface === 'status-line'). User has opted in by saving the search.
 */

// ─── §6.3.1 Pre-window (countdown) ───
export const STATUS_PRE_WINDOW: StatusLineTemplate[] = [
  { id: 'pre-window-today', surface: 'status-line',
    template: 'Your {activity_noun_lower} window opens today.' },
  { id: 'pre-window-tomorrow', surface: 'status-line',
    template: '{activity_noun} window — tomorrow.' },
  { id: 'pre-window-n-days', surface: 'status-line',
    template: '{activity_noun} window — in {n} days.' },             // 2..3
  { id: 'pre-window-day-name', surface: 'status-line',
    template: '{activity_noun} window — {day_name}.' },              // 2..3
  { id: 'pre-window-later-this-week', surface: 'status-line',
    template: '{activity_noun} window — later this week.' },         // 4..7
  { id: 'pre-window-about-week', surface: 'status-line',
    template: '{activity_noun} window — about a week away.' },       // 8..14
  { id: 'pre-window-about-n-weeks', surface: 'status-line',
    template: '{activity_noun} window — about {weeks} weeks away.' }, // 15..30
  { id: 'pre-window-late-month', surface: 'status-line',
    template: '{activity_noun} window — late {month_name}.' },        // 31..90
  { id: 'pre-window-month', surface: 'status-line',
    template: '{activity_noun} window — {month_name}.' },             // 90+
  { id: 'pre-window-season', surface: 'status-line',
    template: '{activity_noun} window — {season}.' },                 // 90+, alt
];

// ─── NEW per PICKER-CONTRACT.md §1 — none-yet state ───
// Active search, no viable window found yet. Not in spec §6's library;
// added at the design pass. Two templates: the bare form and one carrying
// the searched_through horizon (used if the deferred UX question lands on
// "yes, show the horizon").
export const STATUS_NONE_YET: StatusLineTemplate[] = [
  { id: 'none-yet-bare', surface: 'status-line',
    template: '{activity_noun} window — none yet.' },
  { id: 'none-yet-with-horizon', surface: 'status-line',
    template: '{activity_noun} window — none yet through {month_name}.' },
];

// ─── §6.3.2 In-window (EMPHASIZED — see spec §8.3) ───
export const STATUS_IN_WINDOW: StatusLineTemplate[] = [
  { id: 'in-window-open', surface: 'status-line',
    template: "You're inside your {activity_noun_lower} window." },           // > 1h left
  { id: 'in-window-hour-left', surface: 'status-line',
    template: '{activity_noun} window — open for another hour.' },             // <= 1h
  { id: 'in-window-closing-soon', surface: 'status-line',
    template: '{activity_noun} window — closing soon.' },                       // <= 15 min
];

// ─── §6.3.3 New-window alert (EMPHASIZED) ───
export const STATUS_NEW_WINDOW_ALERT: StatusLineTemplate[] = [
  { id: 'alert-concrete-day', surface: 'status-line',
    template: 'A stronger {activity_noun_lower} window — {day_name} afternoon.' }, // <= 3 days
  { id: 'alert-concrete-day-next-week', surface: 'status-line',
    template: 'A stronger {activity_noun_lower} window — {day_name} next week.' }, // 4..14
  { id: 'alert-late-month', surface: 'status-line',
    template: 'A stronger {activity_noun_lower} window — late {month_name}.' },     // 14+
  { id: 'alert-vague', surface: 'status-line',
    template: 'A clearer {activity_noun_lower} window opened in your search.' },     // no close horizon
];

// ─── §6.3.4 Post-window ───
export const STATUS_POST_WINDOW: StatusLineTemplate[] = [
  { id: 'post-window-just-passed', surface: 'status-line',
    template: 'Your {activity_noun_lower} window has passed. Choose another?' },        // <= 7 days
  { id: 'post-window-month-ago', surface: 'status-line',
    template: 'Your search closed in {month_name}. Choose another moment?' },           // 7..30
  { id: 'post-window-older', surface: 'status-line',
    template: 'An older search — choose another moment to look at?' },                  // > 30
];

/**
 * Render an activity-noun substitution. For `{activity_noun_lower}` and
 * `{activity_noun}` both. Templates use whichever is grammatically right
 * for the sentence.
 */
export function renderActivityNoun(
  template: string,
  activity: Activity,
): string {
  const noun = ACTIVITY_NOUNS[activity];
  return template
    .replace(/\{activity_noun_lower\}/g, noun.toLowerCase())
    .replace(/\{activity_noun\}/g, noun);
}
