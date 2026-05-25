// 02c Location picker — search step 3.

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, X, Search, MapPin, Locate } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import PrimaryButton from '../components/PrimaryButton';
import { colors, fonts, radii } from '../theme';

const RESULTS = [
  { name: 'Kyiv, Ukraine',           sub: '50.4501°N · 30.5234°E', mono: true,  selected: true  },
  { name: 'Kyiv Oblast, Ukraine',    sub: 'Region · Ukraine',       mono: false, selected: false },
  { name: 'Kyivskyi Rayon, Ukraine', sub: 'District · Ukraine',     mono: false, selected: false },
];

export default function LocationPickerScreen({ go }) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ overflow: 'hidden' }}>
        <HeroGradient height={300}/>
        <Starfield density="heavy"/>
        <SafeAreaView edges={['top']}>
          <View style={styles.topbar}>
            <IconBtn onPress={() => go('date')} label="Back">
              <ArrowLeft color={colors.text} size={22} strokeWidth={1.5}/>
            </IconBtn>
            <Text style={styles.topbarTitle}>Wedding · where</Text>
            <IconBtn onPress={() => go('today')} label="Close">
              <X color={colors.text} size={22} strokeWidth={1.5}/>
            </IconBtn>
          </View>
          <View style={styles.hero}>
            <Text style={styles.heroH1}>Where will it happen?</Text>
            <Text style={styles.heroSub}>The location of the event — not where you are now.</Text>
          </View>
        </SafeAreaView>
      </View>

      {/* Search input */}
      <View style={{ paddingHorizontal: 24, paddingTop: 40 }}>
        <LinearGradient
          colors={[colors.surface, colors.surface2]}
          style={[styles.searchInput, {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.18,
            shadowRadius: 3,
          }]}>
          <Search color={colors.textMuted} size={20} strokeWidth={1.5}/>
          <Text style={{ fontFamily: fonts.ui, fontSize: 16, color: colors.text, flex: 1 }}>Kyiv</Text>
          <View style={{ width: 1.5, height: 18, backgroundColor: colors.primaryGlow, marginLeft: 2 }}/>
        </LinearGradient>
      </View>

      {/* Results */}
      <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
        {RESULTS.map((r, i) => (
          <Result key={i} r={r} isLast={i === RESULTS.length - 1}/>
        ))}
      </View>

      {/* Use current location */}
      <View style={{ alignItems: 'center', paddingTop: 24 }}>
        <Pressable style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          height: 48,
          paddingHorizontal: 20,
          borderRadius: radii.md,
          borderColor: pressed ? colors.primaryGlow : colors.borderGlow,
          borderWidth: 1,
          backgroundColor: pressed ? 'rgba(139,111,232,0.08)' : 'transparent',
        })}>
          <Locate color={colors.text} size={16} strokeWidth={1.5}/>
          <Text style={{ fontFamily: fonts.uiMed, fontSize: 15, color: colors.text }}>Use current location</Text>
        </Pressable>
      </View>

      <Text style={styles.helper}>The sky's view depends on where you are.</Text>

      <View style={{ paddingHorizontal: 24, paddingTop: 32 }}>
        <PrimaryButton onPress={() => go('loading')}>Find moments</PrimaryButton>
      </View>
    </ScrollView>
  );
}

function Result({ r, isLast }) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingLeft: 12,
      paddingRight: 14,
      borderBottomColor: isLast ? 'transparent' : colors.surface2,
      borderBottomWidth: isLast ? 0 : 1,
      borderLeftColor: r.selected ? colors.primary : 'transparent',
      borderLeftWidth: 2,
    }}>
      <MapPin color={r.selected ? colors.primaryGlow : colors.textSubtle} size={18} strokeWidth={1.5}/>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.ui, fontSize: 16, lineHeight: 22, color: colors.text }}>{r.name}</Text>
        <Text style={{
          fontFamily: r.mono ? fonts.mono : fonts.ui,
          fontSize: 13,
          lineHeight: 18,
          color: colors.textMuted,
          marginTop: 2,
        }}>{r.sub}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  topbar: { paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topbarTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.text, letterSpacing: -0.2 },
  hero: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 36 },
  heroH1: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.3, color: colors.text },
  heroSub: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: 12 },

  searchInput: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderGlow,
  },

  helper: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 18, color: colors.textSubtle, textAlign: 'center', marginTop: 32, paddingHorizontal: 24 },
});
