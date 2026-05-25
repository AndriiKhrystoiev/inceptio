// ActivityChip — rounded pill with emoji + label, used on Today &
// in tight selection contexts. Activity Picker uses the bigger card
// component (see ActivityPickerScreen) instead.

import React from 'react';
import { Pressable, Text } from 'react-native';

export default function ActivityChip({ emoji, label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        'flex-row items-center gap-2.5',
        'py-2.5 pl-3.5 pr-[18px]',
        'rounded-pill border',
        active
          ? 'bg-primary/[0.16] border-primary-glow shadow-lg shadow-primary'
          : 'bg-surface border-soft',
        'active:opacity-[0.85]',
      ].join(' ')}
    >
      <Text className="text-base">{emoji}</Text>
      <Text className="text-cream font-ui-med text-sm">{label}</Text>
    </Pressable>
  );
}
