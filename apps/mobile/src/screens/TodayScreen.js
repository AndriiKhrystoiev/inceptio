// 01 Today — three states (viable / caution / blocked).

import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import MoonRiseHeader from '../components/MoonRiseHeader';
import ScorePill from '../components/ScorePill';
import Starfield from '../components/Starfield';
import PrimaryButton from '../components/PrimaryButton';
import WindowCard from '../components/WindowCard';
import StatePicker from '../components/StatePicker';
import Glyph, { reasonToGlyph } from '../components/Glyph';

export default function TodayScreen({ go }) {
  const [state, setState] = useState('A');

  const hero = state === 'A' ? 'The sky is\ngentle today'
             : state === 'B' ? 'Move with\ncare today'
             :                  'The sky is\nresting today';

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ paddingBottom: 120 }}>
      <MoonRiseHeader phase="waxing-crescent">
        <Text className="font-ui-med text-[13px] text-muted tracking-[0.4px] lowercase mb-2">saturday, may 23</Text>
        <Text className="font-display text-[38px] leading-[44px] tracking-[-0.6px] text-cream max-w-[280px]">{hero}</Text>
      </MoonRiseHeader>

      <StatePicker
        value={state}
        onChange={setState}
        options={[
          ['A', 'A · viable'],
          ['B', 'B · caution'],
          ['C', 'C · blocked'],
        ]}
      />

      <View className="px-6 pt-3">
        {state === 'A' && <CardA go={go}/>}
        {state === 'B' && <CardB go={go}/>}
        {state === 'C' && <CardC go={go}/>}

        <Text className="font-display-reg text-[22px] leading-7 text-cream mt-8">Best windows ahead</Text>
        <View className="gap-[10px] mt-[14px]">
          <WindowCard date="sun · may 24" time="A gentle window opens this morning." score={68} grade="fair" onPress={() => go('detail')}/>
          <WindowCard date="wed · may 27" time="Mercury runs clear, communication settles." score={64} grade="fair" onPress={() => go('detail')}/>
          <WindowCard date="sat · may 30" time="A short, steady afternoon." score={61} grade="fair" onPress={() => go('detail')}/>
          <WindowCard date="mon · jun 2"  time="There's a moment, but it asks for care." score={48} grade="caution" onPress={() => go('detail')}/>
        </View>

        <View className="mt-7">
          <PrimaryButton onPress={() => go('picker')}>Find a moment for…</PrimaryButton>
        </View>
      </View>
    </ScrollView>
  );
}

function CardShell({ children, tone }) {
  const borderClass = tone === 'glow'  ? 'border-glow'
                    : tone === 'gold'  ? 'border-[rgba(229,199,125,0.40)]'
                    :                   'border-soft';
  const bgClass     = tone === 'muted' ? 'bg-gradient' : 'bg-surface';

  // Colored directional shadow kept inline — shadowOffset: {0,6} is not a centered glow.
  const shadowStyle = tone === 'glow'
    ? { shadowColor: '#8B6FE8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 24, elevation: 4 }
    : tone === 'gold'
    ? { shadowColor: '#E5C77D', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 3 }
    : null;

  return (
    <View
      className={['rounded-lg p-[22px] overflow-hidden mt-3 border', bgClass, borderClass].join(' ')}
      style={shadowStyle}>
      {(tone === 'glow' || tone === 'gold') && (
        <View className="absolute left-0 right-0 top-0 bottom-0 opacity-40">
          <Starfield density="normal"/>
        </View>
      )}
      <View>{children}</View>
    </View>
  );
}

function CardA({ go }) {
  return (
    <CardShell tone="glow">
      <ScorePill kind="good">Favorable</ScorePill>
      <View className="flex-row items-end gap-3 mt-4">
        <Text className="font-display text-[76px] leading-[80px] tracking-[-2px] text-cream">68</Text>
        <Text className="font-ui text-[13px] text-subtle pb-[10px]">out of 100</Text>
      </View>
      <Text className="font-display-reg text-[22px] leading-[30px] text-cream mt-[14px] max-w-[300px]">A gentle window opens today.</Text>
      <Text className="font-ui text-[14px] leading-5 text-muted mt-2 max-w-[300px]">Venus is warm and Jupiter holds steady this evening.</Text>
      <CTAInline colorClass="text-primary-glow" onPress={() => go('detail')}>See the window</CTAInline>
    </CardShell>
  );
}

function CardB({ go }) {
  return (
    <CardShell tone="gold">
      <ScorePill kind="caution">Move with care</ScorePill>
      <View className="flex-row items-end gap-3 mt-4">
        <Text className="font-display text-[76px] leading-[80px] tracking-[-2px] text-gold-glow">48</Text>
        <Text className="font-ui text-[13px] text-subtle pb-[10px]">out of 100</Text>
      </View>
      <Text className="font-display-reg text-[22px] leading-[30px] text-cream mt-[14px] max-w-[300px]">A day for reflection, not commitment.</Text>
      <Text className="font-ui text-[14px] leading-5 text-muted mt-2 max-w-[300px]">There's a moment this afternoon, but it asks for care. See what to weigh.</Text>
      <CTAInline colorClass="text-gold-glow" onPress={() => go('detail')}>See the moment</CTAInline>
    </CardShell>
  );
}

function CardC({ go }) {
  const reason = 'moon_voc';
  const copy = 'The Moon is between signs today.';
  return (
    <CardShell tone="muted">
      <View className="flex-row items-center gap-[18px]">
        <View className="w-14 h-14 rounded-full bg-[rgba(91,79,138,0.18)] border border-soft items-center justify-center">
          <Glyph name={reasonToGlyph(reason)} size={28} color="#B8B0CC"/>
        </View>
        <View className="flex-1">
          <Text className="font-ui-semi text-[11px] text-subtle tracking-[0.8px]">A PAUSE DAY</Text>
          <Text className="font-display-reg text-[22px] leading-[30px] text-cream mt-[14px] max-w-[300px]">{copy}</Text>
        </View>
      </View>
      <Text className="font-ui text-[14px] leading-5 text-muted mt-[14px] max-w-[300px]">Efforts begun today don't take root the way they do on other days. Tomorrow looks different.</Text>
      <CTAInline colorClass="text-primary-glow" onPress={() => go('calendar')}>See this week's best</CTAInline>
    </CardShell>
  );
}

function CTAInline({ children, colorClass, onPress }) {
  return (
    <Text
      onPress={onPress}
      className={['mt-[18px] font-ui-med text-[14px]', colorClass].join(' ')}>
      {children}  ›
    </Text>
  );
}
