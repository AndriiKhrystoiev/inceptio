// 03 Calendar — heatmap with three cell states + bottom sheet.

import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Share2, ChevronLeft, ChevronRight } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import StatePicker from '../components/StatePicker';
import SecondaryButton from '../components/SecondaryButton';
import WindowCard from '../components/WindowCard';
import Glyph, { reasonToGlyph, FRIENDLY_REASON } from '../components/Glyph';

const BASE = [
  ['b','moon_voc'],['b','moon_voc'],['v',58],['b','mercury_retrograde'],['v',62],['v',68],['b','eclipse_window'],
  ['b','moon_voc'],['b','moon_voc'],['b','mercury_retrograde'],['b','mercury_retrograde'],['v',54],['v',71],['v',65],
  ['b','moon_voc'],['b','fixed_star_on_angle'],['b','moon_voc'],['b','moon_via_combusta'],['v',66],['v',72],['v',78],
  ['b','moon_voc'],['b','moon_voc'],['v',57],['b','malefic_on_angle'],['v',64],['v',69],['b','moon_voc'],
  ['b','moon_voc'],['b','moon_voc'],
];

const DAY_LABELS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

export default function CalendarScreen({ go }) {
  const [bucket, setBucket] = useState('many');
  const [sheet, setSheet]   = useState(null);

  const days = useMemo(() => {
    if (bucket === 'many') return BASE;
    if (bucket === 'few') {
      const keep = new Set([13, 21, 27]);
      return BASE.map((d, i) => d[0] === 'v' && !keep.has(i + 1) ? ['b','moon_voc'] : d);
    }
    return BASE.map(d => d[0] === 'v' ? ['b','moon_voc'] : d);
  }, [bucket]);

  const viableCount = days.filter(d => d[0] === 'v').length;
  const headerCopy = viableCount === 0
    ? 'No viable windows in this range. The closest moments still exist — see below.'
    : viableCount < 5
    ? `Just ${viableCount} viable windows in your range — they're worth attention.`
    : `${viableCount} viable windows in your range`;

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="overflow-hidden">
        <HeroGradient height={260}/>
        <Starfield density="heavy"/>
        <SafeAreaView edges={['top']}>
          <View className="px-4 pt-2 flex-row items-center justify-between">
            <IconBtn onPress={() => go('today')} label="Back">
              <ArrowLeft color="#F5EFE4" size={22} strokeWidth={1.5}/>
            </IconBtn>
            <Text className="font-display text-[18px] text-cream tracking-[-0.2px]">Wedding · Kyiv</Text>
            <IconBtn label="Share">
              <Share2 color="#F5EFE4" size={20} strokeWidth={1.5}/>
            </IconBtn>
          </View>

          <View className="pt-6 px-6 items-center">
            <Text className="font-ui text-[14px] text-muted">June 14 → August 14</Text>
            <Text className={[
              'font-ui text-[14px] leading-5 text-muted mt-2 text-center max-w-[320px]',
              viableCount === 0 ? 'text-gold-glow' : '',
            ].join(' ')}>{headerCopy}</Text>
          </View>

          <View className="flex-row justify-center gap-2 mt-5 pb-6">
            <TogglePill label="List" active={false}/>
            <TogglePill label="Calendar" active={true}/>
          </View>
        </SafeAreaView>
      </View>

      <StatePicker
        label="viable"
        value={bucket}
        onChange={setBucket}
        options={[
          ['many', 'many · 9'],
          ['few',  'few · 3'],
          ['none', 'none · 0'],
        ]}
      />

      <View className="px-6 pt-6">
        {/* Month nav */}
        <View className="flex-row items-center justify-center gap-[18px]">
          <IconBtn>
            <ChevronLeft color="#B8B0CC" size={16} strokeWidth={1.5}/>
          </IconBtn>
          <Text className="font-display text-[22px] text-cream tracking-[-0.2px] min-w-[150px] text-center">June 2026</Text>
          <IconBtn>
            <ChevronRight color="#B8B0CC" size={16} strokeWidth={1.5}/>
          </IconBtn>
        </View>

        {/* Day labels */}
        <View className="flex-row mt-5 gap-[6px]">
          {DAY_LABELS.map(d => (
            <View key={d} style={styles.cellSlot}>
              <Text className="font-ui-med text-[12px] text-subtle text-center">{d}</Text>
            </View>
          ))}
        </View>

        {/* Cells */}
        <View className="flex-row mt-5 gap-[6px] flex-wrap" style={{ rowGap: 8 }}>
          {days.map(([kind, val], i) => (
            <Cell key={i}
              day={i + 1}
              kind={kind}
              value={val}
              onPress={() => kind === 'b' ? setSheet({ day: i + 1, reason: val }) : go('detail')}/>
          ))}
        </View>

        {/* Legend strip */}
        <View className="mt-[22px] p-[14px] rounded-[12px] bg-gradient border border-surface-2 flex-row items-center gap-3">
          <Glyph name="moon-void" size={18} color="#7A7195"/>
          <Text className="flex-1 font-ui text-[12px] leading-[18px] text-muted">
            Glyphs mark days the sky doesn't favor. Filled cells show available windows. Gold rings mark the strongest moments.
          </Text>
        </View>

        {/* Closest moments — only when none */}
        {viableCount === 0 && (
          <View className="mt-7">
            <Text className="font-display-reg text-[20px] leading-[26px] text-cream">The closest moments</Text>
            <View className="gap-[10px] mt-3">
              <WindowCard date="sat · jun 13" time="A short window, asks for care."   score={49} grade="caution" onPress={() => go('detail')}/>
              <WindowCard date="tue · jun 30" time="A workable window with patience." score={46} grade="caution" onPress={() => go('detail')}/>
            </View>
          </View>
        )}
      </View>

      {/* Blocked-reason bottom sheet */}
      <Modal transparent visible={!!sheet} animationType="slide" onRequestClose={() => setSheet(null)}>
        {sheet && <BlockedSheet sheet={sheet} onClose={() => setSheet(null)}/>}
      </Modal>
    </ScrollView>
  );
}

function Cell({ day, kind, value, onPress }) {
  if (kind === 'b') {
    return (
      <Pressable onPress={onPress} style={styles.cellSlot}>
        <Text className="font-ui-med text-[13px] text-glow">{day}</Text>
        <View className="w-full aspect-square max-h-[38px] rounded-[8px] bg-[rgba(31,24,56,0.55)] border border-surface-2 items-center justify-center">
          <Glyph name={reasonToGlyph(value)} size={14} color="#5B4F8A"/>
        </View>
      </Pressable>
    );
  }

  const score = value;
  const celebrate = score >= 75;
  // Score-derived bg color is fully dynamic — kept inline
  const bg = celebrate ? '#D4B872'
           : score >= 65 ? '#8B6FE8'
           : score >= 50 ? '#6E5DAB'
           : '#5B4F8A';

  // Celebrate glow: centered shadowOffset {0,0} — kept inline per rule 6
  const celebrateShadow = celebrate ? {
    shadowColor: '#E5C77D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 3,
    borderColor: 'rgba(255,238,200,0.6)',
    borderWidth: 1.5,
  } : null;

  return (
    <Pressable onPress={onPress} style={styles.cellSlot}>
      <Text className="font-ui-med text-[13px] text-cream">{day}</Text>
      <View
        className="w-full aspect-square max-h-[38px] rounded-[8px] items-center justify-center"
        style={[{ backgroundColor: bg }, celebrateShadow]}>
        <Text
          className="font-ui-semi text-[11px] opacity-90"
          style={{ color: celebrate ? '#0F0A1F' : '#FFFFFF' }}>
          {score}
        </Text>
      </View>
    </Pressable>
  );
}

function TogglePill({ label, active }) {
  return (
    <Pressable className={[
      'py-[7px] px-4 rounded-full border',
      active ? 'bg-gold-muted/[0.12] border-glow' : 'bg-transparent border-soft',
    ].join(' ')}>
      <Text className={['font-ui-med text-[13px]', active ? 'text-cream' : 'text-muted'].join(' ')}>{label}</Text>
    </Pressable>
  );
}

function BlockedSheet({ sheet, onClose }) {
  const friendly = FRIENDLY_REASON[sheet.reason] || { title: 'A pause day', body: 'The sky asks us to wait.' };
  return (
    <View className="flex-1 justify-end">
      <Pressable
        onPress={onClose}
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,10,31,0.6)' }]}/>
      <View className="bg-surface rounded-tl-xl rounded-tr-xl border-t border-soft pt-5 px-6 pb-8">
        <View className="items-center">
          <View className="w-10 h-1 rounded-full bg-soft"/>
        </View>
        <View className="flex-row items-center gap-[14px] mt-[18px]">
          <View className="w-11 h-11 rounded-full bg-[rgba(91,79,138,0.18)] border border-soft items-center justify-center">
            <Glyph name={reasonToGlyph(sheet.reason)} size={22} color="#B8B0CC"/>
          </View>
          <View className="flex-1">
            <Text className="font-ui-semi text-[11px] text-subtle tracking-[0.8px]">JUNE {sheet.day}</Text>
            <Text className="font-display-reg text-[20px] leading-[26px] text-cream mt-1">{friendly.title}</Text>
          </View>
        </View>
        <Text className="font-ui text-[14px] leading-5 text-muted mt-[14px]">{friendly.body}</Text>
        <View className="mt-5">
          <SecondaryButton onPress={onClose} style={{ width: '100%' }}>Got it</SecondaryButton>
        </View>
      </View>
    </View>
  );
}

// cellSlot width is a calculated percentage — can't express in Tailwind without a plugin
const styles = StyleSheet.create({
  cellSlot: { width: `${100 / 7 - 0.86}%`, alignItems: 'center', gap: 6 },
});
