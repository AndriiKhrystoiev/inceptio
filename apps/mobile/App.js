// Inceptio · React Native (Expo) — root.
// Loads fonts, sets the dark status bar, and renders the screen
// router. In production, swap the in-app router for @react-navigation
// (the screen names below map 1:1).

import './global.css';
import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { useFonts as useFraunces, Fraunces_400Regular, Fraunces_500Medium, Fraunces_600SemiBold, Fraunces_500Medium_Italic } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';

import { colors } from './src/theme';
import i18n, { initI18n } from './src/i18n';
import { SUPPORTED, __setLocaleOverride, activeBundle } from './src/i18n/locale';
import StatePicker from './src/components/StatePicker';
import { queryClient } from './src/lib/query-client';
import { hydrateStorage, storage } from './src/lib/storage';
import { initActivityPreference, useActivityPreference } from './src/lib/activity-preference';
import { initLocationPreference, useLocationPreference } from './src/lib/location-preference';
import { resolveLandingScreen } from './src/lib/onboarding-route';
import { migrateLocationTimezones_v1 } from './src/lib/location-storage';
import { recordActiveDay } from './src/lib/rating/rating-store';
import { useUpdateGate } from './src/lib/update-gate/use-update-gate';
import { UpdateGateContext } from './src/lib/update-gate/update-gate-context';
import UpdateGateScreen from './src/components/UpdateGateScreen';
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
import TabBar from './src/components/TabBar';

SplashScreen.preventAutoHideAsync().catch(() => {});

// __DEV__-only locale switcher bar. Renders at the very top of the root view,
// ABOVE any screen's SafeAreaView, so it must apply the top safe-area inset
// itself or the middle pills sit under the notch / Dynamic Island and can't be
// tapped. Lives inside SafeAreaProvider (rendered within withProviders), so the
// insets hook resolves.
function DevLocaleBar({ value, onChange }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top }}>
      <StatePicker
        label="locale"
        options={SUPPORTED.map((b) => [b, b])}
        value={value}
        onChange={onChange}
      />
    </View>
  );
}

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
  // Onboarding variant of the location step (D13 interceptor sequencing:
  // activity → location → Today). Distinct from 'set-default-location' (the
  // Settings / Today-empty-state entry): onDismissStatus="skipped" makes the
  // screen render the localized "Skip for now" AND write a terminal status on
  // skip — otherwise the location status stays 'pending' and the gate re-fires
  // on every cold launch.
  'onboarding-location': (props) => (
    <SetDefaultLocationScreen {...props} onDismissStatus="skipped"/>
  ),
};

// Screens that hide the bottom tab bar (modal flows + onboarding).
const MODAL_SCREENS = new Set(['onboarding', 'picker', 'date', 'location', 'loading', 'noviable', 'paywall', 'first-launch-activity', 'set-default-location', 'onboarding-location']);

// Tab id (one of: today / calendar / moments / you) is independent
// of screen id so a modal flow doesn't deactivate the tab below it.
const TAB_FOR_SCREEN = { today: 'today', calendar: 'calendar', moments: 'moments', you: 'you' };

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

  // `screen` starts null — there is NO ungated default. The screen shown before
  // any in-session navigation is DERIVED from the two persisted onboarding flags
  // by resolveLandingScreen (see below). This is the root-cause fix: the old
  // useState('onboarding') default made the brand welcome appear on every cold
  // launch for returning users while a separate gate skipped it on first run.
  const [screen, setScreen] = useState(null);
  const [tab, setTab]       = useState('today');
  const [storageReady, setStorageReady] = useState(false);

  // Hydrate the AsyncStorage → in-memory cache once, before any screen reads.
  // Synchronous storage.getString() calls inside hooks return undefined until
  // this completes, which is fine for the splash window but not for actual UI.
  useEffect(() => {
    // Initialize i18next before the boot gate lifts (same slot as hydrateStorage).
    // Synchronous: resources are eager static imports, so init() resolves
    // immediately and t() is safe by the time any screen mounts.
    initI18n();
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
      // Rating: bump the distinct-day counter once per device-local day. MUST be
      // after hydrateStorage() (reads rating.lastActiveDay) and is the only
      // pre-render rating read (spec EC7).
      recordActiveDay();
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

  // __DEV__-only locale override for the local-verification loop. Sits next to the
  // other __DEV__ affordances (TodayScreen StatePicker). Forces i18next to a chosen
  // bundle without changing the device language. No-op in production builds.
  const [devLocale, setDevLocale] = useState(__DEV__ ? activeBundle() : 'en');
  const onDevLocale = useCallback((b) => {
    __setLocaleOverride(b);
    i18n.changeLanguage(b);
    setDevLocale(b);
  }, []);

  // Single shared update-gate controller. MUST be declared BEFORE withProviders
  // (whose useCallback deps array references `update` — a deps array is evaluated
  // WHEN the callback is created, so declaring `update` later would hit the
  // temporal dead zone and crash at render) AND above every conditional return
  // (Rules of Hooks, same constraint as the activity/location prefs). Provided to
  // the normal tree via UpdateGateContext so TodayScreen consumes THIS instance
  // (never a second useUpdateGate → double-fetch/poll).
  const update = useUpdateGate();

  // Hoist I18nextProvider above the three conditional return branches so every
  // branch (first-launch gate, location gate, normal tree) renders under it.
  const withProviders = useCallback((node) => (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <View style={styles.root} onLayout={onLayoutRoot}>
            <StatusBar style="light"/>
            {__DEV__ && (
              <DevLocaleBar value={devLocale} onChange={onDevLocale} />
            )}
            {__DEV__ && (
              <StatePicker
                label="update-gate"
                options={[['none', 'none'], ['soft', 'soft'], ['force', 'force']]}
                value={update.devOverride ?? 'none'}
                onChange={(v) => update.setDevOverride(v === 'none' ? null : v)}
              />
            )}
            {node}
          </View>
        </SafeAreaProvider>
      </QueryClientProvider>
    </I18nextProvider>
  ), [onLayoutRoot, devLocale, onDevLocale, update]);

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

  // Force-update outranks EVERYTHING (onboarding, location, rating). storageReady
  // ⟹ i18n locale is resolved (synchronous initI18n in the hydrate effect), so no
  // English flash. Self-wrap in withProviders — the bare-spinner guards below don't.
  // storeUrl ?? '' guards only the __DEV__ simulator path (storeUrl is null there);
  // in production a 'force' decision always carries a non-null storeUrl.
  if (update.state === 'force') {
    return withProviders(
      <UpdateGateScreen storeUrl={update.storeUrl ?? ''} onRecheck={update.recheck} />,
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

  // Location must be hydrated before resolveLandingScreen reads
  // onboardingLocationStatus — otherwise it reads the module default ('pending')
  // and a returning user would flash the location gate for one frame. In
  // practice initLocationPreference() runs before setStorageReady(true), so this
  // is belt-and-suspenders (mirrors the old gate's `locationHydrationStatus ===
  // 'set'` guard).
  if (locationHydrationStatus === 'loading') {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.primaryGlow}/>
      </View>
    );
  }

  // Single first-run authority. Before any in-session navigation (`screen ===
  // null`), the active screen is DERIVED from the two persisted flags:
  //   - activity unset            → 'onboarding' (welcome → CTA → picker)
  //   - activity set, loc pending → 'onboarding-location' (location gate)
  //   - activity set, loc done    → 'today'
  // Once the user navigates, `screen` wins (the onboarding flow advances
  // welcome → picker → location → Today via explicit go() calls, each routed
  // through resolveLandingScreen). This replaces the old ungated default + two
  // early-return gates that didn't compose. The welcome can no longer be
  // skipped on first run, nor shown to returning users.
  const landing = resolveLandingScreen(hydrationStatus, onboardingLocationStatus);
  const active = screen ?? landing;

  const Screen = SCREENS[active] || SCREENS.today;
  const showTabBar = !MODAL_SCREENS.has(active);

  return withProviders(
    <UpdateGateContext.Provider value={update}>
      <View style={styles.content}>
        <Screen go={go}/>
      </View>
      {showTabBar && <TabBar active={tab} onChange={handleTab}/>}
    </UpdateGateContext.Provider>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bgBase },
  content: { flex: 1 },
  boot:    { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' },
});
