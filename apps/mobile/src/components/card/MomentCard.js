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

// Per-aspect sizing. The 1:1 card is much shorter (360 vs 640), so the moon +
// halo + type stack must SHRINK to fit, or the centered content overflows and
// collides with the watermark. The moon's halo box is `moon * halo` tall — the
// dominant term — so it shrinks most for 1:1.
const LAYOUT = {
  '9:16': { width: 360, height: 640, moon: 84, halo: 2.6, headline: 26, lineHeight: 32, gap: 14, padV: 44 },
  '1:1':  { width: 360, height: 360, moon: 50, halo: 2.2, headline: 19, lineHeight: 24, gap: 7,  padV: 20 },
};

const MomentCard = forwardRef(function MomentCard({ vm, aspect = '9:16' }, ref) {
  const L = LAYOUT[aspect] ?? LAYOUT['9:16'];
  return (
    <View ref={ref} collapsable={false} style={[styles.card, { width: L.width, height: L.height }]}>
      <HeroGradient height={L.height} />
      <Starfield density="heavy" />
      {/* Foreground fills the card; content is centered in the flex:1 area and
          the watermark sits BELOW it in normal flow — never overlapping. */}
      <View style={[styles.fg, { paddingVertical: L.padV }]}>
        <View style={[styles.content, { gap: L.gap }]}>
          <CaptureSafeMoon mood={vm.moodKey} phase={vm.moonPhase} size={L.moon} haloScale={L.halo} />
          <Text style={styles.intent}>{vm.intentText.toUpperCase()}</Text>
          <Text style={[styles.headline, { fontSize: L.headline, lineHeight: L.lineHeight }]}>{vm.headline}</Text>
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
    </View>
  );
});

export default MomentCard;

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgBase, borderRadius: 28, overflow: 'hidden' }, // opaque base
  fg: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, paddingHorizontal: 30 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' }, // center-safe
  // Font keys are the REAL theme.js keys: Fraunces italic = fonts.displayItalic
  // (loaded in App.js); Inter = fonts.ui/uiMed; watermark = fonts.display.
  intent: { fontFamily: fonts.uiMed, fontSize: 12, letterSpacing: 2.5, color: colors.gold, textAlign: 'center' },
  headline: { fontFamily: fonts.displayItalic, color: colors.text, textAlign: 'center' },
  phrasePill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(139,111,232,0.16)', borderWidth: 1, borderColor: 'rgba(139,111,232,0.40)',
  },
  phrase: { fontFamily: fonts.uiMed, fontSize: 13, color: colors.text },
  when: { fontFamily: fonts.ui, fontSize: 15, color: colors.text, textAlign: 'center' },
  whenSub: { fontFamily: fonts.ui, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  watermark: {
    alignSelf: 'center', marginTop: 8,
    fontFamily: fonts.display, fontSize: 13, color: colors.textMuted,
  },
});
