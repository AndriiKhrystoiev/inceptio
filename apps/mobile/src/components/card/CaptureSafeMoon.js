// apps/mobile/src/components/card/CaptureSafeMoon.js
// Capture-safe moon for the Moment Card. The daily-note Moon/DailyHero halo is
// a NATIVE SHADOW, which react-native-view-shot may drop from the exported PNG
// (spec §7b). Here the halo is an SVG RadialGradient layer instead. Reuses the
// MOOD_TOKENS colors, but the alphas are RE-DERIVED for a gradient (the
// 0.95/0.75/0.55/0.35 shadow alphas over-saturate as gradient stops). DO NOT
// edit Moon.js — it's shared and relies on its own shadow contract.
import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

// rgb triplets from MOOD_TOKENS (mood-tokens.js), gradient alphas re-derived.
const HALO = {
  strong: { rgb: '240,216,154', a0: 0.55 },
  good:   { rgb: '169,141,255', a0: 0.50 },
  mixed:  { rgb: '212,184,114', a0: 0.38 },
  closed: { rgb: '184,176,204', a0: 0.22 },
};
const MOON_FILL = '#FBF6E9';

export default function CaptureSafeMoon({ mood = 'good', size = 96, haloScale = 2.6 }) {
  const h = HALO[mood] ?? HALO.good;
  const box = size * haloScale;
  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={box} height={box} style={{ position: 'absolute' }} pointerEvents="none">
        <Defs>
          <RadialGradient id="csm-halo" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0" stopColor={`rgb(${h.rgb})`} stopOpacity={String(h.a0)} />
            <Stop offset="0.55" stopColor={`rgb(${h.rgb})`} stopOpacity={String(h.a0 * 0.35)} />
            <Stop offset="1" stopColor={`rgb(${h.rgb})`} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={box} height={box} fill="url(#csm-halo)" />
      </Svg>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: MOON_FILL }} />
    </View>
  );
}
