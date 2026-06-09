// StatusLine — score number + grade-pill that names the bucket.
// layout="row" by default; "col" stacks for tight contexts.

import React from 'react';
import { View, Text } from 'react-native';
import i18n from '../i18n';

// Grade key → voice:moment.grade.* canonical key. This mirrors gradeToScorePill
// in MomentDetailScreen and gradeLabel in ResultsListView — all three surfaces
// now share one vocabulary family. Labels are UPPERCASED here for the terse
// badge register StatusLine uses; the underlying word comes from the locale's
// translated grade string.
function gradeKey(grade) {
  if (grade === 'exceptional') return 'exceptional';
  if (grade === 'strong' || grade === 'good') return 'strong';
  if (grade === 'fair') return 'favorable';
  if (grade === 'caution') return 'caution';
  return 'poor';
}

function gradeLabel(grade) {
  return i18n
    .t(`moment.grade.${gradeKey(grade)}`, { ns: 'voice', keySeparator: '.' })
    .toUpperCase();
}

// Pill colors use alpha-blended tones that don't map 1:1 to tokens,
// so kept as inline style for bg/border. Text color maps to token classes.
// Only bg/br/fgClass are stored here; label is resolved at render via gradeLabel.
const STYLE = {
  exceptional: { bg: 'rgba(240,216,154,0.22)', br: 'rgba(240,216,154,0.55)', fgClass: 'text-gold-glow' },
  strong:      { bg: 'rgba(229,199,125,0.18)', br: 'rgba(240,216,154,0.45)', fgClass: 'text-gold-glow' },
  favorable:   { bg: 'rgba(139,111,232,0.14)', br: 'rgba(139,111,232,0.40)', fgClass: 'text-primary-glow' },
  caution:     { bg: 'rgba(229,199,125,0.10)', br: 'rgba(229,199,125,0.30)', fgClass: 'text-gold-muted' },
  poor:        { bg: 'rgba(216,142,142,0.10)', br: 'rgba(216,142,142,0.30)', fgClass: 'text-difficult' },
};

export default function StatusLine({ score, grade = 'fair', layout = 'row' }) {
  const key = gradeKey(grade);
  const s = STYLE[key] ?? STYLE.favorable;
  const label = gradeLabel(grade);
  return (
    <View className={[
      'items-center gap-2',
      layout === 'col' ? 'flex-col' : 'flex-row',
    ].join(' ')}>
      <Text className="font-display text-base leading-[18px] text-cream">{score}</Text>
      <View
        className="flex-row items-center py-[3px] px-2 rounded-pill border"
        style={{ backgroundColor: s.bg, borderColor: s.br }}>
        <Text className={['font-ui-semi text-[10px] tracking-[0.8px]', s.fgClass].join(' ')}>{label}</Text>
      </View>
    </View>
  );
}
