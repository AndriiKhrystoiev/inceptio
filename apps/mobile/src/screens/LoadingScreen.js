// 03a Loading — progressive copy with meditative pulse.

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import Pulse from '../components/Pulse';
import StatePicker from '../components/StatePicker';
import { colors, fonts } from '../theme';

const STAGES = [
  { from:  0, to:  5,  copy: 'Looking at the sky for you…' },
  { from:  5, to: 15,  copy: 'Reading the planets\u2019 positions…' },
  { from: 15, to: 30,  copy: 'Considering each window…' },
  { from: 30, to: 999, copy: 'Almost there — the sky takes its time…' },
];

export default function LoadingScreen({ go }) {
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused]   = useState(false);

  useEffect(() => {
    if (paused) return;
    const t0 = Date.now() - elapsed * 1000;
    const id = setInterval(() => setElapsed((Date.now() - t0) / 1000), 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  const stageIndex = STAGES.findIndex(s => elapsed >= s.from && elapsed < s.to);

  return (
    <View style={styles.root}>
      <HeroGradient height={900}/>
      <View style={{ opacity: 0.55, position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
        <Starfield density="heavy"/>
      </View>
      <SafeAreaView style={styles.safe}>
        {/* Top bar */}
        <View style={styles.topbar}>
          <IconBtn onPress={() => go('location')} label="Close">
            <X color={colors.text} size={22} strokeWidth={1.5}/>
          </IconBtn>
          <Text style={styles.elapsed}>{Math.floor(elapsed)}s</Text>
        </View>

        <View style={{ flex: 1 }}/>

        {/* Centerpiece */}
        <View style={styles.center}>
          <Pulse/>
          <View style={styles.msgStack}>
            {STAGES.map((s, i) => (
              <Fade key={i} active={i === stageIndex}>
                <Text style={styles.msg}>{s.copy}</Text>
              </Fade>
            ))}
          </View>
        </View>

        <View style={{ flex: 1.2 }}/>

        <StatePicker
          label="preview"
          value={STAGES[stageIndex]?.from ?? 0}
          onChange={(v) => { setElapsed(v); setPaused(true); }}
          options={[
            [0,  'stage 1 · 0s'],
            [5,  'stage 2 · 5s'],
            [15, 'stage 3 · 15s'],
            [30, 'stage 4 · 30s'],
          ]}
        />
        <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 24 }}>
          <Pressable onPress={() => { setElapsed(0); setPaused(false); }}>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.uiMed, fontSize: 12 }}>replay</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function Fade({ active, children }) {
  const v = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: active ? 1 : 0, duration: 300, useNativeDriver: true }).start();
  }, [active]);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, {
      opacity: v,
      alignItems: 'center',
      justifyContent: 'center',
    }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase, overflow: 'hidden' },
  safe: { flex: 1, paddingHorizontal: 24 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  elapsed: { fontFamily: fonts.ui, fontSize: 13, color: colors.textSubtle },
  center: { alignItems: 'center', gap: 28 },
  msgStack: { width: '100%', minHeight: 60, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  msg: {
    fontFamily: fonts.displayReg,
    fontStyle: 'italic',
    fontSize: 22,
    lineHeight: 30,
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
