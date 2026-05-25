// 02b Date range picker — search step 2.

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, X, ChevronRight, Calendar as CalIcon } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import PrimaryButton from '../components/PrimaryButton';
import StatePicker from '../components/StatePicker';
import { colors, fonts, radii } from '../theme';

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
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ overflow: 'hidden' }}>
        <HeroGradient height={300}/>
        <Starfield density="heavy"/>
        <SafeAreaView edges={['top']}>
          <View style={styles.topbar}>
            <IconBtn onPress={() => go('picker')} label="Back">
              <ArrowLeft color={colors.text} size={22} strokeWidth={1.5}/>
            </IconBtn>
            <Text style={styles.topbarTitle}>Wedding · when</Text>
            <IconBtn onPress={() => go('today')} label="Close">
              <X color={colors.text} size={22} strokeWidth={1.5}/>
            </IconBtn>
          </View>
          <View style={styles.hero}>
            <Text style={styles.heroH1}>When is your window?</Text>
            <Text style={styles.heroSub}>We'll search this range for your best moments.</Text>
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

      <View style={{ paddingHorizontal: 24, paddingTop: 24, gap: 12 }}>
        <DateInput label="FROM" value={m.from}/>
        <DateInput label="TO"   value={m.to}/>
      </View>

      <Text style={styles.summary}>{m.label}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}

      <View style={{ paddingHorizontal: 24, paddingTop: 32 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Text style={styles.orTry}>Or try:</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.borderSoft }}/>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {PRESETS.map(p => <Preset key={p} label={p}/>)}
        </View>
      </View>

      <Text style={styles.helper}>Wedding searches favor weekends and afternoons by default</Text>

      <View style={{ paddingHorizontal: 24, paddingTop: 32 }}>
        <PrimaryButton onPress={() => go('location')}>Continue</PrimaryButton>
      </View>
    </ScrollView>
  );
}

function DateInput({ label, value }) {
  return (
    <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
      <LinearGradient
        colors={[colors.surface, colors.surface2]}
        style={{
          padding: 18,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.borderSoft,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}>
        <CalIcon color={colors.textMuted} size={20} strokeWidth={1.5}/>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.uiMed, fontSize: 12, color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</Text>
          <Text style={{ fontFamily: fonts.displayReg, fontSize: 20, lineHeight: 26, color: colors.text, marginTop: 4 }}>{value}</Text>
        </View>
        <ChevronRight color={colors.textSubtle} size={18} strokeWidth={1.5}/>
      </LinearGradient>
    </Pressable>
  );
}

function Preset({ label }) {
  return (
    <Pressable style={({ pressed }) => ({
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderColor: pressed ? colors.borderGlow : colors.borderSoft,
      borderWidth: 1,
    })}>
      <Text style={{ fontFamily: fonts.uiMed, fontSize: 14, color: colors.text }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  topbar: { paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topbarTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.text, letterSpacing: -0.2 },
  hero: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 36 },
  heroH1: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.3, color: colors.text },
  heroSub: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: 12 },

  summary: { fontFamily: fonts.ui, fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 20 },
  hint: { fontFamily: fonts.ui, fontStyle: 'italic', fontSize: 12, lineHeight: 18, color: colors.textSubtle, textAlign: 'center', marginTop: 10, paddingHorizontal: 36 },
  orTry: { fontFamily: fonts.uiMed, fontSize: 13, color: colors.textMuted },
  helper: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 18, color: colors.textSubtle, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
});
