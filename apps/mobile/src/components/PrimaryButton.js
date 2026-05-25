// PrimaryButton — 56h, gradient violet fill, soft glow.

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, glow, radii } from '../theme';

export default function PrimaryButton({ children, onPress, style }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      {
        borderRadius: radii.md,
        ...glow.primary,
        opacity: pressed ? 0.92 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      },
      style,
    ]}>
      <LinearGradient
        colors={[colors.primaryGlow, colors.primary]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          height: 56,
          borderRadius: radii.md,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}>
        <Text style={{
          color: colors.text,
          fontFamily: fonts.uiSemi,
          fontSize: 16,
          letterSpacing: 0.1,
        }}>{children}</Text>
      </LinearGradient>
    </Pressable>
  );
}
