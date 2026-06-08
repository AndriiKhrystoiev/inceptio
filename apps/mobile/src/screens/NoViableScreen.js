// 03b No viable windows — dedicated empty state after search.
// Reads the same React Query cache as CalendarScreen and MomentDetailScreen.
// Shows top-3 most-frequent excluded range reason IDs with their phrases.

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, X, ChevronRight } from 'lucide-react-native';
import Svg, { Circle, Line, Ellipse, ClipPath, Defs, G } from 'react-native-svg';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import Pulse from '../components/Pulse';
import { useElectionalSearch } from '../hooks/useElectionalSearch';
import { getLastActivity, getLastLocation } from '../lib/draft-store';
import { locationToRequestFields } from '../lib/location-storage';
import { friendlyMessage } from '../lib/error-messages';

const FALLBACK_LOCATION = {
  lat: 50.4501,
  lng: 30.5234,
  timezone: 'Europe/Kyiv',
  city: 'Kyiv',
};

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildRequest() {
  const now = new Date();
  const today = isoDate(now);
  const endMs = now.getTime() + 30 * 24 * 60 * 60 * 1000;
  const endDate = isoDate(new Date(endMs));

  const loc = getLastLocation() ?? FALLBACK_LOCATION;
  const activity = getLastActivity() ?? 'wedding';

  return { activity, start: today, end: endDate, ...locationToRequestFields(loc) };
}

// Count by reason_id, take top 3
function topExcludedReasons(excludedRanges) {
  const counts = {};
  for (const r of excludedRanges) {
    counts[r.reason_id] = (counts[r.reason_id] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([reason_id]) => {
      const range = excludedRanges.find((r) => r.reason_id === reason_id);
      return {
        reason_id,
        phrase: range?.displayable?.phrase ?? range?.label ?? reason_id,
      };
    });
}

export default function NoViableScreen({ go }) {
  const { t } = useTranslation('noviable');
  const request = useMemo(() => buildRequest(), []);
  const { data: result, isLoading, isError, error } = useElectionalSearch(request);

  const envelope = result?.envelope;
  const summary = envelope?.data?.summary;
  const excludedRanges = envelope?.data?.excluded_ranges ?? [];

  const heroHeadline =
    summary?.displayable?.headline ??
    'These days ask for patience — the sky is between rooms.';

  const topReasons = useMemo(() => topExcludedReasons(excludedRanges), [excludedRanges]);

  const activityLabel = (request.activity ?? 'wedding').replace('_', ' ');
  const cityLabel = request.city ?? 'Kyiv';

  if (isLoading) {
    return (
      <View className="flex-1 bg-base items-center justify-center gap-6">
        <Pulse />
        <Text className="font-ui text-[14px] text-muted">{t('reading')}</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-base items-center justify-center px-8 gap-5">
        <Text className="font-display-reg text-[22px] leading-[30px] text-cream text-center">
          {friendlyMessage(error)}
        </Text>
        <Pressable onPress={() => go('date')}>
          <Text className="font-ui-med text-[14px] text-primary-glow">{t('tryRange')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="overflow-hidden">
        <HeroGradient height={320} />
        <View className="opacity-[0.45] absolute left-0 right-0 top-0 bottom-0">
          <Starfield density="heavy" />
        </View>
        <SafeAreaView edges={['top']}>
          <View className="px-4 pt-2 flex-row items-center justify-between">
            <IconBtn onPress={() => go('location')} label={t('common:back')}>
              <ArrowLeft color="#F5EFE4" size={22} strokeWidth={1.5} />
            </IconBtn>
            <Text
              className="font-display text-[18px] text-cream tracking-[-0.2px]"
              style={{ textTransform: 'capitalize' }}>
              {activityLabel} · {cityLabel}
            </Text>
            <IconBtn onPress={() => go('today')} label={t('common:close')}>
              <X color="#F5EFE4" size={22} strokeWidth={1.5} />
            </IconBtn>
          </View>
          <View className="items-center mt-[22px] pb-6">
            <DimSkyChart />
          </View>
        </SafeAreaView>
      </View>

      <View className="px-6 pt-6">
        <Text className="font-display text-[28px] leading-[34px] tracking-[-0.3px] text-cream">
          {heroHeadline}
        </Text>

        {/* Top 3 excluded reasons with their friendly phrases */}
        {topReasons.length > 0 && (
          <View className="mt-5 gap-3">
            {topReasons.map((r, i) => (
              <Text key={r.reason_id ?? i} className="font-ui text-base leading-[26px] text-cream">
                {r.phrase}
              </Text>
            ))}
          </View>
        )}

        <Text className="font-ui text-base leading-[26px] text-cream mt-[14px]">{t('optionsLead')}</Text>

        <View className="mt-6 gap-[10px]">
          <CTA onPress={() => go('date')}>{t('widen')}</CTA>
          <CTA onPress={() => go('picker')}>{t('tryActivity')}</CTA>
          <CTA onPress={() => go('location')}>{t('tryLocation')}</CTA>
        </View>

        <Text className="font-ui text-[12px] leading-[18px] text-subtle text-center mt-8">
          {t('rareNote', {
            activity: activityLabel.charAt(0).toUpperCase() + activityLabel.slice(1),
          })}
        </Text>
      </View>
    </ScrollView>
  );
}

function CTA({ children, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        'h-14 px-5 rounded-md bg-surface border border-soft',
        'flex-row items-center justify-between',
        'active:border-glow',
      ].join(' ')}>
      <Text className="font-ui-med text-[15px] text-cream">{children}</Text>
      <ChevronRight color="#7A7195" size={16} strokeWidth={1.5} />
    </Pressable>
  );
}

function DimSkyChart() {
  const stars = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const r = 70 + (i % 3) * 3;
    stars.push({
      x: 90 + Math.cos(a) * r,
      y: 90 + Math.sin(a) * r,
      sz: i % 4 === 0 ? 1.6 : 1.1,
      o: 0.25 + (i % 5) * 0.10,
    });
  }
  // DimSkyChart uses colors directly for SVG fill/stroke props (not style) — kept as hex literals
  return (
    <Svg width={180} height={180} viewBox="0 0 180 180" fill="none">
      <Circle cx="90" cy="90" r="78" stroke="#3A3258" strokeWidth="1" strokeDasharray="1.5,4" />
      <Circle cx="90" cy="90" r="48" stroke="#3A3258" strokeWidth="1" opacity="0.6" />
      <Line x1="90" y1="12" x2="90" y2="168" stroke="#3A3258" strokeWidth="0.8" opacity="0.45" />
      <Line x1="12" y1="90" x2="168" y2="90" stroke="#3A3258" strokeWidth="0.8" opacity="0.45" />
      {stars.map((s, i) => (
        <Circle key={i} cx={s.x} cy={s.y} r={s.sz} fill="#F5EFE4" opacity={s.o} />
      ))}
      <Defs>
        <ClipPath id="dim-moon">
          <Circle cx="90" cy="90" r="22" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#dim-moon)" opacity="0.85">
        <Circle cx="90" cy="90" r="22" fill="#5B4F8A" />
        <Ellipse cx="97" cy="90" rx="22" ry="22" fill="#1A1433" />
      </G>
      <Circle cx="90" cy="90" r="22" fill="none" stroke="#5B4F8A" strokeWidth="1" />
    </Svg>
  );
}
