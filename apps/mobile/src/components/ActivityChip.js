// ActivityChip — rounded pill with emoji + label, used on Today &
// in tight selection contexts. Activity Picker uses the bigger card
// component (see ActivityPickerScreen) instead.

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, fonts, radii } from '../theme';

export default function ActivityChip({ emoji, label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingLeft: 14,
      paddingRight: 18,
      borderRadius: radii.pill,
      backgroundColor: active ? 'rgba(139,111,232,0.16)' : colors.surface,
      borderColor: active ? colors.primaryGlow : colors.borderSoft,
      borderWidth: 1,
      opacity: pressed ? 0.85 : 1,
      ...(active ? {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      } : null),
    })}>
      <Text style={{ fontSize: 16 }}>{emoji}</Text>
      <Text style={{
        color: colors.text,
        fontFamily: fonts.uiMed,
        fontSize: 14,
      }}>{label}</Text>
    </Pressable>
  );
}
