// apps/mobile/src/components/card/MomentCard.js
// Presentational Moment Card (Composition A — Centered Stack, center-safe).
// Renders a CardViewModel built from the window. Capture-safe: opaque base +
// collapsable={false} + gradient halo (no native shadow). aspect: '9:16'|'1:1'
// (spec §7c-3). Reuse-first: HeroGradient bg wash, Starfield, theme, the
// CaptureSafeMoon variant. forwardRef → the sheet captures this node.
import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HeroGradient from '../HeroGradient';
import Starfield from '../Starfield';
import CaptureSafeMoon from './CaptureSafeMoon';
import { colors, fonts } from '../../theme';
import { t } from '../../lib/card/card-strings';

// 9:16 and 1:1 at a fixed capture width (3× device px happens automatically).
const DIMS = {
  '9:16': { width: 360, height: 640 },
  '1:1': { width: 360, height: 360 },
};

const MomentCard = forwardRef(function MomentCard({ vm, aspect = '9:16' }, ref) {
  const dims = DIMS[aspect] ?? DIMS['9:16'];
  return (
    <View
      ref={ref}
      collapsable={false}
      style={[styles.card, dims]}
    >
      <HeroGradient height={dims.height} />
      <Starfield density="heavy" />
      <View style={styles.center}>
        <CaptureSafeMoon mood={vm.moodKey} size={88} />
        <Text style={styles.intent}>{vm.intentText.toUpperCase()}</Text>
        <Text style={styles.headline}>{vm.headline}</Text>
        <View style={styles.phrasePill}>
          <Text style={styles.phrase}>{vm.tierPhrase}</Text>
        </View>
        <Text style={styles.when}>
          {vm.whenPrimary}{vm.tzAbbrev ? ` ${vm.tzAbbrev}` : ''}
        </Text>
        <Text style={styles.whenSub}>
          {vm.whenSecondary}{vm.city ? ` · ${vm.city}` : ''}
        </Text>
      </View>
      <Text style={styles.watermark}>{`✦ ${t('card.watermark')}`}</Text>
    </View>
  );
});

export default MomentCard;

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgBase, borderRadius: 28, overflow: 'hidden' }, // opaque base
  center: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 36, gap: 16, // center-safe: content stays central
  },
  // Font keys are the REAL theme.js keys: Fraunces italic = fonts.displayItalic
  // (Fraunces_500Medium_Italic, loaded in App.js); Inter = fonts.ui/uiMed; watermark
  // = fonts.display. NO fontStyle:'italic' — the italic family is explicit.
  intent: { fontFamily: fonts.uiMed, fontSize: 12, letterSpacing: 2.5, color: colors.gold },
  headline: { fontFamily: fonts.displayItalic, fontSize: 26, lineHeight: 32, color: colors.text, textAlign: 'center' },
  phrasePill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(139,111,232,0.16)', borderWidth: 1, borderColor: 'rgba(139,111,232,0.40)',
  },
  phrase: { fontFamily: fonts.uiMed, fontSize: 13, color: colors.text },
  when: { fontFamily: fonts.ui, fontSize: 15, color: colors.text },
  whenSub: { fontFamily: fonts.ui, fontSize: 13, color: colors.textMuted },
  watermark: {
    position: 'absolute', bottom: 22, alignSelf: 'center',
    fontFamily: fonts.display, fontSize: 13, color: colors.textMuted,
  },
});
