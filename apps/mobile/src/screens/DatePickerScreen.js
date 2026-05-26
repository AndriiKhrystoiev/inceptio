// 02b Date range picker — search step 2.
// Persists selected start/end via patchDraft({ start, end }).
// Tap FROM/TO to open the native date picker; presets remain as quick-select.

import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, X, ChevronRight, Calendar as CalIcon } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import PrimaryButton from '../components/PrimaryButton';
import { patchDraft, getDraft } from '../lib/draft-store';

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function addYears(date, n) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + n);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function diffDays(a, b) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// Upstream API max is 367 days (~1 year incl. leap year). We cap at 365 to
// keep the same "1 year" experience as the preset and stay comfortably under
// the upstream limit regardless of which day of which year is the start.
const MAX_RANGE_DAYS = 365;

function diffMonths(a, b) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

// Build a human-friendly duration label, mirroring the design-v2.1 "About 2 months, 5 days" example.
function durationLabel(startDate, endDate) {
  const months = diffMonths(startDate, endDate);
  const remainder = diffDays(addMonths(startDate, months), endDate);
  if (months === 0) return `About ${diffDays(startDate, endDate)} days`;
  if (remainder === 0) return `About ${months} month${months > 1 ? 's' : ''}`;
  return `About ${months} month${months > 1 ? 's' : ''}, ${remainder} day${remainder > 1 ? 's' : ''}`;
}

const FMT_FULL_DATE = new Intl.DateTimeFormat('en-US', {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
});

const PRESETS = [
  { label: 'Next month',   months: 1 },
  { label: '3 months',     months: 3 },
  { label: '6 months',     months: 6 },
  { label: '1 year',       months: 12 },
];

export default function DatePickerScreen({ go }) {
  const today = useMemo(() => new Date(), []);

  // Initialise from draft if already set, else default to 3 months.
  // Clamp a persisted draft whose range exceeds MAX_RANGE_DAYS — older builds
  // allowed unbounded ranges and may have left a 18-month draft in storage.
  const [startDate, setStartDate] = useState(() => {
    const draft = getDraft();
    return draft.start ? new Date(draft.start) : today;
  });
  const [endDate, setEndDate] = useState(() => {
    const draft = getDraft();
    if (!draft.end) return addMonths(today, 3);
    const persistedEnd = new Date(draft.end);
    const persistedStart = draft.start ? new Date(draft.start) : today;
    const maxEnd = addDays(persistedStart, MAX_RANGE_DAYS);
    if (persistedEnd > maxEnd) {
      // Sync the clamped value back to storage so a Continue without further
      // interaction sends the capped range, not the stale one.
      patchDraft({ end: isoDate(maxEnd) });
      return maxEnd;
    }
    return persistedEnd;
  });

  // Native picker state — null when closed, 'from' or 'to' when open.
  const [openPicker, setOpenPicker] = useState(null);

  function handlePickerChange(event, selected) {
    // Android: 'dismissed' fires when user taps outside / back. We never
    // mutate state on a dismissal, regardless of platform.
    if (event.type === 'dismissed' || !selected) {
      if (Platform.OS === 'android') setOpenPicker(null);
      return;
    }

    if (openPicker === 'from') {
      setStartDate(selected);
      const maxEnd = addDays(selected, MAX_RANGE_DAYS);
      // Two invariants on the end date when the start moves:
      //   1. end >= start (no negative-duration windows)
      //   2. end - start <= MAX_RANGE_DAYS (upstream caps at 367)
      // Pull endDate forward to satisfy whichever applies.
      let nextEnd = endDate;
      if (endDate < selected) nextEnd = selected;
      else if (endDate > maxEnd) nextEnd = maxEnd;
      setEndDate(nextEnd);
      patchDraft({ start: isoDate(selected), end: isoDate(nextEnd) });
    } else if (openPicker === 'to') {
      setEndDate(selected);
      patchDraft({ start: isoDate(startDate), end: isoDate(selected) });
    }

    // Android closes itself; iOS stays open until user taps "Done".
    if (Platform.OS === 'android') setOpenPicker(null);
  }

  const totalDays = diffDays(startDate, endDate);
  const isShort = totalDays < 14;
  const isLong  = totalDays > 90;

  const hint = isShort
    ? 'Shorter windows may not contain viable moments — try a wider range if results are sparse.'
    : isLong
    ? 'Looking far ahead — this may take a few seconds to compute.'
    : null;

  function applyPreset(months) {
    const newEnd = months === 12 ? addYears(today, 1) : addMonths(today, months);
    setStartDate(today);
    setEndDate(newEnd);
    patchDraft({ start: isoDate(today), end: isoDate(newEnd) });
  }

  function handleContinue() {
    patchDraft({ start: isoDate(startDate), end: isoDate(endDate) });
    go('location');
  }

  const fromLabel = FMT_FULL_DATE.format(startDate);
  const toLabel   = FMT_FULL_DATE.format(endDate);
  const durLabel  = durationLabel(startDate, endDate);
  const activity  = getDraft().activity ?? 'wedding';
  const actLabel  = activity.replace('_', ' ');

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="overflow-hidden">
        <HeroGradient height={300} />
        <Starfield density="heavy" />
        <SafeAreaView edges={['top']}>
          <View className="px-4 pt-2 flex-row items-center justify-between">
            <IconBtn onPress={() => go('picker')} label="Back">
              <ArrowLeft color="#F5EFE4" size={22} strokeWidth={1.5} />
            </IconBtn>
            <Text className="font-display text-[18px] text-cream tracking-[-0.2px]" style={{ textTransform: 'capitalize' }}>
              {actLabel} · when
            </Text>
            <IconBtn onPress={() => go('today')} label="Close">
              <X color="#F5EFE4" size={22} strokeWidth={1.5} />
            </IconBtn>
          </View>
          <View className="px-6 pt-6 pb-9">
            <Text className="font-display text-[32px] leading-[38px] tracking-[-0.3px] text-cream">
              When is your window?
            </Text>
            <Text className="font-ui text-[14px] leading-5 text-muted mt-3">
              We'll search this range for your best moments.
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <View className="px-6 pt-6 gap-3">
        <DateInput
          label="FROM"
          value={fromLabel}
          onPress={() => {
            console.warn('[DatePicker] FROM tapped');
            setOpenPicker('from');
          }}
        />
        <DateInput
          label="TO"
          value={toLabel}
          onPress={() => {
            console.warn('[DatePicker] TO tapped');
            setOpenPicker('to');
          }}
        />
      </View>

      {/* Android: system modal renders inline; no wrapper needed. */}
      {Platform.OS === 'android' && openPicker && (
        <DateTimePicker
          value={openPicker === 'from' ? startDate : endDate}
          mode="date"
          display="default"
          minimumDate={openPicker === 'to' ? startDate : new Date()}
          maximumDate={openPicker === 'to' ? addDays(startDate, MAX_RANGE_DAYS) : undefined}
          onChange={handlePickerChange}
        />
      )}

      {/* iOS: spinner-style picker inside a bottom sheet with a Done button.
          Inline styles (not NativeWind) so the sheet is guaranteed to render
          across Modal context boundaries. */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={!!openPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setOpenPicker(null)}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' }}
              onPress={() => setOpenPicker(null)}
            />
            <View style={{ backgroundColor: '#1F1838', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, borderTopWidth: 1, borderTopColor: '#3A3258' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 }}>
                <Text className="font-display-reg text-[18px] text-cream">
                  {openPicker === 'from' ? 'From' : 'To'}
                </Text>
                <Pressable
                  onPress={() => setOpenPicker(null)}
                  style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text className="font-ui-med text-[16px] text-primary-glow">Done</Text>
                </Pressable>
              </View>
              {openPicker && (
                <DateTimePicker
                  value={openPicker === 'from' ? startDate : endDate}
                  mode="date"
                  display="spinner"
                  themeVariant="dark"
                  textColor="#F5EFE4"
                  minimumDate={openPicker === 'to' ? startDate : new Date()}
          maximumDate={openPicker === 'to' ? addDays(startDate, MAX_RANGE_DAYS) : undefined}
                  onChange={handlePickerChange}
                />
              )}
            </View>
          </View>
        </Modal>
      )}

      <Text className="font-ui text-[14px] text-muted text-center mt-5">{durLabel}</Text>
      {hint && (
        <Text className="font-ui italic text-[12px] leading-[18px] text-subtle text-center mt-[10px] px-9">
          {hint}
        </Text>
      )}

      <View className="px-6 pt-8">
        <View className="flex-row items-center gap-[14px]">
          <Text className="font-ui-med text-[13px] text-muted">Or try:</Text>
          <View className="flex-1 h-px bg-soft" />
        </View>
        <View className="flex-row flex-wrap gap-2 mt-4">
          {PRESETS.map((p) => (
            <Preset key={p.label} label={p.label} onPress={() => applyPreset(p.months)} />
          ))}
        </View>
      </View>

      <Text className="font-ui text-[12px] leading-[18px] text-subtle text-center mt-10 px-6">
        {actLabel.charAt(0).toUpperCase() + actLabel.slice(1)} searches favor weekends and afternoons by default
      </Text>

      <View className="px-6 pt-8">
        <PrimaryButton onPress={handleContinue}>Continue</PrimaryButton>
      </View>
    </ScrollView>
  );
}

function DateInput({ label, value, onPress }) {
  return (
    <Pressable onPress={onPress} className="active:opacity-[0.92]">
      <LinearGradient
        colors={['#1F1838', '#2A2247']}
        style={{
          padding: 18,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#3A3258',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}>
        <CalIcon color="#B8B0CC" size={20} strokeWidth={1.5} />
        <View className="flex-1">
          <Text className="font-ui-med text-[12px] text-muted tracking-[0.8px] uppercase">{label}</Text>
          <Text className="font-display-reg text-[20px] leading-[26px] text-cream mt-1">{value}</Text>
        </View>
        <ChevronRight color="#7A7195" size={18} strokeWidth={1.5} />
      </LinearGradient>
    </Pressable>
  );
}

function Preset({ label, onPress }) {
  return (
    <Pressable onPress={onPress} className="py-2 px-[14px] rounded-pill border border-soft active:border-glow">
      <Text className="font-ui-med text-[14px] text-cream">{label}</Text>
    </Pressable>
  );
}
