// 04 Moment Detail — friendly Level-2 view with factor narrative.
// Reads the same React Query cache as CalendarScreen via useElectionalSearch
// (deduped by React Query — no extra fetch). Window index comes from
// nav-params.ts, set by CalendarScreen before calling go('detail').

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Share2, ChevronRight, Bookmark } from 'lucide-react-native';
import HeroGradient from '../components/HeroGradient';
import Starfield from '../components/Starfield';
import IconBtn from '../components/IconBtn';
import Moon from '../components/Moon';
import ScorePill from '../components/ScorePill';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import StatusLine from '../components/StatusLine';
import Pulse from '../components/Pulse';
import Toast from '../components/Toast';
import { useElectionalSearch } from '../hooks/useElectionalSearch';
import { getLastActivity, getLastLocation, saveMoment } from '../lib/draft-store';
import { locationToRequestFields } from '../lib/location-storage';
import { friendlyMessage } from '../lib/error-messages';
import { getSelectedWindow } from '../lib/nav-params';
import { formatWindowTime, getDurationVariant, buildNarrative } from '../lib/format-window';
import { addWindowToCalendar } from '../lib/calendar-export';

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

// Grade → ScorePill props mapping. The `kind` names align 1:1 with
// ScorePill.STYLE_BY_KIND so colors track the API grade directly.
// API's 'good' (observed on score 75-81 windows) maps to the visual 'strong'
// tier per CLAUDE.md's score-grade calibration.
function gradeToScorePill(grade) {
  if (grade === 'exceptional')               return { kind: 'exceptional', label: 'Exceptional moment' };
  if (grade === 'strong' || grade === 'good') return { kind: 'strong',      label: 'Highly favorable' };
  if (grade === 'fair')                       return { kind: 'fair',        label: 'Favorable' };
  if (grade === 'caution')                    return { kind: 'caution',     label: 'Move with care' };
  if (grade === 'poor')                       return { kind: 'poor',        label: 'Not recommended' };
  // Defensive: unknown grade → neutral favorable. Should not happen with
  // the current Worker grade values, but the Zod schema is permissive.
  return { kind: 'fair', label: 'Favorable' };
}

export default function MomentDetailScreen({ go }) {
  const [showTechnical, setShowTechnical] = useState(false);

  // The window the user tapped on Today/Calendar — set via nav-params before
  // navigation. Captured once at mount so this screen renders the same window
  // even if the caller mutates nav-params later (e.g. user backs out).
  const selectedWindow = useMemo(() => getSelectedWindow(), []);

  // Defensive fallback: if MomentDetail is reached without a selected window
  // (e.g. tab-bar deep entry, or future entry points), fetch the 30-day search
  // and pick its first window. Skipped when we already have one — saves the
  // roundtrip and guarantees the user sees the window they tapped.
  const request = useMemo(
    () => (selectedWindow ? null : buildRequest()),
    [selectedWindow],
  );
  const { data: result, isLoading, isError, error } = useElectionalSearch(
    request ?? {},
  );

  const envelope = result?.envelope;
  const topWindows = envelope?.data?.top_windows ?? [];
  const w = selectedWindow ?? topWindows[0];

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

  // Time display — variant-driven, always derived from the API window
  // (no QA override; the user doesn't pick this).
  const { primary: timePrimary, secondary: timeSecondary } = formatWindowTime(w);
  const timeVariant = getDurationVariant(w.duration_minutes);

  // Narrative — 1-3 paragraphs from translated factors per design-v2.1
  const narrative = buildNarrative(w);

  const rawFactors = w.factors ?? []; // L3 technical view shows ALL raw factors

  const windowDate = w.start
    ? new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
        .format(new Date(w.start))
        .replace(', ', ',\n')
    : '';
  const city = getLastLocation()?.city ?? FALLBACK_LOCATION.city;

  // Toast state — single message at a time. Toast component handles its own
  // fade-in/hold/fade-out timing; we just provide message + onDismiss.
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, tone = 'neutral') => {
    // Replace any in-flight toast immediately. Toast component restarts its
    // own animation on message change.
    setToast({ message, tone, key: Date.now() });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  // Activity flows here from either the original draft (if reached via the
  // picker chain) or getLastActivity (defensive fallback). Keep one source.
  const activity = (request?.activity ?? getLastActivity() ?? 'wedding');

  function handleSave() {
    if (!w) return;
    saveMoment({
      id: `${w.start}_${activity}`,
      activity,
      city,
      start: w.start,
      end: w.end,
      duration_minutes: w.duration_minutes,
      score: w.score,
      grade: w.grade,
      headline,
      saved_at: new Date().toISOString(),
    });
    showToast('Saved to Your moments');
  }

  async function handleAddToCalendar() {
    if (!w) return;
    const result = await addWindowToCalendar(w, activity, city);
    if (result.ok) {
      showToast('Added to your phone calendar');
    } else if (result.reason === 'permission') {
      showToast('Calendar access denied. Enable it in Settings.', 'warn');
    } else {
      showToast(`Couldn't add: ${result.message}`, 'warn');
    }
  }

  async function handleShare() {
    if (!w) return;
    const startDate = new Date(w.start);
    const dateStr = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(startDate);
    const message =
      `${headline}\n\n` +
      `${dateStr} · ${city}\n` +
      `Score: ${w.score} / 100\n\n` +
      `Found via Inceptio.`;
    try {
      await Share.share({ message });
      // Share sheet itself confirms success; no toast on the happy path.
    } catch (err) {
      showToast("Couldn't open the share sheet.", 'warn');
    }
  }

  return (
    // Wrap in a flex View so the Toast can be a sibling of the ScrollView —
    // Toast inside a ScrollView would scroll along with the content instead
    // of floating at a fixed screen position.
    <View className="flex-1">
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
                  <TimeLine primary={timePrimary} variant={timeVariant} />
                  <Text className="font-ui text-base leading-6 text-muted">{city}</Text>
                  {timeSecondary && (
                    <Text className="font-ui italic text-[14px] text-gold-glow mt-2">{timeSecondary}</Text>
                  )}
                </View>
              </View>
              <Moon phase="waxing-crescent" size={64} />
            </View>
          </View>
        </SafeAreaView>
      </View>

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

      {/* Narrative — L2: 1-3 paragraphs picked from translated factors.
          buildNarrative handles all the picking logic (status filter,
          weight_class filter for fails, synthetic-window fallback). */}
      {!showTechnical && (
        <View className="px-6 pt-8">
          <Text className="font-ui-med text-[13px] text-muted">Why this moment</Text>
          <View className="mt-4 gap-4">
            {narrative.length > 0 ? (
              narrative.map((p, i) => (
                <Text key={i} className="font-ui text-base leading-[26px] text-cream">
                  {p}
                </Text>
              ))
            ) : (
              <Text className="font-ui text-base leading-[26px] text-cream">{headline}</Text>
            )}
          </View>

          {/* Hide the L3 disclosure when there are no raw factors — synthetic
              windows from heatmap cells without a top_windows[] entry have
              w.factors === [], so opening L3 would show a blank page. */}
          {rawFactors.length > 0 && (
            <View className="items-center mt-8">
              <Pressable
                onPress={() => setShowTechnical(true)}
                className="flex-row items-center gap-[6px] p-2">
                <Text className="font-ui-med text-[14px] text-muted">See technical details</Text>
                <ChevronRight color="#B8B0CC" size={14} strokeWidth={1.5} />
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* L3 Technical view — factor_id, weight_class, status, contribution, observation, details */}
      {showTechnical && (
        <View className="px-6 pt-8">
          <Text className="font-ui-med text-[13px] text-muted">Technical details</Text>
          <View className="mt-4 gap-4">
            {rawFactors.length === 0 ? (
              <Text className="font-ui text-base leading-[26px] text-cream">
                No factor data is available for this day. The summary view shows everything we have.
              </Text>
            ) : (
              rawFactors.map((f, i) => (
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
              ))
            )}
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
        <PrimaryButton onPress={handleAddToCalendar}>Add to phone calendar</PrimaryButton>
        <View className="flex-row gap-2 mt-3">
          <SecondaryButton
            style={{ flex: 1 }}
            icon={<Bookmark color="#F5EFE4" size={16} strokeWidth={1.5} />}
            onPress={handleSave}>
            Save
          </SecondaryButton>
          <SecondaryButton
            style={{ flex: 1 }}
            icon={<Share2 color="#F5EFE4" size={16} strokeWidth={1.5} />}
            onPress={handleShare}>
            Share
          </SecondaryButton>
        </View>
      </View>

    </ScrollView>
    {toast && (
      <Toast
        key={toast.key}
        message={toast.message}
        tone={toast.tone}
        onDismiss={dismissToast}
      />
    )}
    </View>
  );
}

function TimeLine({ primary, variant }) {
  // Long windows and synthetic/unknown read calmly — body weight cream.
  // Single/short/medium emphasise the time in gold (the design lights up
  // narrower windows to convey "you have to be there").
  if (variant === 'long' || variant === 'unknown') {
    return (
      <Text className="font-ui text-base leading-6 text-cream">{primary}</Text>
    );
  }
  return (
    <Text className="font-ui-semi text-base leading-6 text-gold-glow">{primary}</Text>
  );
}
