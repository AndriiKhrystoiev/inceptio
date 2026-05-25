// 02c Location picker — search step 3.

import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, X, Search, MapPin, Locate } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import PrimaryButton from '../components/PrimaryButton';

const RESULTS = [
  { name: 'Kyiv, Ukraine',           sub: '50.4501°N · 30.5234°E', mono: true,  selected: true  },
  { name: 'Kyiv Oblast, Ukraine',    sub: 'Region · Ukraine',       mono: false, selected: false },
  { name: 'Kyivskyi Rayon, Ukraine', sub: 'District · Ukraine',     mono: false, selected: false },
];

export default function LocationPickerScreen({ go }) {
  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="overflow-hidden">
        <HeroGradient height={300}/>
        <Starfield density="heavy"/>
        <SafeAreaView edges={['top']}>
          <View className="px-4 pt-2 flex-row items-center justify-between">
            <IconBtn onPress={() => go('date')} label="Back">
              <ArrowLeft color="#F5EFE4" size={22} strokeWidth={1.5}/>
            </IconBtn>
            <Text className="font-display text-[18px] text-cream tracking-[-0.2px]">Wedding · where</Text>
            <IconBtn onPress={() => go('today')} label="Close">
              <X color="#F5EFE4" size={22} strokeWidth={1.5}/>
            </IconBtn>
          </View>
          <View className="px-6 pt-6 pb-9">
            <Text className="font-display text-[32px] leading-[38px] tracking-[-0.3px] text-cream">Where will it happen?</Text>
            <Text className="font-ui text-[14px] leading-5 text-muted mt-3">The location of the event — not where you are now.</Text>
          </View>
        </SafeAreaView>
      </View>

      {/* Search input — centered glow kept inline (shadowOffset: {0,0}) */}
      <View className="px-6 pt-10">
        <LinearGradient
          colors={['#1F1838', '#2A2247']}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            padding: 16,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#5B4F8A',
            shadowColor: '#8B6FE8',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.18,
            shadowRadius: 3,
          }}>
          <Search color="#B8B0CC" size={20} strokeWidth={1.5}/>
          <Text className="font-ui text-base text-cream flex-1">Kyiv</Text>
          <View className="w-[1.5px] h-[18px] bg-primary-glow ml-[2px]"/>
        </LinearGradient>
      </View>

      {/* Results */}
      <View className="px-6 pt-6">
        {RESULTS.map((r, i) => (
          <Result key={i} r={r} isLast={i === RESULTS.length - 1}/>
        ))}
      </View>

      {/* Use current location */}
      <View className="items-center pt-6">
        <Pressable className={[
          'flex-row items-center gap-[10px] h-12 px-5 rounded-md border',
          'border-glow active:border-primary-glow active:bg-primary/[0.08]',
        ].join(' ')}>
          <Locate color="#F5EFE4" size={16} strokeWidth={1.5}/>
          <Text className="font-ui-med text-[15px] text-cream">Use current location</Text>
        </Pressable>
      </View>

      <Text className="font-ui text-[12px] leading-[18px] text-subtle text-center mt-8 px-6">The sky's view depends on where you are.</Text>

      <View className="px-6 pt-8">
        <PrimaryButton onPress={() => go('loading')}>Find moments</PrimaryButton>
      </View>
    </ScrollView>
  );
}

function Result({ r, isLast }) {
  return (
    <View
      className="flex-row items-center gap-3 py-[14px] pl-3 pr-[14px]"
      style={{
        borderBottomColor: isLast ? 'transparent' : '#2A2247',
        borderBottomWidth: isLast ? 0 : 1,
        borderLeftColor: r.selected ? '#8B6FE8' : 'transparent',
        borderLeftWidth: 2,
      }}>
      <MapPin color={r.selected ? '#A98DFF' : '#7A7195'} size={18} strokeWidth={1.5}/>
      <View className="flex-1">
        <Text className="font-ui text-base leading-[22px] text-cream">{r.name}</Text>
        <Text className={[
          'text-[13px] leading-[18px] text-muted mt-[2px]',
          r.mono ? 'font-mono' : 'font-ui',
        ].join(' ')}>{r.sub}</Text>
      </View>
    </View>
  );
}
