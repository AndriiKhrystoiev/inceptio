// HeroGradient — the warm-indigo wash at the top of most screens.
// CSS uses a radial gradient; we render the equivalent via SVG so
// the falloff is correct. The SVG is absolute-positioned full-bleed
// behind the hero content.
// SVG fill/stopColor attrs are element props, not CSS — raw hex kept as-is.

import React from 'react';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

export default function HeroGradient({ height = 240 }) {
  return (
    <Svg
      pointerEvents="none"
      width="100%"
      height={height}
      style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
    >
      <Defs>
        <RadialGradient id="hero" cx="50%" cy="0%" r="80%" fx="50%" fy="0%">
          <Stop offset="0"    stopColor="#1A1433" stopOpacity="1"/>
          <Stop offset="0.65" stopColor="#0F0A1F" stopOpacity="1"/>
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height={height} fill="url(#hero)"/>
    </Svg>
  );
}
