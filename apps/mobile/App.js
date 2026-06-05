// Inceptio · React Native (Expo) — root.
// Loads fonts, sets the dark status bar, and renders the screen
// router. In production, swap the in-app router for @react-navigation
// (the screen names below map 1:1).

import './global.css';
import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts as useFraunces, Fraunces_400Regular, Fraunces_500Medium, Fraunces_600SemiBold, Fraunces_500Medium_Italic } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';

import { colors } from './src/theme';
import { queryClient } from './src/lib/query-client';
import { hydrateStorage, storage } from './src/lib/storage';
import { initActivityPreference, useActivityPreference } from './src/lib/activity-preference';
import { initLocationPreference, useLocationPreference } from './src/lib/location-preference';
import { migrateLocationTimezones_v1 } from './src/lib/location-storage';
import OnboardingScreen from './src/screens/OnboardingScreen';
import TodayScreen from './src/screens/TodayScreen';
import ActivityPickerScreen from './src/screens/ActivityPickerScreen';
import DatePickerScreen from './src/screens/DatePickerScreen';
import LocationPickerScreen from './src/screens/LocationPickerScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import NoViableScreen from './src/screens/NoViableScreen';
import MomentDetailScreen from './src/screens/MomentDetailScreen';
import YourMomentsScreen from './src/screens/YourMomentsScreen';
import YouScreen from './src/screens/YouScreen';
import PaywallScreen from './src/screens/PaywallScreen';
import FirstLaunchActivityPicker from './src/screens/FirstLaunchActivityPicker';
import SetDefaultLocationScreen from './src/screens/SetDefaultLocationScreen';
import CaptureSpikeScreen from './src/screens/CaptureSpikeScreen'; // PHASE 0 spike — remove with the flag
import TabBar from './src/components/TabBar';

SplashScreen.preventAutoHideAsync().catch(() => {});

const SCREENS = {
  onboarding: OnboardingScreen,
  today:      TodayScreen,
  picker:     ActivityPickerScreen,
  date:       DatePickerScreen,
  location:   (props) => <LocationPickerScreen {...props} onConfirm={() => props.go('loading')}/>,
  loading:    LoadingScreen,
  calendar:   CalendarScreen,
  noviable:   NoViableScreen,
  detail:     MomentDetailScreen,
  moments:    YourMomentsScreen,
  you:        YouScreen,
  paywall:    PaywallScreen,
  'first-launch-activity': FirstLaunchActivityPicker,
  'set-default-location': SetDefaultLocationScreen,
};

// Screens that hide the bottom tab bar (modal flows + onboarding).
const MODAL_SCREENS = new Set(['onboarding', 'picker', 'date', 'location', 'loading', 'noviable', 'paywall', 'first-launch-activity', 'set-default-location']);

// Tab id (one of: today / calendar / moments / you) is independent
// of screen id so a modal flow doesn't deactivate the tab below it.
const TAB_FOR_SCREEN = { today: 'today', calendar: 'calendar', moments: 'moments', you: 'you' };

// PHASE 0 capture spike (throwaway, see spec §4). When true, the app boots
// straight into the view-shot probe instead of the normal screen tree. Flip
// `&& true` → `&& false` to restore the app; remove this flag and
// src/screens/CaptureSpikeScreen.js once the go/no-go result is recorded.
// __DEV__-gated so it can never reach a production build.
const SPIKE_CAPTURE = __DEV__ && false; // spike PASSED 2026-06-05 — app boots normally; probe kept as CaptureSafeMoon reference

export default function App() {
  const [fontsLoaded] = useFraunces({
    Fraunces_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_500Medium_Italic, // Moment Card headline (locked design: Fraunces italic)
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_400Regular,
  });

  const [screen, setScreen] = useState('onboarding');
  const [tab, setTab]       = useState('today');
  const [storageReady, setStorageReady] = useState(false);

  // Hydrate the AsyncStorage → in-memory cache once, before any screen reads.
  // Synchronous storage.getString() calls inside hooks return undefined until
  // this completes, which is fine for the splash window but not for actual UI.
  useEffect(() => {
    hydrateStorage().then(() => {
      // Cold-start resets for per-session UI preferences. These persist
      // across in-session navigation (back from MomentDetail keeps your
      // view) but each fresh app launch starts on the defaults.
      storage.delete('inceptio.results_view');
      // Resolve hydrationStatus ('loading' → 'set'|'unset') before the
      // render gate lifts. Task 6.2 will gate on 'unset' to route to
      // FirstLaunchActivityPicker before anything else mounts.
      // Migration runs BEFORE init* calls so getLastLocation() reads the
      // corrected tz on first post-migration render. Idempotent; safe under
      // hot reload. Spec §6 / Phase 2 / Task 2.2.
      migrateLocationTimezones_v1();
      initActivityPreference();
      // NEW: location-preference init AFTER activity-init (D14 upgrade path reads activity status).
      // Defensive D32 call inside initLocationPreference is belt-and-suspenders.
      initLocationPreference();
      setStorageReady(true);
    });
  }, []);

  const go = useCallback((id) => {
    setScreen(id);
    if (TAB_FOR_SCREEN[id]) setTab(TAB_FOR_SCREEN[id]);
  }, []);

  const handleTab = useCallback((id) => {
    if (id === 'today')    go('today');
    if (id === 'calendar') go('calendar');
    if (id === 'moments')  go('moments'); // YourMomentsScreen — saved-moments list
    if (id === 'you')      go('you');     // YouScreen — settings
  }, [go]);

  const onLayoutRoot = useCallback(async () => {
    if (fontsLoaded && storageReady) await SplashScreen.hideAsync();
  }, [fontsLoaded, storageReady]);

  // useActivityPreference MUST be called before any conditional return below
  // — Rules of Hooks: every hook call site must be reached on every render in
  // the same order. Placing this after the boot gate caused "Rendered more
  // hooks than during the previous render" when storageReady flipped from
  // false to true. See activity-preference.ts: useActivityPreference wraps
  // useSyncExternalStore.
  const { hydrationStatus } = useActivityPreference();
  // Subscribe to location-preference so the interceptor block in Phase 5
  // (Task 5.3) re-renders on status change. Hook call site MUST be above
  // the boot gate per Rules of Hooks (lesson from activity-pref Task 6.2).
  const {
    hydrationStatus: locationHydrationStatus,
    onboardingLocationStatus,
  } = useLocationPreference();

  if (!fontsLoaded || !storageReady) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.primaryGlow}/>
      </View>
    );
  }

  // PHASE 0 capture spike — boot straight into the view-shot probe. Placed
  // AFTER every hook call + the boot gate (fonts/storage ready) so Rules of
  // Hooks hold and the probe's Fraunces text renders. Remove with SPIKE_CAPTURE.
  if (SPIKE_CAPTURE) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light"/>
        <CaptureSpikeScreen/>
      </SafeAreaProvider>
    );
  }

  // Belt-and-suspenders: if pref is still loading at render, fall back to the
  // boot view. In practice, the storage hydrate effect runs initActivityPreference
  // (Task 6.1) before setStorageReady(true), so hydrationStatus should be 'set'
  // or 'unset' by the time storageReady === true.
  if (hydrationStatus === 'loading') {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.primaryGlow}/>
      </View>
    );
  }

  // First-launch gate: no preference set yet → mount the FirstLaunchActivityPicker
  // as a modal-style full-screen experience (no tab bar). User selects + taps
  // Continue → setDefaultActivity fires → hydrationStatus moves to 'set' → next
  // render falls through to the normal screen tree.
  if (hydrationStatus === 'unset' && screen !== 'first-launch-activity') {
    return (
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <View style={styles.root} onLayout={onLayoutRoot}>
            <StatusBar style="light"/>
            <View style={styles.content}>
              <FirstLaunchActivityPicker go={go}/>
            </View>
          </View>
        </SafeAreaProvider>
      </QueryClientProvider>
    );
  }

  // Second-launch location gate (NEW). Fires when activity onboarding is
  // already done (interceptor sequencing per D13: activity → location → Today)
  // AND the location-preference hydrated AND the user hasn't completed OR
  // skipped the location onboarding step. Spec §7.3.
  if (
    hydrationStatus === 'set' &&
    locationHydrationStatus === 'set' &&
    onboardingLocationStatus === 'pending' &&
    screen !== 'set-default-location'
  ) {
    return (
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <View style={styles.root} onLayout={onLayoutRoot}>
            <StatusBar style="light"/>
            <View style={styles.content}>
              <SetDefaultLocationScreen
                go={go}
                dismissLabel="Skip for now"
                onDismissStatus="skipped"
              />
            </View>
          </View>
        </SafeAreaProvider>
      </QueryClientProvider>
    );
  }

  const Screen = SCREENS[screen] || SCREENS.today;
  const showTabBar = !MODAL_SCREENS.has(screen);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <View style={styles.root} onLayout={onLayoutRoot}>
          <StatusBar style="light"/>
          <View style={styles.content}>
            <Screen go={go}/>
          </View>
          {showTabBar && <TabBar active={tab} onChange={handleTab}/>}
        </View>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bgBase },
  content: { flex: 1 },
  boot:    { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' },
});
