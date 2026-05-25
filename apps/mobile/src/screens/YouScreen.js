// 05 Your Moments — saved upcoming + past.

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, ChevronRight } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import { colors, fonts, radii } from '../theme';

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
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ overflow: 'hidden' }}>
        <HeroGradient height={260}/>
        <Starfield density="heavy"/>
        <SafeAreaView edges={['top']}>
          <View style={styles.topbar}>
            <View style={{ width: 38 }}/>
            <Text style={styles.topbarTitle}>Your moments</Text>
            <IconBtn label="Settings">
              <Settings color={colors.textMuted} size={20} strokeWidth={1.5}/>
            </IconBtn>
          </View>
          <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}>
            <Text style={styles.heroH1}>Moments you've saved</Text>
            <Text style={styles.heroSub}>3 ahead, 2 behind you in time</Text>
          </View>
        </SafeAreaView>
      </View>

      <Section>Coming up</Section>
      <View style={{ paddingHorizontal: 24, gap: 12 }}>
        {UPCOMING.map((m, i) => <MomentCard key={'u' + i} m={m} onPress={() => go('detail')}/>)}
      </View>

      <Section>Behind you</Section>
      <View style={{ paddingHorizontal: 24, gap: 12, opacity: 0.7 }}>
        {PAST.map((m, i) => <MomentCard key={'p' + i} m={m} past onPress={() => go('detail')}/>)}
      </View>
    </ScrollView>
  );
}

function Section({ children }) {
  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 32, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
      <Text style={{ fontFamily: fonts.uiMed, fontSize: 13, color: colors.textMuted }}>{children}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.borderSoft }}/>
    </View>
  );
}

function StatusPill({ status, past }) {
  const map = {
    highly:    { fg: colors.goldGlow,   bg: 'rgba(229,199,125,0.18)', br: 'rgba(240,216,154,0.45)', label: 'Highly favorable', sparkle: true },
    favorable: { fg: colors.goldMuted,  bg: 'rgba(212,184,114,0.10)', br: 'rgba(212,184,114,0.30)', label: 'Favorable' },
    moderate:  { fg: colors.primaryGlow,bg: 'rgba(139,111,232,0.10)', br: 'rgba(139,111,232,0.30)', label: 'Moderate' },
  }[status];
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999,
      backgroundColor: map.bg, borderColor: map.br, borderWidth: 1,
      alignSelf: 'flex-start',
      opacity: past ? 0.85 : 1,
    }}>
      {map.sparkle && <Text style={{ fontSize: 10, color: map.fg }}>✦</Text>}
      <Text style={{ fontFamily: fonts.uiSemi, fontSize: 11, color: map.fg, letterSpacing: 0.1 }}>{map.label}</Text>
    </View>
  );
}

function MomentCard({ m, past, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
      <LinearGradient
        colors={[colors.surface, colors.surface2]}
        style={{
          borderRadius: radii.lg,
          padding: 20,
          borderWidth: 1,
          borderColor: colors.borderSoft,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <StatusPill status={m.status} past={past}/>
          <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: colors.textSubtle }}>{m.when}</Text>
        </View>
        <Text style={{ marginTop: 12, fontFamily: fonts.displayReg, fontSize: 22, lineHeight: 28, color: colors.text }}>{m.date}</Text>
        <Text style={{ marginTop: 2, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: colors.textMuted }}>{m.sub}</Text>
        {past && (
          <Text style={{ marginTop: 4, fontFamily: fonts.uiMed, fontSize: 11, color: colors.textSubtle, letterSpacing: 0.4 }}>Passed</Text>
        )}
        <Text style={{ marginTop: 10, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: past ? colors.textMuted : colors.text, paddingRight: 28 }}>{m.quote}</Text>
        <View style={{ position: 'absolute', right: 16, bottom: 16 }}>
          <ChevronRight color={colors.textSubtle} size={16} strokeWidth={1.5}/>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  topbar: { paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topbarTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.text, letterSpacing: -0.2 },
  heroH1: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.3, color: colors.text },
  heroSub: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: 10 },
});
