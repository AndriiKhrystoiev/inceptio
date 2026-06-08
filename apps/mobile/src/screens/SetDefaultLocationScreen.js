// Generalized set-default-location flow (D22) — used by 3 entry points:
//   1. Onboarding interceptor (dismissLabel="Skip for now", onDismissStatus="skipped")
//   2. YouScreen Settings row (dismissLabel="Cancel", onDismissStatus={null})
//   3. Today empty-state CTA (dismissLabel="Cancel", onDismissStatus={null} per D31)
//
// Renders LocationPickerScreen embedded=true as a child; supplies header
// chrome (soft-anchor heading + dismiss button); wires onConfirm to write
// default_location + (conditionally) mark onboarding status.

import React from 'react';
import { useTranslation } from 'react-i18next';
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
  dismissLabel,
  onDismissStatus = null,
}) {
  const { t } = useTranslation('location');
  // Parents may pass an explicit dismissLabel; absent, fall back to the
  // shared localized Cancel CTA.
  const resolvedDismissLabel = dismissLabel ?? t('common:cancel');
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
            {t('defaultHeading')}
          </Text>
          <Pressable
            onPress={handleDismiss}
            hitSlop={20}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text className="font-ui text-base text-muted">{resolvedDismissLabel}</Text>
          </Pressable>
        </View>
        <View className="flex-1">
          <LocationPickerScreen
            // Embedded contract: parent owns ALL navigation. Passing a no-op
            // go to the picker explicitly so any internal go() call from the
            // picker (current or future) cannot bypass handleConfirm /
            // handleDismiss. Current picker uses go in two places: (1) the
            // Back/Close header which is JSX-gated by !embedded and won't
            // render here, (2) the handleContinue legacy fallback when
            // onConfirm is missing — which never fires because we pass
            // onConfirm. The no-op is belt-and-suspenders against a future
            // refactor that adds an internal go() outside those guards.
            go={() => {}}
            onConfirm={handleConfirm}
            embedded={true}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
