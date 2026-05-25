// 06 Paywall — Pro upsell.

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import PrimaryButton from '../components/PrimaryButton';

const FEATURES = [
  'Unlimited searches',
  'Save unlimited moments',
  'Search up to 12 months ahead',
  'Calendar heatmap view',
  'Export to your phone’s calendar',
  'Quiet — no ads, no account',
];

export default function PaywallScreen({ go }) {
  const [plan, setPlan] = useState('yearly');

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="overflow-hidden">
        <HeroGradient height={320}/>
        <Starfield density="heavy"/>
        <SafeAreaView edges={['top']}>
          <View className="px-4 pt-2">
            <IconBtn onPress={() => go('today')} label="Close">
              <X color="#F5EFE4" size={22} strokeWidth={1.5}/>
            </IconBtn>
          </View>

          <View className="px-6 pt-12">
            <Text className="font-display text-[36px] leading-[42px] tracking-[-0.7px] text-cream">Inceptio Pro</Text>
            <Text className="font-ui text-base leading-6 text-muted mt-3">Unlimited moments, calendar view, and more.</Text>
            <Text className="font-ui italic text-[14px] leading-5 text-subtle mt-6 text-center">You've explored 3 moments — let's go further.</Text>
          </View>
        </SafeAreaView>
      </View>

      <View className="px-6 pt-12">
        {FEATURES.map((f, i) => (
          <Text key={i} className="py-3 font-ui text-base leading-[22px] text-cream">{f}</Text>
        ))}
      </View>

      <View className="px-6 pt-12 gap-3">
        <PlanCard
          selected={plan === 'yearly'}
          onPress={() => setPlan('yearly')}
          yearly
          price="$29.99 / year"
          sub="$2.50 per month"
          badge="SAVE 50%"/>
        <PlanCard
          selected={plan === 'monthly'}
          onPress={() => setPlan('monthly')}
          price="$4.99 / month"/>
      </View>

      <View className="px-6 pt-12">
        <PrimaryButton onPress={() => go('today')}>Continue</PrimaryButton>
      </View>

      <View className="items-center pt-4">
        <Pressable>
          <Text className="font-ui text-[14px] text-muted p-2">Restore</Text>
        </Pressable>
      </View>

      <View className="items-center mt-6">
        <View className="w-[60%] h-px bg-soft"/>
      </View>

      <Text className="font-ui text-[12px] text-subtle text-center mt-5">Terms · Privacy</Text>
    </ScrollView>
  );
}

function PlanCard({ selected, onPress, yearly, price, sub, badge }) {
  return (
    <Pressable onPress={onPress} className="active:opacity-[0.92]">
      <View className={[
        'relative rounded-lg p-5 bg-surface border flex-row items-center gap-[14px] overflow-hidden',
        selected ? 'border-glow' : 'border-soft',
      ].join(' ')}>
        {yearly && selected && (
          <LinearGradient
            colors={['rgba(229,199,125,0.06)', 'rgba(212,184,114,0)']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}/>
        )}
        <View className={[
          'w-[22px] h-[22px] rounded-full border-[1.5px] items-center justify-center',
          selected
            ? (yearly ? 'border-gold' : 'border-primary-glow')
            : 'border-subtle',
        ].join(' ')}>
          {selected && (
            <View className={[
              'w-[10px] h-[10px] rounded-full',
              yearly ? 'bg-gold' : 'bg-primary-glow',
            ].join(' ')}/>
          )}
        </View>

        <View className="flex-1">
          <Text className="font-display-reg text-[20px] leading-[26px] text-cream">{price}</Text>
          {sub && <Text className="font-ui text-[14px] leading-5 text-muted mt-[2px]">{sub}</Text>}
        </View>

        {badge && (
          <View className="absolute top-3 right-3 py-[3px] px-2 rounded-xs bg-gold/[0.18]">
            <Text className="font-ui-semi text-[11px] text-cream tracking-[0.7px]">{badge}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
