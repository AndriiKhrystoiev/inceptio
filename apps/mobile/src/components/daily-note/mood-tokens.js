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
// alpha means each mood renders at its design-spec'd intensity.
//
// Calibration note (2026-06-01): the halo alpha values are tuned for
// native iOS shadow rendering, NOT CSS rgba. Native shadow distributes
// blur over a wider area and requires higher opacity values to achieve
// perceptual parity with CSS-style rendering. The original Layer 2 spec
// values (0.55 / 0.45 / 0.30 / 0.18) were calibrated against the CSS
// DailyNote.jsx mockup; cycling through all four moods in StatePicker on
// a real iOS device after the parseHaloAlpha renderer fix landed showed
// good and mixed visually indistinguishable, and strong barely reading.
// Recalibrated to 0.95 / 0.75 / 0.55 / 0.35 — same celebrate/warm/
// restrained/barely-there gradient, just shifted up to the band where
// native iOS shadow can actually express it. Each adjacent pair should
// look noticeably distinct now, not nearly identical.
//
// If Android elevation needs separate calibration (it falls back to grey
// material drop-shadow and ignores the colored alpha entirely), that's a
// follow-up — Android halos are a known platform compromise per Layer 2.
import { colors } from '../../theme';

export const MOOD_TOKENS = {
  strong: { dot: colors.gold,        halo: 'rgba(240,216,154,0.95)', dim: false },
  good:   { dot: colors.primaryGlow, halo: 'rgba(169,141,255,0.75)', dim: false },
  mixed:  { dot: colors.goldMuted,   halo: 'rgba(212,184,114,0.55)', dim: false },
  closed: { dot: colors.textSubtle,  halo: 'rgba(184,176,204,0.35)', dim: true },
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
