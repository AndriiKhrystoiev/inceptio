// 00 Onboarding — single welcome screen.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import Moon from '../components/Moon';
import PrimaryButton from '../components/PrimaryButton';
import { colors, fonts } from '../theme';

export default function OnboardingScreen({ go }) {
  return (
    <View style={styles.root}>
      <HeroGradient height={900}/>
      <Starfield density="heavy"/>
      <SafeAreaView style={styles.safe}>
        {/* Top breathing space */}
        <View style={{ flex: 1 }}/>

        {/* Logo + crescent */}
        <View style={styles.brand}>
          <Text style={styles.wordmark}>inceptio</Text>
          <View style={{ marginTop: 16 }}>
            <Moon phase="waxing-crescent" size={40}/>
          </View>
        </View>

        <View style={{ height: 48 }}/>

        {/* Headline */}
        <View style={styles.headlineWrap}>
          <Text style={styles.headline}>Find the right time to begin.</Text>
          <Text style={styles.sub}>Inceptio reads the sky to help you choose your moment.</Text>
        </View>

        {/* Push action to bottom */}
        <View style={{ flex: 1.5 }}/>

        {/* Action */}
        <View style={styles.action}>
          <PrimaryButton onPress={() => go('today')}>Get started</PrimaryButton>
          <Text style={styles.footnote}>No account needed</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  safe: { flex: 1, paddingHorizontal: 24 },
  brand: { alignItems: 'center' },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1.0,
    color: colors.text,
  },
  headlineWrap: { alignItems: 'center' },
  headline: {
    fontFamily: fonts.displayReg,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.3,
    color: colors.text,
    textAlign: 'center',
    maxWidth: 320,
  },
  sub: {
    fontFamily: fonts.ui,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
    maxWidth: 300,
  },
  action: { paddingBottom: 32 },
  footnote: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.textSubtle,
    textAlign: 'center',
    marginTop: 20,
  },
});
