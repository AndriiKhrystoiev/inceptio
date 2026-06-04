// Generalized set-default-location flow (D22) — used by 3 entry points:
//   1. Onboarding interceptor (dismissLabel="Skip for now", onDismissStatus="skipped")
//   2. YouScreen Settings row (dismissLabel="Cancel", onDismissStatus={null})
//   3. Today empty-state CTA (dismissLabel="Cancel", onDismissStatus={null} per D31)
//
// Renders LocationPickerScreen embedded=true as a child; supplies header
// chrome (soft-anchor heading + dismiss button); wires onConfirm to write
// default_location + (conditionally) mark onboarding status.

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import LocationPickerScreen from './LocationPickerScreen';
import {
  setDefaultLocation,
  markOnboardingLocationStatus,
} from '../lib/location-preference';

export default function SetDefaultLocationScreen({
  go,
  dismissLabel = 'Cancel',
  onDismissStatus = null,
}) {
  const handleConfirm = (loc) => {
    setDefaultLocation(loc);
    // Onboarding entry (onDismissStatus='skipped') wants 'completed' on confirm.
    // Settings + empty-state entries pass null — they don't write on confirm
    // because the status is already terminal (by interceptor invariant).
    if (onDismissStatus !== null) {
      markOnboardingLocationStatus('completed');
    }
    go('today');
  };

  const handleDismiss = () => {
    // D31: empty-state CTA Cancel writes NOTHING (null sentinel).
    // Settings Cancel: same — null preserves whatever terminal status was set.
    // Onboarding Skip: writes 'skipped' to mark the user's choice.
    if (onDismissStatus !== null) {
      markOnboardingLocationStatus(onDismissStatus);
    }
    go('today');
  };

  return (
    <View className="flex-1 bg-base">
      <HeroGradient height={500}/>
      <Starfield density="light"/>
      <SafeAreaView className="flex-1">
        <View className="flex-row justify-between items-center px-6 py-4">
          <Text className="font-display-reg text-[20px] leading-[28px] text-cream max-w-[240px]">
            Where do you usually start from?
          </Text>
          <Pressable onPress={handleDismiss} hitSlop={12}>
            <Text className="font-ui text-base text-muted">{dismissLabel}</Text>
          </Pressable>
        </View>
        <View className="flex-1">
          <LocationPickerScreen
            go={go}
            onConfirm={handleConfirm}
            embedded={true}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
