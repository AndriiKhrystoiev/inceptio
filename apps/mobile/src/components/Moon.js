// Moon — 8 phases rendered as SVG with optional gold halo.

import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, Rect, ClipPath, Defs, G } from 'react-native-svg';

const LIT  = '#F5EFE4';
const DARK = '#0F0A1F';
const RING = '#F5EFE4';

export default function Moon({ phase = 'waxing-crescent', size = 56, glow = true }) {
  const r = size * 0.4;
  const cx = size / 2;
  const cy = size / 2;
  const clipId = `clip-${phase}-${size}`;

  let fg = null;
  if (phase === 'new')          fg = <Circle cx={cx} cy={cy} r={r} fill={DARK}/>;
  else if (phase === 'full')    fg = <Circle cx={cx} cy={cy} r={r} fill={LIT}/>;
  else if (phase === 'waxing-crescent')
    fg = (
      <>
        <Circle cx={cx} cy={cy} r={r} fill={LIT}/>
        <Ellipse cx={cx + r * 0.3} cy={cy} rx={r} ry={r} fill={DARK}/>
      </>
    );
  else if (phase === 'first-quarter')
    fg = (
      <>
        <Rect x={cx - r} y={cy - r} width={r} height={r * 2} fill={DARK}/>
        <Rect x={cx}     y={cy - r} width={r} height={r * 2} fill={LIT}/>
      </>
    );
  else if (phase === 'waxing-gibbous')
    fg = (
      <>
        <Circle cx={cx} cy={cy} r={r} fill={LIT}/>
        <Ellipse cx={cx - r * 0.3} cy={cy} rx={r * 0.65} ry={r} fill={DARK}/>
      </>
    );
  else if (phase === 'waning-gibbous')
    fg = (
      <>
        <Circle cx={cx} cy={cy} r={r} fill={LIT}/>
        <Ellipse cx={cx + r * 0.3} cy={cy} rx={r * 0.65} ry={r} fill={DARK}/>
      </>
    );
  else if (phase === 'last-quarter')
    fg = (
      <>
        <Rect x={cx - r} y={cy - r} width={r} height={r * 2} fill={LIT}/>
        <Rect x={cx}     y={cy - r} width={r} height={r * 2} fill={DARK}/>
      </>
    );
  else if (phase === 'waning-crescent')
    fg = (
      <>
        <Circle cx={cx} cy={cy} r={r} fill={LIT}/>
        <Ellipse cx={cx - r * 0.3} cy={cy} rx={r} ry={r} fill={DARK}/>
      </>
    );

  // Soft gold halo approximated with iOS shadow (Android can't
  // render colored shadows; falls back to elevation).
  const haloStyle = glow ? {
    shadowColor: '#F0D89A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 2,
  } : null;

  return (
    <View style={haloStyle}>
      <Svg width={size} height={size}>
        <Defs>
          <ClipPath id={clipId}>
            <Circle cx={cx} cy={cy} r={r}/>
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${clipId})`}>{fg}</G>
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={RING} strokeWidth="1.5" opacity="0.85"/>
      </Svg>
    </View>
  );
}
