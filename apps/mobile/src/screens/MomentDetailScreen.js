// 04 Moment Detail — friendly Level-2 view with factor narrative.
// Reads the same React Query cache as CalendarScreen via useElectionalSearch
// (deduped by React Query — no extra fetch). Window index comes from
// nav-params.ts, set by CalendarScreen before calling go('detail').

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
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
import MomentCardSheet from '../components/card/MomentCardSheet';
import { useElectionalSearch } from '../hooks/useElectionalSearch';
import { getLastActivity, getLastLocation, saveMoment } from '../lib/draft-store';
import { locationToRequestFields } from '../lib/location-storage';
import { friendlyMessage } from '../lib/error-messages';
import { getSelectedWindow } from '../lib/nav-params';
import { formatWindowTime, getDurationVariant, buildNarrative } from '../lib/format-window';
import { moonPhaseForIso } from '../lib/card/moon-phase';
import { activeBundle, toIntlLocale } from '../i18n/locale';
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

// Grade-word lookup (VOICE, en-only — ruling-flavored, stays English this phase).
// REVIEW: grade words carry a traditional-astrology register (favorable / move
// with care) — values pending native + astrology-literate review pre-launch.
// Nested under voice.moment.grade.*, traversed with an explicit keySeparator '.'
// (global config sets keySeparator:false).
function gradeVoice(key) {
  return i18n.t(`moment.grade.${key}`, { ns: 'voice', keySeparator: '.' });
}

// Grade → ScorePill props mapping. The `kind` names align 1:1 with
// ScorePill.STYLE_BY_KIND so colors track the API grade directly.
// API's 'good' (observed on score 75-81 windows) maps to the visual 'strong'
// tier per CLAUDE.md's score-grade calibration. Labels resolve via gradeVoice.
function gradeToScorePill(grade) {
  if (grade === 'exceptional')               return { kind: 'exceptional', label: gradeVoice('exceptional') };
  if (grade === 'strong' || grade === 'good') return { kind: 'strong',      label: gradeVoice('strong') };
  if (grade === 'fair')                       return { kind: 'fair',        label: gradeVoice('favorable') };
  if (grade === 'caution')                    return { kind: 'caution',     label: gradeVoice('caution') };
  if (grade === 'poor')                       return { kind: 'poor',        label: gradeVoice('poor') };
  // Defensive: unknown grade → neutral favorable. Should not happen with
  // the current Worker grade values, but the Zod schema is permissive.
  return { kind: 'fair', label: gradeVoice('favorable') };
}

export default function MomentDetailScreen({ go }) {
  const { t } = useTranslation('moment');
  const [showTechnical, setShowTechnical] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);

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
        <Text className="font-ui text-[14px] text-muted">{t('reading')}</Text>
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
          {t('noWindow')}
        </Text>
      </View>
    );
  }

  const displayable = w.displayable ?? {};
  const headline = displayable.headline ?? w.rationale ?? t('fallback.headline');
  const pillProps = gradeToScorePill(w.grade);

  // Time display — variant-driven, always derived from the API window
  // (no QA override; the user doesn't pick this).
  const { primary: timePrimary, secondary: timeSecondary } = formatWindowTime(w);
  const timeVariant = getDurationVariant(w.duration_minutes);

  // Narrative — 1-3 paragraphs from translated factors per design-v2.1
  const narrative = buildNarrative(w);

  const rawFactors = w.factors ?? []; // L3 technical view shows ALL raw factors

  // Weekday on its own line above the date. Split the formatters rather than
  // string-replacing ", " — that separator is en/de-style; fr ("samedi 20 juin")
  // has no comma, so a .replace would silently leave the weekday un-wrapped.
  const windowDate = (() => {
    if (!w.start) return '';
    const d = new Date(w.start);
    const loc = toIntlLocale(activeBundle());
    const weekday = new Intl.DateTimeFormat(loc, { weekday: 'long' }).format(d);
    const monthDay = new Intl.DateTimeFormat(loc, { month: 'long', day: 'numeric' }).format(d);
    return `${weekday}\n${monthDay}`;
  })();
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
    showToast(t('toast.saved'));
  }

  async function handleAddToCalendar() {
    if (!w) return;
    const result = await addWindowToCalendar(w, activity, city);
    if (result.ok) {
      showToast(t('toast.calendarAdded'));
    } else if (result.reason === 'permission') {
      showToast(t('toast.calendarDenied'), 'warn');
    } else {
      showToast(t('toast.calendarError', { message: result.message }), 'warn');
    }
  }

  const handleShare = () => setCardOpen(true);

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
            <IconBtn onPress={() => go('calendar')} label={t('common:back')}>
              <ArrowLeft color="#F5EFE4" size={22} strokeWidth={1.5} />
            </IconBtn>
            {/* Single share affordance: the footer Save/Share action row (below).
                The header keeps just Back; the inert top-right share icon is gone. */}
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
              <Moon phase={w?.start ? moonPhaseForIso(w.start) : 'waxing-crescent'} size={64} />
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
          <Text className="font-ui text-[12px] text-subtle mt-[6px]">{t('scoreCaption')}</Text>
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
          <Text className="font-ui-med text-[13px] text-muted">{t('whyThis')}</Text>
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
                <Text className="font-ui-med text-[14px] text-muted">{t('seeTechnical')}</Text>
                <ChevronRight color="#B8B0CC" size={14} strokeWidth={1.5} />
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* L3 Technical view — factor_id, weight_class, status, contribution, observation, details */}
      {showTechnical && (
        <View className="px-6 pt-8">
          <Text className="font-ui-med text-[13px] text-muted">{t('technicalTitle')}</Text>
          <View className="mt-4 gap-4">
            {rawFactors.length === 0 ? (
              <Text className="font-ui text-base leading-[26px] text-cream">
                {t('technical.noFactors')}
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
              <Text className="font-ui-med text-[14px] text-muted">{t('backToSummary')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View className="px-6 mt-12">
        <PrimaryButton onPress={handleAddToCalendar}>{t('addToCalendar')}</PrimaryButton>
        <View className="flex-row gap-2 mt-3">
          <SecondaryButton
            style={{ flex: 1 }}
            icon={<Bookmark color="#F5EFE4" size={16} strokeWidth={1.5} />}
            onPress={handleSave}>
            {t('common:save')}
          </SecondaryButton>
          <SecondaryButton
            style={{ flex: 1 }}
            icon={<Share2 color="#F5EFE4" size={16} strokeWidth={1.5} />}
            onPress={handleShare}>
            {t('common:share')}
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
    <MomentCardSheet
      visible={cardOpen}
      onClose={() => setCardOpen(false)}
      window={w}
      activity={activity}
      showToast={showToast}
    />
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
