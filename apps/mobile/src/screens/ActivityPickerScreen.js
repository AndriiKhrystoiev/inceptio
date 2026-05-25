// 02 Activity Picker — "New moment" entry.

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, X, ChevronRight } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import { colors, fonts, radii } from '../theme';

const CARDS = [
  { id: 'wedding',  emoji: '💍', title: 'Wedding or engagement',     subtitle: 'Lasting commitments and unions',   tint: 'rgba(249,181,200,0.10)', tintDeep: 'rgba(249,181,200,0.18)' },
  { id: 'contract', emoji: '📋', title: 'Contract or agreement',     subtitle: 'Important signatures and deals',   tint: 'rgba(244,193,154,0.10)', tintDeep: 'rgba(244,193,154,0.18)' },
  { id: 'business', emoji: '🚀', title: 'Business or launch',        subtitle: 'New ventures and openings',         tint: 'rgba(229,199,125,0.10)', tintDeep: 'rgba(229,199,125,0.18)' },
  { id: 'travel',   emoji: '✈️', title: 'Travel or move',            subtitle: 'Journeys and relocations',          tint: 'rgba(103,232,199,0.10)', tintDeep: 'rgba(103,232,199,0.18)' },
];

export default function ActivityPickerScreen({ go }) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.heroWrap}>
        <HeroGradient height={420}/>
        <Starfield density="heavy"/>
        <SafeAreaView edges={['top']}>
          {/* Top bar */}
          <View style={styles.topbar}>
            <IconBtn onPress={() => go('today')} label="Back">
              <ArrowLeft color={colors.text} size={22} strokeWidth={1.5}/>
            </IconBtn>
            <Text style={styles.topbarTitle}>New moment</Text>
            <IconBtn onPress={() => go('today')} label="Close">
              <X color={colors.text} size={22} strokeWidth={1.5}/>
            </IconBtn>
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroH1}>What do you want{'\n'}to begin?</Text>
            <Text style={styles.heroSub}>We'll find your best windows in the sky.</Text>
          </View>
        </SafeAreaView>
      </View>

      <View style={{ paddingHorizontal: 24, marginTop: 40, gap: 12 }}>
        {CARDS.map(c => <Card key={c.id} c={c} onPress={() => go('date')}/>)}
      </View>

      <Text style={styles.footer}>Eight more activities coming soon</Text>
    </ScrollView>
  );
}

function Card({ c, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
      <LinearGradient
        colors={[colors.surface, colors.surface2]}
        style={styles.card}>
        {/* Activity-tinted wash */}
        <LinearGradient
          colors={[c.tint, 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.6 }}
          style={StyleSheet.absoluteFill}/>

        <LinearGradient
          colors={[c.tintDeep, c.tint]}
          style={[styles.emojiPlate, { borderColor: c.tint }]}>
          <Text style={{ fontSize: 22 }}>{c.emoji}</Text>
        </LinearGradient>

        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{c.title}</Text>
          <Text style={styles.cardSub}>{c.subtitle}</Text>
        </View>

        <ChevronRight color={colors.textSubtle} size={18} strokeWidth={1.5}/>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  heroWrap: { overflow: 'hidden' },
  topbar: { paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topbarTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.text, letterSpacing: -0.2 },
  hero: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 36 },
  heroH1: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.3, color: colors.text },
  heroSub: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: 12 },

  card: {
    borderRadius: radii.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    overflow: 'hidden',
  },
  emojiPlate: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  cardTitle: { fontFamily: fonts.uiMed, fontSize: 17, lineHeight: 22, color: colors.text },
  cardSub:   { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, color: colors.textMuted, marginTop: 3 },

  footer: {
    fontFamily: fonts.ui, fontSize: 12, color: colors.textSubtle,
    textAlign: 'center', marginTop: 40,
  },
});
