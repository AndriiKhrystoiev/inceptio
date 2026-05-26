// Glyph — blocking-reason glyphs + cell variants.
// Used in calendar cells, blocked sheets, the Today "pause day" card.
// SVG fill/stroke attrs are not CSS — raw hex values kept as-is.

import React from 'react';
import Svg, { Circle, Path, Ellipse } from 'react-native-svg';

export default function Glyph({ name, size = 18, color = '#B8B0CC' }) {
  const sw = Math.max(1, size / 12);
  const v  = '0 0 24 24';
  switch (name) {
    case 'moon-void':
      return (
        <Svg width={size} height={size} viewBox={v} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="12" cy="12" r="9"/>
          <Path d="M14.5 7.5a5.5 5.5 0 1 0 0 9 4 4 0 0 1 0-9z" fill={color} stroke="none"/>
        </Svg>
      );
    case 'retrograde':
      return (
        <Svg width={size} height={size} viewBox={v} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M8 18V6h4a3 3 0 0 1 0 6H8"/>
          <Path d="M12 12l4 6"/>
          <Path d="M19 8l-2-2 2-2"/>
        </Svg>
      );
    case 'eclipse':
      return (
        <Svg width={size} height={size} viewBox={v} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="12" cy="12" r="8"/>
          <Path d="M12 4 a8 8 0 0 1 0 16 Z" fill={color} stroke="none"/>
        </Svg>
      );
    case 'fixed-star':
      return (
        <Svg width={size} height={size} viewBox={v} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 3v18"/>
          <Path d="M3 12h18"/>
          <Path d="M5.6 5.6l12.8 12.8"/>
          <Path d="M18.4 5.6L5.6 18.4"/>
        </Svg>
      );
    case 'malefic-angle':
      return (
        <Svg width={size} height={size} viewBox={v} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 4 L20 19 H4 Z"/>
        </Svg>
      );
    default:
      return null;
  }
}

// Reason → glyph name. The calendar reasons map onto Glyph variants
// (moon_voc and moon_via_combusta both use 'moon-void', etc.). Unknown
// reasons fall through to 'moon-void' — the schema is permissive, see
// KNOWN_REASON_IDS in @inceptio/shared-types.
export function reasonToGlyph(reason) {
  if (reason === 'moon_voc' || reason === 'moon_via_combusta') return 'moon-void';
  if (
    reason === 'mercury_retrograde' ||
    reason === 'venus_retrograde' ||
    reason === 'mars_retrograde' ||
    reason === 'jupiter_retrograde' ||
    reason === 'saturn_retrograde' ||
    reason === 'mercury_combust'
  ) return 'retrograde';
  if (reason === 'eclipse_window')      return 'eclipse';
  if (reason === 'fixed_star_on_angle') return 'fixed-star';
  if (reason === 'malefic_on_angle')    return 'malefic-angle';
  return 'moon-void';
}

// Friendly copy for the blocked-day bottom sheet. New entries should track
// KNOWN_REASON_IDS in @inceptio/shared-types. An unknown reason key returns
// undefined here; CalendarScreen's `|| { title, body }` fallback covers it.
export const FRIENDLY_REASON = {
  moon_voc:            { title: 'The Moon is between signs',       body: 'Decisions started now tend to drift. Wait until the Moon enters its next sign.' },
  moon_via_combusta:   { title: 'The Moon is in a tender stretch', body: 'A traditionally fragile path of sky. Better to let this day pass.' },
  mercury_retrograde:  { title: 'Mercury is sleeping',              body: 'Words and agreements made now often need to be revisited. Be patient.' },
  mercury_combust:     { title: 'Mercury is hidden by the Sun',     body: "Words don't carry far this stretch. Hold the important conversations." },
  venus_retrograde:    { title: 'Venus is resting',                 body: 'A poor day for vows or affection-bound commitments.' },
  mars_retrograde:     { title: 'Mars is hesitating',               body: "Bold moves don't carry the same force right now. Pause initiatives." },
  jupiter_retrograde:  { title: 'Jupiter turns inward',             body: 'Growth needs patience this stretch. Plan, then expand later.' },
  saturn_retrograde:   { title: 'Saturn looks inward',              body: 'Structure is unstable. Avoid foundations laid today.' },
  eclipse_window:      { title: 'Inside an eclipse window',         body: 'The sky is volatile for two weeks around an eclipse. Pause begins now.' },
  fixed_star_on_angle: { title: 'A fixed star sits on an angle',    body: 'A piercing influence rises today. Better to wait it out.' },
  malefic_on_angle:    { title: 'A difficult planet rises today',   body: 'A traditionally hard placement is prominent. Hold off.' },
};
