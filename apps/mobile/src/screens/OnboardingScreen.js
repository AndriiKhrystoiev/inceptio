// 00 Onboarding — single welcome screen.

import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import Moon from '../components/Moon';
import PrimaryButton from '../components/PrimaryButton';

export default function OnboardingScreen({ go }) {
  return (
    <View className="flex-1 bg-base">
      <HeroGradient height={900}/>
      <Starfield density="heavy"/>
      <SafeAreaView className="flex-1 px-6">
        {/* Top breathing space */}
        <View className="flex-1"/>

        {/* Logo + crescent */}
        <View className="items-center">
          <Text className="font-display text-5xl leading-[52px] tracking-[-1px] text-cream">
            inceptio
          </Text>
          <View className="mt-4">
            <Moon phase="waxing-crescent" size={40}/>
          </View>
        </View>

        <View className="h-12"/>

        {/* Headline */}
        <View className="items-center">
          <Text className="font-display-reg text-[32px] leading-[40px] tracking-[-0.3px] text-cream text-center max-w-[320px]">
            Every beginning has its moment.
          </Text>
          <Text className="font-ui text-base leading-6 text-muted text-center mt-4 max-w-[320px]">
            Inceptio helps you find the right time to start what matters — a wedding, a launch, a journey, a fresh page.
          </Text>
        </View>

        {/* Push action to bottom */}
        <View className="flex-[1.5]"/>

        {/* Action */}
        <View className="pb-8">
          <PrimaryButton onPress={() => go('today')}>Find your moment</PrimaryButton>
          <Text className="font-ui text-[13px] text-subtle text-center mt-5">
            No account needed
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
