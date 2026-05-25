// StatePicker — small inline switcher used to preview multi-state
// screens during review. Production should derive state from data.

import React from 'react';
import { View, Text, Pressable } from 'react-native';

export default function StatePicker({ label = 'state', options, value, onChange }) {
  return (
    <View className="px-6 pt-3 flex-row items-center gap-[6px] flex-wrap">
      <Text className="text-subtle font-ui-semi text-[10px] tracking-[0.8px] uppercase mr-1">{label}</Text>
      {options.map(([id, lab]) => {
        const active = value === id;
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            className={[
              'py-1 px-[10px] rounded-pill border',
              active ? 'bg-primary/[0.16] border-glow' : 'border-soft',
            ].join(' ')}>
            <Text className={[
              'font-ui-med text-[11px]',
              active ? 'text-cream' : 'text-muted',
            ].join(' ')}>{lab}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
