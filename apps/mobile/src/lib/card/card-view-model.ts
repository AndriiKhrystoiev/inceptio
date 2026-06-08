// Pure mapper: window `w` + privacy context → CardViewModel. No rendering, no
// storage reads (caller passes activity/location). Golden-tested. Spec §4/§6/§7c.
import type { Activity, MoonPhase } from '@inceptio/shared-types';
import { gradeToMood, type MoodKey } from './grade-to-mood';
import { TIER_PHRASES, t, SENSITIVE_ACTIVITIES } from './card-strings';
import { getActivityLabel } from '../activities';
import { timeOfDayBand, weekday, monthDay, weekdayMonthDay } from './time-of-day';
import { exactClock, tzAbbrev } from './format-tz';
import { moonPhaseForIso } from './moon-phase';

interface WindowLike {
  start: string; // REQUIRED — WindowSchema guarantees it. Absence is a contract violation (throw, never fabricate).
  grade?: string;
  displayable?: { headline?: string };
  rationale?: string;
  _synthetic?: boolean;
}

interface LocationLike {
  city: string;
  // timezone NOT needed: all time derives from the window ISO's own offset
  // (Hermes-safe, Option 2). location is only consulted for the city label.
}

export interface CardContext {
  activity: Activity;
  location: LocationLike | null;
  showLocation: boolean;
  showIntent: boolean;
}

export interface CardViewModel {
  headline: string;
  moodKey: MoodKey;
  moonPhase: MoonPhase;
  tierPhrase: string;
  intentText: string;
  whenPrimary: string;
  whenSecondary: string;
  city: string | null;
  tzAbbrev: string | null;
}

// Default visibility of the activity label, per activity (spec §7c-1).
export function defaultShowIntent(activity: Activity): boolean {
  return !SENSITIVE_ACTIVITIES.has(activity);
}

export function buildCardViewModel(w: WindowLike, ctx: CardContext): CardViewModel {
  // Fail-LOUD on a missing start: the API contract guarantees it, so absence is
  // a programming/contract error. Fabricating a date (e.g. 1970) would silently
  // ship a wrong time onto a public PNG — the fabrication IS the bug. The share
  // FLOW layer (sheet/hook) catches this and surfaces a graceful UI state.
  if (!w.start) {
    throw new Error('buildCardViewModel: window.start is required (contract violation).');
  }
  const iso = w.start;
  const moodKey = gradeToMood(w.grade);
  // TRUST ASSUMPTION (explicit): the headline is rendered VERBATIM and bypasses
  // BOTH the intent-toggle and the soft-time logic. If a server voice headline
  // names the activity or embeds a precise clock, it leaks past the card's
  // privacy protections (worst for the sensitive-activity / travel safety case).
  // This MUST be guaranteed at the source: headlines stay activity-neutral and
  // time-neutral, esp. for sensitive activities. Hung on the pending astrologer/
  // voice ruling — see spec §5/§13 and translation-layer-design decisions #7/#8.
  const headline = w.displayable?.headline ?? w.rationale ?? 'A moment to consider.';

  const showExact = ctx.showLocation; // exact time + tz ride the location opt-in
  // Default (soft) when-line: weekday + the band WORD from the strings module
  // (i18n chrome), composed from the band KEY. Never a tz-less clock. ALL time
  // derives from the ISO's own offset (Hermes-safe) — no location.timezone.
  const whenPrimary = showExact
    ? exactClock(iso)
    : `${weekday(iso)} ${t('card.band.' + timeOfDayBand(iso))}`;
  const whenSecondary = showExact ? weekdayMonthDay(iso) : monthDay(iso);

  return {
    headline,
    moodKey,
    moonPhase: moonPhaseForIso(iso),
    tierPhrase: TIER_PHRASES[moodKey],
    intentText: ctx.showIntent ? getActivityLabel(ctx.activity) : t('card.genericIntent'),
    whenPrimary,
    whenSecondary,
    city: ctx.showLocation ? (ctx.location?.city ?? null) : null,
    tzAbbrev: ctx.showLocation ? tzAbbrev(iso) : null,
  };
}
