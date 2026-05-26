// 03 Calendar — heatmap with three cell states + bottom sheet.
// Data source: useElectionalSearch() with today → today+30 days range,
// built from draft store (last activity + last location, with Kyiv fallback).

import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Share2, ChevronLeft, ChevronRight } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import SecondaryButton from '../components/SecondaryButton';
import WindowCard from '../components/WindowCard';
import Glyph, { reasonToGlyph, FRIENDLY_REASON } from '../components/Glyph';
import Pulse from '../components/Pulse';
import { useElectionalSearch } from '../hooks/useElectionalSearch';
import { getLastActivity, getLastLocation } from '../lib/draft-store';
import { locationToRequestFields } from '../lib/location-storage';
import { friendlyMessage } from '../lib/error-messages';
import { setWindowIndex } from '../lib/nav-params';

// Kyiv fallback mirrors the constant in useTodayMoment.
const FALLBACK_LOCATION = {
  lat: 50.4501,
  lng: 30.5234,
  timezone: 'Europe/Kyiv',
  city: 'Kyiv',
};

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildRequest() {
  const now = new Date();
  const today = isoDate(now);
  const endMs = now.getTime() + 30 * 24 * 60 * 60 * 1000;
  const endDate = isoDate(new Date(endMs));

  const loc = getLastLocation() ?? FALLBACK_LOCATION;
  const activity = getLastActivity() ?? 'wedding';

  return { activity, start: today, end: endDate, ...locationToRequestFields(loc) };
}

export default function CalendarScreen({ go }) {
  const [sheet, setSheet] = useState(null);

  // Build request once on mount — date range doesn't change during the session
  const request = useMemo(() => buildRequest(), []);
  const { data: result, isLoading, isError, error, refetch } = useElectionalSearch(request);

  const envelope = result?.envelope;
  const heatmap = envelope?.data?.heatmap ?? [];
  const topWindows = envelope?.data?.top_windows ?? [];
  const summary = envelope?.data?.summary;
  const noViable = summary?.no_viable_windows ?? false;

  const viableCount = heatmap.filter((d) => !d.blocked && d.viable_count > 0).length;

  const headerCopy = noViable
    ? 'No viable windows in this range. The closest moments still exist — see below.'
    : viableCount < 5
    ? `Just ${viableCount} viable window${viableCount === 1 ? '' : 's'} in your range — they're worth attention.`
    : `${viableCount} viable windows in your range`;

  const activityLabel = request.activity.replace('_', ' ');
  const cityLabel = request.city;

  const FMT_MONTH_YEAR = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
  const FMT_MON_DAY    = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

  // Build month label from first heatmap entry
  const monthLabel = useMemo(() => {
    if (heatmap.length === 0) return FMT_MONTH_YEAR.format(new Date());
    const first = heatmap[0].date;
    return FMT_MONTH_YEAR.format(new Date(first.year, first.month - 1, first.day));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heatmap]);

  // Build date range label
  const rangeLabel = useMemo(() => {
    if (heatmap.length === 0) return '';
    const first = heatmap[0].date;
    const last  = heatmap[heatmap.length - 1].date;
    const s = new Date(first.year, first.month - 1, first.day);
    const e = new Date(last.year,  last.month  - 1, last.day);
    return `${FMT_MON_DAY.format(s)} → ${FMT_MON_DAY.format(e)}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heatmap]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-base items-center justify-center gap-6">
        <Pulse />
        <Text className="font-ui text-[14px] text-muted">Reading the calendar...</Text>
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
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="overflow-hidden">
        <HeroGradient height={260} />
        <Starfield density="heavy" />
        <SafeAreaView edges={['top']}>
          <View className="px-4 pt-2 flex-row items-center justify-between">
            <IconBtn onPress={() => go('today')} label="Back">
              <ArrowLeft color="#F5EFE4" size={22} strokeWidth={1.5} />
            </IconBtn>
            <Text className="font-display text-[18px] text-cream tracking-[-0.2px]" style={{ textTransform: 'capitalize' }}>
              {activityLabel} · {cityLabel}
            </Text>
            <IconBtn label="Share">
              <Share2 color="#F5EFE4" size={20} strokeWidth={1.5} />
            </IconBtn>
          </View>

          <View className="pt-6 px-6 items-center">
            <Text className="font-ui text-[14px] text-muted">{rangeLabel}</Text>
            <Text
              className={[
                'font-ui text-[14px] leading-5 text-muted mt-2 text-center max-w-[320px]',
                noViable ? 'text-gold-glow' : '',
              ].join(' ')}>
              {headerCopy}
            </Text>
          </View>

          <View className="flex-row justify-center gap-2 mt-5 pb-6">
            <TogglePill label="List" active={false} />
            <TogglePill label="Calendar" active={true} />
          </View>
        </SafeAreaView>
      </View>

      <View className="px-6 pt-6">
        {/* Month nav — navigation between months not yet implemented; shows current range */}
        <View className="flex-row items-center justify-center gap-[18px]">
          <IconBtn>
            <ChevronLeft color="#B8B0CC" size={16} strokeWidth={1.5} />
          </IconBtn>
          <Text className="font-display text-[22px] text-cream tracking-[-0.2px] min-w-[150px] text-center">
            {monthLabel}
          </Text>
          <IconBtn>
            <ChevronRight color="#B8B0CC" size={16} strokeWidth={1.5} />
          </IconBtn>
        </View>

        {/* Day labels */}
        <View className="flex-row mt-5 gap-[6px]">
          {DAY_LABELS.map((d) => (
            <View key={d} style={styles.cellSlot}>
              <Text className="font-ui-med text-[12px] text-subtle text-center">{d}</Text>
            </View>
          ))}
        </View>

        {/* Cells — rendered from live heatmap */}
        <View className="flex-row mt-5 gap-[6px] flex-wrap" style={{ rowGap: 8 }}>
          {heatmap.map((day, i) => {
            const dayNum = day.date.day;
            if (day.blocked) {
              const reason = day.blocked_reasons?.[0] ?? 'moon_voc';
              return (
                <Cell
                  key={i}
                  day={dayNum}
                  kind="b"
                  value={reason}
                  onPress={() => setSheet({ day: dayNum, reason })}
                />
              );
            }

            // Find the matching top_window for this day so we can pass windowIndex
            const windowIdx = topWindows.findIndex((w) => {
              if (!w.start) return false;
              const ws = new Date(w.start);
              return (
                ws.getFullYear() === day.date.year &&
                ws.getMonth() + 1 === day.date.month &&
                ws.getDate() === day.date.day
              );
            });

            return (
              <Cell
                key={i}
                day={dayNum}
                kind="v"
                value={day.best_score}
                onPress={() => {
                  setWindowIndex(windowIdx >= 0 ? windowIdx : 0);
                  go('detail');
                }}
              />
            );
          })}
        </View>

        {/* Legend */}
        <View className="mt-[22px] p-[14px] rounded-[12px] bg-gradient border border-surface-2 flex-row items-center gap-3">
          <Glyph name="moon-void" size={18} color="#7A7195" />
          <Text className="flex-1 font-ui text-[12px] leading-[18px] text-muted">
            Glyphs mark days the sky doesn't favor. Filled cells show available windows. Gold rings mark the strongest moments.
          </Text>
        </View>

        {/* Closest moments when all are blocked */}
        {noViable && topWindows.length > 0 && (
          <View className="mt-7">
            <Text className="font-display-reg text-[20px] leading-[26px] text-cream">The closest moments</Text>
            <View className="gap-[10px] mt-3">
              {topWindows.slice(0, 3).map((w, i) => {
                const displayable = w.displayable ?? {};
                const wDate = w.start
                  ? new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                      .format(new Date(w.start))
                      .replace(',', ' ·')
                      .toLowerCase()
                  : '';
                return (
                  <WindowCard
                    key={w.rank ?? i}
                    date={wDate}
                    time={displayable.headline ?? w.rationale ?? 'A window to consider.'}
                    score={w.score}
                    grade={w.grade}
                    onPress={() => {
                      setWindowIndex(i);
                      go('detail');
                    }}
                  />
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* Blocked-reason bottom sheet */}
      <Modal transparent visible={!!sheet} animationType="slide" onRequestClose={() => setSheet(null)}>
        {sheet && <BlockedSheet sheet={sheet} onClose={() => setSheet(null)} />}
      </Modal>
    </ScrollView>
  );
}

function Cell({ day, kind, value, onPress }) {
  if (kind === 'b') {
    return (
      <Pressable onPress={onPress} style={styles.cellSlot}>
        <Text className="font-ui-med text-[13px] text-glow">{day}</Text>
        <View className="w-full aspect-square max-h-[38px] rounded-[8px] bg-[rgba(31,24,56,0.55)] border border-surface-2 items-center justify-center">
          <Glyph name={reasonToGlyph(value)} size={14} color="#5B4F8A" />
        </View>
      </Pressable>
    );
  }

  const score = value;
  const celebrate = score >= 75;
  // Score-derived bg color is fully dynamic — kept inline
  const bg = celebrate
    ? '#D4B872'
    : score >= 65
    ? '#8B6FE8'
    : score >= 50
    ? '#6E5DAB'
    : '#5B4F8A';

  // Celebrate glow: centered shadowOffset {0,0} — kept inline per rule 6
  const celebrateShadow = celebrate
    ? {
        shadowColor: '#E5C77D',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 6,
        elevation: 3,
        borderColor: 'rgba(255,238,200,0.6)',
        borderWidth: 1.5,
      }
    : null;

  return (
    <Pressable onPress={onPress} style={styles.cellSlot}>
      <Text className="font-ui-med text-[13px] text-cream">{day}</Text>
      <View
        className="w-full aspect-square max-h-[38px] rounded-[8px] items-center justify-center"
        style={[{ backgroundColor: bg }, celebrateShadow]}>
        <Text
          className="font-ui-semi text-[11px] opacity-90"
          style={{ color: celebrate ? '#0F0A1F' : '#FFFFFF' }}>
          {score}
        </Text>
      </View>
    </Pressable>
  );
}

function TogglePill({ label, active }) {
  return (
    <Pressable
      className={[
        'py-[7px] px-4 rounded-full border',
        active ? 'bg-gold-muted/[0.12] border-glow' : 'bg-transparent border-soft',
      ].join(' ')}>
      <Text className={['font-ui-med text-[13px]', active ? 'text-cream' : 'text-muted'].join(' ')}>
        {label}
      </Text>
    </Pressable>
  );
}

function BlockedSheet({ sheet, onClose }) {
  const friendly = FRIENDLY_REASON[sheet.reason] || { title: 'A pause day', body: 'The sky asks us to wait.' };
  return (
    <View className="flex-1 justify-end">
      <Pressable
        onPress={onClose}
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,10,31,0.6)' }]}
      />
      <View className="bg-surface rounded-tl-xl rounded-tr-xl border-t border-soft pt-5 px-6 pb-8">
        <View className="items-center">
          <View className="w-10 h-1 rounded-full bg-soft" />
        </View>
        <View className="flex-row items-center gap-[14px] mt-[18px]">
          <View className="w-11 h-11 rounded-full bg-[rgba(91,79,138,0.18)] border border-soft items-center justify-center">
            <Glyph name={reasonToGlyph(sheet.reason)} size={22} color="#B8B0CC" />
          </View>
          <View className="flex-1">
            <Text className="font-ui-semi text-[11px] text-subtle tracking-[0.8px]">DAY {sheet.day}</Text>
            <Text className="font-display-reg text-[20px] leading-[26px] text-cream mt-1">
              {friendly.title}
            </Text>
          </View>
        </View>
        <Text className="font-ui text-[14px] leading-5 text-muted mt-[14px]">{friendly.body}</Text>
        <View className="mt-5">
          <SecondaryButton onPress={onClose} style={{ width: '100%' }}>
            Got it
          </SecondaryButton>
        </View>
      </View>
    </View>
  );
}

// cellSlot width is a calculated percentage — can't express in Tailwind without a plugin
const styles = StyleSheet.create({
  cellSlot: { width: `${100 / 7 - 0.86}%`, alignItems: 'center', gap: 6 },
});
