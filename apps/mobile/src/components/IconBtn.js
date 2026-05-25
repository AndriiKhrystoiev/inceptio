// Bare icon button used in top bars (back, close, share, settings).
// Wraps a lucide-react-native icon in a hit-friendly Pressable.

import React from 'react';
import { Pressable } from 'react-native';
import { colors } from '../theme';

export default function IconBtn({ children, onPress, label }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => ({
        padding: 8,
        opacity: pressed ? 0.6 : 1,
      })}>
      {children}
    </Pressable>
  );
}
