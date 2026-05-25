// 03b No viable windows — dedicated empty state after search.

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, X, ChevronRight } from 'lucide-react-native';
import Svg, { Circle, Line, Ellipse, ClipPath, Defs, G } from 'react-native-svg';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import StatePicker from '../components/StatePicker';
import { colors } from '../theme';

export default function NoViableScreen({ go }) {
  const [variant, setVariant] = useState('week');
  const headline = variant === 'week'
    ? 'The sky doesn’t offer ideal moments this week.'
    : 'No ideal moments in this range — but there are alternatives.';

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="overflow-hidden">
        <HeroGradient height={320}/>
        <View className="opacity-[0.45] absolute left-0 right-0 top-0 bottom-0">
          <Starfield density="heavy"/>
        </View>
        <SafeAreaView edges={['top']}>
          <View className="px-4 pt-2 flex-row items-center justify-between">
            <IconBtn onPress={() => go('location')} label="Back">
              <ArrowLeft color="#F5EFE4" size={22} strokeWidth={1.5}/>
            </IconBtn>
            <Text className="font-display text-[18px] text-cream tracking-[-0.2px]">Wedding · Kyiv</Text>
            <IconBtn onPress={() => go('today')} label="Close">
              <X color="#F5EFE4" size={22} strokeWidth={1.5}/>
            </IconBtn>
          </View>
          <View className="items-center mt-[22px] pb-6">
            <DimSkyChart/>
          </View>
        </SafeAreaView>
      </View>

      <StatePicker
        label="range"
        value={variant}
        onChange={setVariant}
        options={[['week', 'week · 7d'], ['longer', 'longer · 2w+']]}
      />

      <View className="px-6 pt-6">
        <Text className="font-display text-[28px] leading-[34px] tracking-[-0.3px] text-cream">{headline}</Text>
        <Text className="font-ui text-base leading-[26px] text-cream mt-[18px]">Mercury is retrograde from June 29, and the Moon is between signs much of the week.</Text>
        <Text className="font-ui text-base leading-[26px] text-cream mt-[14px]">You have a few options.</Text>

        <View className="mt-6 gap-[10px]">
          <CTA onPress={() => go('detail')}>See the closest moment anyway</CTA>
          <CTA onPress={() => go('date')}>Widen the date range</CTA>
          <CTA onPress={() => go('location')}>Try a different city</CTA>
        </View>

        <Text className="font-ui text-[12px] leading-[18px] text-subtle text-center mt-8">Wedding windows are rare — Inceptio finds them, even when they're brief.</Text>
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
      <ChevronRight color="#7A7195" size={16} strokeWidth={1.5}/>
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
      <Circle cx="90" cy="90" r="78" stroke="#3A3258" strokeWidth="1" strokeDasharray="1.5,4"/>
      <Circle cx="90" cy="90" r="48" stroke="#3A3258" strokeWidth="1" opacity="0.6"/>
      <Line x1="90" y1="12"  x2="90" y2="168" stroke="#3A3258" strokeWidth="0.8" opacity="0.45"/>
      <Line x1="12" y1="90"  x2="168" y2="90" stroke="#3A3258" strokeWidth="0.8" opacity="0.45"/>
      {stars.map((s, i) => (
        <Circle key={i} cx={s.x} cy={s.y} r={s.sz} fill="#F5EFE4" opacity={s.o}/>
      ))}
      <Defs>
        <ClipPath id="dim-moon"><Circle cx="90" cy="90" r="22"/></ClipPath>
      </Defs>
      <G clipPath="url(#dim-moon)" opacity="0.85">
        <Circle cx="90" cy="90" r="22" fill="#5B4F8A"/>
        <Ellipse cx="97" cy="90" rx="22" ry="22" fill="#1A1433"/>
      </G>
      <Circle cx="90" cy="90" r="22" fill="none" stroke="#5B4F8A" strokeWidth="1"/>
    </Svg>
  );
}
