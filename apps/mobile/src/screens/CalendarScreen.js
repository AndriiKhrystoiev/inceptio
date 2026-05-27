// 03 Calendar — true monthly heatmap with three cell states + bottom sheet.
//
// User holds a `viewMonth` ({year, month}); the grid renders all 28-31 days
// of that month with leading-padding cells to align day 1 under its weekday.
// Past days (date < today) render dimmed and non-interactive. The API fetch
// covers from max(today, firstOfMonth) → lastOfMonth, because astrology-api
// doesn't search past dates.
//
// Month chevrons mutate viewMonth. The back arrow is disabled at the current
// month — there's no useful data behind it.

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
import { getDraft, getLastActivity, getLastLocation } from '../lib/draft-store';
import { locationToRequestFields } from '../lib/location-storage';
import { friendlyMessage } from '../lib/error-messages';
import { setSelectedWindow } from '../lib/nav-params';

const FALLBACK_LOCATION = {
  lat: 50.4501,
  lng: 30.5234,
  timezone: 'Europe/Kyiv',
  city: 'Kyiv',
};

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const FMT_MONTH_YEAR = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const FMT_MON_DAY    = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// month is 1-indexed. Day 0 of next month = last day of current.
function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// JS getDay() is 0=Sun..6=Sat; we want 0=Mon..6=Sun.
function weekdayMondayFirst(date) {
  return (date.getDay() + 6) % 7;
}

// Parse a YYYY-MM-DD picker string into {year, month, day}. Returns null on
// malformed input.
function parseYMD(s) {
  if (!s || typeof s !== 'string') return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}

// Default fallback range when the user reaches Calendar without picking
// dates (e.g., tapping the tab bar directly). 30 days from today.
function defaultRange() {
  const now = new Date();
  const endMs = now.getTime() + 30 * 24 * 60 * 60 * 1000;
  return { start: isoDate(now), end: isoDate(new Date(endMs)) };
}

export default function CalendarScreen({ go }) {
  const [sheet, setSheet] = useState(null);

  // Anchor "today" once on mount so day boundaries don't shift mid-session.
  const today = useMemo(() => new Date(), []);
  const todayYMD = useMemo(
    () => ({
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    }),
    [today],
  );

  // The picker's selection is the search range. Captured once on mount — the
  // user can't go back to the picker without leaving this screen, so the
  // draft is effectively immutable here.
  const searchRange = useMemo(() => {
    const draft = getDraft();
    if (draft.start && draft.end) {
      return { start: draft.start, end: draft.end };
    }
    return defaultRange();
  }, []);
  const searchStartYMD = useMemo(() => parseYMD(searchRange.start), [searchRange.start]);
  const searchEndYMD = useMemo(() => parseYMD(searchRange.end), [searchRange.end]);

  // viewMonth is UI navigation only — which month's grid is rendered.
  // Defaults to the picker's start month (NOT the current month), so the
  // user lands on the month they actually searched.
  const [viewMonth, setViewMonth] = useState(() =>
    searchStartYMD
      ? { year: searchStartYMD.year, month: searchStartYMD.month }
      : { year: todayYMD.year, month: todayYMD.month },
  );

  // One API call for the picker's full range. Switching months below is a
  // free UI operation against the cached response.
  const request = useMemo(() => {
    const loc = getLastLocation() ?? FALLBACK_LOCATION;
    const activity = getLastActivity() ?? 'wedding';
    return {
      activity,
      start: searchRange.start,
      end: searchRange.end,
      ...locationToRequestFields(loc),
    };
  }, [searchRange]);

  const { data: result, isLoading, isError, error, refetch } =
    useElectionalSearch(request);

  const envelope = result?.envelope;
  const heatmap = envelope?.data?.heatmap ?? [];
  const topWindows = envelope?.data?.top_windows ?? [];
  const summary = envelope?.data?.summary;
  const noViable = summary?.no_viable_windows ?? false;

  // Header copy reflects the picker's full range, not the visible month.
  const viableCount = heatmap.filter((d) => !d.blocked && d.viable_count > 0).length;
  const headerCopy = noViable
    ? 'No viable windows in this range. The closest moments still exist — see below.'
    : viableCount < 5
    ? `Just ${viableCount} viable window${viableCount === 1 ? '' : 's'} in your range — they're worth attention.`
    : `${viableCount} viable windows in your range`;

  const activityLabel = (getLastActivity() ?? 'wedding').replace('_', ' ');
  const cityLabel = (getLastLocation() ?? FALLBACK_LOCATION).city;

  // Month name in the grid header tracks the visible month. The "Jun 27 →
  // Aug 29" range row tracks the picker's selection (i.e., the search range).
  const monthLabel = useMemo(
    () => FMT_MONTH_YEAR.format(new Date(viewMonth.year, viewMonth.month - 1, 1)),
    [viewMonth],
  );
  const rangeLabel = useMemo(() => {
    if (!searchStartYMD || !searchEndYMD) return '';
    const first = new Date(searchStartYMD.year, searchStartYMD.month - 1, searchStartYMD.day);
    const last = new Date(searchEndYMD.year, searchEndYMD.month - 1, searchEndYMD.day);
    return `${FMT_MON_DAY.format(first)} → ${FMT_MON_DAY.format(last)}`;
  }, [searchStartYMD, searchEndYMD]);

  // Grid scaffolding
  const lastDayNum = lastDayOfMonth(viewMonth.year, viewMonth.month);
  const monthDays = useMemo(
    () => Array.from({ length: lastDayNum }, (_, i) => i + 1),
    [lastDayNum],
  );
  const leadingPadCount = useMemo(
    () => weekdayMondayFirst(new Date(viewMonth.year, viewMonth.month - 1, 1)),
    [viewMonth],
  );

  function isPastDay(dayNum) {
    // Past relative to today's date.
    if (viewMonth.year < todayYMD.year) return true;
    if (viewMonth.year > todayYMD.year) return false;
    if (viewMonth.month < todayYMD.month) return true;
    if (viewMonth.month > todayYMD.month) return false;
    return dayNum < todayYMD.day;
  }

  // A day can be "outside the search range" if the user picked, say,
  // Jun 27 → Aug 29: days Jun 1-26 are visible in the June grid but weren't
  // searched. Render them dimmed (treated like past days visually).
  function isOutsideRange(dayNum) {
    if (!searchStartYMD || !searchEndYMD) return false;
    const idx = viewMonth.year * 10000 + viewMonth.month * 100 + dayNum;
    const lo = searchStartYMD.year * 10000 + searchStartYMD.month * 100 + searchStartYMD.day;
    const hi = searchEndYMD.year * 10000 + searchEndYMD.month * 100 + searchEndYMD.day;
    return idx < lo || idx > hi;
  }

  function findHeatmapDay(dayNum) {
    return heatmap.find(
      (d) =>
        d.date.year === viewMonth.year &&
        d.date.month === viewMonth.month &&
        d.date.day === dayNum,
    );
  }

  function goPrevMonth() {
    setViewMonth(({ year, month }) => {
      if (month === 1) return { year: year - 1, month: 12 };
      return { year, month: month - 1 };
    });
  }

  function goNextMonth() {
    setViewMonth(({ year, month }) => {
      if (month === 12) return { year: year + 1, month: 1 };
      return { year, month: month + 1 };
    });
  }

  // Chevrons are bounded to the picker's selected month-range. Inside that
  // range, the user can browse freely; outside, the chevron dims.
  const viewIdx = viewMonth.year * 12 + viewMonth.month;
  const minIdx = searchStartYMD
    ? searchStartYMD.year * 12 + searchStartYMD.month
    : viewIdx;
  const maxIdx = searchEndYMD
    ? searchEndYMD.year * 12 + searchEndYMD.month
    : viewIdx;
  const canGoPrev = viewIdx > minIdx;
  const canGoNext = viewIdx < maxIdx;

  // Only show full-screen loading on the very first fetch (no data yet).
  // Month switches no longer trigger a refetch (single request for the full
  // picker range), so this only fires on initial mount.
  const showFullScreenLoading = isLoading && !envelope;

  if (showFullScreenLoading) {
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
        {/* Month nav */}
        <View className="flex-row items-center justify-center gap-[18px]">
          <IconBtn onPress={canGoPrev ? goPrevMonth : undefined}>
            {/* Color shifts to a near-invisible grey when disabled — IconBtn
                itself doesn't support a `disabled` prop, but `onPress=undefined`
                already swallows taps, so the visual hint is the only contract
                we need. */}
            <ChevronLeft
              color={canGoPrev ? '#B8B0CC' : '#3A3258'}
              size={16}
              strokeWidth={1.5}
            />
          </IconBtn>
          <Text className="font-display text-[22px] text-cream tracking-[-0.2px] min-w-[150px] text-center">
            {monthLabel}
          </Text>
          <IconBtn onPress={canGoNext ? goNextMonth : undefined}>
            <ChevronRight
              color={canGoNext ? '#B8B0CC' : '#3A3258'}
              size={16}
              strokeWidth={1.5}
            />
          </IconBtn>
        </View>

        {/* Day labels */}
        <View className="flex-row mt-5">
          {DAY_LABELS.map((d) => (
            <View key={d} style={styles.cellSlot}>
              <Text className="font-ui-med text-[12px] text-subtle text-center">{d}</Text>
            </View>
          ))}
        </View>

        {/* Cells — iterates 1..lastDayOfMonth so the grid is always a true
            calendar month, regardless of what the API returned. Past days are
            dimmed; future days look up their heatmap entry by date. */}
        <View className="flex-row mt-5 flex-wrap" style={{ rowGap: 8 }}>
          {Array.from({ length: leadingPadCount }).map((_, i) => (
            <PadCell key={`pad-${i}`} />
          ))}
          {monthDays.map((dayNum) => {
            // Past relative to today, OR outside the picker's search range
            // (e.g., Jun 1-26 when the user picked Jun 27 → Aug 29). Both
            // render the same way: dimmed and non-interactive.
            if (isPastDay(dayNum) || isOutsideRange(dayNum)) {
              return <PastCell key={dayNum} day={dayNum} />;
            }

            const day = findHeatmapDay(dayNum);
            if (!day) {
              // Future day but no heatmap entry yet (loading, or unexpected
              // API gap). Render an empty placeholder so the column stays
              // aligned; don't make it tappable.
              return <NoDataCell key={dayNum} day={dayNum} />;
            }

            if (day.blocked) {
              const reason = day.blocked_reasons?.[0] ?? 'moon_voc';
              return (
                <Cell
                  key={dayNum}
                  day={dayNum}
                  kind="b"
                  value={reason}
                  onPress={() => setSheet({ day: dayNum, reason })}
                />
              );
            }

            return (
              <Cell
                key={dayNum}
                day={dayNum}
                kind="v"
                value={day.best_score}
                onPress={() => {
                  // Match by exact best_window_start ISO timestamp — the
                  // heatmap day already carries it. If no exact top_windows
                  // entry exists for this day, synthesize a minimal window so
                  // MomentDetail shows THIS day, not the rank-1 fallback.
                  let picked = null;
                  if (day.best_window_start) {
                    picked = topWindows.find((w) => w.start === day.best_window_start);
                  }
                  if (!picked && day.best_window_start) {
                    picked = {
                      start: day.best_window_start,
                      end: day.best_window_start,
                      score: day.best_score,
                      grade: day.best_grade,
                      duration_minutes: null,
                      factors: [],
                      displayable: {
                        headline: 'A window worth looking at.',
                        factors: [],
                      },
                      rank: -1,
                      _synthetic: true,
                    };
                  }
                  if (!picked) return;
                  setSelectedWindow(picked);
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
                      setSelectedWindow(w);
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

// Invisible placeholder for leading-weekday offset. Same dimensions as a real
// Cell so the columns stay aligned.
function PadCell() {
  return (
    <View style={styles.cellSlot}>
      <Text className="font-ui-med text-[13px] opacity-0"> </Text>
      <View className="w-full aspect-square max-h-[38px]" />
    </View>
  );
}

// Past day — visible but dimmed and non-interactive. Number only, no colored
// square or glyph.
function PastCell({ day }) {
  return (
    <View style={[styles.cellSlot, { opacity: 0.35 }]}>
      <Text className="font-ui-med text-[13px] text-subtle">{day}</Text>
      <View className="w-full aspect-square max-h-[38px]" />
    </View>
  );
}

// Future day with no heatmap entry yet (e.g., during a month-switch refetch).
// Visually neutral — shows the day number but no colored square.
function NoDataCell({ day }) {
  return (
    <View style={styles.cellSlot}>
      <Text className="font-ui-med text-[13px] text-cream">{day}</Text>
      <View className="w-full aspect-square max-h-[38px] rounded-[8px] border border-soft" style={{ opacity: 0.3 }} />
    </View>
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

// cellSlot is exactly 1/7 of the row. The visual gap between cells comes from
// horizontal padding INSIDE each cell (3px each side → 6px between any two
// adjacent cells' content). Doing it this way keeps the math
// screen-width-independent — the prior `100/7 - 0.86%` formula was hand-tuned
// for one device width and dropped a column on wider/narrower screens.
const styles = StyleSheet.create({
  cellSlot: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 3,
  },
});
