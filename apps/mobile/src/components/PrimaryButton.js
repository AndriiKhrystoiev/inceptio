// PrimaryButton — 56h, gradient violet fill, soft glow.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
      {/* Layout lives on a plain View — NativeWind's class application is
          unreliable on third-party native components like LinearGradient when
          `style` is also present (collapses height, drops alignment). The
          gradient is purely a background paint layer behind the content. */}
      <View className="h-14 items-center justify-center px-6 rounded-[14px] overflow-hidden">
        <LinearGradient
          colors={['#A98DFF', '#8B6FE8']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text className="text-cream font-ui-semi text-base tracking-[0.1px]">
          {children}
        </Text>
      </View>
    </Pressable>
  );
}
