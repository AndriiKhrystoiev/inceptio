// ActivityLine — tappable secondary line rendered in the daily-note hierarchy
// between the date eyebrow and the headline:
//
//   eyebrow (date) → activity-line (this) → headline → body → [severity-hint]
//
// Renders the user's default activity as "for your wedding ›" with a chevron
// affordance. Tap opens ActivityChangeSheet in change mode (parent owns sheet
// state and setDefaultActivity wiring — this component is purely presentational
// given an activity + onPress).
//
// Touch target ≥ 44pt via minHeight + hitSlop (belt-and-suspenders; the visible
// row is shorter than 44pt so hitSlop extends the tappable zone beyond the row).
//
// Accessibility: role="button", accessibilityLabel announces "Change activity,
// currently <Label>" so VoiceOver/TalkBack users understand the affordance.
//
// Parent gate: this component renders only when hydrationStatus === 'set' &&
// activity is defined. The parent (DailyNoteSection) checks both conditions
// before mounting this component — no redundant guard here.
//
// Styling: inline styles mirror DailyNoteBody's approach for the eyebrow row
// text (font-ui-med, text-[13px], text-muted). NativeWind className is used
// for flex layout; inline styles are used where Tailwind utilities would require
// arbitrary values that are already established as inline-style conventions in
// this subtree.
//
// No RNTL unit tests — component tests are not the project's posture. Verified
// via Phase 5 manual smoke (Checkpoint 1 simulator run).

import React from 'react';
import { Pressable, Text } from 'react-native';
import { getActivityEyebrowPhrase, getActivityLabel } from '../lib/activities';

/**
 * ActivityLine
 *
 * @param {{
 *   activity: import('@inceptio/shared-types').Activity,
 *   onPress: () => void,
 * }} props
 */
export function ActivityLine({ activity, onPress }) {
  const phrase = getActivityEyebrowPhrase(activity);
  const label = getActivityLabel(activity);

  return (
    <Pressable
      testID="activity-line"
      accessibilityRole="button"
      accessibilityLabel={`Change activity, currently ${label}`}
      onPress={onPress}
      // minHeight ensures the visible row meets the 44pt touch-target minimum.
      // hitSlop extends the tappable area beyond the visible row (belt-and-
      // suspenders for short text rows that would otherwise fall below 44pt).
      style={{ minHeight: 44 }}
      hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
      className="flex-row items-center gap-2 py-2"
    >
      <Text
        className="font-ui-med text-muted"
        style={{ fontSize: 13, letterSpacing: 0.4 }}
      >
        {phrase}
      </Text>
      <Text
        testID="activity-line-chevron"
        className="font-ui text-muted"
        style={{ fontSize: 13 }}
      >
        ›
      </Text>
    </Pressable>
  );
}

export default ActivityLine;
