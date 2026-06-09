// 03a Loading — progressive copy with meditative pulse.
// Observes the React Query state for the current draft request. Navigates
// to 'calendar' on success (viable) or 'noviable' when no_viable_windows is true.
// On error: shows friendly message + "Try again" CTA that calls refetch().

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import Pulse from '../components/Pulse';
import { useElectionalSearch } from '../hooks/useElectionalSearch';
import { getDraft } from '../lib/draft-store';
import { friendlyMessage } from '../lib/error-messages';
import {
  recordSuccessfulSearch, recordFrustration, oncePerKey, searchKeyOf,
} from '../lib/rating/rating-store';

const STAGES = [
  { from:  0, to:  5,  key: 'stage1' },
  { from:  5, to: 15,  key: 'stage2' },
  { from: 15, to: 30,  key: 'stage3' },
  { from: 30, to: 999, key: 'stage4' },
];

export default function LoadingScreen({ go }) {
  const { t } = useTranslation('loading');
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  // Build request from the assembled draft. The draft is fully populated by
  // the time the user reaches LoadingScreen (ActivityPicker → DatePicker → Location)
  // and is immutable while this screen is mounted — so memoize it. This makes the
  // EC10 rating dedup key (searchKeyOf(request)) structurally stable across
  // renders rather than relying on getDraft() returning identical values.
  const request = useMemo(() => {
    const draft = getDraft();
    return {
      activity: draft.activity,
      start: draft.start,
      end: draft.end,
      lat: draft.lat,
      lng: draft.lng,
      timezone: draft.timezone,
      city: draft.city,
    };
  }, []);

  const {
    data: result,
    isLoading,
    isError,
    error,
    refetch,
  } = useElectionalSearch(request);

  // Stable per-search key so the success/error recorders fire once per result,
  // even if React remounts this screen on a cache hit (EC10 funnel). request is
  // rebuilt each render from getDraft(), but searchKeyOf returns a deterministic
  // STRING from the field values — identical across renders for the same search.
  const ratingSearchKey = useMemo(() => searchKeyOf(request), [request]);

  // Tick the elapsed counter while loading
  useEffect(() => {
    if (!isLoading) return;
    startRef.current = Date.now();
    const id = setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000);
    }, 200);
    return () => clearInterval(id);
  }, [isLoading]);

  // Navigate on success — and record the search outcome ONCE per result. This
  // is the SINGLE funnel for successful-search + no_viable frustration. The
  // search hook is TanStack v5 with no onSuccess, and per-screen render-time
  // isError would double-count on cache-hit remounts — so recording lives here,
  // in effects gated by oncePerKey.
  useEffect(() => {
    if (!result) return;
    const noViable = result.envelope?.data?.summary?.no_viable_windows ?? false;
    if (oncePerKey('search-outcome', ratingSearchKey)) {
      if (noViable) recordFrustration();
      else recordSuccessfulSearch();
    }
    if (noViable) go('noviable');
    else go('calendar');
  }, [result, go, ratingSearchKey]);

  // Record search ERRORS as frustration. Per spec D4, ANY error/empty state
  // suppresses the next positive prompt — so this fires on every isError
  // (RateLimitError, UpstreamQuotaError, network, timeout, parse all included).
  // We deliberately do NOT branch on instanceof: that would UNDER-cover (miss
  // network/parse), contradicting "any error". Same funnel key as success, so a
  // success and an error for the same search can never both fire.
  useEffect(() => {
    if (!isError) return;
    if (oncePerKey('search-outcome', ratingSearchKey)) recordFrustration();
  }, [isError, ratingSearchKey]);

  const stageIndex = STAGES.findIndex((s) => elapsed >= s.from && elapsed < s.to);

  if (isError) {
    return (
      <View className="flex-1 bg-base overflow-hidden">
        <HeroGradient height={900} />
        <View className="opacity-[0.55] absolute left-0 right-0 top-0 bottom-0">
          <Starfield density="heavy" />
        </View>
        <SafeAreaView className="flex-1 px-6">
          <View className="flex-row items-center justify-between pt-1">
            <IconBtn onPress={() => go('location')} label={t('common:close')}>
              <X color="#F5EFE4" size={22} strokeWidth={1.5} />
            </IconBtn>
          </View>
          <View className="flex-1 items-center justify-center gap-7">
            <Text className="font-display-reg italic text-[22px] leading-[30px] text-cream text-center px-6">
              {friendlyMessage(error)}
            </Text>
            <Pressable
              onPress={() => {
                setElapsed(0);
                startRef.current = Date.now();
                refetch();
              }}
              className="py-3 px-8 rounded-full border border-glow">
              <Text className="font-ui-med text-[15px] text-cream">{t('common:tryAgain')}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-base overflow-hidden">
      <HeroGradient height={900} />
      <View className="opacity-[0.55] absolute left-0 right-0 top-0 bottom-0">
        <Starfield density="heavy" />
      </View>
      <SafeAreaView className="flex-1 px-6">
        {/* Top bar */}
        <View className="flex-row items-center justify-between pt-1">
          <IconBtn onPress={() => go('location')} label={t('common:close')}>
            <X color="#F5EFE4" size={22} strokeWidth={1.5} />
          </IconBtn>
          <Text className="font-ui text-[13px] text-subtle">{Math.floor(elapsed)}s</Text>
        </View>

        <View className="flex-1" />

        {/* Centerpiece */}
        <View className="items-center gap-7">
          <Pulse />
          <View className="w-full min-h-[60px] items-center justify-center relative">
            {STAGES.map((s, i) => (
              <Fade key={i} active={i === stageIndex}>
                <Text className="font-display-reg italic text-[22px] leading-[30px] text-cream text-center px-6">
                  {t(s.key)}
                </Text>
              </Fade>
            ))}
          </View>
        </View>

        <View className="flex-[1.2]" />
      </SafeAreaView>
    </View>
  );
}

function Fade({ active, children }) {
  const v = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: active ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [active, v]);
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { opacity: v, alignItems: 'center', justifyContent: 'center' },
      ]}>
      {children}
    </Animated.View>
  );
}
