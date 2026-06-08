// TabBar — bottom navigation. Uses BlurView for the frosted glass
// feel; falls back gracefully on platforms without backdrop blur.

import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Home, Calendar, Clock, User } from 'lucide-react-native';

// Tab ids double as nav-ns translation keys (today/calendar/moments/you).
const TABS = [
  { id: 'today',    Icon: Home },
  { id: 'calendar', Icon: Calendar },
  { id: 'moments',  Icon: Clock },
  { id: 'you',      Icon: User },
];

export default function TabBar({ active, onChange }) {
  const { t } = useTranslation('nav');
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12);

  return (
    <BlurView
      intensity={Platform.OS === 'android' ? 40 : 20}
      tint="dark"
      className="flex-row border-t border-soft"
      style={{ paddingBottom: bottomPad, backgroundColor: 'rgba(31,24,56,0.82)' }}>
      {TABS.map(tab => {
        const isActive = active === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
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
            <tab.Icon
              size={22}
              color={isActive ? '#F5EFE4' : '#7A7195'}
              strokeWidth={1.5}/>
            <Text className={[
              'font-ui-med text-[11px]',
              isActive ? 'text-cream' : 'text-subtle',
            ].join(' ')}>{t(tab.id)}</Text>
          </Pressable>
        );
      })}
    </BlurView>
  );
}
