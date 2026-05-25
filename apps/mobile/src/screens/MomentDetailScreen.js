// 04 Moment Detail — friendly Level-2 view with 4 paragraphs.

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Share2, ChevronRight, Bookmark } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import Moon from '../components/Moon';
import ScorePill from '../components/ScorePill';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import StatePicker from '../components/StatePicker';
import StatusLine from '../components/StatusLine';
import { colors, fonts, radii } from '../theme';

const VARIANTS = {
  long:   { label: '2:32 — 4:08',  paren: '(3h 16m)',   sub: null,                                      score: 78, grade: 'strong',  pillKind: 'excellent', pillLabel: 'Highly favorable' },
  medium: { label: '2:32',          paren: '25 minutes', sub: null,                                      score: 68, grade: 'fair',    pillKind: 'good',      pillLabel: 'Favorable' },
  short:  { label: '2:32',          paren: '10 minutes', sub: 'A precise window — set a reminder.',     score: 64, grade: 'fair',    pillKind: 'good',      pillLabel: 'Favorable' },
  single: { label: '2:32 exactly',  paren: null,         sub: 'A single, pristine moment. Be ready.',   score: 72, grade: 'fair',    pillKind: 'good',      pillLabel: 'Favorable' },
};

export default function MomentDetailScreen({ go }) {
  const [variant, setVariant] = useState('long');
  const v = VARIANTS[variant];

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Hero */}
      <View style={{ overflow: 'hidden' }}>
        <HeroGradient height={300}/>
        <Starfield density="heavy"/>
        <SafeAreaView edges={['top']}>
          <View style={styles.topbar}>
            <IconBtn onPress={() => go('calendar')} label="Back">
              <ArrowLeft color={colors.text} size={22} strokeWidth={1.5}/>
            </IconBtn>
            <IconBtn label="Share">
              <Share2 color={colors.text} size={20} strokeWidth={1.5}/>
            </IconBtn>
          </View>

          <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 36 }}>
            <ScorePill kind={v.pillKind}>{v.pillLabel}</ScorePill>

            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dateBig}>Saturday,{'\n'}June 21</Text>
                <View style={{ marginTop: 14 }}>
                  <TimeLine variant={variant} v={v}/>
                  <Text style={styles.loc}>Kyiv, Ukraine</Text>
                  {v.sub && <Text style={styles.subItalic}>{v.sub}</Text>}
                </View>
              </View>
              <Moon phase="waxing-crescent" size={64}/>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <StatePicker
        label="duration"
        value={variant}
        onChange={setVariant}
        options={[
          ['long',   'long · >60m'],
          ['medium', 'medium · 25m'],
          ['short',  'short · 10m'],
          ['single', 'single · 1m'],
        ]}
      />

      {/* Score block */}
      <View style={styles.scoreBlock}>
        <Text style={styles.scoreNum}>{v.score}</Text>
        <View style={{ flex: 1 }}>
          <StatusLine score="" grade={v.grade}/>
          <Text style={styles.scoreNote}>moment score · out of 100</Text>
        </View>
      </View>

      {/* Hairline */}
      <View style={{ alignItems: 'center', marginTop: 32 }}>
        <View style={{ width: '50%', height: 1, backgroundColor: colors.borderSoft }}/>
      </View>

      {/* Narrative — four paragraphs */}
      <View style={{ paddingHorizontal: 24, paddingTop: 32 }}>
        <Text style={styles.sectionLabel}>Why this moment</Text>
        <View style={{ marginTop: 16, gap: 16 }}>
          <Text style={styles.para}>Venus brings warmth to this window. She rests in Leo, where she's dignified, and her light favors connection.</Text>
          <Text style={styles.para}>The Moon is waxing, gaining light, which traditional astrology favors for new beginnings.</Text>
          <Text style={styles.para}>
            <Text style={styles.nuance}>Worth noting: </Text>
            the Moon doesn't make a soft connection to Venus or Jupiter at this moment. The window holds itself rather than being lifted by them.
          </Text>
          <Text style={styles.para}>
            If your ceremony falls within this window, it's a thoughtful choice. If you have flexibility, the window on{' '}
            <Text style={styles.inlineLink} onPress={() => go('detail')}>June 22</Text>
            {' '}is slightly stronger.
          </Text>
        </View>

        <View style={{ alignItems: 'center', marginTop: 32 }}>
          <Pressable onPress={() => go('detail')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 }}>
            <Text style={{ fontFamily: fonts.uiMed, fontSize: 14, color: colors.textMuted }}>See technical details</Text>
            <ChevronRight color={colors.textMuted} size={14} strokeWidth={1.5}/>
          </Pressable>
        </View>

        <View style={{ marginTop: 48 }}>
          <PrimaryButton onPress={() => go('today')}>Add to calendar</PrimaryButton>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <SecondaryButton
              style={{ flex: 1 }}
              icon={<Bookmark color={colors.text} size={16} strokeWidth={1.5}/>}>
              Save
            </SecondaryButton>
            <SecondaryButton
              style={{ flex: 1 }}
              icon={<Share2 color={colors.text} size={16} strokeWidth={1.5}/>}>
              Share
            </SecondaryButton>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function TimeLine({ variant, v }) {
  if (variant === 'long') {
    return (
      <Text style={styles.loc}>
        <Text>Afternoon · {v.label} </Text>
        <Text style={{ color: colors.textMuted }}>{v.paren}</Text>
      </Text>
    );
  }
  if (variant === 'medium' || variant === 'short') {
    return (
      <Text style={styles.loc}>
        <Text>Afternoon · </Text>
        <Text style={styles.timeGold}>{v.label}</Text>
        <Text style={styles.timeGoldThin}> · {v.paren}</Text>
      </Text>
    );
  }
  if (variant === 'single') {
    return (
      <Text style={styles.loc}>
        <Text>Afternoon · </Text>
        <Text style={styles.timeGold}>{v.label}</Text>
      </Text>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  topbar: { paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginTop: 24 },
  dateBig: { fontFamily: fonts.display, fontSize: 36, lineHeight: 42, letterSpacing: -0.7, color: colors.text },
  loc: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 24, color: colors.textMuted },
  subItalic: { fontFamily: fonts.ui, fontStyle: 'italic', fontSize: 14, color: colors.goldGlow, marginTop: 8 },
  timeGold: { fontFamily: fonts.uiSemi, color: colors.goldGlow },
  timeGoldThin: { fontFamily: fonts.ui, color: colors.goldGlow },

  scoreBlock: { paddingHorizontal: 24, paddingTop: 24, flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreNum: { fontFamily: fonts.display, fontSize: 44, lineHeight: 48, letterSpacing: -1.3, color: colors.text },
  scoreNote: { fontFamily: fonts.ui, fontSize: 12, color: colors.textSubtle, marginTop: 6 },

  sectionLabel: { fontFamily: fonts.uiMed, fontSize: 13, color: colors.textMuted },
  para: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 26, color: colors.text },
  nuance: { fontFamily: fonts.uiSemi, color: colors.goldGlow, letterSpacing: 0.1 },
  inlineLink: { color: colors.primaryGlow, textDecorationLine: 'underline' },
});
