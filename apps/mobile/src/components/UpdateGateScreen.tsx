import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Linking, Platform, AccessibilityInfo, findNodeHandle, ToastAndroid, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';

type Props = { storeUrl: string; onRecheck: () => Promise<void> };

export default function UpdateGateScreen({ storeUrl, onRecheck }: Props) {
  const { t } = useTranslation('update');
  const titleRef = useRef<Text>(null);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);

  // Move screen-reader focus to the title on mount (no accessibilityAutoFocus —
  // not a real RN prop).
  useEffect(() => {
    const tag = findNodeHandle(titleRef.current);
    if (tag != null) AccessibilityInfo.setAccessibilityFocus(tag);
  }, []);

  const announce = useCallback((msg: string) => {
    AccessibilityInfo.announceForAccessibility(msg); // iOS (liveRegion is Android-only)
  }, []);

  const openStore = useCallback(async () => {
    try {
      await Linking.openURL(storeUrl); // https → no canOpenURL precheck needed
    } catch {
      const msg = t('force.openFailed');
      if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.LONG);
      else Alert.alert('', msg);
      announce(msg);
    }
  }, [storeUrl, t, announce]);

  const retry = useCallback(async () => {
    setBusy(true); setOffline(false);
    try {
      await onRecheck();
    } finally {
      setBusy(false);
    }
    // If still mounted after recheck, the policy didn't clear → surface offline copy.
    setOffline(true);
    announce(t('force.retryOffline'));
  }, [onRecheck, t, announce]);

  return (
    <View style={styles.root} accessibilityViewIsModal>
      <View style={styles.content}>
        <Text ref={titleRef} accessibilityRole="header" style={styles.title}>
          {t('force.title')}
        </Text>
        <Text style={styles.body}>{t('force.body')}</Text>

        <Pressable
          onPress={openStore}
          accessibilityRole="button"
          accessibilityLabel={t('force.action')}
          accessibilityHint={t('force.actionHint')}
          style={styles.primary}
        >
          <Text style={styles.primaryLabel}>{t('force.action')}</Text>
        </Pressable>

        <Pressable
          onPress={retry}
          accessibilityRole="button"
          accessibilityLabel={t('force.retry')}
          accessibilityState={{ busy }}
          style={styles.secondary}
        >
          {busy ? <ActivityIndicator color={colors.textMuted} /> : <Text style={styles.secondaryLabel}>{t('force.retry')}</Text>}
        </Pressable>

        {offline && !busy ? (
          <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.offline}>
            {t('force.retryOffline')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { maxWidth: 360, gap: 16, alignItems: 'center' },
  title: { color: colors.text, fontSize: 24, textAlign: 'center' },
  body: { color: colors.textMuted, fontSize: 16, textAlign: 'center', lineHeight: 22 },
  primary: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, minWidth: 200, alignItems: 'center' },
  primaryLabel: { color: colors.text, fontSize: 16, fontWeight: '600' },
  secondary: { paddingVertical: 12, paddingHorizontal: 20, minHeight: 44, justifyContent: 'center' },
  secondaryLabel: { color: colors.textMuted, fontSize: 15 },
  offline: { color: colors.difficult, fontSize: 14, textAlign: 'center' },
});
