// Mood → visual treatment tokens for the daily-note hero.
// All four colors already exist in theme.js; no new theme tokens.
//
// Invariant (2026-06-01): all four moods carry a non-null halo with varying
// intensity. closed halo is the weakest (alpha 0.18 vs gold 0.55 / violet
// 0.45 / muted-gold 0.30 — closed is ~3x weaker than gold/violet) but
// non-null, preserving moon-glyph legibility on full-moon-on-closed-day
// collisions. The closed:halo:null + full-phase:no-contrast-line collision
// was an unanticipated edge case caught at smoke test (today happened to be
// both Moon-VoC AND full moon; the moon rendered as a featureless dim disc
// because there was no halo to signal "this is a moon"). The faint cool
// halo preserves the "quiet" voice — closed days are still visually muted
// — while keeping the moon legible as a moon ~once a month when this
// collision recurs.
//
// NO `phase` field. The DailyNote.jsx mockup had phase-per-mood defaults
// as a fallback. Production strictly uses the API's moon_phase. The mood
// determines color/halo only, never overrides the actual lunar cycle.
// Removing the field is a structural guarantee that mood and moon_phase
// don't conflate semantically.
//
// Halo rendering note: DailyHero (moon glyph) and DailyNoteBody (mood dot)
// extract this rgba into shadowColor (alpha forced to 1 via haloColorSolid)
// and apply the alpha as shadowOpacity (via parseHaloAlpha). Honoring the
// alpha means each mood renders at its design-spec'd intensity — strong
// at 0.55, good at 0.45, mixed at 0.30, closed at 0.18 — rather than all
// uniformly at full strength.
import { colors } from '../../theme';

export const MOOD_TOKENS = {
  strong: { dot: colors.gold,        halo: 'rgba(240,216,154,0.55)', dim: false },
  good:   { dot: colors.primaryGlow, halo: 'rgba(169,141,255,0.45)', dim: false },
  mixed:  { dot: colors.goldMuted,   halo: 'rgba(212,184,114,0.30)', dim: false },
  closed: { dot: colors.textSubtle,  halo: 'rgba(184,176,204,0.18)', dim: true },
};

/**
 * Parse the alpha float from an rgba(r, g, b, a) string.
 * Returns 1.0 when no alpha is present or the string doesn't match.
 * Used by DailyHero and DailyNoteBody to honor each mood's design-intent
 * intensity (see file-header invariant).
 */
export function parseHaloAlpha(rgba) {
  if (typeof rgba !== 'string') return 1;
  const m = rgba.match(/rgba\([^)]+,\s*([0-9.]+)\s*\)$/);
  return m ? parseFloat(m[1]) : 1;
}

/**
 * Return the rgba string with alpha forced to 1.0 — suitable for RN's
 * shadowColor (which takes a solid color and an opacity controlled via
 * shadowOpacity separately).
 */
export function haloColorSolid(rgba) {
  if (typeof rgba !== 'string') return rgba;
  return rgba.replace(/rgba\(([^)]+),\s*[0-9.]+\s*\)$/, 'rgba($1,1)');
}
