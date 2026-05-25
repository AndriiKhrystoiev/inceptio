// WindowCard — row with date + time + score; emphasises duration
// when a window is short or single-minute.

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radii } from '../theme';
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
    <Pressable onPress={onPress} style={({ pressed }) => ({
      borderRadius: radii.md,
      opacity: pressed ? 0.92 : 1,
    })}>
      <LinearGradient
        colors={[colors.surface, colors.surface2]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          borderRadius: radii.md,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderWidth: 1,
          borderColor: colors.borderSoft,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{
            fontFamily: fonts.uiMed,
            fontSize: 12,
            color: colors.textMuted,
            letterSpacing: 0.4,
            textTransform: 'lowercase',
          }}>{date}</Text>

          <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' }}>
            {isSingle && (
              <>
                <Text style={{ fontFamily: fonts.uiSemi, fontSize: 17, color: colors.goldGlow }}>{time}</Text>
                <Text style={{ fontFamily: fonts.ui, fontSize: 15, fontStyle: 'italic', color: colors.goldGlow, marginLeft: 6 }}>exactly</Text>
              </>
            )}
            {isShort && (
              <>
                <Text style={{ fontFamily: fonts.uiSemi, fontSize: 17, color: colors.goldGlow }}>{time}</Text>
                <Text style={{ fontFamily: fonts.ui, fontSize: 15, color: colors.goldGlow, marginLeft: 6 }}>· {durationMinutes} minutes</Text>
              </>
            )}
            {isLong && (
              <>
                <Text style={{ fontFamily: fonts.ui, fontSize: 15, color: colors.text }}>{time}</Text>
                {durationLabel && (
                  <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: colors.textMuted, marginLeft: 6 }}>({durationLabel})</Text>
                )}
              </>
            )}
            {durationMinutes == null && (
              <Text style={{ fontFamily: fonts.ui, fontSize: 15, color: colors.text }}>{time}</Text>
            )}
          </View>
        </View>

        <StatusLine score={score} grade={grade} layout="col"/>
      </LinearGradient>
    </Pressable>
  );
}
