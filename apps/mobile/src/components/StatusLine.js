// StatusLine — score number + grade-pill that names the bucket.
// layout="row" by default; "col" stacks for tight contexts.

import React from 'react';
import { View, Text } from 'react-native';
import { colors, fonts } from '../theme';

const MAP = {
  strong:  { bg: 'rgba(229,199,125,0.18)', br: 'rgba(240,216,154,0.45)', fg: '#F0D89A', label: 'STRONG' },
  fair:    { bg: 'rgba(139,111,232,0.14)', br: 'rgba(139,111,232,0.40)', fg: '#A98DFF', label: 'FAIR · GOOD WINDOW' },
  caution: { bg: 'rgba(229,199,125,0.10)', br: 'rgba(229,199,125,0.30)', fg: '#D4B872', label: 'CAUTION' },
  poor:    { bg: 'rgba(216,142,142,0.10)', br: 'rgba(216,142,142,0.30)', fg: '#D88E8E', label: 'POOR' },
};

export default function StatusLine({ score, grade = 'fair', layout = 'row' }) {
  const s = MAP[grade] || MAP.fair;
  return (
    <View style={{
      flexDirection: layout === 'col' ? 'column' : 'row',
      alignItems: 'center',
      gap: 8,
    }}>
      <Text style={{
        fontFamily: fonts.display,
        fontSize: 16,
        lineHeight: 18,
        color: colors.text,
      }}>{score}</Text>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor: s.bg,
        borderColor: s.br,
        borderWidth: 1,
      }}>
        <Text style={{
          color: s.fg,
          fontFamily: fonts.uiSemi,
          fontSize: 10,
          letterSpacing: 0.8,
        }}>{s.label}</Text>
      </View>
    </View>
  );
}
