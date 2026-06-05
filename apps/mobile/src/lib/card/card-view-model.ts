// Pure mapper: window `w` + privacy context → CardViewModel. No rendering, no
// storage reads (caller passes activity/location). Golden-tested. Spec §4/§6/§7c.
import type { Activity } from '@inceptio/shared-types';
import { gradeToMood, type MoodKey } from './grade-to-mood';
import { TIER_PHRASES, t, SENSITIVE_ACTIVITIES } from './card-strings';
import { ACTIVITY_LABELS } from '../activities';
import { timeOfDayBand, weekday, monthDay, weekdayMonthDay } from './time-of-day';
import { exactClock, tzAbbrev } from './format-tz';

interface WindowLike {
  start?: string;
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
  const iso = w.start ?? new Date(0).toISOString();
  const moodKey = gradeToMood(w.grade);
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
    tierPhrase: TIER_PHRASES[moodKey],
    intentText: ctx.showIntent ? ACTIVITY_LABELS[ctx.activity] : t('card.genericIntent'),
    whenPrimary,
    whenSecondary,
    city: ctx.showLocation ? (ctx.location?.city ?? null) : null,
    tzAbbrev: ctx.showLocation ? tzAbbrev(iso) : null,
  };
}
