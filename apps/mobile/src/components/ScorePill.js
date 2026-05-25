// ScorePill — the "Favorable / Move with care / Highly favorable"
// pill. Carries a colored dot or sparkle prefix and a label.

import React from 'react';
import { View, Text } from 'react-native';

const MAP = {
  good:       { bg: 'rgba(103,232,199,0.12)', br: 'rgba(103,232,199,0.4)',  fg: '#67E8C7' },
  caution:    { bg: 'rgba(229,199,125,0.12)', br: 'rgba(229,199,125,0.4)',  fg: '#E5C77D' },
  difficult:  { bg: 'rgba(216,142,142,0.12)', br: 'rgba(216,142,142,0.4)',  fg: '#D88E8E' },
  excellent:  { bg: 'rgba(229,199,125,0.16)', br: 'rgba(240,216,154,0.45)', fg: '#F0D89A', sparkle: true },
};

export default function ScorePill({ kind = 'good', children }) {
  const s = MAP[kind] || MAP.good;
  return (
    <View style={{
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: s.bg,
      borderColor: s.br,
      borderWidth: 1,
    }}>
      {s.sparkle ? (
        <Text style={{ color: s.fg, marginRight: 6, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>✦</Text>
      ) : (
        <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: s.fg, marginRight: 6 }}/>
      )}
      <Text style={{ color: s.fg, fontFamily: 'Inter_600SemiBold', fontSize: 12, letterSpacing: 0.1 }}>{children}</Text>
    </View>
  );
}
