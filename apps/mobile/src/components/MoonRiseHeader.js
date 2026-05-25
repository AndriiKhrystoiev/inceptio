// MoonRiseHeader — radial gradient + starfield + (optional) moon glyph.
// Used as the top zone for Today, Calendar, You.

import React from 'react';
import { View } from 'react-native';
import HeroGradient from './HeroGradient';
import Starfield from './Starfield';
import Moon from './Moon';
import { space } from '../theme';

export default function MoonRiseHeader({
  phase = 'waxing-crescent',
  height = 200,
  showMoon = true,
  children,
}) {
  return (
    <View style={{
      paddingTop: 60,
      paddingBottom: space[5],
      paddingHorizontal: space[6],
      overflow: 'hidden',
      minHeight: height,
    }}>
      <HeroGradient height={Math.max(height + 40, 260)}/>
      <Starfield density="heavy"/>
      {showMoon && (
        <View style={{ position: 'absolute', top: 56, right: space[6] }}>
          <Moon phase={phase} size={64}/>
        </View>
      )}
      <View>{children}</View>
    </View>
  );
}
