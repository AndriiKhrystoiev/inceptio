// 06 You — Settings screen.
// Preferences mirror what's in storage (last_activity, last_location).
// About surfaces app version + placeholders for legal copy.
// Debug section is gated behind __DEV__ — dev affordances for testing the
// Worker (reset device_id), clearing local state, etc.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import Toast from '../components/Toast';
import { useActivityPreference, setDefaultActivity } from '../lib/activity-preference';
import { getActivityLabel } from '../lib/activities';
import { ActivityChangeSheet } from '../components/ActivityChangeSheet';
import { clearSavedMoments } from '../lib/draft-store';
import { useLocationPreference, clearDefaultLocation } from '../lib/location-preference';
import { getDeviceId, clearDeviceId } from '../lib/device-id';
import { openFeedback, openStoreListing, debugForceRequestReview } from '../lib/rating/store-review';
import { recordFrustration, resetRatingState, resetRatingDedupe } from '../lib/rating/rating-store';
import { debugEvaluate } from '../lib/rating/prompt-triggers';


export default function YouScreen({ go }) {
  const { t } = useTranslation('settings');
  // Toast state — mirrors the pattern from MomentDetailScreen.
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, tone = 'neutral') => {
    setToast({ message, tone, key: Date.now() });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  // Debug section is hidden by default even in dev. Long-press the
  // "About Inceptio" header for 3s to reveal it. The flag resets on
  // component unmount (app restart) — there's no persistence by design.
  const [showDebug, setShowDebug] = useState(false);
  const handleAboutLongPress = useCallback(() => {
    if (__DEV__ && !showDebug) {
      setShowDebug(true);
      Alert.alert(t('debugMode.title'), t('debugMode.body'));
    }
  }, [showDebug, t]);

  // Preferences read once on mount + on each "tick" so Reset operations
  // re-render the row values without a full screen remount.
  const [tick, setTick] = useState(0);
  const bumpTick = useCallback(() => setTick((t) => t + 1), []);

  const { hydrationStatus, activity } = useActivityPreference();
  const activityDetail =
    hydrationStatus === 'set' && activity
      ? getActivityLabel(activity)
      : hydrationStatus === 'unset'
      ? t('detail.notSet')
      : '...'; // 'loading' — Phase 6 gate makes this unreachable in practice
  // Subscribe to the default location so the row value + Clear affordance
  // stay in sync with any write (SetDefaultLocationScreen, onboarding, etc.)
  // without requiring a screen remount.
  const { hydrationStatus: locationHydrationStatus, defaultLocation } =
    useLocationPreference();
  // Mirror the activity row's tri-state detail handling: 'loading' shows '...'
  // to avoid a brief 'Not set' flash on slow first-mounts. The location-preference
  // store transitions 'loading' → 'set' (never 'unset') per spec §8.1, so the
  // 'set' branch is the steady state.
  const locationDetail =
    locationHydrationStatus === 'set'
      ? defaultLocation?.city ?? t('detail.notSet')
      : '...';

  // Change-sheet state for the Default activity Row.
  const [changeSheetOpen, setChangeSheetOpen] = useState(false);
  const openActivityChangeSheet = useCallback(() => setChangeSheetOpen(true), []);
  const closeActivityChangeSheet = useCallback(() => setChangeSheetOpen(false), []);
  const onSelectActivity = useCallback((next) => {
    setDefaultActivity(next);
    setChangeSheetOpen(false);
  }, []);

  // Device id is async (platform vendor lookup on first call). Cache locally.
  const [deviceId, setDeviceId] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getDeviceId().then((id) => {
      if (!cancelled) setDeviceId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [tick]); // re-read after a Reset

  // Read from app.json (`expo.version`), NOT Application.nativeApplicationVersion
  // — the latter returns Expo Go's own version (e.g. "55.0.34") when running
  // inside Expo Go, which has nothing to do with our app.
  const appVersion = Constants.expoConfig?.version ?? '0.0.0';

  // -- Handlers --------------------------------------------------------------

  const comingSoon = useCallback(() => showToast(t('toast.comingSoon')), [showToast, t]);

  async function copyDeviceId() {
    if (!deviceId) return;
    try {
      await Clipboard.setStringAsync(deviceId);
      showToast(t('common:copied'));
    } catch {
      showToast(t('toast.copyFailed'), 'warn');
    }
  }

  function confirmResetDeviceId() {
    Alert.alert(
      t('resetDeviceId.title'),
      t('resetDeviceId.body'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('resetDeviceId.confirm'),
          style: 'destructive',
          onPress: () => {
            clearDeviceId();
            bumpTick();
            showToast(t('toast.deviceIdReset'));
          },
        },
      ],
    );
  }

  function confirmClearSavedMoments() {
    Alert.alert(
      t('clearMoments.title'),
      t('clearMoments.body'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('clearMoments.confirm'),
          style: 'destructive',
          onPress: () => {
            clearSavedMoments();
            showToast(t('toast.savedMomentsCleared'));
          },
        },
      ],
    );
  }

  // Support — always-available unhappy-user valve. The TAP writes the
  // frustration cooldown (action-only; no sentiment is ever read). openFeedback
  // opens the mail composer, or copies the address if there's no mail client.
  function handleFeedback() {
    recordFrustration();
    void openFeedback({
      onCopied: () => showToast(t('common:copied')),
      onError: () => showToast(t('toast.copyFailed'), 'warn'),
    });
  }

  // User-initiated store listing. Never calls requestReview (compliance).
  function handleRate() {
    void openStoreListing();
  }

  // Debug (__DEV__ only — compiled out of production, verified by LG9).
  function debugRatingEval() {
    const d = debugEvaluate();
    Alert.alert('Rating eval', `shouldAttempt: ${d.shouldAttempt}\nreason: ${d.reason}`);
  }
  function debugForceCard() {
    void debugForceRequestReview();
  }
  function debugResetRating() {
    resetRatingState();
    resetRatingDedupe(); // also clear in-session dedup so the dev gets a true clean slate
    showToast('Rating state reset');
  }

  const truncatedDeviceId = deviceId
    ? deviceId.length > 16
      ? `${deviceId.slice(0, 16)}…`
      : deviceId
    : t('deviceIdLoading');

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1 bg-base"
        contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="overflow-hidden">
          <HeroGradient height={220} />
          <Starfield density="heavy" />
          <SafeAreaView edges={['top']}>
            <View className="px-6 pt-6 pb-8">
              <Text className="font-display text-[32px] leading-[38px] tracking-[-0.3px] text-cream">
                {t('title')}
              </Text>
              <Text className="font-ui text-[14px] leading-5 text-muted mt-[10px]">
                {t('subtitle')}
              </Text>
            </View>
          </SafeAreaView>
        </View>

        <Section title={t('section.preferences')} />
        <Row label={t('row.defaultActivity')} detail={activityDetail} onPress={openActivityChangeSheet} />
        <Row
          label={t('row.defaultLocation')}
          detail={locationDetail}
          onPress={() => go('set-default-location')}
        />
        {/* Clear affordance: only visible when a default is set.
            Copy intentionally communicates fall-through to last_location
            so the user understands Today stays populated after clearing
            (Ruling 5 — bare "Clear" would imply Today goes quiet). */}
        {locationHydrationStatus === 'set' && defaultLocation !== null && (
          <Pressable
            onPress={() => clearDefaultLocation()}
            className="px-6 py-3 active:bg-surface/[0.35]"
            hitSlop={20}
            style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text className="font-ui text-[13px] text-muted">
              {t('clearLocationHint')}
            </Text>
          </Pressable>
        )}

        <Section title={t('support.title')} />
        <Row label={t('support.feedback')} detail="" onPress={handleFeedback} />
        <Row label={t('support.rate')} detail="" onPress={handleRate} />

        {/* Long-press the About header for 3s to reveal the Debug section
            below. In production builds (__DEV__ === false), the long-press
            is a no-op — the Debug section never renders regardless. */}
        <Pressable onLongPress={handleAboutLongPress} delayLongPress={3000}>
          <Section title={t('section.about')} />
        </Pressable>
        <Row label={t('row.version')} detail={appVersion} />
        <Row label={t('row.privacy')} detail="" onPress={comingSoon} />
        <Row label={t('row.terms')} detail="" onPress={comingSoon} />

        {__DEV__ && showDebug && (
          <>
            <Section title={t('section.debug')} />
            <Row
              label={t('row.deviceId')}
              detail={truncatedDeviceId}
              onPress={copyDeviceId}
              hint={t('copyHint')}
            />
            <Row
              label={t('row.resetDeviceId')}
              detail=""
              destructive
              onPress={confirmResetDeviceId}
            />
            <Row
              label={t('row.clearSavedMoments')}
              detail=""
              destructive
              onPress={confirmClearSavedMoments}
            />
            <Row label="Force rating eval" detail="" onPress={debugRatingEval} />
            <Row label="Force requestReview()" detail="" onPress={debugForceCard} />
            <Row label="Reset rating state" detail="" destructive onPress={debugResetRating} />
          </>
        )}
      </ScrollView>

      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          tone={toast.tone}
          onDismiss={dismissToast}
        />
      )}

      <ActivityChangeSheet
        open={changeSheetOpen}
        current={activity}
        onSelect={onSelectActivity}
        onClose={closeActivityChangeSheet}
      />
    </View>
  );
}

// -- Section + Row primitives. Kept local to this screen — settings rows are
// uniquely shaped enough that adding them to `components/` would invite
// unwanted reuse pressure. If a second settings-style surface appears,
// promote them. ---------------------------------------------------------------

function Section({ title }) {
  return (
    <View className="px-6 pt-9 pb-3 flex-row items-center gap-[14px]">
      <Text className="font-ui-semi text-[11px] text-muted tracking-[1px] uppercase">
        {title}
      </Text>
      <View className="flex-1 h-px bg-soft" />
    </View>
  );
}

function Row({ label, detail, onPress, destructive, hint }) {
  const labelClass = destructive
    ? 'font-ui text-base text-difficult'
    : 'font-ui text-base text-cream';
  return (
    <Pressable
      onPress={onPress}
      className="px-6 h-14 flex-row items-center justify-between border-b border-soft active:bg-surface/[0.35]">
      <View>
        <Text className={labelClass}>{label}</Text>
        {hint ? (
          <Text className="font-ui text-[11px] text-muted mt-[2px]">{hint}</Text>
        ) : null}
      </View>
      {detail ? (
        <Text
          className="font-ui text-[14px] text-muted ml-3 max-w-[55%] text-right"
          numberOfLines={1}>
          {detail}
        </Text>
      ) : null}
    </Pressable>
  );
}
