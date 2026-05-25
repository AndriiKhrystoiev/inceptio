// MoonRiseHeader — radial gradient + starfield + (optional) moon glyph.
// Used as the top zone for Today, Calendar, You.

import React from 'react';
import { View } from 'react-native';
import HeroGradient from './HeroGradient';
import Starfield from './Starfield';
import Moon from './Moon';

export default function MoonRiseHeader({
  phase = 'waxing-crescent',
  height = 200,
  showMoon = true,
  children,
}) {
  return (
    <View
      className="overflow-hidden pt-[60px] pb-5 px-6"
      style={{ minHeight: height }}>
      <HeroGradient height={Math.max(height + 40, 260)}/>
      <Starfield density="heavy"/>
      {showMoon && (
        <View className="absolute top-14 right-6">
          <Moon phase={phase} size={64}/>
        </View>
      )}
      <View>{children}</View>
    </View>
  );
}
