// StatusLine — score number + grade-pill that names the bucket.
// layout="row" by default; "col" stacks for tight contexts.

import React from 'react';
import { View, Text } from 'react-native';

// Pill colors use alpha-blended tones that don't map 1:1 to tokens,
// so kept as inline style for bg/border. Text color maps to token classes.
const MAP = {
  strong:  { bg: 'rgba(229,199,125,0.18)', br: 'rgba(240,216,154,0.45)', fgClass: 'text-gold-glow',    label: 'STRONG' },
  fair:    { bg: 'rgba(139,111,232,0.14)', br: 'rgba(139,111,232,0.40)', fgClass: 'text-primary-glow', label: 'FAIR · GOOD WINDOW' },
  caution: { bg: 'rgba(229,199,125,0.10)', br: 'rgba(229,199,125,0.30)', fgClass: 'text-gold-muted',   label: 'CAUTION' },
  poor:    { bg: 'rgba(216,142,142,0.10)', br: 'rgba(216,142,142,0.30)', fgClass: 'text-difficult',    label: 'POOR' },
};

export default function StatusLine({ score, grade = 'fair', layout = 'row' }) {
  const s = MAP[grade] || MAP.fair;
  return (
    <View className={[
      'items-center gap-2',
      layout === 'col' ? 'flex-col' : 'flex-row',
    ].join(' ')}>
      <Text className="font-display text-base leading-[18px] text-cream">{score}</Text>
      <View
        className="flex-row items-center py-[3px] px-2 rounded-pill border"
        style={{ backgroundColor: s.bg, borderColor: s.br }}>
        <Text className={['font-ui-semi text-[10px] tracking-[0.8px]', s.fgClass].join(' ')}>{s.label}</Text>
      </View>
    </View>
  );
}
