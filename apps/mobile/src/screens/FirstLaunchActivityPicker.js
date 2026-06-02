// 00b First Launch Activity Picker — D14 non-dismissible gate.
//
// Shown once on first launch (or after a preference reset) so the user sets
// their default activity before reaching Today. Mounted in MODAL_SCREENS by
// Task 4.4 so the tab bar is hidden. No back button, no close button — the
// only exit is pressing Continue with a selection.
//
// Migration courtesy: getLastActivity() pre-selects from KEY_LAST_ACTIVITY for
// users upgrading from a build that wrote last_activity but never
// default_activity. Fresh installs (null) show no preselection and Continue
// stays disabled until the user picks.
//
// No RNTL tests — screen-level verification is via simulator smoke (Checkpoint
// 1 canary + Phase 5 manual run). See apps/mobile/src/lib/__tests__/ for the
// project's test boundary.

import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import PrimaryButton from '../components/PrimaryButton';
import { ActivityOption } from '../components/ActivityOption';
import { setDefaultActivity } from '../lib/activity-preference';
import { getLastActivity } from '../lib/draft-store';

const ALL_ACTIVITIES = ['wedding', 'contracts', 'business_launch', 'travel'];

/**
 * First-launch mandatory activity picker — D14 non-dismissible gate.
 *
 * @param {{ go: (screen: string) => void }} props
 */
export default function FirstLaunchActivityPicker({ go }) {
  // Read-once on mount: pre-select from KEY_LAST_ACTIVITY as a migration
  // courtesy. getLastActivity() returns null for fresh installs, which means
  // no preselection and Continue stays disabled until the user picks.
  // NEVER calls setDefaultActivity during this read — only on Continue.
  const [selected, setSelected] = useState(() => getLastActivity() ?? null);

  function onContinue() {
    if (!selected) return;
    setDefaultActivity(selected);
    go('today');
  }

  return (
    <View className="flex-1 bg-base">
      <HeroGradient height={560} />
      <Starfield density="heavy" />

      <SafeAreaView className="flex-1 px-6">
        {/* Top breathing room — mirrors OnboardingScreen's flex-1 spacer */}
        <View className="flex-1" />

        {/* Headline */}
        <View className="items-center">
          <Text className="font-display text-[32px] leading-[40px] tracking-[-0.3px] text-cream text-center max-w-[320px]">
            Welcome to Inceptio
          </Text>
          <Text className="font-ui text-[15px] leading-[22px] text-muted text-center mt-4 max-w-[300px]">
            What kind of moment would you like to find first?
          </Text>
        </View>

        <View className="h-10" />

        {/* Activity options */}
        <View className="gap-3">
          {ALL_ACTIVITIES.map((a) => (
            <ActivityOption
              key={a}
              activity={a}
              selected={selected === a}
              onPress={setSelected}
            />
          ))}
        </View>

        {/* Push Continue to bottom */}
        <View className="flex-[1.5]" />

        {/* Continue CTA — disabled until selection is made */}
        <View className="pb-8">
          {/* View wrapper owns testID because PrimaryButton's signature does not
              forward testID to its internal Pressable — adding it there would
              affect every consumer. The wrapper gives RNTL and smoke tests a
              stable query target without touching the shared component. */}
          <View testID="first-launch-continue">
            <PrimaryButton onPress={onContinue} disabled={!selected}>
              Continue
            </PrimaryButton>
          </View>
          {/* Hint text reassures users that this isn't permanent */}
          <Text className="font-ui text-[13px] text-subtle text-center mt-5">
            You can change this anytime in You → Settings.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
