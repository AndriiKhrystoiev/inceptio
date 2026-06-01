// DailyNoteSection — the screen-level composer used by TodayScreen.
// Combines DailyHero + DailyNoteBody + (EmptyInvite when applicable).
//
// Loading/error states are handled at the screen level via the LoadingHero
// and ErrorHero named exports of DailyHero — this component is rendered
// only when data has loaded successfully.

import React from 'react';
import DailyHero from './DailyHero';
import DailyNoteBody from './DailyNoteBody';
import EmptyInvite from './EmptyInvite';

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
  return (
    <>
      <DailyHero mood={dailyNote.mood} phase={dailyNote.moon_phase}>
        <DailyNoteBody
          mood={dailyNote.mood}
          date={dailyNote.date}
          headline={dailyNote.headline}
          supporting={dailyNote.supporting}
        />
      </DailyHero>
      {savedMomentsCount === 0 && <EmptyInvite onPress={onInvitePress}/>}
    </>
  );
}
