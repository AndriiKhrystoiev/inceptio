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

const STAGES = [
  { from:  0, to:  5,  copy: 'Looking at the sky for you…' },
  { from:  5, to: 15,  copy: 'Reading the planets’ positions…' },
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
    <View className="flex-1 bg-base overflow-hidden">
      <HeroGradient height={900}/>
      <View className="opacity-[0.55] absolute left-0 right-0 top-0 bottom-0">
        <Starfield density="heavy"/>
      </View>
      <SafeAreaView className="flex-1 px-6">
        {/* Top bar */}
        <View className="flex-row items-center justify-between pt-1">
          <IconBtn onPress={() => go('location')} label="Close">
            <X color="#F5EFE4" size={22} strokeWidth={1.5}/>
          </IconBtn>
          <Text className="font-ui text-[13px] text-subtle">{Math.floor(elapsed)}s</Text>
        </View>

        <View className="flex-1"/>

        {/* Centerpiece */}
        <View className="items-center gap-7">
          <Pulse/>
          <View className="w-full min-h-[60px] items-center justify-center relative">
            {STAGES.map((s, i) => (
              <Fade key={i} active={i === stageIndex}>
                <Text className="font-display-reg italic text-[22px] leading-[30px] text-cream text-center px-6">{s.copy}</Text>
              </Fade>
            ))}
          </View>
        </View>

        <View className="flex-[1.2]"/>

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
        <View className="items-center pt-2 pb-6">
          <Pressable onPress={() => { setElapsed(0); setPaused(false); }}>
            <Text className="text-muted font-ui-med text-[12px]">replay</Text>
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
