// Seam for the Moment Card (spec §8) — now i18next-backed. Card CHROME routes
// through t() (ns 'card'); the warm tier phrases route through tierPhrase()
// (ns 'voice', en-only). Resources are EAGER-loaded once in i18n/index.ts (Task
// 0); this module only reads them — it never registers a namespace.
//
// Call signatures are preserved so card-view-model.ts and MomentCard.js stay
// UNCHANGED: t(key) and the TIER_PHRASES record are exactly as before.
//
// We import the i18next SINGLETON directly (not ../../i18n, which pulls the
// Intl polyfill loader that the node test resolver can't parse). At app runtime
// App.js calls initI18n() on the same singleton, so t()/tierPhrase() resolve
// against the loaded resources. Before init (e.g. a pure mapper unit test that
// never boots i18n), we fall back to the en JSON dictionaries — the same source
// of truth the bundle is built from — so the card never inlines English literals
// and the mapper stays deterministic.
//
// TIER_PHRASES + band words: DRAFT — astrologer review pending (spec §12).
// Constraints: noun "moment" (never in-app "window"), no grade words (never
// "Fair"), no forbidden words (magic/destiny/fortune/stars align/manifest/
// energy/vibes/alignment/blessed).
import i18n from 'i18next';
import type { MoodKey } from './grade-to-mood';
import type { Activity } from '@inceptio/shared-types';
import enCard from '../../locales/en/card.json';
import enVoiceCard from '../../locales/en/voice/card.json';

const CARD: Record<string, string> = enCard;
const VOICE_CARD: Record<string, string> = enVoiceCard;

/** Card CHROME lookup. i18next when initialized, en-dictionary fallback otherwise. */
export const t = (key: string): string =>
  i18n.isInitialized ? i18n.t(key, { ns: 'card' }) : (CARD[key] ?? key);

/**
 * Warm tier phrase for a mood. Lives in the en-only `voice` namespace under the
 * `card` sub-file (resources.voice.card), so the voice lookup uses a per-call
 * keySeparator '.' to descend card.<mood> (global keySeparator is false).
 */
export const tierPhrase = (mood: MoodKey | string): string =>
  i18n.isInitialized
    ? i18n.t(`card.${mood}`, { ns: 'voice', keySeparator: '.' })
    : (VOICE_CARD[mood] ?? `card.${mood}`);

const MOODS: readonly MoodKey[] = ['strong', 'good', 'mixed', 'closed'];

// Record kept for the UNCHANGED consumer card-view-model.ts (`TIER_PHRASES[mood]`)
// and MomentCard.js. Values resolve through tierPhrase() so the record and the
// function never diverge. Built eagerly here, but t()/tierPhrase() are also safe
// to call directly post-init.
export const TIER_PHRASES: Record<MoodKey, string> = MOODS.reduce((acc, mood) => {
  acc[mood] = tierPhrase(mood);
  return acc;
}, {} as Record<MoodKey, string>);

// Activities whose intent is sensitive to broadcast publicly (spec §7c-1):
// default the card to the generic line for these; show the activity for wedding.
export const SENSITIVE_ACTIVITIES: ReadonlySet<Activity> = new Set<Activity>([
  'contracts',
  'business_launch',
  'travel',
]);
