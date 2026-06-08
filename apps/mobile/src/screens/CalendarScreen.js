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

import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import ResultsListView from '../components/ResultsListView';
import { useElectionalSearch } from '../hooks/useElectionalSearch';
import { getDraft, getLastActivity, getLastLocation } from '../lib/draft-store';
import { locationToRequestFields } from '../lib/location-storage';
import { friendlyMessage } from '../lib/error-messages';
import { setSelectedWindow } from '../lib/nav-params';
import { storage } from '../lib/storage';
import { clusterWindows } from '../lib/cluster-windows';

const VIEW_KEY = 'inceptio.results_view'; // 'list' | 'calendar'

const FALLBACK_LOCATION = {
  lat: 50.4501,
  lng: 30.5234,
  timezone: 'Europe/Kyiv',
  city: 'Kyiv',
};

// Day-column order (Monday-first). Labels are localized via t('day.<key>').
const DAY_KEYS = ['day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat', 'day.sun'];

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

/**
 * Map a heatmap day + cross-checked top_windows to one of 4 cell states.
 *
 * Override rule (resolves the API's heatmap-vs-top_windows disagreement):
 *   When `dayWindows` is non-empty AND the heatmap day says blocked or has
 *   score 0, we prefer the top_windows view. This happens for moon-void
 *   days where the void covers most of the day but a few minutes outside
 *   it still hold viable moments. The list view shows those moments — the
 *   calendar should agree.
 *
 * Returns both the cell state and the effective score the cell should
 * display (max of dayWindows.score, falling back to heatmap.best_score).
 */
function classifyCell({ outOfRange, day, dayWindows }) {
  if (outOfRange || !day) return { state: 'out_of_range', score: 0 };

  const bestWindowScore = (dayWindows && dayWindows.length > 0)
    ? Math.max(...dayWindows.map((w) => w?.score ?? 0))
    : 0;
  // Effective score: prefer the top_windows-derived value when it beats the
  // heatmap. For "blocked but has moments" days, heatmap.best_score is 0,
  // so the override kicks in.
  const score = Math.max(bestWindowScore, day.best_score ?? 0);

  if (score >= 75) return { state: 'celebrate', score };
  if (score > 0) return { state: 'viable', score };
  if (day.blocked) return { state: 'blocked', score: 0 };
  return { state: 'out_of_range', score: 0 };
}

export default function CalendarScreen({ go }) {
  const { t } = useTranslation('calendar');
  const [sheet, setSheet] = useState(null);

  // 'list' | 'calendar'. Initialised from storage (persists across in-session
  // navigation: tap a card → MomentDetail → back keeps you in the same view).
  // Reset on cold start by App.js, so each app launch starts on 'calendar'
  // unless the user explicitly switched within this session.
  const [view, setView] = useState(() => {
    const saved = storage.getString(VIEW_KEY);
    return saved === 'list' || saved === 'calendar' ? saved : 'calendar';
  });
  const handleViewChange = useCallback((next) => {
    setView(next);
    storage.set(VIEW_KEY, next);
  }, []);

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

  // Header copy reflects the picker's full range. Uses the API's true window
  // count (summary.viable_windows_count = total viable windows across the
  // range), NOT a day-level filter — those are different metrics. A range
  // can have 5 viable days that together yield 12 viable windows.
  const viableWindowsCount = summary?.viable_windows_count ?? 0;
  const headerCopy = noViable
    ? t('header.noViable')
    : viableWindowsCount < 5
    ? t('header.few', { count: viableWindowsCount })
    : t('header.many', { count: viableWindowsCount });

  // Day-level pills above the grid. Buckets mirror the cell rendering, so
  // pill totals always agree with what's drawn:
  //   many = effective score ≥ 75 (celebrate cells)
  //   few  = effective score 1-74 (viable cells)
  //   none = no signal AND not blocked (no cell color, no glyph)
  // Truly-blocked days (heatmap.blocked AND no top_windows override) belong
  // to the moon-void/malefic glyph, not any pill.
  // Phase 1: info-only (no filter interactivity). Phase 2 (later) would let
  // the user toggle these to dim non-matching cells.
  // Index top_windows by 'YYYY-MM-DD'. Used by classifyCell to override
  // heatmap.blocked on days where viable moments exist outside the day's
  // dominant block (e.g. moon-void days that still have a usable hour).
  const windowsByDate = useMemo(() => {
    const map = new Map();
    for (const w of topWindows) {
      if (!w?.start) continue;
      const key = w.start.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(w);
    }
    return map;
  }, [topWindows]);

  function dayWindowsFor(dayNum) {
    const m = String(viewMonth.month).padStart(2, '0');
    const d = String(dayNum).padStart(2, '0');
    return windowsByDate.get(`${viewMonth.year}-${m}-${d}`) ?? [];
  }

  // Highest-scored window of a given day's list — used both for cell score
  // and for the onPress destination.
  function bestWindowOfDay(dayWindows) {
    if (!dayWindows || dayWindows.length === 0) return null;
    return dayWindows.reduce((a, b) =>
      (b?.score ?? 0) > (a?.score ?? 0) ? b : a,
    );
  }

  // List-view cards: cluster consecutive same-signature top_windows so a
  // 7-sample Jupiter evening collapses into one card with a time range,
  // rather than seven near-identical rows. The clustering rule lives in
  // lib/cluster-windows.ts.
  const listCards = useMemo(() => clusterWindows(topWindows), [topWindows]);

  // Effective score = max(heatmap.best_score, top_windows[date].max_score).
  // Same override classifyCell() uses, applied per-day so the pill counts
  // agree with what's rendered. Without this, moon-void days where the API
  // returns `blocked:true, best_score:0` but still emits top_windows with
  // scores 60+ would be silently dropped from every bucket — symptom that
  // motivated this fix: pills said 0/0/0 while the grid clearly showed
  // a gold "75" and a violet "64".
  //
  // In-range guard: the API already returns only days within the search
  // range, but a defensive check protects against future Worker changes.
  // Truly-blocked days (no overriding top_windows) get no pill bucket —
  // they have their own glyph in the grid.
  const filterCounts = useMemo(() => {
    const lo = searchStartYMD
      ? searchStartYMD.year * 10000 + searchStartYMD.month * 100 + searchStartYMD.day
      : -Infinity;
    const hi = searchEndYMD
      ? searchEndYMD.year * 10000 + searchEndYMD.month * 100 + searchEndYMD.day
      : Infinity;

    let many = 0, few = 0, none = 0;
    for (const d of heatmap) {
      if (!d?.date) continue;
      const idx = d.date.year * 10000 + d.date.month * 100 + d.date.day;
      if (idx < lo || idx > hi) continue;

      const m = String(d.date.month).padStart(2, '0');
      const dd = String(d.date.day).padStart(2, '0');
      const key = `${d.date.year}-${m}-${dd}`;
      const dayWindows = windowsByDate.get(key) ?? [];
      const bestWindowScore = dayWindows.length > 0
        ? Math.max(...dayWindows.map((w) => w?.score ?? 0))
        : 0;
      const effective = Math.max(bestWindowScore, d.best_score ?? 0);

      if (effective >= 75) many++;
      else if (effective > 0) few++;
      else if (!d.blocked) none++;
      // else: truly-blocked day with no override — excluded from all pills.
    }
    return { many, few, none };
  }, [heatmap, windowsByDate, searchStartYMD, searchEndYMD]);

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
        <Text className="font-ui text-[14px] text-muted">{t('loading')}</Text>
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
          <Text className="font-ui-med text-[14px] text-primary-glow">{t('common:tryAgain')}</Text>
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
            <IconBtn onPress={() => go('today')} label={t('common:back')}>
              <ArrowLeft color="#F5EFE4" size={22} strokeWidth={1.5} />
            </IconBtn>
            <Text className="font-display text-[18px] text-cream tracking-[-0.2px]" style={{ textTransform: 'capitalize' }}>
              {activityLabel} · {cityLabel}
            </Text>
            <IconBtn label={t('common:share')}>
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
            <TogglePill
              label={t('toggle.list')}
              active={view === 'list'}
              onPress={() => handleViewChange('list')}
            />
            <TogglePill
              label={t('toggle.calendar')}
              active={view === 'calendar'}
              onPress={() => handleViewChange('calendar')}
            />
          </View>
        </SafeAreaView>
      </View>

      <View className="px-6 pt-6">
        {/* Month nav — only meaningful for the grid view. */}
        {view === 'calendar' && (
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
        )}

        {/* Viable filter pills — counts of (non-blocked) days bucketed by
            effective score. Visible in both views. mt-5 only when month nav
            sits above; in list view the filter row anchors to the hero's
            bottom padding directly. */}
        <View className={`flex-row items-center gap-2 ${view === 'calendar' ? 'mt-5' : ''}`}>
          <Text className="font-ui-semi text-[11px] text-subtle tracking-[1px] uppercase mr-1">
            {t('filter.label')}
          </Text>
          <ViableFilterPill label={t('filter.many')} count={filterCounts.many} />
          <ViableFilterPill label={t('filter.few')} count={filterCounts.few} />
          <ViableFilterPill label={t('filter.none')} count={filterCounts.none} />
        </View>

        {/* List view — alternate visualisation of top_windows. Same data
            source as the grid; tapping a card opens MomentDetail with the
            picked window. Empty state navigates to the activity picker. */}
        {view === 'list' && (
          <View className="mt-7">
            <ResultsListView
              cards={listCards}
              onCardPress={(card) => {
                setSelectedWindow(card.representative);
                go('detail');
              }}
              onAdjustSearch={() => go('picker')}
            />
          </View>
        )}

        {/* Day labels */}
        {view === 'calendar' && <>
        <View className="flex-row mt-5">
          {DAY_KEYS.map((dk) => (
            <View key={dk} style={styles.cellSlot}>
              <Text className="font-ui-med text-[12px] text-subtle text-center">{t(dk)}</Text>
            </View>
          ))}
        </View>

        {/* Cells — iterates 1..lastDayOfMonth so the grid is always a true
            calendar month, regardless of what the API returned. Cell state
            comes from classifyCell() per design-v2.1's 6-state spec. */}
        <View className="flex-row mt-5 flex-wrap" style={{ rowGap: 8 }}>
          {Array.from({ length: leadingPadCount }).map((_, i) => (
            <PadCell key={`pad-${i}`} />
          ))}
          {monthDays.map((dayNum) => {
            const outOfRange = isPastDay(dayNum) || isOutsideRange(dayNum);
            const day = outOfRange ? null : findHeatmapDay(dayNum);
            const dayWindows = outOfRange ? [] : dayWindowsFor(dayNum);
            const { state, score } = classifyCell({ outOfRange, day, dayWindows });

            // Tap behavior depends on state. Out-of-range cells aren't
            // tappable. Blocked cells open the BlockedSheet for the reason.
            // Viable/celebrate cells open MomentDetail with the best window
            // for the day — prefer the highest-scored top_window, otherwise
            // fall back to the heatmap's best_window_start, otherwise
            // synthesize from heatmap day data.
            let onPress;
            if (state === 'out_of_range') {
              onPress = undefined;
            } else if (state === 'blocked') {
              const reason = day?.blocked_reasons?.[0] ?? 'moon_voc';
              onPress = () => setSheet({ day: dayNum, reason });
            } else {
              onPress = () => {
                let picked = bestWindowOfDay(dayWindows);
                if (!picked && day?.best_window_start) {
                  picked = topWindows.find((w) => w.start === day.best_window_start);
                }
                if (!picked && day?.best_window_start) {
                  picked = {
                    start: day.best_window_start,
                    end: day.best_window_start,
                    score: day.best_score,
                    grade: day.best_grade,
                    duration_minutes: null,
                    factors: [],
                    displayable: {
                      headline: t('closest.fallbackHeadline'),
                      factors: [],
                      tagline: { phrase_short: t('closest.fallbackTagline') },
                    },
                    rank: -1,
                    _synthetic: true,
                  };
                }
                if (!picked) return;
                setSelectedWindow(picked);
                go('detail');
              };
            }

            const reason = day?.blocked_reasons?.[0] ?? 'moon_voc';
            return (
              <Cell
                key={dayNum}
                state={state}
                day={dayNum}
                score={score}
                reason={reason}
                onPress={onPress}
              />
            );
          })}
        </View>

        {/* Legend — three glyph rows + a closing summary sentence. Swatch
            colors mirror the in-grid cells: blocked glyphs at #B8B0CC (the
            "carries signal" tone), out-of-range dot at #3A3258 (the "empty
            placeholder" tone). Update both surfaces together if either
            changes — they only work as a legend when they match. */}
        <View className="mt-[22px] p-[14px] rounded-[12px] bg-gradient border border-surface-2 gap-2">
          <View className="flex-row items-center gap-3">
            <View className="w-[20px] items-center">
              <Glyph name="moon-void" size={16} color="#B8B0CC" />
            </View>
            {/* VOICE legend line — ruling-dependent astrology copy. Companion to
                voice:reason.moon_voc (A7), which drives the blocked-sheet body.
                The voice ns nests each sub-file under its name (voice.calendar =
                calendar.json), so we traverse with a per-call keySeparator '.'. */}
            <Text className="flex-1 font-ui text-[14px] leading-[20px] text-muted">
              {t('voice:calendar.legend.moonVoid', { keySeparator: '.' })}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="w-[20px] items-center">
              <Glyph name="malefic-angle" size={16} color="#B8B0CC" />
            </View>
            <Text className="flex-1 font-ui text-[14px] leading-[20px] text-muted">
              {t('voice:calendar.legend.malefic', { keySeparator: '.' })}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="w-[20px] items-center">
              <View
                className="w-[6px] h-[6px] rounded-full"
                style={{ backgroundColor: '#3A3258' }}
              />
            </View>
            <Text className="flex-1 font-ui text-[14px] leading-[20px] text-muted">
              {t('legend.outsideRange')}
            </Text>
          </View>
          <Text className="font-ui text-[12px] leading-[18px] text-muted mt-2">
            {t('legend.cells')}
          </Text>
        </View>
        </>}

        {/* Closest moments when all are blocked — calendar view only.
            In list view the cards already surface top_windows ranked. */}
        {view === 'calendar' && noViable && topWindows.length > 0 && (
          <View className="mt-7">
            <Text className="font-display-reg text-[20px] leading-[26px] text-cream">{t('closest.title')}</Text>
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
                    time={displayable.headline ?? w.rationale ?? t('closest.fallbackTime')}
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

// Centered gold ring for celebrate cells (score ≥ 75). shadowOffset {0,0}
// is iOS-only (Android falls back to elevation); kept inline per the
// project shadow rule.
const CELEBRATE_RING = {
  shadowColor: '#E5C77D',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.55,
  shadowRadius: 7,
  elevation: 4,
  borderColor: 'rgba(255,238,200,0.7)',
  borderWidth: 1.5,
};

// Score-driven viable-cell color tier per the design doc's "gradient from
// muted-indigo (low) to warm-violet (mid) to gold-tint (high-fair)". Three
// buckets within the 1-74 range — finer interpolation isn't worth the math
// at this cell size (38px square).
function viableCellBg(score) {
  if (score >= 60) return '#8B6FE8';   // heat-good / warm-violet (high-fair)
  if (score >= 45) return '#6E5DAB';   // mid (between indigo and violet)
  return '#5B4F8A';                    // heat-ok / muted-indigo (low)
}

/**
 * Single Cell component, switched on state — design-v2.1 lines 125-158
 * specify 3 cell states (blocked / viable / celebrate). We add a 4th UI
 * state (out_of_range) for days outside the picker's selection.
 *
 * Tap behavior is provided by the caller (out_of_range cells get
 * onPress=undefined; everything else gets a real handler).
 */
function Cell({ state, day, score, reason, onPress }) {
  if (state === 'out_of_range') {
    // Non-interactive. Day number muted; inner container hosts a dim dot
    // so the grid stays visually uniform without competing with blocked
    // cells (which carry meaningful glyphs).
    return (
      <View style={styles.cellSlot}>
        <Text className="font-ui-med text-[13px] text-subtle opacity-60">{day}</Text>
        <View className="w-full aspect-square max-h-[38px] rounded-[8px] bg-[rgba(31,24,56,0.35)] items-center justify-center">
          <View
            className="w-[6px] h-[6px] rounded-full"
            style={{ backgroundColor: '#3A3258' }}
          />
        </View>
      </View>
    );
  }

  if (state === 'blocked') {
    // Glyph color sits brighter than the out-of-range dot so blocked days
    // visibly carry signal (moon-void, malefic angle) rather than reading
    // as "empty like the dotted days."
    return (
      <Pressable onPress={onPress} style={styles.cellSlot}>
        <Text className="font-ui-med text-[13px] text-glow">{day}</Text>
        <View className="w-full aspect-square max-h-[38px] rounded-[8px] bg-[rgba(31,24,56,0.55)] border border-surface-2 items-center justify-center">
          <Glyph name={reasonToGlyph(reason)} size={15} color="#B8B0CC" />
        </View>
      </Pressable>
    );
  }

  if (state === 'celebrate') {
    // Score ≥ 75: gold fill, ring, dark text. Design language calls this
    // "the user's payoff for searching."
    return (
      <Pressable onPress={onPress} style={styles.cellSlot}>
        <Text className="font-ui-med text-[13px] text-cream">{day}</Text>
        <View
          className="w-full aspect-square max-h-[38px] rounded-[8px] items-center justify-center"
          style={[{ backgroundColor: '#E5C77D' }, CELEBRATE_RING]}>
          <Text
            className="font-ui-semi text-[11px]"
            style={{ color: '#0F0A1F' }}>
            {score}
          </Text>
        </View>
      </Pressable>
    );
  }

  // 'viable' — score 1-74. Color picked from the gradient bucket; score
  // visible regardless of grade. Caution-tier days (40-59) get a dimmer
  // purple; fair (60-74) gets brighter; no asterisks anywhere — the design
  // language treats every non-blocked scored day as "viable".
  return (
    <Pressable onPress={onPress} style={styles.cellSlot}>
      <Text className="font-ui-med text-[13px] text-cream">{day}</Text>
      <View
        className="w-full aspect-square max-h-[38px] rounded-[8px] items-center justify-center"
        style={{ backgroundColor: viableCellBg(score) }}>
        <Text className="font-ui-semi text-[11px]" style={{ color: '#FFFFFF' }}>
          {score}
        </Text>
      </View>
    </Pressable>
  );
}

// Info-only filter pill — count of days in a viable bucket. Phase 2 wires
// these to a filter state that dims non-matching cells.
function ViableFilterPill({ label, count }) {
  return (
    <View className="flex-row items-center gap-[6px] py-1 px-3 rounded-full border border-soft">
      <Text className="font-ui-med text-[12px] text-cream">{label}</Text>
      <Text className="font-ui text-[12px] text-subtle">·</Text>
      <Text className="font-ui-semi text-[12px] text-primary-glow">{count}</Text>
    </View>
  );
}

function TogglePill({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
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
  const { t } = useTranslation('calendar');
  // Reason copy comes from voice:reason (A7) via FRIENDLY_REASON; the CHROME
  // fallback here covers unknown/permissive reason ids.
  const friendly = FRIENDLY_REASON[sheet.reason] || {
    title: t('sheet.fallbackTitle'),
    body: t('sheet.fallbackBody'),
  };
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
            <Text className="font-ui-semi text-[11px] text-subtle tracking-[0.8px]">{t('sheet.dayLabel', { day: sheet.day })}</Text>
            <Text className="font-display-reg text-[20px] leading-[26px] text-cream mt-1">
              {friendly.title}
            </Text>
          </View>
        </View>
        <Text className="font-ui text-[14px] leading-5 text-muted mt-[14px]">{friendly.body}</Text>
        <View className="mt-5">
          <SecondaryButton onPress={onClose} style={{ width: '100%' }}>
            {t('sheet.gotIt')}
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
