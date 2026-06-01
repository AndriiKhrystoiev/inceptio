// InWindowCard — emphasized warm-and-steady variant for state='in-window'.
// SCAFFOLD ONLY: not rendered in MVP. See ../README.md for context.

import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { ActivityPlate } from './activity-display';

/**
 * Props:
 *   activity — Activity enum value
 *   text     — main status copy
 *   sub      — optional secondary copy (e.g. "Open until 4:08")
 *   onPress  — tap handler
 */
export default function InWindowCard({ activity, text, sub, onPress }) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          marginHorizontal: 24,
          marginTop: 12,
          padding: 16,
          borderRadius: 16,
          backgroundColor: '#1F1838',
          borderWidth: 1,
          borderColor: 'rgba(240,216,154,0.42)',
        }}>
        <View className="flex-row items-center" style={{ gap: 8, marginBottom: 12 }}>
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              backgroundColor: '#F0D89A',
              shadowColor: '#F0D89A',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 4,
            }}
          />
          <Text
            className="font-ui-semi uppercase"
            style={{ fontSize: 11, color: '#F0D89A', letterSpacing: 1.1 }}>
            Happening now
          </Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 14 }}>
          <ActivityPlate activity={activity} size={38}/>
          <View className="flex-1">
            <Text
              className="font-display-reg text-cream"
              style={{ fontSize: 18, lineHeight: 24 }}>
              {text}
            </Text>
            {sub ? (
              <Text style={{ marginTop: 3, fontSize: 13, lineHeight: 18, color: '#E5C77D' }}>
                {sub}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
