// 04 Moment Detail — friendly Level-2 view with 4 paragraphs.

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Share2, ChevronRight, Bookmark } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import Moon from '../components/Moon';
import ScorePill from '../components/ScorePill';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import StatePicker from '../components/StatePicker';
import StatusLine from '../components/StatusLine';

const VARIANTS = {
  long:   { label: '2:32 — 4:08',  paren: '(3h 16m)',   sub: null,                                      score: 78, grade: 'strong',  pillKind: 'excellent', pillLabel: 'Highly favorable' },
  medium: { label: '2:32',          paren: '25 minutes', sub: null,                                      score: 68, grade: 'fair',    pillKind: 'good',      pillLabel: 'Favorable' },
  short:  { label: '2:32',          paren: '10 minutes', sub: 'A precise window — set a reminder.',     score: 64, grade: 'fair',    pillKind: 'good',      pillLabel: 'Favorable' },
  single: { label: '2:32 exactly',  paren: null,         sub: 'A single, pristine moment. Be ready.',   score: 72, grade: 'fair',    pillKind: 'good',      pillLabel: 'Favorable' },
};

export default function MomentDetailScreen({ go }) {
  const [variant, setVariant] = useState('long');
  const v = VARIANTS[variant];

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Hero */}
      <View className="overflow-hidden">
        <HeroGradient height={300}/>
        <Starfield density="heavy"/>
        <SafeAreaView edges={['top']}>
          <View className="px-4 pt-2 flex-row items-center justify-between">
            <IconBtn onPress={() => go('calendar')} label="Back">
              <ArrowLeft color="#F5EFE4" size={22} strokeWidth={1.5}/>
            </IconBtn>
            <IconBtn label="Share">
              <Share2 color="#F5EFE4" size={20} strokeWidth={1.5}/>
            </IconBtn>
          </View>

          <View className="px-6 pt-6 pb-9">
            <ScorePill kind={v.pillKind}>{v.pillLabel}</ScorePill>

            <View className="flex-row items-start gap-4 mt-6">
              <View className="flex-1">
                <Text className="font-display text-[36px] leading-[42px] tracking-[-0.7px] text-cream">Saturday,{'\n'}June 21</Text>
                <View className="mt-[14px]">
                  <TimeLine variant={variant} v={v}/>
                  <Text className="font-ui text-base leading-6 text-muted">Kyiv, Ukraine</Text>
                  {v.sub && <Text className="font-ui italic text-[14px] text-gold-glow mt-2">{v.sub}</Text>}
                </View>
              </View>
              <Moon phase="waxing-crescent" size={64}/>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <StatePicker
        label="duration"
        value={variant}
        onChange={setVariant}
        options={[
          ['long',   'long · >60m'],
          ['medium', 'medium · 25m'],
          ['short',  'short · 10m'],
          ['single', 'single · 1m'],
        ]}
      />

      {/* Score block */}
      <View className="px-6 pt-6 flex-row items-center gap-4">
        <Text className="font-display text-[44px] leading-[48px] tracking-[-1.3px] text-cream">{v.score}</Text>
        <View className="flex-1">
          <StatusLine score="" grade={v.grade}/>
          <Text className="font-ui text-[12px] text-subtle mt-[6px]">moment score · out of 100</Text>
        </View>
      </View>

      {/* Hairline */}
      <View className="items-center mt-8">
        <View className="w-[50%] h-px bg-soft"/>
      </View>

      {/* Narrative — four paragraphs */}
      <View className="px-6 pt-8">
        <Text className="font-ui-med text-[13px] text-muted">Why this moment</Text>
        <View className="mt-4 gap-4">
          <Text className="font-ui text-base leading-[26px] text-cream">Venus brings warmth to this window. She rests in Leo, where she's dignified, and her light favors connection.</Text>
          <Text className="font-ui text-base leading-[26px] text-cream">The Moon is waxing, gaining light, which traditional astrology favors for new beginnings.</Text>
          <Text className="font-ui text-base leading-[26px] text-cream">
            <Text className="font-ui-semi text-gold-glow tracking-[0.1px]">Worth noting: </Text>
            the Moon doesn't make a soft connection to Venus or Jupiter at this moment. The window holds itself rather than being lifted by them.
          </Text>
          <Text className="font-ui text-base leading-[26px] text-cream">
            If your ceremony falls within this window, it's a thoughtful choice. If you have flexibility, the window on{' '}
            <Text className="text-primary-glow underline" onPress={() => go('detail')}>June 22</Text>
            {' '}is slightly stronger.
          </Text>
        </View>

        <View className="items-center mt-8">
          <Pressable onPress={() => go('detail')} className="flex-row items-center gap-[6px] p-2">
            <Text className="font-ui-med text-[14px] text-muted">See technical details</Text>
            <ChevronRight color="#B8B0CC" size={14} strokeWidth={1.5}/>
          </Pressable>
        </View>

        <View className="mt-12">
          <PrimaryButton onPress={() => go('today')}>Add to calendar</PrimaryButton>
          <View className="flex-row gap-2 mt-3">
            <SecondaryButton
              style={{ flex: 1 }}
              icon={<Bookmark color="#F5EFE4" size={16} strokeWidth={1.5}/>}>
              Save
            </SecondaryButton>
            <SecondaryButton
              style={{ flex: 1 }}
              icon={<Share2 color="#F5EFE4" size={16} strokeWidth={1.5}/>}>
              Share
            </SecondaryButton>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function TimeLine({ variant, v }) {
  if (variant === 'long') {
    return (
      <Text className="font-ui text-base leading-6 text-muted">
        <Text>Afternoon · {v.label} </Text>
        <Text className="text-muted">{v.paren}</Text>
      </Text>
    );
  }
  if (variant === 'medium' || variant === 'short') {
    return (
      <Text className="font-ui text-base leading-6 text-muted">
        <Text>Afternoon · </Text>
        <Text className="font-ui-semi text-gold-glow">{v.label}</Text>
        <Text className="font-ui text-gold-glow"> · {v.paren}</Text>
      </Text>
    );
  }
  if (variant === 'single') {
    return (
      <Text className="font-ui text-base leading-6 text-muted">
        <Text>Afternoon · </Text>
        <Text className="font-ui-semi text-gold-glow">{v.label}</Text>
      </Text>
    );
  }
  return null;
}
