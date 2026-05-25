// SecondaryButton — 48h, transparent fill, border-glow outline.

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, fonts, radii } from '../theme';

export default function SecondaryButton({ children, onPress, style, icon }) {
  return (
    <Pressable onPress={onPress} style={({ pressed, hovered }) => [
      {
        height: 48,
        borderRadius: radii.md,
        borderColor: hovered ? colors.primaryGlow : colors.borderGlow,
        borderWidth: 1,
        paddingHorizontal: 20,
        backgroundColor: pressed ? 'rgba(139,111,232,0.14)' : 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      },
      style,
    ]}>
      {icon}
      <Text style={{
        color: colors.text,
        fontFamily: fonts.uiMed,
        fontSize: 15,
      }}>{children}</Text>
    </Pressable>
  );
}
