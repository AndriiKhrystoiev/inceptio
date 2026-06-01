// 01 Today — daily-note hero + Find-a-moment CTA.
// "Best windows ahead" dropped per design memo Layer 5 (info-density vs
// ritual + upstream credit budget). Forward-window browsing lives on
// Calendar.
//
// StatePicker retained as design QA override for the four mood variants.
// Letter prefixes (A·/B·/C·/D·) are dev-tool affordances, not user-facing
// copy — don't "fix" in a voice pass. Load-bearing in Maestro
// 04-daily-note-tour.yaml sentinel.

import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useDailyNote } from '../hooks/useDailyNote';
import DailyNoteSection from '../components/daily-note/DailyNoteSection';
import DailyHero, { LoadingHero, ErrorHero } from '../components/daily-note/DailyHero';
import StatePicker from '../components/StatePicker';
import PrimaryButton from '../components/PrimaryButton';
import { getSavedMoments } from '../lib/draft-store';

export default function TodayScreen({ go }) {
  const { data, isLoading, isError, error, refetch } = useDailyNote();
  const [moodOverride, setMoodOverride] = useState(null);

  if (isLoading) return <LoadingHero/>;
  if (isError) return <ErrorHero error={error} onRetry={refetch}/>;

  const dailyNote = data.response.daily_note;
  const renderedMood = moodOverride ?? dailyNote.mood;
  const savedMomentsCount = getSavedMoments().length;

  return (
    <ScrollView className="flex-1 bg-base" contentContainerStyle={{ paddingBottom: 120 }}>
      <DailyNoteSection
        dailyNote={{ ...dailyNote, mood: renderedMood }}
        savedMomentsCount={savedMomentsCount}
        onInvitePress={() => go('picker')}
      />

      <StatePicker
        value={renderedMood}
        onChange={setMoodOverride}
        options={[
          ['strong', 'A · strong'],
          ['good',   'B · good'],
          ['mixed',  'C · mixed'],
          ['closed', 'D · closed'],
        ]}
      />

      <View className="px-6 mt-7">
        <PrimaryButton onPress={() => go('picker')}>Find a moment for…</PrimaryButton>
      </View>
    </ScrollView>
  );
}
