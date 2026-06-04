// Empty-state hero rendered by TodayScreen when the user has completed
// onboarding (locationHydrationStatus === 'set') but has no effective
// location (effectiveLocation === null). Sibling of LoadingHero/ErrorHero.
//
// Full-screen layout (flex-1 bg-base + inline HeroGradient + Starfield)
// rather than the HeroBackdrop card-zone wrapper used by DailyHero — the
// card zone is a fixed-height section inside TodayScreen, whereas this
// state owns the whole screen. Moon size 62 mirrors DailyHero's default
// variant. Spec §4.7 + §5.3.

import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeroGradient from '../HeroGradient';
import Starfield from '../Starfield';
import Moon from '../Moon';
import PrimaryButton from '../PrimaryButton';

export default function EmptyStateHero({ onSetLocation }) {
  return (
    <View className="flex-1 bg-base">
      <HeroGradient height={900}/>
      <Starfield density="light"/>
      <SafeAreaView className="flex-1 px-6">
        <View className="flex-1"/>
        <View className="items-center">
          <Moon phase="waxing-crescent" size={62} glow={false}/>
          <View className="h-8"/>
          <Text className="font-display-reg text-[28px] leading-[36px] tracking-[-0.3px] text-cream text-center max-w-[320px]">
            Set a default location to see your daily timing.
          </Text>
          <Text className="font-ui text-base leading-6 text-muted text-center mt-4 max-w-[320px]">
            We'll show how the sky is moving for your usual starting point.
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
