// Generalized set-default-location flow used by 3 entry points (D22):
//   1. Onboarding interceptor (dismissLabel="Skip for now", onDismissStatus="skipped")
//   2. YouScreen Settings row (dismissLabel="Cancel", onDismissStatus={null})
//   3. Today empty-state CTA (dismissLabel="Cancel", onDismissStatus={null} per D31)
//
// Renders LocationPickerScreen embedded=true as a child and supplies its
// own header chrome (soft-anchor heading + dismiss button). Full impl lands
// in Phase 5 / Task 5.1.

import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LocationPickerScreen from './LocationPickerScreen';
import { setDefaultLocation, markOnboardingLocationStatus } from '../lib/location-preference';

export default function SetDefaultLocationScreen({ go, dismissLabel = 'Cancel', onDismissStatus = null }) {
  const handleConfirm = (loc) => {
    setDefaultLocation(loc);
    // Onboarding entry passes onDismissStatus='skipped' but confirms write 'completed'.
    // Settings + empty-state entries pass null and don't touch the flag on confirm
    // unless onboarding-status is still 'pending' (covered by interceptor; can't
    // happen from those entry points).
    if (onDismissStatus !== null) {
      markOnboardingLocationStatus('completed');
    }
    go('today');
  };

  const handleDismiss = () => {
    if (onDismissStatus !== null) {
      markOnboardingLocationStatus(onDismissStatus);
    }
    go('today');
  };

  return (
    <View className="flex-1 bg-base">
      <SafeAreaView className="flex-1">
        <View className="flex-row justify-between items-center px-6 py-4">
          <Text className="font-display-reg text-[20px] text-cream">
            Where do you usually start from?
          </Text>
          <Text className="font-ui text-base text-muted" onPress={handleDismiss}>
            {dismissLabel}
          </Text>
        </View>
        <View className="flex-1">
          <LocationPickerScreen go={go} onConfirm={handleConfirm} embedded={true}/>
        </View>
      </SafeAreaView>
    </View>
  );
}
