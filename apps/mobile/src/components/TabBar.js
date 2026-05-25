// TabBar — bottom navigation. Uses BlurView for the frosted glass
// feel; falls back gracefully on platforms without backdrop blur.

import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Calendar, Clock, User } from 'lucide-react-native';

const TABS = [
  { id: 'today',    label: 'Today',    Icon: Home },
  { id: 'calendar', label: 'Calendar', Icon: Calendar },
  { id: 'moments',  label: 'Moments',  Icon: Clock },
  { id: 'you',      label: 'You',      Icon: User },
];

export default function TabBar({ active, onChange }) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12);

  return (
    <BlurView
      intensity={Platform.OS === 'android' ? 40 : 20}
      tint="dark"
      className="flex-row border-t border-soft"
      style={{ paddingBottom: bottomPad, backgroundColor: 'rgba(31,24,56,0.82)' }}>
      {TABS.map(t => {
        const isActive = active === t.id;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            className="flex-1 items-center justify-center pt-3 pb-2 gap-1 active:opacity-[0.7]">
            {isActive && (
              // Centered glow (shadowOffset 0,0) must stay inline per rule 6.
              <View
                className="absolute top-[6px] w-8 h-[3px] rounded-pill bg-primary-glow"
                style={{
                  shadowColor: '#A98DFF',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.7,
                  shadowRadius: 6,
                }}/>
            )}
            <t.Icon
              size={22}
              color={isActive ? '#F5EFE4' : '#7A7195'}
              strokeWidth={1.5}/>
            <Text className={[
              'font-ui-med text-[11px]',
              isActive ? 'text-cream' : 'text-subtle',
            ].join(' ')}>{t.label}</Text>
          </Pressable>
        );
      })}
    </BlurView>
  );
}
