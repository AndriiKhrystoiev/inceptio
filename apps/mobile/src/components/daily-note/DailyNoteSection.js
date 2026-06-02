// DailyNoteSection — the screen-level composer used by TodayScreen.
// Combines DailyHero + DailyNoteBody + (EmptyInvite when applicable).
//
// Loading/error states are handled at the screen level via the LoadingHero
// and ErrorHero named exports of DailyHero — this component is rendered
// only when data has loaded successfully.
//
// Task 5.1: owns the ActivityLine + ActivityChangeSheet integration.
// ActivityLine is injected into DailyNoteBody's activitySlot prop so it
// renders between the date eyebrow and the headline. ActivityChangeSheet is
// appended at the tail of the render tree (outside DailyHero) so the Modal
// is not nested inside a scroll/backdrop context.
//
// State: changeOpen lives here (not in TodayScreen) because it is purely a
// UI concern of this composer — TodayScreen has no need to know about it.
// setDefaultActivity is the standalone function (not the hook setter) because
// the activity store is external; calling it triggers the useSyncExternalStore
// subscription, which propagates to useDailyNote's query key automatically.

import React, { useState, useCallback } from 'react';
import DailyHero from './DailyHero';
import DailyNoteBody from './DailyNoteBody';
import EmptyInvite from './EmptyInvite';
import { ActivityLine } from '../ActivityLine';
import { ActivityChangeSheet } from '../ActivityChangeSheet';
import { useActivityPreference, setDefaultActivity } from '../../lib/activity-preference';

/**
 * Props:
 *   dailyNote          — { mood, moon_phase, date, headline, supporting } from
 *                        the response's daily_note field. mood may be
 *                        overridden by the screen's StatePicker (design QA).
 *   savedMomentsCount  — getSavedMoments().length; controls EmptyInvite render
 *   onInvitePress      — callback for the EmptyInvite tap (typically
 *                        go('picker'))
 */
export default function DailyNoteSection({ dailyNote, savedMomentsCount, onInvitePress }) {
  const { hydrationStatus, activity } = useActivityPreference();
  const [changeOpen, setChangeOpen] = useState(false);

  const openChange = useCallback(() => setChangeOpen(true), []);
  const closeChange = useCallback(() => setChangeOpen(false), []);
  const onSelectFromTap = useCallback((next) => {
    setDefaultActivity(next);
    setChangeOpen(false);
  }, []);

  // ActivityLine is only shown once the preference store has resolved to a
  // concrete activity. While 'loading' or 'unset' the slot is null, preserving
  // the existing eyebrow → headline layout unchanged.
  const activitySlot =
    hydrationStatus === 'set' && activity ? (
      <ActivityLine activity={activity} onPress={openChange} />
    ) : null;

  return (
    <>
      <DailyHero mood={dailyNote.mood} phase={dailyNote.moon_phase}>
        <DailyNoteBody
          mood={dailyNote.mood}
          date={dailyNote.date}
          headline={dailyNote.headline}
          supporting={dailyNote.supporting}
          severityHint={dailyNote.severity_hint}
          activitySlot={activitySlot}
        />
      </DailyHero>
      {savedMomentsCount === 0 && <EmptyInvite onPress={onInvitePress}/>}
      {/* ActivityChangeSheet is rendered outside DailyHero so the Modal is not
          nested inside any scroll or backdrop context. It is always mounted
          (not gated on activity) because it self-gates via `open={changeOpen}`;
          only rendered when activity is set means it never needs to open when
          activity is null, so current prop is safe to pass. */}
      {hydrationStatus === 'set' && activity && (
        <ActivityChangeSheet
          open={changeOpen}
          current={activity}
          onSelect={onSelectFromTap}
          onClose={closeChange}
        />
      )}
    </>
  );
}
