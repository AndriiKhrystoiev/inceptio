// Glyph — blocking-reason glyphs + cell variants.
// Used in calendar cells, blocked sheets, the Today "pause day" card.
// SVG fill/stroke attrs are not CSS — raw hex values kept as-is.

import React from 'react';
import Svg, { Circle, Path, Ellipse } from 'react-native-svg';
import i18n from '../i18n';

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

// Friendly copy for the blocked-day bottom sheet. Copy lives in the en-only
// `voice:reason` i18n namespace (locales/en/voice/reason.json) — VOICE strings
// are ruling-dependent astrology phrasing and stay English-only this phase.
// REVIEW: traditional-astrology terms (void of course, combust, via combusta,
// malefic on angle) — values pending native + astrology-literate review pre-launch.
//
// New entries should track KNOWN_REASON_IDS in @inceptio/shared-types. An unknown
// reason key returns undefined here; CalendarScreen's `|| { title, body }`
// fallback covers it.
//
// Lookup note: the voice ns nests each sub-file under its name (voice.reason =
// reason.json), so we traverse with an explicit per-call keySeparator '.' (the
// global config sets keySeparator:false). On a miss i18next returns the key
// path; we map that back to undefined so the CalendarScreen fallback still fires.
const REASON_IDS = [
  'moon_voc',
  'moon_via_combusta',
  'mercury_retrograde',
  'mercury_combust',
  'venus_retrograde',
  'mars_retrograde',
  'jupiter_retrograde',
  'saturn_retrograde',
  'eclipse_window',
  'fixed_star_on_angle',
  'malefic_on_angle',
];

function reasonCopy(id) {
  const titleKey = `reason.${id}.title`;
  const bodyKey = `reason.${id}.body`;
  const title = i18n.t(titleKey, { ns: 'voice', keySeparator: '.' });
  const body = i18n.t(bodyKey, { ns: 'voice', keySeparator: '.' });
  // Miss → i18next echoes the key path; treat as absent so callers fall back.
  if (title === titleKey || body === bodyKey) return undefined;
  return { title, body };
}

// Resolved lazily on access so i18n.init() (run in App.js boot, before any
// screen renders) is guaranteed in place — a module-load-time build could race
// ahead of init and capture empty copy. The `FRIENDLY_REASON[id]` access shape
// and the CalendarScreen `|| { title, body }` fallback are preserved.
export const FRIENDLY_REASON = new Proxy(
  {},
  {
    get: (_t, id) => (typeof id === 'string' ? reasonCopy(id) : undefined),
    has: (_t, id) => typeof id === 'string' && REASON_IDS.includes(id),
    ownKeys: () => [...REASON_IDS],
    getOwnPropertyDescriptor: (_t, id) =>
      typeof id === 'string' && REASON_IDS.includes(id)
        ? { enumerable: true, configurable: true, value: reasonCopy(id) }
        : undefined,
  },
);
