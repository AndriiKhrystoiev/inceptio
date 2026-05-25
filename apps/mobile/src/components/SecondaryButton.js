// SecondaryButton — 48h, transparent fill, border-glow outline.

import React from 'react';
import { Pressable, Text, View } from 'react-native';

export default function SecondaryButton({ children, onPress, style, icon }) {
  return (
    <Pressable
      onPress={onPress}
      style={style}
      className="h-12 rounded-md border border-glow flex-row items-center justify-center gap-2 px-5 active:bg-primary/[0.14] active:opacity-[0.92]">
      {icon}
      <Text className="text-cream font-ui-med text-[15px]">{children}</Text>
    </Pressable>
  );
}
