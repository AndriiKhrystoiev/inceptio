// EmptyInvite — "Choose a moment of your own" chip rendered beneath the
// daily-note hero ONLY when the user has zero saved moments.
//
// Rendering decision (design memo §8): text + separate chevron icon,
// NOT a literal → glyph in the string. The voice spec §6.2 literal
// "Choose a moment of your own →" is shorthand for "text-with-affordance".
// The icon carries the affordance signal; standard RN separation of
// concerns.
//
// Gating-rationale caveat (design memo §8): gates on
// getSavedMoments().length === 0 in MVP because mobile doesn't have a
// SavedSearch concept yet. The voice spec gates on
// saved_searches.length === 0 — happens to produce identical behavior
// because Worker stubs saved_searches as []. Don't silently flip the
// gate when SavedSearch lands later; surface the decision in the
// SavedSearch brainstorm.

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight, Plus } from 'lucide-react-native';

/**
 * Props:
 *   onPress — invoked when the user taps the chip. Should navigate to the
 *             search/picker flow (same destination as the PrimaryButton at
 *             the bottom of TodayScreen).
 */
export default function EmptyInvite({ onPress }) {
  return (
    <Pressable onPress={onPress}>
      <View
        className="flex-row items-center mx-6 mt-3"
        style={{
          gap: 14,
          paddingVertical: 16,
          paddingHorizontal: 18,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#5B4F8A',
        }}>
        <View
          className="items-center justify-center"
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            backgroundColor: 'rgba(139,111,232,0.14)',
            borderWidth: 1,
            borderColor: '#5B4F8A',
          }}>
          <Plus size={18} color="#A98DFF"/>
        </View>
        <Text className="flex-1 font-ui-med text-cream" style={{ fontSize: 15 }}>
          Choose a moment of your own
        </Text>
        <ChevronRight size={18} color="#A98DFF"/>
      </View>
    </Pressable>
  );
}
