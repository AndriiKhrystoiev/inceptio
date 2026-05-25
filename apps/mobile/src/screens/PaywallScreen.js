// 06 Paywall — Pro upsell.

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import PrimaryButton from '../components/PrimaryButton';
import { colors, fonts, radii } from '../theme';

const FEATURES = [
  'Unlimited searches',
  'Save unlimited moments',
  'Search up to 12 months ahead',
  'Calendar heatmap view',
  'Export to your phone\u2019s calendar',
  'Quiet — no ads, no account',
];

export default function PaywallScreen({ go }) {
  const [plan, setPlan] = useState('yearly');

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ overflow: 'hidden' }}>
        <HeroGradient height={320}/>
        <Starfield density="heavy"/>
        <SafeAreaView edges={['top']}>
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <IconBtn onPress={() => go('today')} label="Close">
              <X color={colors.text} size={22} strokeWidth={1.5}/>
            </IconBtn>
          </View>

          <View style={{ paddingHorizontal: 24, paddingTop: 48 }}>
            <Text style={styles.h1}>Inceptio Pro</Text>
            <Text style={styles.sub}>Unlimited moments, calendar view, and more.</Text>
            <Text style={styles.quote}>You've explored 3 moments — let's go further.</Text>
          </View>
        </SafeAreaView>
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 48 }}>
        {FEATURES.map((f, i) => (
          <Text key={i} style={styles.feature}>{f}</Text>
        ))}
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 48, gap: 12 }}>
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

      <View style={{ paddingHorizontal: 24, paddingTop: 48 }}>
        <PrimaryButton onPress={() => go('today')}>Continue</PrimaryButton>
      </View>

      <View style={{ alignItems: 'center', paddingTop: 16 }}>
        <Pressable>
          <Text style={{ fontFamily: fonts.ui, fontSize: 14, color: colors.textMuted, padding: 8 }}>Restore</Text>
        </Pressable>
      </View>

      <View style={{ alignItems: 'center', marginTop: 24 }}>
        <View style={{ width: '60%', height: 1, backgroundColor: colors.borderSoft }}/>
      </View>

      <Text style={styles.legal}>Terms · Privacy</Text>
    </ScrollView>
  );
}

function PlanCard({ selected, onPress, yearly, price, sub, badge }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
      <View style={{
        position: 'relative',
        borderRadius: radii.lg,
        padding: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: selected ? colors.borderGlow : colors.borderSoft,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        overflow: 'hidden',
      }}>
        {yearly && selected && (
          <LinearGradient
            colors={['rgba(229,199,125,0.06)', 'rgba(212,184,114,0)']}
            style={StyleSheet.absoluteFill}/>
        )}
        <View style={{
          width: 22, height: 22, borderRadius: 999,
          borderColor: selected ? (yearly ? colors.gold : colors.primaryGlow) : colors.textSubtle,
          borderWidth: 1.5,
          alignItems: 'center', justifyContent: 'center',
        }}>
          {selected && (
            <View style={{
              width: 10, height: 10, borderRadius: 999,
              backgroundColor: yearly ? colors.gold : colors.primaryGlow,
            }}/>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.displayReg, fontSize: 20, lineHeight: 26, color: colors.text }}>{price}</Text>
          {sub && <Text style={{ fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: 2 }}>{sub}</Text>}
        </View>

        {badge && (
          <View style={{
            position: 'absolute', top: 12, right: 12,
            paddingVertical: 3, paddingHorizontal: 8,
            borderRadius: 6,
            backgroundColor: 'rgba(229,199,125,0.18)',
          }}>
            <Text style={{ fontFamily: fonts.uiSemi, fontSize: 11, color: colors.text, letterSpacing: 0.7 }}>{badge}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  h1:   { fontFamily: fonts.display, fontSize: 36, lineHeight: 42, letterSpacing: -0.7, color: colors.text },
  sub:  { fontFamily: fonts.ui, fontSize: 16, lineHeight: 24, color: colors.textMuted, marginTop: 12 },
  quote:{ fontFamily: fonts.ui, fontStyle: 'italic', fontSize: 14, lineHeight: 20, color: colors.textSubtle, marginTop: 24, textAlign: 'center' },
  feature: { paddingVertical: 12, fontFamily: fonts.ui, fontSize: 16, lineHeight: 22, color: colors.text },
  legal: { fontFamily: fonts.ui, fontSize: 12, color: colors.textSubtle, textAlign: 'center', marginTop: 20 },
});
