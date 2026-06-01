// Mood → visual treatment tokens for the daily-note hero.
// All four colors already exist in theme.js; no new theme tokens.
//
// NO `phase` field. The DailyNote.jsx mockup had phase-per-mood defaults
// as a fallback. Production strictly uses the API's moon_phase. The mood
// determines color/halo only, never overrides the actual lunar cycle.
// Removing the field is a structural guarantee that mood and moon_phase
// don't conflate semantically.
import { colors } from '../../theme';

export const MOOD_TOKENS = {
  strong: { dot: colors.gold,        halo: 'rgba(240,216,154,0.55)', dim: false },
  good:   { dot: colors.primaryGlow, halo: 'rgba(169,141,255,0.45)', dim: false },
  mixed:  { dot: colors.goldMuted,   halo: 'rgba(212,184,114,0.30)', dim: false },
  closed: { dot: colors.textSubtle,  halo: null,                     dim: true },
};
