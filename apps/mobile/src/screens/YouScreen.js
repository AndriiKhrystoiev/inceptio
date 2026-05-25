// 05 Your Moments — saved upcoming + past.

import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, ChevronRight } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';

const UPCOMING = [
  { status: 'highly',     when: 'in 3 days',  date: 'Saturday, June 21', sub: 'Afternoon · 2:32 — 4:08 · Kyiv',  quote: 'Venus brings warmth to this window.' },
  { status: 'favorable',  when: 'in 2 weeks', date: 'Friday, July 4',    sub: 'Morning · 10:15 — 11:30 · Kyiv', quote: 'The Moon is gentle, communication clear.' },
  { status: 'moderate',   when: 'in 1 month', date: 'Tuesday, July 22',  sub: 'Evening · 6:00 — 7:15 · Kyiv',   quote: 'A workable window with some patience needed.' },
];

const PAST = [
  { status: 'highly',    when: '2 weeks ago', date: 'Saturday, May 31', sub: 'Afternoon · 3:00 · Kyiv', quote: 'A particularly tender moment for new beginnings.' },
  { status: 'favorable', when: '1 month ago', date: 'Monday, May 19',   sub: 'Morning · 9:30 · Kyiv',   quote: 'Steady ground for important words.' },
];

export default function YouScreen({ go }) {
  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="overflow-hidden">
        <HeroGradient height={260}/>
        <Starfield density="heavy"/>
        <SafeAreaView edges={['top']}>
          <View className="px-4 pt-2 flex-row items-center justify-between">
            <View className="w-[38px]"/>
            <Text className="font-display text-[18px] text-cream tracking-[-0.2px]">Your moments</Text>
            <IconBtn label="Settings">
              <Settings color="#B8B0CC" size={20} strokeWidth={1.5}/>
            </IconBtn>
          </View>
          <View className="px-6 pt-6 pb-8">
            <Text className="font-display text-[32px] leading-[38px] tracking-[-0.3px] text-cream">Moments you've saved</Text>
            <Text className="font-ui text-[14px] leading-5 text-muted mt-[10px]">3 ahead, 2 behind you in time</Text>
          </View>
        </SafeAreaView>
      </View>

      <Section>Coming up</Section>
      <View className="px-6 gap-3">
        {UPCOMING.map((m, i) => <MomentCard key={'u' + i} m={m} onPress={() => go('detail')}/>)}
      </View>

      <Section>Behind you</Section>
      <View className="px-6 gap-3 opacity-70">
        {PAST.map((m, i) => <MomentCard key={'p' + i} m={m} past onPress={() => go('detail')}/>)}
      </View>
    </ScrollView>
  );
}

function Section({ children }) {
  return (
    <View className="px-6 pt-8 flex-row items-center gap-[14px] mb-4">
      <Text className="font-ui-med text-[13px] text-muted">{children}</Text>
      <View className="flex-1 h-px bg-soft"/>
    </View>
  );
}

function StatusPill({ status, past }) {
  const map = {
    highly:    { fgClass: 'text-gold-glow',    bg: 'rgba(229,199,125,0.18)', br: 'rgba(240,216,154,0.45)', label: 'Highly favorable', sparkle: true },
    favorable: { fgClass: 'text-gold-muted',   bg: 'rgba(212,184,114,0.10)', br: 'rgba(212,184,114,0.30)', label: 'Favorable' },
    moderate:  { fgClass: 'text-primary-glow', bg: 'rgba(139,111,232,0.10)', br: 'rgba(139,111,232,0.30)', label: 'Moderate' },
  }[status];

  // Dynamic bg/border colors use inline style; only fgClass goes via className
  return (
    <View
      className={['flex-row items-center gap-[6px] py-1 px-[10px] rounded-full border self-start', past ? 'opacity-[0.85]' : ''].join(' ')}
      style={{ backgroundColor: map.bg, borderColor: map.br }}>
      {map.sparkle && <Text className={['text-[10px]', map.fgClass].join(' ')}>✦</Text>}
      <Text className={['font-ui-semi text-[11px] tracking-[0.1px]', map.fgClass].join(' ')}>{map.label}</Text>
    </View>
  );
}

function MomentCard({ m, past, onPress }) {
  return (
    <Pressable onPress={onPress} className="active:opacity-[0.92]">
      <LinearGradient
        colors={['#1F1838', '#2A2247']}
        style={{ borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#3A3258' }}>
        <View className="flex-row items-center justify-between gap-[10px]">
          <StatusPill status={m.status} past={past}/>
          <Text className="font-ui text-[12px] text-subtle">{m.when}</Text>
        </View>
        <Text className="mt-3 font-display-reg text-[22px] leading-7 text-cream">{m.date}</Text>
        <Text className="mt-[2px] font-ui text-[14px] leading-5 text-muted">{m.sub}</Text>
        {past && (
          <Text className="mt-1 font-ui-med text-[11px] text-subtle tracking-[0.4px]">Passed</Text>
        )}
        <Text className={['mt-[10px] font-ui text-[14px] leading-5 pr-7', past ? 'text-muted' : 'text-cream'].join(' ')}>{m.quote}</Text>
        <View className="absolute right-4 bottom-4">
          <ChevronRight color="#7A7195" size={16} strokeWidth={1.5}/>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
