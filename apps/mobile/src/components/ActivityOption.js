// ActivityOption — single-activity selection card used in:
//   1. ActivityChangeSheet  (Task 4.2, change-mode list)
//   2. FirstLaunchActivityPicker (Task 4.3, first-launch mandatory gate)
//   3. Any future activity-pick surface
//
// Visual design matches ActivityPickerScreen's Card component exactly:
// LinearGradient outer card + activity-tinted wash + tinted emoji square +
// title + subtitle + ChevronRight icon. The selected state adds a
// border-primary ring around the card (not present in ActivityPickerScreen
// which is navigation-only). When selected={false} the card is visually
// identical to ActivityPickerScreen's Card.
//
// Touch target: padding: 20 gives ≥44pt tappable area on standard DPI.
//
// Accessibility: role="button" + accessibilityState.selected mirrors the
// ARIA "option" pattern — screen readers announce selection state on focus.
//
// No RNTL unit tests: components in this project are verified via visual smoke
// (Checkpoint 1 canary + Phase 5 manual simulator run). See project test posture
// in apps/mobile/src/lib/__tests__/ — lib/hooks have tests, components do not.

import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import {
  ACTIVITY_EMOJI,
  ACTIVITY_LABELS,
  ACTIVITY_SUBTITLES,
  ACTIVITY_TINTS,
} from '../lib/activities';

/**
 * ActivityOption
 *
 * Renders a full-width card matching ActivityPickerScreen's Card visual.
 * Adds a primary-colored border ring when selected={true}.
 *
 * @param {{ activity: import('@inceptio/shared-types').Activity, selected: boolean, onPress: (activity: import('@inceptio/shared-types').Activity) => void }} props
 */
export function ActivityOption({ activity, selected, onPress }) {
  const { tint, tintDeep } = ACTIVITY_TINTS[activity];

  return (
    <Pressable
      testID={`activity-option-${activity}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onPress(activity)}
      className="active:opacity-[0.92]"
      // The border ring for selected state wraps the outer Pressable so it
      // sits outside the card gradient, giving a clean inset-free ring.
      style={selected ? {
        borderRadius: 18,  // 16 card radius + 2 border → ring hugs the card edge
        borderWidth: 2,
        borderColor: '#8B6FE8',  // accent-primary token (locked palette)
      } : {
        borderRadius: 18,
        borderWidth: 2,
        borderColor: 'transparent',
      }}
    >
      <LinearGradient
        colors={['#1F1838', '#2A2247']}
        style={{
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: '#3A3258',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          overflow: 'hidden',
        }}
      >
        {/* Activity-tinted colour wash — same as ActivityPickerScreen */}
        <LinearGradient
          colors={[tint, 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.6 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Emoji icon square — 44×44, borderRadius 12, tintDeep → tint gradient */}
        <LinearGradient
          colors={[tintDeep, tint]}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: tint,
          }}
        >
          <Text style={{ fontSize: 22 }}>{ACTIVITY_EMOJI[activity]}</Text>
        </LinearGradient>

        {/* Title + subtitle */}
        <View style={{ flex: 1 }}>
          <Text className="font-ui-med text-[17px] leading-[22px] text-cream">
            {ACTIVITY_LABELS[activity]}
          </Text>
          <Text className="font-ui text-[13px] leading-[18px] text-muted mt-[3px]">
            {ACTIVITY_SUBTITLES[activity]}
          </Text>
        </View>

        <ChevronRight color="#7A7195" size={18} strokeWidth={1.5} />
      </LinearGradient>
    </Pressable>
  );
}

export default ActivityOption;
