// X-Locale shape validation for the client→Worker locale seam.
//
// Mirrors the STRUCTURE of `isValidTz` in local-date.ts (null/absent → valid,
// otherwise probe), but with a pure regex body instead of an Intl probe — a
// locale tag is a syntactic token here, not something we resolve to behavior
// this phase. The Worker accepts the header, validates its shape, and then
// intentionally IGNORES it: locale does NOT affect responses or cache keys
// today. (VOICE-phase: thread the validated locale into cache keys + composed
// copy.)
//
// BCP-47-ish: a 2-3 letter primary subtag followed by optional alphanumeric
// subtags (script / region / variant — this admits `es-419` and `pt-BR`).
const LOCALE_RE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

// Generous length cap to reject pathological header values while still
// admitting realistic multi-subtag tags (e.g. `zh-Hant-HK`).
const MAX = 35;

/** True if `raw` is a well-formed locale tag OR absent. Absent = valid (unset). */
export function isValidLocale(raw: string | null | undefined): boolean {
  if (raw == null) return true; // absent header is valid (unset)
  return raw.length <= MAX && LOCALE_RE.test(raw);
}

import type { Locale } from '../translations/types';

// The four non-en locales the VOICE phase composes. Any other (or absent)
// tag resolves to 'en' — the fail-safe default, so an unknown/garbage header
// can never silently route to a half-filled locale branch.
const SUPPORTED_NON_EN = ['de', 'fr', 'es-419', 'pt-BR'] as const;

/**
 * Resolve a raw X-Locale header value to a supported `Locale`. Absent or
 * unknown → 'en' (the authoritative default). This is the SINGLE place a
 * header string becomes a `Locale`; routes call it once at the top and thread
 * the non-optional result down the composition path (spec §3).
 *
 * Note: `isValidLocale` (shape gate, above) runs separately and 400s a
 * MALFORMED tag; `resolveLocale` then maps a well-formed-but-unsupported tag
 * (e.g. 'ja', 'zh-Hant-HK') to 'en'. The two are complementary, not redundant.
 */
export function resolveLocale(raw: string | null): Locale {
  return raw && (SUPPORTED_NON_EN as readonly string[]).includes(raw)
    ? (raw as Locale)
    : 'en';
}
