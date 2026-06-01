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
// Halo rendering note: the current DailyHero/DailyNoteBody renderers
// extract the rgba color into shadowColor and use shadowOpacity: 1 (the
// regex strips the alpha). So the alpha values below are documentary
// for now — they encode the design intent for intensity, even if the
// renderer doesn't honor them. A follow-up renderer fix can extract the
// alpha into shadowOpacity to make the documented "3x weaker" intent
// literal; until then, the closed halo will render at full intensity in
// a muted-purple color.
import { colors } from '../../theme';

export const MOOD_TOKENS = {
  strong: { dot: colors.gold,        halo: 'rgba(240,216,154,0.55)', dim: false },
  good:   { dot: colors.primaryGlow, halo: 'rgba(169,141,255,0.45)', dim: false },
  mixed:  { dot: colors.goldMuted,   halo: 'rgba(212,184,114,0.30)', dim: false },
  closed: { dot: colors.textSubtle,  halo: 'rgba(184,176,204,0.18)', dim: true },
};
