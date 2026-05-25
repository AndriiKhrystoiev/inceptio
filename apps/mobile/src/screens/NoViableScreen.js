// 03b No viable windows — dedicated empty state after search.

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, X, ChevronRight } from 'lucide-react-native';
import Svg, { Circle, Line, Ellipse, ClipPath, Defs, G } from 'react-native-svg';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import StatePicker from '../components/StatePicker';
import { colors, fonts, radii } from '../theme';

export default function NoViableScreen({ go }) {
  const [variant, setVariant] = useState('week');
  const headline = variant === 'week'
    ? 'The sky doesn\u2019t offer ideal moments this week.'
    : 'No ideal moments in this range — but there are alternatives.';

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ overflow: 'hidden' }}>
        <HeroGradient height={320}/>
        <View style={{ opacity: 0.45, position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          <Starfield density="heavy"/>
        </View>
        <SafeAreaView edges={['top']}>
          <View style={styles.topbar}>
            <IconBtn onPress={() => go('location')} label="Back">
              <ArrowLeft color={colors.text} size={22} strokeWidth={1.5}/>
            </IconBtn>
            <Text style={styles.topbarTitle}>Wedding · Kyiv</Text>
            <IconBtn onPress={() => go('today')} label="Close">
              <X color={colors.text} size={22} strokeWidth={1.5}/>
            </IconBtn>
          </View>
          <View style={{ alignItems: 'center', marginTop: 22, paddingBottom: 24 }}>
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

      <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={[styles.body, { marginTop: 18 }]}>Mercury is retrograde from June 29, and the Moon is between signs much of the week.</Text>
        <Text style={[styles.body, { marginTop: 14 }]}>You have a few options.</Text>

        <View style={{ marginTop: 24, gap: 10 }}>
          <CTA onPress={() => go('detail')}>See the closest moment anyway</CTA>
          <CTA onPress={() => go('date')}>Widen the date range</CTA>
          <CTA onPress={() => go('location')}>Try a different city</CTA>
        </View>

        <Text style={styles.footer}>Wedding windows are rare — Inceptio finds them, even when they're brief.</Text>
      </View>
    </ScrollView>
  );
}

function CTA({ children, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      height: 56,
      paddingHorizontal: 20,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderColor: pressed ? colors.borderGlow : colors.borderSoft,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    })}>
      <Text style={{ fontFamily: fonts.uiMed, fontSize: 15, color: colors.text }}>{children}</Text>
      <ChevronRight color={colors.textSubtle} size={16} strokeWidth={1.5}/>
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
  return (
    <Svg width={180} height={180} viewBox="0 0 180 180" fill="none">
      <Circle cx="90" cy="90" r="78" stroke={colors.borderSoft} strokeWidth="1" strokeDasharray="1.5,4"/>
      <Circle cx="90" cy="90" r="48" stroke={colors.borderSoft} strokeWidth="1" opacity="0.6"/>
      <Line x1="90" y1="12"  x2="90" y2="168" stroke={colors.borderSoft} strokeWidth="0.8" opacity="0.45"/>
      <Line x1="12" y1="90"  x2="168" y2="90" stroke={colors.borderSoft} strokeWidth="0.8" opacity="0.45"/>
      {stars.map((s, i) => (
        <Circle key={i} cx={s.x} cy={s.y} r={s.sz} fill={colors.text} opacity={s.o}/>
      ))}
      <Defs>
        <ClipPath id="dim-moon"><Circle cx="90" cy="90" r="22"/></ClipPath>
      </Defs>
      <G clipPath="url(#dim-moon)" opacity="0.85">
        <Circle cx="90" cy="90" r="22" fill={colors.borderGlow}/>
        <Ellipse cx="97" cy="90" rx="22" ry="22" fill={colors.bgGradient}/>
      </G>
      <Circle cx="90" cy="90" r="22" fill="none" stroke={colors.borderGlow} strokeWidth="1"/>
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  topbar: { paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topbarTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.text, letterSpacing: -0.2 },
  headline: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.3, color: colors.text },
  body: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 26, color: colors.text },
  footer: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 18, color: colors.textSubtle, textAlign: 'center', marginTop: 32 },
});
