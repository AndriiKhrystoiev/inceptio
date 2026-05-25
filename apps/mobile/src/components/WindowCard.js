// WindowCard — row with date + time + score; emphasises duration
// when a window is short or single-minute.

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import StatusLine from './StatusLine';

export default function WindowCard({
  date, time,
  durationMinutes, durationLabel,
  score, grade = 'fair',
  onPress,
}) {
  const isShort  = durationMinutes != null && durationMinutes <= 10 && durationMinutes > 1;
  const isSingle = durationMinutes === 1;
  const isLong   = durationMinutes != null && durationMinutes > 10;

  return (
    <Pressable onPress={onPress} className="rounded-md active:opacity-[0.92]">
      <LinearGradient
        colors={['#1F1838', '#2A2247']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ borderRadius: 14 }}
        className="py-[14px] px-4 border border-soft flex-row items-center justify-between gap-3">
        <View className="flex-1 min-w-0">
          <Text className="font-ui-med text-[12px] text-muted tracking-[0.4px] lowercase">{date}</Text>

          <View className="mt-1 flex-row items-baseline flex-wrap">
            {isSingle && (
              <>
                <Text className="font-ui-semi text-[17px] text-gold-glow">{time}</Text>
                <Text className="font-ui text-[15px] italic text-gold-glow ml-[6px]">exactly</Text>
              </>
            )}
            {isShort && (
              <>
                <Text className="font-ui-semi text-[17px] text-gold-glow">{time}</Text>
                <Text className="font-ui text-[15px] text-gold-glow ml-[6px]">· {durationMinutes} minutes</Text>
              </>
            )}
            {isLong && (
              <>
                <Text className="font-ui text-[15px] text-cream">{time}</Text>
                {durationLabel && (
                  <Text className="font-ui text-[13px] text-muted ml-[6px]">({durationLabel})</Text>
                )}
              </>
            )}
            {durationMinutes == null && (
              <Text className="font-ui text-[15px] text-cream">{time}</Text>
            )}
          </View>
        </View>

        <StatusLine score={score} grade={grade} layout="col"/>
      </LinearGradient>
    </Pressable>
  );
}
