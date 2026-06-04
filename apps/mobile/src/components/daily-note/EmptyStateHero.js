// Empty-state hero rendered by TodayScreen when the user has completed
// onboarding (locationHydrationStatus === 'set') but has no effective
// location (effectiveLocation === null). Sibling of LoadingHero/ErrorHero.
// Final styling + voice copy lands in Phase 5 / Task 5.4 (D29).

import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeroGradient from '../HeroGradient';
import Starfield from '../Starfield';
import PrimaryButton from '../PrimaryButton';

export default function EmptyStateHero({ onSetLocation }) {
  return (
    <View className="flex-1 bg-base">
      <HeroGradient height={900}/>
      <Starfield density="light"/>
      <SafeAreaView className="flex-1 px-6">
        <View className="flex-1"/>
        <View className="items-center">
          <Text className="font-display-reg text-[28px] leading-[36px] text-cream text-center max-w-[320px]">
            Set a default location to see your daily timing.
          </Text>
        </View>
        <View className="flex-[1.5]"/>
        <View className="pb-8">
          <PrimaryButton onPress={onSetLocation}>Add a location</PrimaryButton>
        </View>
      </SafeAreaView>
    </View>
  );
}
