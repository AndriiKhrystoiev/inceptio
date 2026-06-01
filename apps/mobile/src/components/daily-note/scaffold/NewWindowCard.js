// NewWindowCard — emphasized bright-and-brief variant for state='new-window'.
// SCAFFOLD ONLY: not rendered in MVP. See ../README.md for context.
//
// onAck is a generic () => void callback. The future wire-in passes
// () => postAlertAck(alertId) at the use site. NewWindowCard stays ignorant
// of network concerns; tests render it with a noop ack.

import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { ActivityPlate } from './activity-display';

/**
 * Props:
 *   activity — Activity enum value
 *   text     — main status copy (e.g. "A stronger wedding window — Thursday")
 *   alertId  — passed through, used by the future wire-in for onAck
 *   onPress  — tap handler (typically navigates to detail + fires onAck)
 *   onAck    — () => void; future wire-in passes () => postAlertAck(alertId)
 */
export default function NewWindowCard({ activity, text, alertId, onPress, onAck }) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          marginHorizontal: 24,
          marginTop: 12,
          padding: 15,
          borderRadius: 16,
          backgroundColor: '#1F1838',
          borderWidth: 1,
          borderColor: 'rgba(169,141,255,0.55)',
        }}>
        <View className="flex-row items-center" style={{ gap: 7, marginBottom: 10 }}>
          <Text style={{ color: '#A98DFF', fontSize: 12 }}>✦</Text>
          <Text
            className="font-ui-semi uppercase"
            style={{ fontSize: 11, color: '#A98DFF', letterSpacing: 1.1 }}>
            New · just found
          </Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <ActivityPlate activity={activity}/>
          <Text
            className="flex-1 font-ui-med text-cream"
            style={{ fontSize: 15, lineHeight: 20 }}>
            {text}
          </Text>
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <Text className="font-ui-semi" style={{ fontSize: 13, color: '#A98DFF' }}>
              See it
            </Text>
            <ChevronRight size={14} color="#A98DFF"/>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
