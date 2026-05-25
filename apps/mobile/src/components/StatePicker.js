// StatePicker — small inline switcher used to preview multi-state
// screens during review. Production should derive state from data.

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors, fonts } from '../theme';

export default function StatePicker({ label = 'state', options, value, onChange }) {
  return (
    <View style={{
      paddingHorizontal: 24,
      paddingTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    }}>
      <Text style={{
        color: colors.textSubtle,
        fontFamily: fonts.uiSemi,
        fontSize: 10,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginRight: 4,
      }}>{label}</Text>
      {options.map(([id, lab]) => {
        const active = value === id;
        return (
          <Pressable key={id} onPress={() => onChange(id)} style={{
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: 999,
            backgroundColor: active ? 'rgba(139,111,232,0.16)' : 'transparent',
            borderColor: active ? colors.borderGlow : colors.borderSoft,
            borderWidth: 1,
          }}>
            <Text style={{
              color: active ? colors.text : colors.textMuted,
              fontFamily: fonts.uiMed,
              fontSize: 11,
            }}>{lab}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
