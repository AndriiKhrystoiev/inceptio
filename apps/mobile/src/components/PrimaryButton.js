// PrimaryButton — 56h, gradient violet fill, soft glow.

import React from 'react';
import { Pressable, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Centered glow (shadowOffset 0,0) cannot be approximated with shadow-{size}
// directional utilities — kept as inline style per rule 6.
const GLOW_STYLE = {
  shadowColor: '#A98DFF',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.45,
  shadowRadius: 16,
  elevation: 6,
};

export default function PrimaryButton({ children, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        GLOW_STYLE,
        { borderRadius: 14, opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
        style,
      ]}>
      <LinearGradient
        colors={['#A98DFF', '#8B6FE8']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ borderRadius: 14 }}
        className="h-14 items-center justify-center px-6">
        <Text className="text-cream font-ui-semi text-base tracking-[0.1px]">{children}</Text>
      </LinearGradient>
    </Pressable>
  );
}
