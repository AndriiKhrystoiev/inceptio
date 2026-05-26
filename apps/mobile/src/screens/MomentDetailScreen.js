// 04 Moment Detail — friendly Level-2 view with factor narrative.
// Reads the same React Query cache as CalendarScreen via useElectionalSearch
// (deduped by React Query — no extra fetch). Window index comes from
// nav-params.ts, set by CalendarScreen before calling go('detail').

import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Share2, ChevronRight, Bookmark } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import Moon from '../components/Moon';
import ScorePill from '../components/ScorePill';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import StatePicker from '../components/StatePicker';
import StatusLine from '../components/StatusLine';
import Pulse from '../components/Pulse';
import { useElectionalSearch } from '../hooks/useElectionalSearch';
import { getLastActivity, getLastLocation, saveMoment } from '../lib/draft-store';
import { locationToRequestFields } from '../lib/location-storage';
import { friendlyMessage } from '../lib/error-messages';
import { getWindowIndex } from '../lib/nav-params';

const FALLBACK_LOCATION = {
  lat: 50.4501,
  lng: 30.5234,
  timezone: 'Europe/Kyiv',
  city: 'Kyiv',
};

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildRequest() {
  const now = new Date();
  const today = isoDate(now);

  // +30 days, computed via raw ms math. No date-fns dep on mobile yet.
  const endMs = now.getTime() + 30 * 24 * 60 * 60 * 1000;
  const endDate = isoDate(new Date(endMs));

  const loc = getLastLocation() ?? FALLBACK_LOCATION;
  const activity = getLastActivity() ?? 'wedding';

  return { activity, start: today, end: endDate, ...locationToRequestFields(loc) };
}

// Grade → ScorePill props mapping
function gradeToScorePill(grade) {
  if (grade === 'exceptional') return { kind: 'excellent', label: 'Exceptional' };
  if (grade === 'strong')      return { kind: 'excellent', label: 'Highly favorable' };
  if (grade === 'good')        return { kind: 'good',      label: 'Favorable' };
  if (grade === 'fair')        return { kind: 'good',      label: 'Favorable' };
  if (grade === 'caution')     return { kind: 'caution',   label: 'Move with care' };
  return { kind: 'poor', label: 'Not recommended' };
}

const FMT_TIME = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });

// Duration-aware time display per design-v2.1
function formatWindowTime(w) {
  const minutes = w.duration_minutes;
  const start = new Date(w.start);
  const end = new Date(w.end);
  const startStr = FMT_TIME.format(start);
  const endStr   = FMT_TIME.format(end);

  if (minutes < 5) {
    return { label: `${startStr} exactly`, paren: null, sub: 'A single, pristine moment. Be ready.' };
  }
  if (minutes <= 25) {
    return { label: `${startStr} – ${endStr}`, paren: `${minutes} minutes`, sub: 'A precise window — set a reminder.' };
  }
  // > 25 min
  const hours = Math.floor(minutes / 60);
  const mins  = minutes % 60;
  const dur   = hours > 0
    ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}`
    : `${mins}m`;
  return { label: `${startStr} – ${endStr}`, paren: dur, sub: null };
}

export default function MomentDetailScreen({ go }) {
  const [showTechnical, setShowTechnical] = useState(false);

  const request = useMemo(() => buildRequest(), []);
  const { data: result, isLoading, isError, error } = useElectionalSearch(request);

  const windowIndex = getWindowIndex();
  const envelope = result?.envelope;
  const topWindows = envelope?.data?.top_windows ?? [];
  const w = topWindows[windowIndex] ?? topWindows[0];

  // StatePicker for duration variant — QA only; drives same display logic
  const [durationOverride, setDurationOverride] = useState(null);

  if (isLoading) {
    return (
      <View className="flex-1 bg-base items-center justify-center gap-6">
        <Pulse />
        <Text className="font-ui text-[14px] text-muted">Reading this moment...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-base items-center justify-center px-8 gap-5">
        <Text className="font-display-reg text-[22px] leading-[30px] text-cream text-center">
          {friendlyMessage(error)}
        </Text>
      </View>
    );
  }

  if (!w) {
    return (
      <View className="flex-1 bg-base items-center justify-center px-8">
        <Text className="font-display-reg text-[22px] leading-[30px] text-cream text-center">
          No window data available. Try searching again.
        </Text>
      </View>
    );
  }

  const displayable = w.displayable ?? {};
  const headline = displayable.headline ?? w.rationale ?? 'A moment to consider.';
  const pillProps = gradeToScorePill(w.grade);

  // Duration display — override simulates different durations for QA
  const effectiveMinutes = durationOverride != null ? durationOverride : w.duration_minutes;
  const effectiveW = durationOverride != null
    ? { ...w, duration_minutes: durationOverride }
    : w;
  const { label: timeLabel, paren: timeParen, sub: timeSub } = formatWindowTime(effectiveW);

  // Factors: L2 shows pass+partial; L3 shows all
  const allFactors = displayable.factors ?? [];
  const l2Factors = allFactors.filter((f) => f.status !== 'fail');
  const rawFactors = w.factors ?? []; // for L3 technical view

  const windowDate = w.start
    ? new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
        .format(new Date(w.start))
        .replace(', ', ',\n')
    : '';
  const city = getLastLocation()?.city ?? FALLBACK_LOCATION.city;

  function handleSave() {
    if (!w) return;
    saveMoment({
      id: `${w.start}_${request.activity}`,
      activity: request.activity,
      city,
      start: w.start,
      end: w.end,
      duration_minutes: w.duration_minutes,
      score: w.score,
      grade: w.grade,
      headline,
      saved_at: new Date().toISOString(),
    });
  }

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Hero */}
      <View className="overflow-hidden">
        <HeroGradient height={300} />
        <Starfield density="heavy" />
        <SafeAreaView edges={['top']}>
          <View className="px-4 pt-2 flex-row items-center justify-between">
            <IconBtn onPress={() => go('calendar')} label="Back">
              <ArrowLeft color="#F5EFE4" size={22} strokeWidth={1.5} />
            </IconBtn>
            <IconBtn label="Share">
              <Share2 color="#F5EFE4" size={20} strokeWidth={1.5} />
            </IconBtn>
          </View>

          <View className="px-6 pt-6 pb-9">
            <ScorePill kind={pillProps.kind}>{pillProps.label}</ScorePill>

            <View className="flex-row items-start gap-4 mt-6">
              <View className="flex-1">
                <Text className="font-display text-[36px] leading-[42px] tracking-[-0.7px] text-cream">
                  {windowDate}
                </Text>
                <View className="mt-[14px]">
                  <TimeLine timeLabel={timeLabel} timeParen={timeParen} minutes={effectiveMinutes} />
                  <Text className="font-ui text-base leading-6 text-muted">{city}</Text>
                  {timeSub && (
                    <Text className="font-ui italic text-[14px] text-gold-glow mt-2">{timeSub}</Text>
                  )}
                </View>
              </View>
              <Moon phase="waxing-crescent" size={64} />
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Duration QA StatePicker */}
      <StatePicker
        label="duration"
        value={durationOverride ?? effectiveMinutes}
        onChange={setDurationOverride}
        options={[
          [null,  'real data'],
          [190,   'long · >60m'],
          [25,    'medium · 25m'],
          [10,    'short · 10m'],
          [1,     'single · 1m'],
        ]}
      />

      {/* Score block */}
      <View className="px-6 pt-6 flex-row items-center gap-4">
        <Text className="font-display text-[44px] leading-[48px] tracking-[-1.3px] text-cream">
          {w.score}
        </Text>
        <View className="flex-1">
          <StatusLine score="" grade={w.grade} />
          <Text className="font-ui text-[12px] text-subtle mt-[6px]">moment score · out of 100</Text>
        </View>
      </View>

      {/* Hairline */}
      <View className="items-center mt-8">
        <View className="w-[50%] h-px bg-soft" />
      </View>

      {/* Narrative — L2: friendly factor phrases */}
      {!showTechnical && (
        <View className="px-6 pt-8">
          <Text className="font-ui-med text-[13px] text-muted">Why this moment</Text>
          <View className="mt-4 gap-4">
            {l2Factors.length > 0
              ? l2Factors.map((f, i) => (
                  <Text key={f.factor_id ?? i} className="font-ui text-base leading-[26px] text-cream">
                    {f.phrase_full ?? f.phrase_short ?? ''}
                  </Text>
                ))
              : /* Fallback if Worker hasn't added displayable yet */
                <Text className="font-ui text-base leading-[26px] text-cream">{headline}</Text>
            }
          </View>

          <View className="items-center mt-8">
            <Pressable
              onPress={() => setShowTechnical(true)}
              className="flex-row items-center gap-[6px] p-2">
              <Text className="font-ui-med text-[14px] text-muted">See technical details</Text>
              <ChevronRight color="#B8B0CC" size={14} strokeWidth={1.5} />
            </Pressable>
          </View>
        </View>
      )}

      {/* L3 Technical view — factor_id, weight_class, status, contribution, observation, details */}
      {showTechnical && (
        <View className="px-6 pt-8">
          <Text className="font-ui-med text-[13px] text-muted">Technical details</Text>
          <View className="mt-4 gap-4">
            {rawFactors.map((f, i) => (
              <View key={f.factor_id ?? i} className="gap-[6px] border-b border-soft pb-4">
                {/* Mono font intentionally in L3 only — see CLAUDE.md visual direction */}
                <Text className="font-mono text-[12px] text-primary-glow">{f.factor_id}</Text>
                <Text className="font-mono text-[11px] text-muted">
                  {f.weight_class} · {f.status} · +{Number(f.contribution ?? 0).toFixed(2)}
                </Text>
                <Text className="font-ui text-[13px] leading-[18px] text-cream">{f.observation}</Text>
                {f.details ? (
                  <Text className="font-mono text-[10px] text-subtle">{JSON.stringify(f.details)}</Text>
                ) : null}
              </View>
            ))}
          </View>

          <View className="items-center mt-8">
            <Pressable
              onPress={() => setShowTechnical(false)}
              className="flex-row items-center gap-[6px] p-2">
              <Text className="font-ui-med text-[14px] text-muted">Back to summary</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View className="px-6 mt-12">
        <PrimaryButton onPress={() => go('today')}>Add to calendar</PrimaryButton>
        <View className="flex-row gap-2 mt-3">
          <SecondaryButton
            style={{ flex: 1 }}
            icon={<Bookmark color="#F5EFE4" size={16} strokeWidth={1.5} />}
            onPress={handleSave}>
            Save
          </SecondaryButton>
          <SecondaryButton
            style={{ flex: 1 }}
            icon={<Share2 color="#F5EFE4" size={16} strokeWidth={1.5} />}>
            Share
          </SecondaryButton>
        </View>
      </View>
    </ScrollView>
  );
}

function TimeLine({ timeLabel, timeParen, minutes }) {
  if (minutes < 5) {
    return (
      <Text className="font-ui text-base leading-6 text-muted">
        <Text className="font-ui-semi text-gold-glow">{timeLabel}</Text>
      </Text>
    );
  }
  if (minutes <= 25) {
    return (
      <Text className="font-ui text-base leading-6 text-muted">
        <Text className="font-ui-semi text-gold-glow">{timeLabel}</Text>
        <Text className="font-ui text-gold-glow"> · {timeParen}</Text>
      </Text>
    );
  }
  // > 25 min — show range + duration
  return (
    <Text className="font-ui text-base leading-6 text-muted">
      <Text>{timeLabel} </Text>
      <Text className="text-muted">{timeParen}</Text>
    </Text>
  );
}
