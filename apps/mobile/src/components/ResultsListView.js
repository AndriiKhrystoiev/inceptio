// Results list — alternate view of the Calendar screen's data. Renders
// clustered top_windows[] as ranked cards. Each card represents one
// favorable stretch (one cluster of consecutive same-signature windows)
// rather than each API sample, so a 7-sample Jupiter evening shows as
// one card with a time range instead of 7 near-identical rows.
//
// Cards are built upstream by `lib/cluster-windows.ts` — this component
// only renders. Header pills + range row stay in CalendarScreen; this
// component owns only the section label, the card list, and the empty
// state.

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import ScorePill from './ScorePill';

// Short labels for the per-card pill — design-ref screenshot shows
// "Exceptional" / "Strong" not the verbose "Exceptional moment" /
// "Highly favorable" used on MomentDetail. Different surface, different copy
// weight; keeping the Results variants as DISTINCT voice keys (voice.moment.
// results.*) rather than reusing the MomentDetail grade words.
// VOICE (en-only) — ruling-flavored grade words; traversed with keySeparator '.'
// (global config sets keySeparator:false).
// REVIEW: grade words carry a traditional-astrology register — values pending
// native + astrology-literate review pre-launch.
function gradeLabel(grade) {
  const key =
    grade === 'exceptional' ? 'exceptional'
      : grade === 'strong' || grade === 'good' ? 'strong'
      : grade === 'fair' ? 'favorable'
      : grade === 'caution' ? 'caution'
      : 'poor';
  return i18n.t(`moment.results.${key}`, { ns: 'voice', keySeparator: '.' });
}

// `kind` mapping mirrors gradeToScorePill in MomentDetailScreen — keep them
// aligned so pill colors track grade identically across surfaces.
function gradeKind(grade) {
  if (grade === 'exceptional') return 'exceptional';
  if (grade === 'strong' || grade === 'good') return 'strong';
  if (grade === 'fair') return 'fair';
  if (grade === 'caution') return 'caution';
  return 'poor';
}

// Score number color: gold for exceptional, cream for everything else.
// Matches design-ref where the "91" reads gold and the "78" reads cream.
function scoreColor(grade) {
  return grade === 'exceptional' ? '#F0D89A' : '#F5EFE4';
}

// Per-window tagline. Prefers the Worker's diversified `tagline` field
// (added in translations v2 — picks a factor that's NOT dominant across the
// result set, falling back to a time-of-day phrase when all factors repeat).
// Falls back to factors[0] for older cached responses where `tagline` is
// missing, and ultimately to the search-level headline.
function tagline(w) {
  return (
    w.displayable?.tagline?.phrase_short ||
    w.displayable?.factors?.[0]?.phrase_short ||
    w.displayable?.factors?.[0]?.phrase_full ||
    w.displayable?.headline ||
    ''
  );
}

export default function ResultsListView({ cards, onCardPress, onAdjustSearch }) {
  const { t } = useTranslation('moment');
  if (!cards || cards.length === 0) {
    return <ListEmptyState onAdjustSearch={onAdjustSearch} />;
  }
  return (
    <View>
      <Text className="font-ui text-[14px] text-muted">{t('results.lead')}</Text>
      <View className="gap-3 mt-4">
        {cards.map((c, i) => (
          <Card
            key={c.representative?.rank ?? `${c.representative?.start}-${i}`}
            card={c}
            onPress={() => onCardPress(c)}
          />
        ))}
      </View>
    </View>
  );
}

function Card({ card, onPress }) {
  const { t } = useTranslation('moment');
  const { representative: w, count, dateText, timePrimary, timeSecondary } = card;

  return (
    <Pressable
      onPress={onPress}
      className="border border-soft rounded-[16px] px-5 py-4 active:opacity-[0.92]"
      style={{ backgroundColor: 'rgba(31,24,56,0.50)' }}>
      <View className="flex-row items-start justify-between gap-3">
        <ScorePill kind={gradeKind(w.grade)}>{gradeLabel(w.grade)}</ScorePill>
        <Text
          className="font-display text-[34px] leading-[36px] tracking-[-0.5px]"
          style={{ color: scoreColor(w.grade) }}
          numberOfLines={1}>
          {w.score}
        </Text>
      </View>
      {/* Date is the primary anchor; time joins it inline as a smaller-weight
          tail. When multiple windows share a date (common for clustered
          favorable hours), the time difference is the visible disambiguator
          without needing a date-group restructure. */}
      <Text
        className="font-display-reg text-[22px] leading-[28px] text-cream mt-3"
        numberOfLines={2}>
        {dateText}
        <Text className="font-ui text-[15px] text-muted"> · {timePrimary}</Text>
      </Text>
      {timeSecondary ? (
        <Text className="font-ui italic text-[13px] leading-[18px] text-gold-glow mt-[6px]">
          {timeSecondary}
        </Text>
      ) : null}
      {count > 1 ? (
        <Text className="font-ui text-[12px] text-muted mt-[6px]">
          {t('results.countMore', { count })}
        </Text>
      ) : null}
      <Text
        className="font-ui text-[14px] leading-[20px] text-cream mt-[10px]"
        numberOfLines={2}>
        {tagline(w)}
      </Text>
    </Pressable>
  );
}

function ListEmptyState({ onAdjustSearch }) {
  const { t } = useTranslation('moment');
  return (
    <View className="pt-8 items-center gap-4">
      <Text className="font-display-reg text-[22px] leading-[30px] text-cream text-center max-w-[300px]">
        {t('results.emptyTitle')}
      </Text>
      <Text className="font-ui text-[14px] leading-5 text-muted text-center max-w-[280px]">
        {t('results.emptyBody')}
      </Text>
      <Pressable
        onPress={onAdjustSearch}
        className="mt-4 py-3 px-8 rounded-full border border-glow active:opacity-[0.85]">
        <Text className="font-ui-med text-[15px] text-cream">{t('results.adjust')}</Text>
      </Pressable>
    </View>
  );
}
