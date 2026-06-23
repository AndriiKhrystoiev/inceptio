// Bump this constant on any change to the translation dictionary, activity
// overrides, headlines, or synthesizer logic. The Worker embeds it in the KV
// cache key so updates invalidate cached responses naturally:
//   `search:v1:${TRANSLATIONS_VERSION}:${requestHash}`
//
// Format: integer that monotonically increases. Don't reuse old numbers.
// v2: per-window tagline added to DisplayableWindow. Bumping invalidates
// any KV-cached responses from v1 that lack the new field, so mobile clients
// get fresh translations on next request.
// v3: VOICE phase — X-Locale now part of the search cache-key prefix. (Even
// though composed copy is still all-English at this commit, the prefix now
// carries the locale segment, so the key namespace changed.)
export const TRANSLATIONS_VERSION = 3;

export {
  translate,
  translateFactor,
  translateExcludedReason,
} from './translate';
export type {
  TranslatedResponse,
  TranslateOpts,
} from './translate';

// Daily-note synthesis surface — used by mobile directly.
export { synthesizeDailyNote } from './daily-notes/picker';
export { composeDisplayable } from './daily-notes/composer';
export { computeMoonPhase } from './daily-notes/moon-phase';

// Types and constants shared between Worker and mobile.
export type {
  Locale,
  DailyNoteOutput,
  DailyNoteResponseShape,
} from './types';
export { LIBRARY_VERSION } from './types';

export { PART_OF_DAY_CUTOFFS } from './dictionary/part-of-day';
