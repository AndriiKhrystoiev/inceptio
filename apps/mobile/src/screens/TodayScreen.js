// 01 Today — three states (viable / caution / blocked).
// Data source: useTodayMoment() → single-day electional search.
//
// State resolution order:
//   1. StatePicker (design QA override) — only active when real data is present
//      so the picker position doesn't flash to mock content on load/error.
//   2. Real API data — wins whenever the query has settled successfully.
//
// The StatePicker is retained for design QA; it overrides the derived state
// AFTER data loads. While loading or in error it has no effect.

import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import MoonRiseHeader from '../components/MoonRiseHeader';
import ScorePill from '../components/ScorePill';
import Starfield from '../components/Starfield';
import PrimaryButton from '../components/PrimaryButton';
import WindowCard from '../components/WindowCard';
import StatePicker from '../components/StatePicker';
import Glyph, { reasonToGlyph } from '../components/Glyph';
import Pulse from '../components/Pulse';
import { useTodayMoment } from '../hooks/useTodayMoment';
import { friendlyMessage } from '../lib/error-messages';

// Derive the screen state from real API data.
// Returns 'viable' | 'caution' | 'blocked'
function deriveState(envelope) {
  const summary = envelope?.data?.summary;
  const heatmap = envelope?.data?.heatmap ?? [];
  const topWindows = envelope?.data?.top_windows ?? [];

  if (!summary) return 'blocked';

  if (summary.no_viable_windows) return 'blocked';

  // Check today in the heatmap (single-day search, so index 0 is today)
  const todayCell = heatmap[0];
  if (todayCell?.blocked) return 'blocked';

  // If best grade is caution, reflect that
  const bestGrade = todayCell?.best_grade ?? summary.best_grade;
  if (bestGrade === 'caution' || bestGrade === 'poor') return 'caution';

  // Has at least one fair/strong/exceptional window
  const hasGoodWindow = topWindows.some(
    (w) =>
      w.grade === 'fair' ||
      w.grade === 'good' ||
      w.grade === 'strong' ||
      w.grade === 'exceptional',
  );
  if (!hasGoodWindow) return 'caution';

  return 'viable';
}

// Format today's date label using Intl — no date-fns dependency
function todayLabel() {
  const now = new Date();
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    .format(now)
    .toLowerCase();
}

export default function TodayScreen({ go }) {
  const { data: result, isLoading, isError, error, refetch } = useTodayMoment();

  // QA override — only meaningful after data has loaded. While loading or in
  // error state the picker is hidden so it doesn't imply the state is controllable.
  // Precedence: when stateOverride is non-null AND data is loaded, override wins.
  const [stateOverride, setStateOverride] = useState(null);

  const derivedState = useMemo(() => {
    if (!result) return null;
    return deriveState(result.envelope);
  }, [result]);

  // The final state: QA override if set and data available, otherwise real data
  const state = stateOverride && derivedState ? stateOverride : (derivedState ?? 'blocked');

  const envelope = result?.envelope;
  const summary = envelope?.data?.summary;
  const topWindows = envelope?.data?.top_windows ?? [];
  const excludedRanges = envelope?.data?.excluded_ranges ?? [];

  // Hero headline: prefer the Worker's displayable headline, fall back to tone
  const summaryDisplayable = summary?.displayable;
  const heroHeadline = summaryDisplayable?.headline
    ? summaryDisplayable.headline
    : state === 'viable'
    ? 'The sky is\ngentle today'
    : state === 'caution'
    ? 'Move with\ncare today'
    : 'The sky is\nresting today';

  if (isLoading) {
    return (
      <View className="flex-1 bg-base items-center justify-center gap-6">
        <Pulse />
        <Text className="font-ui text-[14px] text-muted">Looking at the sky for you...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-base items-center justify-center px-8 gap-5">
        <Text className="font-display-reg text-[22px] leading-[30px] text-cream text-center">
          {friendlyMessage(error)}
        </Text>
        <Pressable onPress={() => refetch()}>
          <Text className="font-ui-med text-[14px] text-primary-glow">Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ paddingBottom: 120 }}>
      <MoonRiseHeader phase="waxing-crescent">
        <Text className="font-ui-med text-[13px] text-muted tracking-[0.4px] lowercase mb-2">
          {todayLabel()}
        </Text>
        <Text className="font-display text-[38px] leading-[44px] tracking-[-0.6px] text-cream max-w-[280px]">
          {heroHeadline}
        </Text>
      </MoonRiseHeader>

      {/* StatePicker — design QA override. Precedence explained at file top. */}
      {derivedState && (
        <StatePicker
          value={stateOverride ?? derivedState}
          onChange={setStateOverride}
          options={[
            ['viable',  'A · viable'],
            ['caution', 'B · caution'],
            ['blocked', 'C · blocked'],
          ]}
        />
      )}

      <View className="px-6 pt-3">
        {state === 'viable'  && <CardA go={go} topWindows={topWindows} />}
        {state === 'caution' && <CardB go={go} topWindows={topWindows} />}
        {state === 'blocked' && <CardC go={go} excludedRanges={excludedRanges} />}

        <Text className="font-display-reg text-[22px] leading-7 text-cream mt-8">Best windows ahead</Text>
        <View className="gap-[10px] mt-[14px]">
          {topWindows.length > 0
            ? topWindows.slice(0, 4).map((w, i) => {
                const displayable = w.displayable ?? {};
                const windowHeadline = displayable.headline ?? w.rationale ?? 'A window to consider.';
                const windowDate = w.start
                  ? new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                      .format(new Date(w.start))
                      .replace(',', ' ·')
                      .toLowerCase()
                  : '';
                return (
                  <WindowCard
                    key={w.rank ?? i}
                    date={windowDate}
                    time={windowHeadline}
                    score={w.score}
                    grade={w.grade}
                    onPress={() => go('detail')}
                  />
                );
              })
            : /* Fallback when API returns no windows for today — common for single-day search */
              [
                { date: 'no windows found', time: 'Try widening the search range.', score: 0, grade: 'poor' },
              ].map((m, i) => (
                <WindowCard key={i} date={m.date} time={m.time} score={m.score} grade={m.grade} />
              ))}
        </View>

        <View className="mt-7">
          <PrimaryButton onPress={() => go('picker')}>Find a moment for…</PrimaryButton>
        </View>
      </View>
    </ScrollView>
  );
}

function CardShell({ children, tone }) {
  const borderClass =
    tone === 'glow' ? 'border-glow'
    : tone === 'gold' ? 'border-[rgba(229,199,125,0.40)]'
    : 'border-soft';
  const bgClass = tone === 'muted' ? 'bg-gradient' : 'bg-surface';

  // Colored directional shadow kept inline — shadowOffset: {0,6} is not a centered glow.
  const shadowStyle =
    tone === 'glow'
      ? { shadowColor: '#8B6FE8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 24, elevation: 4 }
      : tone === 'gold'
      ? { shadowColor: '#E5C77D', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 3 }
      : null;

  return (
    <View
      className={['rounded-lg p-[22px] overflow-hidden mt-3 border', bgClass, borderClass].join(' ')}
      style={shadowStyle}>
      {(tone === 'glow' || tone === 'gold') && (
        <View className="absolute left-0 right-0 top-0 bottom-0 opacity-40">
          <Starfield density="normal" />
        </View>
      )}
      <View>{children}</View>
    </View>
  );
}

function CardA({ go, topWindows }) {
  const best = topWindows[0];
  const displayable = best?.displayable ?? {};
  const headline = displayable.headline ?? 'A gentle window opens today.';
  // Show at most 2 passing/partial factors as a subtitle
  const factors = (displayable.factors ?? [])
    .filter((f) => f.status !== 'fail')
    .slice(0, 2)
    .map((f) => f.phrase_short)
    .join(' · ');
  const score = best?.score ?? 68;

  return (
    <CardShell tone="glow">
      <ScorePill kind="good">Favorable</ScorePill>
      <View className="flex-row items-end gap-3 mt-4">
        <Text className="font-display text-[76px] leading-[80px] tracking-[-2px] text-cream">{score}</Text>
        <Text className="font-ui text-[13px] text-subtle pb-[10px]">out of 100</Text>
      </View>
      <Text className="font-display-reg text-[22px] leading-[30px] text-cream mt-[14px] max-w-[300px]">
        {headline}
      </Text>
      {factors ? (
        <Text className="font-ui text-[14px] leading-5 text-muted mt-2 max-w-[300px]">{factors}</Text>
      ) : null}
      <CTAInline colorClass="text-primary-glow" onPress={() => go('detail')}>
        See the window
      </CTAInline>
    </CardShell>
  );
}

function CardB({ go, topWindows }) {
  const best = topWindows[0];
  const displayable = best?.displayable ?? {};
  const headline = displayable.headline ?? 'A day for reflection, not commitment.';
  const score = best?.score ?? 48;

  return (
    <CardShell tone="gold">
      <ScorePill kind="caution">Move with care</ScorePill>
      <View className="flex-row items-end gap-3 mt-4">
        <Text className="font-display text-[76px] leading-[80px] tracking-[-2px] text-gold-glow">{score}</Text>
        <Text className="font-ui text-[13px] text-subtle pb-[10px]">out of 100</Text>
      </View>
      <Text className="font-display-reg text-[22px] leading-[30px] text-cream mt-[14px] max-w-[300px]">
        {headline}
      </Text>
      <Text className="font-ui text-[14px] leading-5 text-muted mt-2 max-w-[300px]">
        There's a moment, but it asks for care. See what to weigh.
      </Text>
      <CTAInline colorClass="text-gold-glow" onPress={() => go('detail')}>
        See the moment
      </CTAInline>
    </CardShell>
  );
}

function CardC({ go, excludedRanges }) {
  // Show the first excluded range that overlaps today
  const first = excludedRanges[0];
  const reason = first?.reason_id ?? 'moon_voc';
  const copy =
    first?.displayable?.phrase ??
    "The Moon is between signs — efforts begun now don't take root the way they do on other days.";

  return (
    <CardShell tone="muted">
      <View className="flex-row items-center gap-[18px]">
        <View className="w-14 h-14 rounded-full bg-[rgba(91,79,138,0.18)] border border-soft items-center justify-center">
          <Glyph name={reasonToGlyph(reason)} size={28} color="#B8B0CC" />
        </View>
        <View className="flex-1">
          <Text className="font-ui-semi text-[11px] text-subtle tracking-[0.8px]">A PAUSE DAY</Text>
          <Text className="font-display-reg text-[22px] leading-[30px] text-cream mt-[14px] max-w-[300px]">
            {copy}
          </Text>
        </View>
      </View>
      <Text className="font-ui text-[14px] leading-5 text-muted mt-[14px] max-w-[300px]">
        Tomorrow looks different. See this week's windows on the calendar.
      </Text>
      <CTAInline colorClass="text-primary-glow" onPress={() => go('calendar')}>
        See this week's best
      </CTAInline>
    </CardShell>
  );
}

function CTAInline({ children, colorClass, onPress }) {
  return (
    <Text
      onPress={onPress}
      className={['mt-[18px] font-ui-med text-[14px]', colorClass].join(' ')}>
      {children}  ›
    </Text>
  );
}
