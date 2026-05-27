// ScorePill — grade-aware status pill. Every grade now carries a lucide
// icon as well as the colored tint, so color + icon together communicate
// the grade at a glance without reading the label.
//
// Icon roles:
//   exceptional  →  Sparkles  (festive, two sparkles)
//   strong       →  Sparkle   (calm celebration, one sparkle)
//   fair         →  Moon      (the brand mark — calm presence)
//   caution      →  CircleAlert  (gentle "be aware")
//   poor         →  CircleMinus  (clear "not now", not alarmist)
//
// Lucide v1.x renamed AlertCircle → CircleAlert and MinusCircle → CircleMinus.
// Using the new names matches the installed version.
//
// Colors per design-v2.1 (lines 196-201):
//   75+ (exceptional, strong)  →  gold tint, sparkle
//   60-74 (fair)               →  warm violet, moon
//   40-59 (caution)            →  muted gold/amber, circle-alert
//   < 40 (poor)                →  dim rose, circle-minus

import React from 'react';
import { View, Text } from 'react-native';
import {
  Sparkles,
  Sparkle,
  Moon,
  CircleAlert,
  CircleMinus,
} from 'lucide-react-native';

const STYLE_BY_KIND = {
  exceptional: {
    bg: 'rgba(229,199,125,0.18)',
    br: 'rgba(240,216,154,0.55)',
    fgClass: 'text-gold-glow',
    iconColor: '#F0D89A', // gold-glow
    Icon: Sparkles,
  },
  strong: {
    bg: 'rgba(229,199,125,0.14)',
    br: 'rgba(240,216,154,0.45)',
    fgClass: 'text-gold-glow',
    iconColor: '#F0D89A',
    Icon: Sparkle,
  },
  fair: {
    bg: 'rgba(139,111,232,0.12)',
    br: 'rgba(169,141,255,0.45)',
    fgClass: 'text-primary-glow',
    iconColor: '#A98DFF', // primary-glow
    Icon: Moon,
  },
  caution: {
    bg: 'rgba(229,199,125,0.12)',
    br: 'rgba(229,199,125,0.40)',
    fgClass: 'text-caution',
    iconColor: '#E5C77D', // caution / gold
    Icon: CircleAlert,
  },
  poor: {
    bg: 'rgba(216,142,142,0.12)',
    br: 'rgba(216,142,142,0.45)',
    fgClass: 'text-difficult',
    iconColor: '#D88E8E', // difficult / muted rose
    Icon: CircleMinus,
  },
};

// Legacy kind names — preserve existing TodayScreen callers. `good`
// previously rendered as mint/teal; per design-v2.1 fair (60-74) should
// be warm violet, so it redirects to the violet entry.
const KIND_ALIAS = {
  good: 'fair',
  excellent: 'strong',
  difficult: 'poor',
};

function resolveKind(kind) {
  if (STYLE_BY_KIND[kind]) return kind;
  if (KIND_ALIAS[kind]) return KIND_ALIAS[kind];
  return 'fair';
}

export default function ScorePill({ kind = 'fair', children }) {
  const s = STYLE_BY_KIND[resolveKind(kind)];
  const { Icon } = s;
  return (
    <View
      className="self-start flex-row items-center py-[5px] px-[10px] rounded-pill border gap-[6px]"
      style={{ backgroundColor: s.bg, borderColor: s.br }}>
      <Icon size={14} color={s.iconColor} strokeWidth={1.75} />
      <Text className={`font-ui-semi text-[12px] tracking-[0.1px] ${s.fgClass}`}>
        {children}
      </Text>
    </View>
  );
}
