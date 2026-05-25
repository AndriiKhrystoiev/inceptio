// 02b Date range picker — search step 2.

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, X, ChevronRight, Calendar as CalIcon } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import PrimaryButton from '../components/PrimaryButton';
import StatePicker from '../components/StatePicker';

const RANGES = {
  short:  { from: 'Saturday, June 14, 2026', to: 'Friday, June 20, 2026',    label: 'About 6 days' },
  normal: { from: 'Saturday, June 14, 2026', to: 'Saturday, August 14, 2026', label: 'About 2 months, 5 days' },
  long:   { from: 'Saturday, June 14, 2026', to: 'Sunday, March 14, 2027',    label: 'About 9 months' },
};

const PRESETS = ['Next month', '3 months', '6 months', '1 year'];

export default function DatePickerScreen({ go }) {
  const [range, setRange] = useState('normal');
  const m = RANGES[range];
  const hint = range === 'short'
    ? 'Shorter windows may not contain viable moments — try a wider range if results are sparse.'
    : range === 'long'
    ? 'Looking far ahead — this may take a few seconds to compute.'
    : null;

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="overflow-hidden">
        <HeroGradient height={300}/>
        <Starfield density="heavy"/>
        <SafeAreaView edges={['top']}>
          <View className="px-4 pt-2 flex-row items-center justify-between">
            <IconBtn onPress={() => go('picker')} label="Back">
              <ArrowLeft color="#F5EFE4" size={22} strokeWidth={1.5}/>
            </IconBtn>
            <Text className="font-display text-[18px] text-cream tracking-[-0.2px]">Wedding · when</Text>
            <IconBtn onPress={() => go('today')} label="Close">
              <X color="#F5EFE4" size={22} strokeWidth={1.5}/>
            </IconBtn>
          </View>
          <View className="px-6 pt-6 pb-9">
            <Text className="font-display text-[32px] leading-[38px] tracking-[-0.3px] text-cream">When is your window?</Text>
            <Text className="font-ui text-[14px] leading-5 text-muted mt-3">We'll search this range for your best moments.</Text>
          </View>
        </SafeAreaView>
      </View>

      <StatePicker
        label="range"
        value={range}
        onChange={setRange}
        options={[
          ['short',  'short · <14d'],
          ['normal', 'normal'],
          ['long',   'long · >90d'],
        ]}
      />

      <View className="px-6 pt-6 gap-3">
        <DateInput label="FROM" value={m.from}/>
        <DateInput label="TO"   value={m.to}/>
      </View>

      <Text className="font-ui text-[14px] text-muted text-center mt-5">{m.label}</Text>
      {hint && <Text className="font-ui italic text-[12px] leading-[18px] text-subtle text-center mt-[10px] px-9">{hint}</Text>}

      <View className="px-6 pt-8">
        <View className="flex-row items-center gap-[14px]">
          <Text className="font-ui-med text-[13px] text-muted">Or try:</Text>
          <View className="flex-1 h-px bg-soft"/>
        </View>
        <View className="flex-row flex-wrap gap-2 mt-4">
          {PRESETS.map(p => <Preset key={p} label={p}/>)}
        </View>
      </View>

      <Text className="font-ui text-[12px] leading-[18px] text-subtle text-center mt-10 px-6">Wedding searches favor weekends and afternoons by default</Text>

      <View className="px-6 pt-8">
        <PrimaryButton onPress={() => go('location')}>Continue</PrimaryButton>
      </View>
    </ScrollView>
  );
}

function DateInput({ label, value }) {
  return (
    <Pressable className="active:opacity-[0.92]">
      <LinearGradient
        colors={['#1F1838', '#2A2247']}
        style={{
          padding: 18,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#3A3258',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}>
        <CalIcon color="#B8B0CC" size={20} strokeWidth={1.5}/>
        <View className="flex-1">
          <Text className="font-ui-med text-[12px] text-muted tracking-[0.8px] uppercase">{label}</Text>
          <Text className="font-display-reg text-[20px] leading-[26px] text-cream mt-1">{value}</Text>
        </View>
        <ChevronRight color="#7A7195" size={18} strokeWidth={1.5}/>
      </LinearGradient>
    </Pressable>
  );
}

function Preset({ label }) {
  return (
    <Pressable className="py-2 px-[14px] rounded-pill border border-soft active:border-glow">
      <Text className="font-ui-med text-[14px] text-cream">{label}</Text>
    </Pressable>
  );
}
