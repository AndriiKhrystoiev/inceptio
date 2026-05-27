// Lightweight transient confirmation pill. Fades in (200ms), holds (1500ms),
// fades out (300ms), then calls onDismiss so the parent can clear its
// message state. Position is absolute at the bottom of the host view.

import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

const FADE_IN_MS = 200;
const HOLD_MS = 1500;
const FADE_OUT_MS = 300;

export default function Toast({ message, tone = 'neutral', onDismiss }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return undefined;

    const animation = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: FADE_IN_MS, useNativeDriver: true }),
      Animated.delay(HOLD_MS),
      Animated.timing(opacity, { toValue: 0, duration: FADE_OUT_MS, useNativeDriver: true }),
    ]);

    animation.start(({ finished }) => {
      if (finished && onDismiss) onDismiss();
    });

    return () => {
      // If the message changes mid-animation, stop the old timeline so the
      // new message starts from the correct opacity.
      animation.stop();
    };
  }, [message, opacity, onDismiss]);

  if (!message) return null;

  // Tone: 'neutral' (cream on surface) or 'warn' (gold border) — keeps the
  // surface palette consistent with the rest of the app.
  const borderClass = tone === 'warn' ? 'border-gold-glow' : 'border-soft';

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 24,
        right: 24,
        bottom: 96,
        alignItems: 'center',
        opacity,
      }}>
      <View className={`bg-surface-2 px-5 py-3 rounded-full border ${borderClass}`}>
        <Text className="font-ui-med text-[14px] text-cream text-center">{message}</Text>
      </View>
    </Animated.View>
  );
}
