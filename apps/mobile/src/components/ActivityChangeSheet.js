// ActivityChangeSheet — bottom-sheet activity selector for change-mode surfaces.
//
// Two consumers (both Phase 5+ surfaces):
//   1. Today's tappable activity-line (Phase 5 Task 5.1) — passes
//      `current={defaultActivity}`, calls setDefaultActivity in onSelect.
//   2. YouScreen Default activity Row (Phase 7 Task 7.1) — same pattern.
//
// NOT used by FirstLaunchActivityPicker (Task 4.3) — first-launch is a
// mandatory non-dismissible gate (D14) and renders ActivityOption rows
// directly in its own full-screen layout. This sheet is change-mode only,
// with a backdrop-press onClose escape.
//
// Modal pattern: follows DatePickerScreen.js convention — backdrop and sheet
// are absolute-positioned siblings inside a flex-end View. The sheet body
// uses inline styles (not NativeWind className) because NativeWind className
// layout/padding can fail to apply on Views rendered inside Modal context
// boundaries (documented in WindowCard.js and DatePickerScreen.js comments).
// Backdrop is a separate absolute Pressable; sheet is a plain View.
//
// Behavior:
//   - Tap a different activity → onSelect(next), parent handles dismissal
//   - Tap the current activity → no-op (ActivityOption shows it's selected;
//     onPress guard `if (next !== current) onSelect(next)` skips dispatch)
//   - Tap the backdrop → onClose (discard intent)
//   - Hardware back (Android) → onClose via Modal's onRequestClose
//
// No RNTL unit tests — component tests are not the project's posture.
// Rendering verified via Phase 5 manual smoke (Checkpoint 2 simulator run).

import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { ActivityOption } from './ActivityOption';

/** All four MVP activities, in display order. */
const ALL_ACTIVITIES = ['wedding', 'contracts', 'business_launch', 'travel'];

/**
 * ActivityChangeSheet
 *
 * @param {{
 *   open: boolean,
 *   current: import('@inceptio/shared-types').Activity,
 *   onSelect: (activity: import('@inceptio/shared-types').Activity) => void,
 *   onClose: () => void,
 * }} props
 */
export function ActivityChangeSheet({ open, current, onSelect, onClose }) {
  return (
    <Modal
      transparent
      visible={open}
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Outer container — flex-end so sheet hugs the bottom. */}
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>

        {/* Backdrop: absolute Pressable fills the full screen behind the sheet.
            Tapping here dismisses without selecting. Using absolute positioning
            (not nested Pressable + stopPropagation) mirrors the DatePickerScreen
            pattern — it's more reliable across Android/iOS Modal rendering. */}
        <Pressable
          testID="activity-change-sheet-backdrop"
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
          }}
        />

        {/* Sheet body: plain View (not Pressable) so taps inside don't
            propagate to the backdrop Pressable. Inline styles per project
            convention for Modal content (see DatePickerScreen.js). */}
        <View
          testID="activity-change-sheet-body"
          style={{
            backgroundColor: '#1F1838',       // bg-surface
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderTopColor: '#3A3258',         // border-soft
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 40,
            gap: 12,
          }}
        >
          <Text
            className="font-display-reg text-cream"
            style={{ fontSize: 20, lineHeight: 26, marginBottom: 4 }}
          >
            Default activity
          </Text>

          {ALL_ACTIVITIES.map((a) => (
            <ActivityOption
              key={a}
              activity={a}
              selected={a === current}
              onPress={(next) => {
                // Guard: tapping the already-selected activity is a visual
                // affordance only — the option shows as selected but nothing
                // changes. The parent is not called; it need not handle this.
                if (next !== current) onSelect(next);
              }}
            />
          ))}
        </View>

      </View>
    </Modal>
  );
}

export default ActivityChangeSheet;
