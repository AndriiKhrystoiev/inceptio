// TabBar — bottom navigation. Uses BlurView for the frosted glass
// feel; falls back gracefully on platforms without backdrop blur.

import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Calendar, Clock, User } from 'lucide-react-native';
import { colors, fonts } from '../theme';

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
      style={{
        flexDirection: 'row',
        borderTopColor: colors.borderSoft,
        borderTopWidth: 1,
        paddingBottom: bottomPad,
        backgroundColor: 'rgba(31,24,56,0.82)',
      }}>
      {TABS.map(t => {
        const isActive = active === t.id;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 12,
              paddingBottom: 8,
              gap: 4,
            }}>
            {isActive && (
              <View style={{
                position: 'absolute',
                top: 6,
                width: 32,
                height: 3,
                borderRadius: 999,
                backgroundColor: colors.primaryGlow,
                shadowColor: colors.primaryGlow,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.7,
                shadowRadius: 6,
              }}/>
            )}
            <t.Icon
              size={22}
              color={isActive ? colors.text : colors.textSubtle}
              strokeWidth={1.5}/>
            <Text style={{
              fontFamily: fonts.uiMed,
              fontSize: 11,
              color: isActive ? colors.text : colors.textSubtle,
            }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </BlurView>
  );
}
