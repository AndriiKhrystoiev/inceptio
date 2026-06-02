// ActivityOption — single-activity selection row used in:
//   1. ActivityChangeSheet  (Task 4.2, change-mode list)
//   2. FirstLaunchActivityPicker (Task 4.3, first-launch mandatory gate)
//   3. Any future activity-pick surface
//
// Rendering is intentionally "thin": tint background from ACTIVITY_DISPLAY,
// accent-primary border when selected, transparent border when idle. This keeps
// the visual weight low so sheets can stack multiple options without crowding.
//
// Touch target: py-4 gives ≥44pt on standard DPI. The flex-row layout scales
// correctly if the host container is narrower than the default screen width.
//
// Accessibility: role="button" + accessibilityState.selected mirrors the
// ARIA "option" pattern — screen readers announce selection state on focus.
//
// No RNTL unit tests: components in this project are verified via visual smoke
// (Checkpoint 1 canary + Phase 5 manual simulator run). See project test posture
// in apps/mobile/src/lib/__tests__/ — lib/hooks have tests, components do not.

import React from 'react';
import { Pressable, Text } from 'react-native';
import { ACTIVITY_EMOJI, ACTIVITY_LABELS, ACTIVITY_DISPLAY } from '../lib/activities';

/**
 * ActivityOption
 *
 * @param {{ activity: import('@inceptio/shared-types').Activity, selected: boolean, onPress: (activity: import('@inceptio/shared-types').Activity) => void }} props
 */
export function ActivityOption({ activity, selected, onPress }) {
  const { tint } = ACTIVITY_DISPLAY[activity];

  const borderClass = selected
    ? 'border-2 border-primary'
    : 'border-2 border-transparent';

  return (
    <Pressable
      testID={`activity-option-${activity}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onPress(activity)}
      className={[
        'flex-row items-center gap-3',
        'rounded-xl px-4 py-4',
        tint,
        borderClass,
        'active:opacity-[0.85]',
      ].join(' ')}
    >
      <Text className="text-2xl">{ACTIVITY_EMOJI[activity]}</Text>
      <Text className="text-cream font-ui-med text-base">{ACTIVITY_LABELS[activity]}</Text>
    </Pressable>
  );
}

export default ActivityOption;
