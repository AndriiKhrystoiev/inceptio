import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Platform, AccessibilityInfo, ToastAndroid, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import { shouldShowSoftBanner, SOFT_BANNER_CONFIG } from '../lib/update-gate/banner-policy';
import { loadSuppression, recordSoftDismiss } from '../lib/update-gate/update-store';
import type { UpdateState } from '../lib/update-gate/decision';

type Props = { state: UpdateState; latestVersion: string | null; storeUrl: string | null };

export default function UpdateBanner({ state, latestVersion, storeUrl }: Props) {
  const { t } = useTranslation('update');
  const [dismissed, setDismissed] = useState(false);

  const visible = !dismissed && latestVersion != null && storeUrl != null &&
    shouldShowSoftBanner({ state, latestVersion, suppression: loadSuppression(), config: SOFT_BANNER_CONFIG, now: new Date() });

  useEffect(() => {
    if (visible) AccessibilityInfo.announceForAccessibility(t('soft.message')); // iOS polite-ish
  }, [visible, t]);

  const onUpdate = useCallback(async () => {
    if (!storeUrl) return;
    try { await Linking.openURL(storeUrl); }
    catch {
      const msg = t('force.openFailed');
      if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.LONG); else Alert.alert('', msg);
    }
  }, [storeUrl, t]);

  const onDismiss = useCallback(() => {
    if (latestVersion) recordSoftDismiss(latestVersion);
    setDismissed(true);
  }, [latestVersion]);

  if (!visible) return null;

  return (
    <View style={styles.root} accessibilityLiveRegion="polite">
      <Text style={styles.message}>{t('soft.message')}</Text>
      <Pressable onPress={onUpdate} accessibilityRole="button" accessibilityLabel={t('soft.action')} accessibilityHint={t('force.actionHint')} style={styles.action}>
        <Text style={styles.actionLabel}>{t('soft.action')}</Text>
      </Pressable>
      <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel={t('soft.dismiss')} hitSlop={12} style={styles.dismiss}>
        <Text style={styles.dismissGlyph}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // CONTRAST (spec §11.2): this banner sits on `colors.surface2` (NOT the gate's
  // `colors.bgBase`). The message text (`colors.text`) AND the Update-label
  // (`colors.text` on `colors.primary`) must be AA-verified against THAT surface
  // specifically — distinct from the full-screen gate's bgBase contrast check.
  root: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface2, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, margin: 16 },
  message: { flex: 1, color: colors.text, fontSize: 14 },
  action: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: colors.primary, borderRadius: 8, minHeight: 44, justifyContent: 'center' },
  actionLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  dismiss: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dismissGlyph: { color: colors.textMuted, fontSize: 20 },
});
