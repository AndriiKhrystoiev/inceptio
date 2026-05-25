// Bare icon button used in top bars (back, close, share, settings).
// Wraps a lucide-react-native icon in a hit-friendly Pressable.

import React from 'react';
import { Pressable } from 'react-native';

export default function IconBtn({ children, onPress, label }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={8}
      className="p-2 active:opacity-[0.6]">
      {children}
    </Pressable>
  );
}
