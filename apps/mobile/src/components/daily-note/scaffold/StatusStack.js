// StatusStack — container for up to 3 SavedRows + "+N more →" overflow.
// SCAFFOLD ONLY: not rendered in MVP. See ../README.md for context.

import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import SavedRow from './SavedRow';

const VISIBLE_CAP = 3;

/**
 * Props:
 *   rows       — array of { activity, text, onPress } (sorted by priority)
 *   moreCount  — number of overflow rows beyond VISIBLE_CAP
 *   onMore     — tap handler for the "+N more →" affordance
 *   onRow      — tap handler for individual rows (alt to row.onPress)
 */
export default function StatusStack({ rows = [], moreCount = 0, onMore, onRow }) {
  const visible = rows.slice(0, VISIBLE_CAP);
  return (
    <View
      style={{
        marginHorizontal: 24,
        marginTop: 12,
        backgroundColor: '#1F1838',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#3A3258',
        overflow: 'hidden',
      }}>
      {visible.map((r, i) => (
        <SavedRow
          key={`${r.activity}-${i}`}
          activity={r.activity}
          text={r.text}
          last={i === visible.length - 1 && moreCount <= 0}
          onPress={() => (onRow ? onRow(r) : r.onPress?.())}
        />
      ))}
      {moreCount > 0 && (
        <Pressable onPress={onMore}>
          <View
            className="flex-row items-center"
            style={{
              gap: 6,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderTopWidth: 1,
              borderTopColor: '#2A2247',
            }}>
            <Text className="font-ui-med" style={{ fontSize: 13, color: '#A98DFF' }}>
              +{moreCount} more
            </Text>
            <ChevronRight size={14} color="#A98DFF"/>
          </View>
        </Pressable>
      )}
    </View>
  );
}
