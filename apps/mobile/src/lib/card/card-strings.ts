// Seam-ready string layer for the Moment Card (spec §8). All NEW card chrome
// routes through t(); English values now, no i18n library. A real library
// slots in later by swapping t()'s body. The card never inlines English.
//
// TIER_PHRASES + band words: DRAFT — astrologer review pending (spec §12).
// Constraints: noun "moment" (never in-app "window"), no grade words (never
// "Fair"), no forbidden words (magic/destiny/fortune/stars align/manifest/
// energy/vibes/alignment/blessed).
import type { MoodKey } from './grade-to-mood';
import type { Activity } from '@inceptio/shared-types';

export const TIER_PHRASES: Record<MoodKey, string> = {
  strong: 'A radiant moment',
  good: 'A tender moment',
  mixed: 'A delicate moment',
  closed: 'A quiet moment',
};

const STRINGS: Record<string, string> = {
  'card.genericIntent': 'A moment to begin',
  'card.watermark': 'Inceptio',
  // Band words — i18n chrome rendered from the band KEY returned by
  // time-of-day.timeOfDayBand (NOT baked into that helper). Per-locale band
  // naturalness is deferred l10n content.
  'card.band.morning': 'morning',
  'card.band.afternoon': 'afternoon',
  'card.band.evening': 'evening',
  'card.band.night': 'night',
};

export function t(key: string): string {
  return STRINGS[key] ?? key;
}

// Activities whose intent is sensitive to broadcast publicly (spec §7c-1):
// default the card to the generic line for these; show the activity for wedding.
export const SENSITIVE_ACTIVITIES: ReadonlySet<Activity> = new Set<Activity>([
  'contracts',
  'business_launch',
  'travel',
]);
