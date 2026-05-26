// WindowCard — L1 row: date, friendly headline, score.
// The `time` prop carries the displayable headline string ("A gentle window
// opens this morning."), not a clock time — the calling screen passes
// `w.displayable.headline` through this prop.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function WindowCard({ date, time, score, onPress }) {
  return (
    <Pressable onPress={onPress} className="active:opacity-[0.92]">
      {/* LinearGradient lives as an absolute background. Putting layout classes
          on LinearGradient is unreliable in NativeWind v4 — when both
          `style` and `className` are present on a native third-party
          component, the className's flex/padding/etc can fail to apply,
          causing children to render in default (column) flow. Keeping
          gradient purely visual and putting all layout on a plain View
          sidesteps the problem. */}
      <View className="relative rounded-[16px] overflow-hidden border border-soft">
        <LinearGradient
          colors={['#1F1838', '#2A2247']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View className="py-5 px-5 flex-row items-center justify-between gap-4">
          <View className="flex-1 min-w-0">
            <Text className="font-ui-med text-[12px] text-muted tracking-[0.4px] lowercase">
              {date}
            </Text>
            <Text
              className="font-display-reg text-[20px] leading-[26px] text-cream mt-[6px]"
              numberOfLines={2}>
              {time}
            </Text>
          </View>
          {/* Inline fontSize because Tailwind's text-* scale tops out smaller
              than this Fraunces score number. */}
          <Text
            className="font-display-reg text-cream"
            style={{ fontSize: 56, lineHeight: 60 }}
            numberOfLines={1}>
            {score}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
