// Inceptio · React Native (Expo) — root.
// Loads fonts, sets the dark status bar, and renders the screen
// router. In production, swap the in-app router for @react-navigation
// (the screen names below map 1:1).

import './global.css';
import 'react-native-gesture-handler';
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts as useFraunces, Fraunces_400Regular, Fraunces_500Medium, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';

import { colors } from './src/theme';
import OnboardingScreen from './src/screens/OnboardingScreen';
import TodayScreen from './src/screens/TodayScreen';
import ActivityPickerScreen from './src/screens/ActivityPickerScreen';
import DatePickerScreen from './src/screens/DatePickerScreen';
import LocationPickerScreen from './src/screens/LocationPickerScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import NoViableScreen from './src/screens/NoViableScreen';
import MomentDetailScreen from './src/screens/MomentDetailScreen';
import YouScreen from './src/screens/YouScreen';
import PaywallScreen from './src/screens/PaywallScreen';
import TabBar from './src/components/TabBar';

SplashScreen.preventAutoHideAsync().catch(() => {});

const SCREENS = {
  onboarding: OnboardingScreen,
  today:      TodayScreen,
  picker:     ActivityPickerScreen,
  date:       DatePickerScreen,
  location:   LocationPickerScreen,
  loading:    LoadingScreen,
  calendar:   CalendarScreen,
  noviable:   NoViableScreen,
  detail:     MomentDetailScreen,
  you:        YouScreen,
  paywall:    PaywallScreen,
};

// Screens that hide the bottom tab bar (modal flows + onboarding).
const MODAL_SCREENS = new Set(['onboarding', 'picker', 'date', 'location', 'loading', 'noviable', 'paywall']);

// Tab id (one of: today / calendar / moments / you) is independent
// of screen id so a modal flow doesn't deactivate the tab below it.
const TAB_FOR_SCREEN = { today: 'today', calendar: 'calendar', you: 'you' };

export default function App() {
  const [fontsLoaded] = useFraunces({
    Fraunces_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_400Regular,
  });

  const [screen, setScreen] = useState('onboarding');
  const [tab, setTab]       = useState('today');

  const go = useCallback((id) => {
    setScreen(id);
    if (TAB_FOR_SCREEN[id]) setTab(TAB_FOR_SCREEN[id]);
  }, []);

  const handleTab = useCallback((id) => {
    if (id === 'today')    go('today');
    if (id === 'calendar') go('calendar');
    if (id === 'moments')  go('detail');
    if (id === 'you')      go('you');
  }, [go]);

  const onLayoutRoot = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.primaryGlow}/>
      </View>
    );
  }

  const Screen = SCREENS[screen] || SCREENS.today;
  const showTabBar = !MODAL_SCREENS.has(screen);

  return (
    <SafeAreaProvider>
      <View style={styles.root} onLayout={onLayoutRoot}>
        <StatusBar style="light"/>
        <View style={styles.content}>
          <Screen go={go}/>
        </View>
        {showTabBar && <TabBar active={tab} onChange={handleTab}/>}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bgBase },
  content: { flex: 1 },
  boot:    { flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center' },
});
