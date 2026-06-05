// apps/mobile/src/components/card/MomentCardSheet.js
// Share Preview sheet: hosts the LIVE MomentCard (its rendered output is the
// capture source), the two privacy toggles + the aspect choice, and the Share
// button. Toggles re-render the card live. Reuses the in-app Modal/sheet idiom.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import MomentCard from './MomentCard';
import { buildCardViewModel, defaultShowIntent } from '../../lib/card/card-view-model';
import { useMomentCardShare } from '../../hooks/useMomentCardShare';
import { getLastLocation } from '../../lib/location-storage';
import { colors, fonts } from '../../theme';

export default function MomentCardSheet({ visible, onClose, window: w, activity, showToast }) {
  const location = useMemo(() => getLastLocation(), []);
  const [showLocation, setShowLocation] = useState(false);
  // showIntent's default is the per-activity privacy default. The initializer
  // runs once; `activity` is fixed for a screen's lifetime, so there's no stale
  // value (and re-syncing would clobber a user's toggle).
  const [showIntent, setShowIntent] = useState(defaultShowIntent(activity));
  const [aspect, setAspect] = useState('9:16');
  // Gate Share until the card has a committed native layout — captureRef on a
  // not-yet-laid-out node can return a blank PNG (view-shot, New Arch).
  const [cardMeasured, setCardMeasured] = useState(false);
  const cardRef = useRef(null);
  const { share, sharing } = useMomentCardShare(showToast);

  // Graceful-catch (complements the mapper's fail-loud throw on a contract
  // violation): never let a build error crash the sheet render. On error → null.
  const vm = useMemo(() => {
    try {
      return buildCardViewModel(w, { activity, location, showLocation, showIntent });
    } catch (e) {
      return null;
    }
  }, [w, activity, location, showLocation, showIntent]);

  // If the view model couldn't be built (contract violation), don't render a
  // broken card — toast + close. Effect (not render-time) to avoid setState-in-render.
  useEffect(() => {
    if (visible && !vm) {
      showToast("Couldn't prepare this moment to share.", 'warn');
      onClose();
    }
  }, [visible, vm, showToast, onClose]);

  const onShare = async () => {
    if (!vm) return;
    const r = await share(cardRef);
    if (r.ok) onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.cardWrap} onLayout={() => setCardMeasured(true)}>
              {vm && <MomentCard ref={cardRef} vm={vm} aspect={aspect} />}
            </View>

            <Row label="Show my city" value={showLocation} onChange={setShowLocation} />
            <Row label="Show the occasion" value={showIntent} onChange={setShowIntent} />

            <View style={styles.aspectRow}>
              {['9:16', '1:1'].map((a) => (
                <Pressable key={a} onPress={() => setAspect(a)} style={[styles.chip, aspect === a && styles.chipOn]}>
                  <Text style={[styles.chipText, aspect === a && styles.chipTextOn]}>{a}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={onShare} disabled={sharing || !cardMeasured} style={[styles.shareBtn, (sharing || !cardMeasured) && styles.shareBusy]}>
              <Text style={styles.shareText}>{sharing ? 'Preparing…' : 'Share'}</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Custom Pressable toggle. The stock RN <Switch> did not fire onValueChange in
// this Modal/New-Arch context (the aspect Pressables worked, proving state→card
// re-render is fine — Switch was the lone failure). Pressable is reliable here
// and matches the Mystical Premium palette (violet, not the default green).
function Row({ label, value, onChange }) {
  return (
    <Pressable style={styles.row} onPress={() => onChange(!value)} hitSlop={6}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={[styles.toggle, value ? styles.toggleOn : styles.toggleOff]}>
        <View style={styles.knob} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface2, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  scroll: { padding: 20, gap: 14, alignItems: 'stretch' },
  cardWrap: { alignItems: 'center', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { fontFamily: fonts.uiMed, fontSize: 15, color: colors.text },
  toggle: { width: 50, height: 30, borderRadius: 15, padding: 3, flexDirection: 'row' },
  toggleOff: { backgroundColor: colors.borderSoft, justifyContent: 'flex-start' },
  toggleOn: { backgroundColor: colors.primary, justifyContent: 'flex-end' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF' },
  aspectRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.borderGlow },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.uiMed, color: colors.textMuted },
  chipTextOn: { color: colors.text },
  shareBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  shareBusy: { opacity: 0.5 },
  shareText: { fontFamily: fonts.uiSemi, fontSize: 16, color: colors.text },
  cancel: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontFamily: fonts.ui, color: colors.textMuted },
});
