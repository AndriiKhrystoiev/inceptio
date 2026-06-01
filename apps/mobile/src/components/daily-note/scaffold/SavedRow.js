// SavedRow — quiet status row used inside StatusStack.
// SCAFFOLD ONLY: not rendered in MVP. See ../README.md for context.

import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { ActivityPlate } from './activity-display';

/**
 * Props:
 *   activity — Activity enum value
 *   text     — pre-rendered status string (e.g. "Wedding window — in 3 days")
 *   last     — when true, omits the bottom border
 *   onPress  — tap handler
 */
export default function SavedRow({ activity, text, last, onPress }) {
  return (
    <Pressable onPress={onPress}>
      <View
        className="flex-row items-center"
        style={{
          gap: 12,
          paddingVertical: 13,
          paddingHorizontal: 16,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: '#2A2247',
        }}>
        <ActivityPlate activity={activity}/>
        <Text
          className="flex-1 font-ui"
          style={{ fontSize: 14, lineHeight: 19, color: '#D8D2E4' }}>
          {text}
        </Text>
        <ChevronRight size={16} color="#7A7195"/>
      </View>
    </Pressable>
  );
}
