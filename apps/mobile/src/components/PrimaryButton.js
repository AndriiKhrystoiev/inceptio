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

// Active gradient = the warm-violet "tap me" fill. Disabled gradient sits
// in the same color family but desaturated so the button still reads as
// "the primary action" without inviting a tap. Pairing this with no glow
// + dimmed text gives an unambiguous dead state — the previous opacity-0.4
// override at the call-site couldn't dim the shadow, so the button still
// glowed violet while supposedly disabled.
const ACTIVE_COLORS = ['#A98DFF', '#8B6FE8'];
const DISABLED_COLORS = ['#3A3258', '#2A2247'];

export default function PrimaryButton({ children, onPress, style, disabled = false }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        disabled ? null : GLOW_STYLE,
        {
          borderRadius: 14,
          opacity: disabled ? 0.55 : pressed ? 0.92 : 1,
          transform: [{ scale: !disabled && pressed ? 0.985 : 1 }],
        },
        style,
      ]}>
      {/* Layout lives on a plain View — NativeWind's class application is
          unreliable on third-party native components like LinearGradient when
          `style` is also present (collapses height, drops alignment). The
          gradient is purely a background paint layer behind the content. */}
      <View className="h-14 items-center justify-center px-6 rounded-[14px] overflow-hidden">
        <LinearGradient
          colors={disabled ? DISABLED_COLORS : ACTIVE_COLORS}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text
          className={`font-ui-semi text-base tracking-[0.1px] ${
            disabled ? 'text-muted' : 'text-cream'
          }`}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}
