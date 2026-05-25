// Starfield — small dots scattered across the parent, never animated.
// Uses absolute-positioned dots so it composes with any background.
// Star positions, sizes and colors are data-driven — kept as inline styles.

import React, { useMemo } from 'react';
import { View } from 'react-native';

const NORMAL = [
  { x: 0.15, y: 0.24, r: 1.0, o: 0.45 },
  { x: 0.32, y: 0.68, r: 1.0, o: 0.28 },
  { x: 0.58, y: 0.18, r: 1.5, o: 0.40, gold: true },
  { x: 0.74, y: 0.46, r: 1.0, o: 0.30 },
  { x: 0.86, y: 0.30, r: 1.0, o: 0.40 },
];

const HEAVY = [
  { x: 0.12, y: 0.22, r: 1.0, o: 0.50 },
  { x: 0.27, y: 0.67, r: 1.0, o: 0.32 },
  { x: 0.54, y: 0.14, r: 1.5, o: 0.45, gold: true },
  { x: 0.71, y: 0.49, r: 1.0, o: 0.35 },
  { x: 0.83, y: 0.28, r: 1.0, o: 0.55 },
  { x: 0.91, y: 0.73, r: 1.0, o: 0.30, gold: true },
  { x: 0.38, y: 0.82, r: 1.0, o: 0.22 },
  { x: 0.08, y: 0.90, r: 1.0, o: 0.18 },
];

export default function Starfield({ density = 'normal' }) {
  const stars = useMemo(() => density === 'heavy' ? HEAVY : NORMAL, [density]);
  return (
    <View pointerEvents="none" className="absolute inset-0">
      {stars.map((s, i) => (
        <View key={i} style={{
          position: 'absolute',
          left: `${s.x * 100}%`,
          top:  `${s.y * 100}%`,
          width:  s.r * 2,
          height: s.r * 2,
          borderRadius: 999,
          opacity: s.o,
          backgroundColor: s.gold ? '#F0D89A' : '#F5EFE4',
        }}/>
      ))}
    </View>
  );
}
