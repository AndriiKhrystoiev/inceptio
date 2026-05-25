// ScorePill — the "Favorable / Move with care / Highly favorable"
// pill. Carries a colored dot or sparkle prefix and a label.
// Pill bg/border use alpha-blended rgba not covered by a single token — kept inline.

import React from 'react';
import { View, Text } from 'react-native';

const MAP = {
  good:       { bg: 'rgba(103,232,199,0.12)', br: 'rgba(103,232,199,0.4)',  fgClass: 'text-good' },
  caution:    { bg: 'rgba(229,199,125,0.12)', br: 'rgba(229,199,125,0.4)',  fgClass: 'text-caution' },
  difficult:  { bg: 'rgba(216,142,142,0.12)', br: 'rgba(216,142,142,0.4)',  fgClass: 'text-difficult' },
  excellent:  { bg: 'rgba(229,199,125,0.16)', br: 'rgba(240,216,154,0.45)', fgClass: 'text-gold-glow', sparkle: true },
};

export default function ScorePill({ kind = 'good', children }) {
  const s = MAP[kind] || MAP.good;
  return (
    <View
      className="self-start flex-row items-center py-[6px] px-3 rounded-pill border"
      style={{ backgroundColor: s.bg, borderColor: s.br }}>
      {s.sparkle ? (
        <Text className={['mr-[6px] text-[11px] font-ui-semi', s.fgClass].join(' ')}>✦</Text>
      ) : (
        <View className={['w-[6px] h-[6px] rounded-full mr-[6px]', s.fgClass.replace('text-', 'bg-')].join(' ')}/>
      )}
      <Text className={['font-ui-semi text-[12px] tracking-[0.1px]', s.fgClass].join(' ')}>{children}</Text>
    </View>
  );
}
