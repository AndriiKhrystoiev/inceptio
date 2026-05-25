// 01 Today — three states (viable / caution / blocked).

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import MoonRiseHeader from '../components/MoonRiseHeader';
import ScorePill from '../components/ScorePill';
import Starfield from '../components/Starfield';
import PrimaryButton from '../components/PrimaryButton';
import WindowCard from '../components/WindowCard';
import StatePicker from '../components/StatePicker';
import Glyph, { reasonToGlyph } from '../components/Glyph';
import { colors, fonts } from '../theme';

export default function TodayScreen({ go }) {
  const [state, setState] = useState('A');

  const hero = state === 'A' ? 'The sky is\ngentle today'
             : state === 'B' ? 'Move with\ncare today'
             :                  'The sky is\nresting today';

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 120 }}>
      <MoonRiseHeader phase="waxing-crescent">
        <Text style={styles.eyebrow}>saturday, may 23</Text>
        <Text style={styles.heroTitle}>{hero}</Text>
      </MoonRiseHeader>

      <StatePicker
        value={state}
        onChange={setState}
        options={[
          ['A', 'A · viable'],
          ['B', 'B · caution'],
          ['C', 'C · blocked'],
        ]}
      />

      <View style={{ paddingHorizontal: 24, paddingTop: 12 }}>
        {state === 'A' && <CardA go={go}/>}
        {state === 'B' && <CardB go={go}/>}
        {state === 'C' && <CardC go={go}/>}

        <Text style={styles.sectionH1}>Best windows ahead</Text>
        <View style={{ gap: 10, marginTop: 14 }}>
          <WindowCard date="sun · may 24" time="A gentle window opens this morning." score={68} grade="fair" onPress={() => go('detail')}/>
          <WindowCard date="wed · may 27" time="Mercury runs clear, communication settles." score={64} grade="fair" onPress={() => go('detail')}/>
          <WindowCard date="sat · may 30" time="A short, steady afternoon." score={61} grade="fair" onPress={() => go('detail')}/>
          <WindowCard date="mon · jun 2"  time="There's a moment, but it asks for care." score={48} grade="caution" onPress={() => go('detail')}/>
        </View>

        <View style={{ marginTop: 28 }}>
          <PrimaryButton onPress={() => go('picker')}>Find a moment for…</PrimaryButton>
        </View>
      </View>
    </ScrollView>
  );
}

function CardShell({ children, tone }) {
  // tone: 'glow' (viable), 'gold' (caution), 'muted' (blocked)
  const styleByTone = {
    glow:  { backgroundColor: colors.surface, borderColor: colors.borderGlow, borderWidth: 1 },
    gold:  { backgroundColor: colors.surface, borderColor: 'rgba(229,199,125,0.40)', borderWidth: 1 },
    muted: { backgroundColor: colors.bgGradient, borderColor: colors.borderSoft, borderWidth: 1 },
  }[tone];
  return (
    <View style={[styles.card, styleByTone, tone === 'glow' && styles.cardGlow, tone === 'gold' && styles.cardGold]}>
      {(tone === 'glow' || tone === 'gold') && (
        <View style={[StyleSheet.absoluteFillObject, { opacity: 0.4 }]}>
          <Starfield density="normal"/>
        </View>
      )}
      <View>{children}</View>
    </View>
  );
}

function CardA({ go }) {
  return (
    <CardShell tone="glow">
      <ScorePill kind="good">Favorable</ScorePill>
      <View style={styles.scoreRow}>
        <Text style={[styles.score, { color: colors.text }]}>68</Text>
        <Text style={styles.scoreSub}>out of 100</Text>
      </View>
      <Text style={styles.headline}>A gentle window opens today.</Text>
      <Text style={styles.body}>Venus is warm and Jupiter holds steady this evening.</Text>
      <CTAInline color={colors.primaryGlow} onPress={() => go('detail')}>See the window</CTAInline>
    </CardShell>
  );
}

function CardB({ go }) {
  return (
    <CardShell tone="gold">
      <ScorePill kind="caution">Move with care</ScorePill>
      <View style={styles.scoreRow}>
        <Text style={[styles.score, { color: colors.goldGlow }]}>48</Text>
        <Text style={styles.scoreSub}>out of 100</Text>
      </View>
      <Text style={styles.headline}>A day for reflection, not commitment.</Text>
      <Text style={styles.body}>There's a moment this afternoon, but it asks for care. See what to weigh.</Text>
      <CTAInline color={colors.goldGlow} onPress={() => go('detail')}>See the moment</CTAInline>
    </CardShell>
  );
}

function CardC({ go }) {
  const reason = 'moon_voc';
  const copy = 'The Moon is between signs today.';
  return (
    <CardShell tone="muted">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        <View style={styles.glyphPlate}>
          <Glyph name={reasonToGlyph(reason)} size={28} color={colors.textMuted}/>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>A PAUSE DAY</Text>
          <Text style={styles.headline}>{copy}</Text>
        </View>
      </View>
      <Text style={[styles.body, { marginTop: 14 }]}>Efforts begun today don't take root the way they do on other days. Tomorrow looks different.</Text>
      <CTAInline color={colors.primaryGlow} onPress={() => go('calendar')}>See this week's best</CTAInline>
    </CardShell>
  );
}

function CTAInline({ children, color, onPress }) {
  return (
    <Text
      onPress={onPress}
      style={{
        marginTop: 18,
        color,
        fontFamily: fonts.uiMed,
        fontSize: 14,
      }}>
      {children}  ›
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  eyebrow: {
    fontFamily: fonts.uiMed, fontSize: 13, color: colors.textMuted,
    letterSpacing: 0.4, textTransform: 'lowercase', marginBottom: 8,
  },
  heroTitle: {
    fontFamily: fonts.display, fontSize: 38, lineHeight: 44,
    letterSpacing: -0.6, color: colors.text, maxWidth: 280,
  },
  card: { borderRadius: 16, padding: 22, overflow: 'hidden', marginTop: 12 },
  cardGlow: {
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16, shadowRadius: 24, elevation: 4,
  },
  cardGold: {
    shadowColor: colors.gold, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08, shadowRadius: 18, elevation: 3,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 16 },
  score: { fontFamily: fonts.display, fontSize: 76, lineHeight: 80, letterSpacing: -2 },
  scoreSub: { fontFamily: fonts.ui, fontSize: 13, color: colors.textSubtle, paddingBottom: 10 },
  headline: { fontFamily: fonts.displayReg, fontSize: 22, lineHeight: 30, color: colors.text, marginTop: 14, maxWidth: 300 },
  body: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: 8, maxWidth: 300 },
  kicker: { fontFamily: fonts.uiSemi, fontSize: 11, color: colors.textSubtle, letterSpacing: 0.8 },
  glyphPlate: {
    width: 56, height: 56, borderRadius: 999,
    backgroundColor: 'rgba(91,79,138,0.18)',
    borderColor: colors.borderSoft, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionH1: {
    fontFamily: fonts.displayReg, fontSize: 22, lineHeight: 28,
    color: colors.text, marginTop: 32,
  },
});
