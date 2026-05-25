// 03 Calendar — heatmap with three cell states + bottom sheet.

import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Share2, ChevronLeft, ChevronRight } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import StatePicker from '../components/StatePicker';
import SecondaryButton from '../components/SecondaryButton';
import WindowCard from '../components/WindowCard';
import Glyph, { reasonToGlyph, FRIENDLY_REASON } from '../components/Glyph';
import { colors, fonts, radii } from '../theme';

const BASE = [
  ['b','moon_voc'],['b','moon_voc'],['v',58],['b','mercury_retrograde'],['v',62],['v',68],['b','eclipse_window'],
  ['b','moon_voc'],['b','moon_voc'],['b','mercury_retrograde'],['b','mercury_retrograde'],['v',54],['v',71],['v',65],
  ['b','moon_voc'],['b','fixed_star_on_angle'],['b','moon_voc'],['b','moon_via_combusta'],['v',66],['v',72],['v',78],
  ['b','moon_voc'],['b','moon_voc'],['v',57],['b','malefic_on_angle'],['v',64],['v',69],['b','moon_voc'],
  ['b','moon_voc'],['b','moon_voc'],
];

const DAY_LABELS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

export default function CalendarScreen({ go }) {
  const [bucket, setBucket] = useState('many');
  const [sheet, setSheet]   = useState(null);

  const days = useMemo(() => {
    if (bucket === 'many') return BASE;
    if (bucket === 'few') {
      const keep = new Set([13, 21, 27]);
      return BASE.map((d, i) => d[0] === 'v' && !keep.has(i + 1) ? ['b','moon_voc'] : d);
    }
    return BASE.map(d => d[0] === 'v' ? ['b','moon_voc'] : d);
  }, [bucket]);

  const viableCount = days.filter(d => d[0] === 'v').length;
  const headerCopy = viableCount === 0
    ? 'No viable windows in this range. The closest moments still exist — see below.'
    : viableCount < 5
    ? `Just ${viableCount} viable windows in your range — they're worth attention.`
    : `${viableCount} viable windows in your range`;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ overflow: 'hidden' }}>
        <HeroGradient height={260}/>
        <Starfield density="heavy"/>
        <SafeAreaView edges={['top']}>
          <View style={styles.topbar}>
            <IconBtn onPress={() => go('today')} label="Back">
              <ArrowLeft color={colors.text} size={22} strokeWidth={1.5}/>
            </IconBtn>
            <Text style={styles.topbarTitle}>Wedding · Kyiv</Text>
            <IconBtn label="Share">
              <Share2 color={colors.text} size={20} strokeWidth={1.5}/>
            </IconBtn>
          </View>

          <View style={{ paddingTop: 24, paddingHorizontal: 24, alignItems: 'center' }}>
            <Text style={styles.subtitle}>June 14 → August 14</Text>
            <Text style={[styles.stat, viableCount === 0 && { color: colors.goldGlow }]}>{headerCopy}</Text>
          </View>

          <View style={styles.toggleRow}>
            <TogglePill label="List" active={false}/>
            <TogglePill label="Calendar" active={true}/>
          </View>
        </SafeAreaView>
      </View>

      <StatePicker
        label="viable"
        value={bucket}
        onChange={setBucket}
        options={[
          ['many', 'many · 9'],
          ['few',  'few · 3'],
          ['none', 'none · 0'],
        ]}
      />

      <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
        {/* Month nav */}
        <View style={styles.monthNav}>
          <IconBtn>
            <ChevronLeft color={colors.textMuted} size={16} strokeWidth={1.5}/>
          </IconBtn>
          <Text style={styles.monthLabel}>June 2026</Text>
          <IconBtn>
            <ChevronRight color={colors.textMuted} size={16} strokeWidth={1.5}/>
          </IconBtn>
        </View>

        {/* Day labels */}
        <View style={styles.row}>
          {DAY_LABELS.map(d => (
            <View key={d} style={styles.cellSlot}>
              <Text style={styles.dayLabel}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Cells */}
        <View style={[styles.row, { flexWrap: 'wrap', rowGap: 8 }]}>
          {days.map(([kind, val], i) => (
            <Cell key={i}
              day={i + 1}
              kind={kind}
              value={val}
              onPress={() => kind === 'b' ? setSheet({ day: i + 1, reason: val }) : go('detail')}/>
          ))}
        </View>

        {/* Legend strip */}
        <View style={styles.legend}>
          <Glyph name="moon-void" size={18} color={colors.textSubtle}/>
          <Text style={styles.legendText}>
            Glyphs mark days the sky doesn't favor. Filled cells show available windows. Gold rings mark the strongest moments.
          </Text>
        </View>

        {/* Closest moments — only when none */}
        {viableCount === 0 && (
          <View style={{ marginTop: 28 }}>
            <Text style={styles.rescueH1}>The closest moments</Text>
            <View style={{ gap: 10, marginTop: 12 }}>
              <WindowCard date="sat · jun 13" time="A short window, asks for care."   score={49} grade="caution" onPress={() => go('detail')}/>
              <WindowCard date="tue · jun 30" time="A workable window with patience." score={46} grade="caution" onPress={() => go('detail')}/>
            </View>
          </View>
        )}
      </View>

      {/* Blocked-reason bottom sheet */}
      <Modal transparent visible={!!sheet} animationType="slide" onRequestClose={() => setSheet(null)}>
        {sheet && <BlockedSheet sheet={sheet} onClose={() => setSheet(null)}/>}
      </Modal>
    </ScrollView>
  );
}

function Cell({ day, kind, value, onPress }) {
  // BLOCKED
  if (kind === 'b') {
    return (
      <Pressable onPress={onPress} style={styles.cellSlot}>
        <Text style={[styles.dayNum, { color: colors.borderGlow }]}>{day}</Text>
        <View style={[styles.cellBox, styles.blockedBox]}>
          <Glyph name={reasonToGlyph(value)} size={14} color={colors.borderGlow}/>
        </View>
      </Pressable>
    );
  }
  const score = value;
  const celebrate = score >= 75;
  const bg = celebrate ? colors.goldMuted
           : score >= 65 ? colors.primary
           : score >= 50 ? '#6E5DAB'
           : colors.borderGlow;
  return (
    <Pressable onPress={onPress} style={styles.cellSlot}>
      <Text style={styles.dayNum}>{day}</Text>
      <View style={[styles.cellBox, {
        backgroundColor: bg,
        ...(celebrate ? {
          shadowColor: colors.gold,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.45,
          shadowRadius: 6,
          elevation: 3,
          borderColor: 'rgba(255,238,200,0.6)',
          borderWidth: 1.5,
        } : null),
      }]}>
        <Text style={{
          fontFamily: fonts.uiSemi,
          fontSize: 11,
          color: celebrate ? colors.bgBase : '#FFFFFF',
          opacity: 0.9,
        }}>{score}</Text>
      </View>
    </Pressable>
  );
}

function TogglePill({ label, active }) {
  return (
    <Pressable style={{
      paddingVertical: 7,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: active ? 'rgba(212,184,114,0.12)' : 'transparent',
      borderColor: active ? colors.borderGlow : colors.borderSoft,
      borderWidth: 1,
    }}>
      <Text style={{ fontFamily: fonts.uiMed, fontSize: 13, color: active ? colors.text : colors.textMuted }}>{label}</Text>
    </Pressable>
  );
}

function BlockedSheet({ sheet, onClose }) {
  const friendly = FRIENDLY_REASON[sheet.reason] || { title: 'A pause day', body: 'The sky asks us to wait.' };
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,10,31,0.6)' }]}/>
      <View style={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopColor: colors.borderSoft,
        borderTopWidth: 1,
        paddingTop: 20,
        paddingHorizontal: 24,
        paddingBottom: 32,
      }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 40, height: 4, borderRadius: 999, backgroundColor: colors.borderSoft }}/>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18 }}>
          <View style={styles.sheetGlyph}>
            <Glyph name={reasonToGlyph(sheet.reason)} size={22} color={colors.textMuted}/>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.uiSemi, fontSize: 11, color: colors.textSubtle, letterSpacing: 0.8 }}>JUNE {sheet.day}</Text>
            <Text style={{ fontFamily: fonts.displayReg, fontSize: 20, lineHeight: 26, color: colors.text, marginTop: 4 }}>{friendly.title}</Text>
          </View>
        </View>
        <Text style={{ fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: 14 }}>{friendly.body}</Text>
        <View style={{ marginTop: 20 }}>
          <SecondaryButton onPress={onClose} style={{ width: '100%' }}>Got it</SecondaryButton>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  topbar: { paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topbarTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.text, letterSpacing: -0.2 },
  subtitle: { fontFamily: fonts.ui, fontSize: 14, color: colors.textMuted },
  stat: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: 8, textAlign: 'center', maxWidth: 320 },
  toggleRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 20, paddingBottom: 24 },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  monthLabel: { fontFamily: fonts.display, fontSize: 22, color: colors.text, letterSpacing: -0.2, minWidth: 150, textAlign: 'center' },
  row: { flexDirection: 'row', marginTop: 20, columnGap: 6 },
  dayLabel: { fontFamily: fonts.uiMed, fontSize: 12, color: colors.textSubtle, textAlign: 'center' },
  cellSlot: { width: `${100 / 7 - 0.86}%`, alignItems: 'center', gap: 6 },
  dayNum: { fontFamily: fonts.uiMed, fontSize: 13, color: colors.text },
  cellBox: { width: '100%', aspectRatio: 1, maxHeight: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  blockedBox: { backgroundColor: 'rgba(31,24,56,0.55)', borderColor: colors.surface2, borderWidth: 1 },

  legend: {
    marginTop: 22, padding: 14, borderRadius: 12,
    backgroundColor: colors.bgGradient,
    borderColor: colors.surface2, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  legendText: { flex: 1, fontFamily: fonts.ui, fontSize: 12, lineHeight: 18, color: colors.textMuted },

  rescueH1: { fontFamily: fonts.displayReg, fontSize: 20, lineHeight: 26, color: colors.text },

  sheetGlyph: {
    width: 44, height: 44, borderRadius: 999,
    backgroundColor: 'rgba(91,79,138,0.18)',
    borderColor: colors.borderSoft, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
});
