// 05 Your Moments — saved upcoming + past.
// Source of truth: AsyncStorage via getSavedMoments() — no API call on this tab.
// "Passed" detection is local: compare saved moment's end timestamp to now.
// Phase 5 TODO: add per-moment refetch to re-validate scores against the API.

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import { getSavedMoments } from '../lib/draft-store';

const FMT_TIME      = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
const FMT_FULL_DATE = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

// Grade → status key for the StatusPill styling map
function gradeToStatus(grade) {
  if (grade === 'exceptional' || grade === 'strong') return 'highly';
  if (grade === 'fair' || grade === 'good') return 'favorable';
  return 'moderate';
}

function isPast(moment) {
  return new Date(moment.end) < new Date();
}

function relativeLabel(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = d - now;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const ago = Math.abs(diffDays);
    if (ago < 7) return `${ago} day${ago !== 1 ? 's' : ''} ago`;
    const weeks = Math.round(ago / 7);
    if (weeks < 5) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    const months = Math.round(ago / 30);
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  }

  if (diffDays === 0) return 'today';
  if (diffDays < 7) return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  const weeks = Math.round(diffDays / 7);
  if (weeks < 5) return `in ${weeks} week${weeks !== 1 ? 's' : ''}`;
  const months = Math.round(diffDays / 30);
  return `in ${months} month${months !== 1 ? 's' : ''}`;
}

function formatMomentSub(moment) {
  const start = new Date(moment.start);
  const end   = new Date(moment.end);
  const timeStr = FMT_TIME.format(start);
  const endStr  = FMT_TIME.format(end);
  const timeRange = moment.duration_minutes < 5 ? timeStr : `${timeStr} — ${endStr}`;
  const ampm = start.getHours() < 12 ? 'morning' : start.getHours() < 17 ? 'afternoon' : 'evening';
  return `${ampm} · ${timeRange} · ${moment.city}`;
}

function formatMomentDate(moment) {
  return FMT_FULL_DATE.format(new Date(moment.start));
}

export default function YourMomentsScreen({ go }) {
  // Re-read from MMKV on each render (and on pull-to-refresh) so newly saved
  // moments appear without a full app restart.
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Re-read MMKV by bumping tick (forces re-render, re-calls getSavedMoments)
    setTick((t) => t + 1);
    setRefreshing(false);
  }, []);

  // tick is a dependency so ESLint doesn't warn; it forces re-evaluation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allMoments = getSavedMoments();

  const upcoming = allMoments.filter((m) => !isPast(m));
  const past     = allMoments.filter((m) => isPast(m));

  const upcomingCount = upcoming.length;
  const pastCount     = past.length;

  const summaryLine = allMoments.length === 0
    ? 'No moments saved yet'
    : `${upcomingCount} ahead, ${pastCount} behind you in time`;

  return (
    <ScrollView
      className="flex-1 bg-base"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#B8B0CC"
        />
      }>
      <View className="overflow-hidden">
        <HeroGradient height={260} />
        <Starfield density="heavy" />
        <SafeAreaView edges={['top']}>
          {/* Two equal-width spacers keep the title visually centered without
              changing the flex-between layout that other screens share. The
              Settings cog used to live on the right but Settings now lives
              on the You tab; a duplicate icon with no handler read as broken. */}
          <View className="px-4 pt-2 flex-row items-center justify-between">
            <View className="w-[38px]" />
            <Text className="font-display text-[18px] text-cream tracking-[-0.2px]">Your moments</Text>
            <View className="w-[38px]" />
          </View>
          <View className="px-6 pt-6 pb-8">
            <Text className="font-display text-[32px] leading-[38px] tracking-[-0.3px] text-cream">
              Moments you've saved
            </Text>
            <Text className="font-ui text-[14px] leading-5 text-muted mt-[10px]">{summaryLine}</Text>
          </View>
        </SafeAreaView>
      </View>

      {allMoments.length === 0 ? (
        <View className="px-6 pt-12 items-center gap-4">
          <Text className="font-display-reg text-[22px] leading-[30px] text-cream text-center">
            Nothing saved yet.
          </Text>
          <Text className="font-ui text-[14px] leading-5 text-muted text-center max-w-[280px]">
            When you find a favorable window, tap Save on the moment detail to keep it here.
          </Text>
          <Pressable
            onPress={() => go('picker')}
            className="mt-4 py-3 px-8 rounded-full border border-glow">
            <Text className="font-ui-med text-[15px] text-cream">Find a moment</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <Section>Coming up</Section>
              <View className="px-6 gap-3">
                {upcoming.map((m) => (
                  <MomentCard
                    key={m.id}
                    moment={m}
                    past={false}
                    onPress={() => go('detail')}
                  />
                ))}
              </View>
            </>
          )}

          {past.length > 0 && (
            <>
              <Section>Behind you</Section>
              <View className="px-6 gap-3 opacity-70">
                {past.map((m) => (
                  <MomentCard
                    key={m.id}
                    moment={m}
                    past={true}
                    onPress={() => go('detail')}
                  />
                ))}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function Section({ children }) {
  return (
    <View className="px-6 pt-8 flex-row items-center gap-[14px] mb-4">
      <Text className="font-ui-med text-[13px] text-muted">{children}</Text>
      <View className="flex-1 h-px bg-soft" />
    </View>
  );
}

function StatusPill({ status, past }) {
  const map = {
    highly:    { fgClass: 'text-gold-glow',    bg: 'rgba(229,199,125,0.18)', br: 'rgba(240,216,154,0.45)', label: 'Highly favorable', sparkle: true },
    favorable: { fgClass: 'text-gold-muted',   bg: 'rgba(212,184,114,0.10)', br: 'rgba(212,184,114,0.30)', label: 'Favorable' },
    moderate:  { fgClass: 'text-primary-glow', bg: 'rgba(139,111,232,0.10)', br: 'rgba(139,111,232,0.30)', label: 'Moderate' },
  }[status] ?? {
    fgClass: 'text-muted', bg: 'rgba(100,100,100,0.10)', br: 'rgba(100,100,100,0.30)', label: 'Saved',
  };

  // Dynamic bg/border colors use inline style; only fgClass goes via className
  return (
    <View
      className={[
        'flex-row items-center gap-[6px] py-1 px-[10px] rounded-full border self-start',
        past ? 'opacity-[0.85]' : '',
      ].join(' ')}
      style={{ backgroundColor: map.bg, borderColor: map.br }}>
      {map.sparkle && <Text className={['text-[10px]', map.fgClass].join(' ')}>✦</Text>}
      <Text className={['font-ui-semi text-[11px] tracking-[0.1px]', map.fgClass].join(' ')}>
        {map.label}
      </Text>
    </View>
  );
}

function MomentCard({ moment, past, onPress }) {
  const status = gradeToStatus(moment.grade);
  const when   = relativeLabel(moment.start);
  const date   = formatMomentDate(moment);
  const sub    = formatMomentSub(moment);

  return (
    <Pressable onPress={onPress} className="active:opacity-[0.92]">
      <LinearGradient
        colors={['#1F1838', '#2A2247']}
        style={{ borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#3A3258' }}>
        <View className="flex-row items-center justify-between gap-[10px]">
          <StatusPill status={status} past={past} />
          <Text className="font-ui text-[12px] text-subtle">{when}</Text>
        </View>
        <Text className="mt-3 font-display-reg text-[22px] leading-7 text-cream">{date}</Text>
        <Text className="mt-[2px] font-ui text-[14px] leading-5 text-muted">{sub}</Text>
        {past && (
          <Text className="mt-1 font-ui-med text-[11px] text-subtle tracking-[0.4px]">Passed</Text>
        )}
        <Text
          className={[
            'mt-[10px] font-ui text-[14px] leading-5 pr-7',
            past ? 'text-muted' : 'text-cream',
          ].join(' ')}>
          {moment.headline}
        </Text>
        <View className="absolute right-4 bottom-4">
          <ChevronRight color="#7A7195" size={16} strokeWidth={1.5} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}
