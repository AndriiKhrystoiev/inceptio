// Bump this constant on any change to the translation dictionary, activity
// overrides, headlines, or synthesizer logic. The Worker embeds it in the KV
// cache key so updates invalidate cached responses naturally:
//   `search:v1:${TRANSLATIONS_VERSION}:${requestHash}`
//
// Format: integer that monotonically increases. Don't reuse old numbers.
// v2: per-window tagline added to DisplayableWindow. Bumping invalidates
// any KV-cached responses from v1 that lack the new field, so mobile clients
// get fresh translations on next request.
export const TRANSLATIONS_VERSION = 2;

export {
  translate,
  translateFactor,
  translateExcludedReason,
} from './translate';
export type {
  TranslatedResponse,
} from './translate';
