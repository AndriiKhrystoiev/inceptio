// 02 Activity Picker — "New moment" entry.
// On selection: persists to MMKV via patchDraft + setLastActivity, then navigates to 'date'.

import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, X, ChevronRight } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import { patchDraft, setLastActivity } from '../lib/draft-store';

const CARDS = [
  { id: 'wedding',        emoji: '💍', title: 'Wedding or engagement',  subtitle: 'Lasting commitments and unions',  tint: 'rgba(249,181,200,0.10)', tintDeep: 'rgba(249,181,200,0.18)' },
  { id: 'contracts',      emoji: '📋', title: 'Contract or agreement',  subtitle: 'Important signatures and deals', tint: 'rgba(244,193,154,0.10)', tintDeep: 'rgba(244,193,154,0.18)' },
  { id: 'business_launch',emoji: '🚀', title: 'Business or launch',     subtitle: 'New ventures and openings',      tint: 'rgba(229,199,125,0.10)', tintDeep: 'rgba(229,199,125,0.18)' },
  { id: 'travel',         emoji: '✈️', title: 'Travel or move',         subtitle: 'Journeys and relocations',       tint: 'rgba(103,232,199,0.10)', tintDeep: 'rgba(103,232,199,0.18)' },
];

export default function ActivityPickerScreen({ go }) {
  function handleSelect(activityId) {
    // Persist to both the draft (for the current search flow) and the last-activity
    // mirror (so Today screen reuses it for the single-day query on next open).
    patchDraft({ activity: activityId });
    setLastActivity(activityId);
    go('date');
  }

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="overflow-hidden">
        <HeroGradient height={420} />
        <Starfield density="heavy" />
        <SafeAreaView edges={['top']}>
          {/* Top bar */}
          <View className="px-4 pt-2 flex-row items-center justify-between">
            <IconBtn onPress={() => go('today')} label="Back">
              <ArrowLeft color="#F5EFE4" size={22} strokeWidth={1.5} />
            </IconBtn>
            <Text className="font-display text-[18px] text-cream tracking-[-0.2px]">New moment</Text>
            <IconBtn onPress={() => go('today')} label="Close">
              <X color="#F5EFE4" size={22} strokeWidth={1.5} />
            </IconBtn>
          </View>

          {/* Hero */}
          <View className="px-6 pt-6 pb-9">
            <Text className="font-display text-[32px] leading-[38px] tracking-[-0.3px] text-cream">
              What are you planning?
            </Text>
            <Text className="font-ui text-[14px] leading-5 text-muted mt-3">
              We'll find your best windows in the sky.
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <View className="px-6 mt-10 gap-3">
        {CARDS.map((c) => (
          <Card key={c.id} c={c} onPress={() => handleSelect(c.id)} />
        ))}
      </View>

      <Text className="font-ui text-[12px] text-subtle text-center mt-10">
        Eight more activities coming soon
      </Text>
    </ScrollView>
  );
}

function Card({ c, onPress }) {
  return (
    <Pressable onPress={onPress} className="active:opacity-[0.92]">
      <LinearGradient
        colors={['#1F1838', '#2A2247']}
        style={{
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: '#3A3258',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          overflow: 'hidden',
        }}>
        {/* Activity-tinted wash */}
        <LinearGradient
          colors={[c.tint, 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.6 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <LinearGradient
          colors={[c.tintDeep, c.tint]}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: c.tint,
          }}>
          <Text style={{ fontSize: 22 }}>{c.emoji}</Text>
        </LinearGradient>

        <View className="flex-1">
          <Text className="font-ui-med text-[17px] leading-[22px] text-cream">{c.title}</Text>
          <Text className="font-ui text-[13px] leading-[18px] text-muted mt-[3px]">{c.subtitle}</Text>
        </View>

        <ChevronRight color="#7A7195" size={18} strokeWidth={1.5} />
      </LinearGradient>
    </Pressable>
  );
}
