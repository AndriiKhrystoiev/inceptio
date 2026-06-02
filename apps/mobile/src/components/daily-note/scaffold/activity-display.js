// Activity display data is now the canonical source from lib/activities.
// ACTIVITY_NOUNS, ACTIVITY_DISPLAY, and getActivityNoun are re-exported from
// there so the scaffold stays in sync automatically.
//
// NOTE: lib/activities.ts ACTIVITY_NOUNS uses sentence-context lowercase
// ('wedding', 'contract', 'launch', 'journey') while the Worker dictionary
// (status-lines.ts) uses capitalized display nouns ('Wedding', 'Contract',
// 'Launch', 'Travel'). This divergence is flagged in Task 1.4 — the worker-
// mirror parity test surfaces it explicitly. Resolve before wire-in.
//
// NOTE: lib/activities.ts ACTIVITY_DISPLAY uses NativeWind class strings
// ('bg-wedding-tint' / 'border-wedding-ring') rather than rgba literals.
// ActivityPlate's inline style usage (backgroundColor: a.tint) will receive
// a NativeWind class string after this re-export — acceptable for a scaffold-
// only component not rendered in MVP; must be updated at wire-in time.

// All imports must precede other module statements per ES module spec.
import React from 'react';
import { View, Text } from 'react-native';
import { ACTIVITY_DISPLAY } from '../../../lib/activities';

// Re-export canonical data so existing consumers of this path keep working.
export {
  ACTIVITY_NOUNS,
  ACTIVITY_DISPLAY,
  getActivityNoun,
} from '../../../lib/activities';

/**
 * ActivityPlate — emoji-in-tinted-square used by SavedRow, InWindowCard,
 * NewWindowCard.
 *
 * Props:
 *   activity — Activity enum value
 *   size     — pixel size (default 32)
 */
export function ActivityPlate({ activity, size = 32 }) {
  const a = ACTIVITY_DISPLAY[activity] || ACTIVITY_DISPLAY.wedding;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 9,
        backgroundColor: a.tint,
        borderWidth: 1,
        borderColor: a.ring,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontSize: size * 0.5 }}>{a.emoji}</Text>
    </View>
  );
}
