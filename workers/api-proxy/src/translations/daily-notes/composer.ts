import type { Activity, MoonPhase } from '@inceptio/shared-types';
import {
  getSeverityHint,
  type SeverityCondition,
} from '../dictionary/severity-hints';
import type { DailyNoteOutput, Locale } from '../types';
import type { PickResult } from './picker';

/**
 * Composer — bridges the picker output (sky-shape entry selection) to the
 * /daily-note response's `daily_note` field.
 *
 * Why a composer exists separate from the picker:
 *   - The picker is intentionally activity-agnostic. The same Mercury-
 *     retrograde sky selects `closed-mercury-retrograde` whether the user
 *     is planning a wedding, a contract, a launch, or a trip.
 *   - Activity-asymmetric clarification (the severity_hint) is layered on
 *     HERE so the picker stays a pure sky → entry function. Keeps the
 *     selection logic testable without an activity matrix.
 *
 * The composer does three things:
 *   1. Pass through the PickResult fields verbatim.
 *   2. Attach the backend-computed moon_phase.
 *   3. When the picked entry maps to an asymmetric exclusion condition,
 *      attach an activity-specific severity_hint from the dictionary.
 *
 * Asymmetric entry → SeverityCondition mapping (voice spec §3.3):
 *   closed-mercury-retrograde  → mercury_retrograde
 *   closed-venus-retrograde    → venus_retrograde
 *   closed-moon-voc            → moon_voc
 *   mixed-moon-void-until-noon → moon_voc_intraday   (pending — undefined by default)
 *
 * Entries not in this table produce no severity_hint — most days (good,
 * strong, mixed-non-voc) carry no activity-specific caveat.
 */
const ENTRY_TO_CONDITION: Record<string, SeverityCondition> = {
  'closed-mercury-retrograde': 'mercury_retrograde',
  'closed-venus-retrograde': 'venus_retrograde',
  'closed-moon-voc': 'moon_voc',
  // moon_voc_intraday is `pending_astrologer_ruling: true` in the dictionary;
  // getSeverityHint returns undefined for pending entries without
  // includePending: true, so this mapping is wired but naturally yields no
  // severity_hint until the astrologer pass flips the pending flag.
  'mixed-moon-void-until-noon': 'moon_voc_intraday',
};

export interface ComposeDisplayableInput {
  picked: PickResult;
  moonPhase: MoonPhase;
  activity: Activity;
  /** Request locale (VOICE phase) — threaded to getSeverityHint. */
  locale: Locale;
  /**
   * True iff the route fell back to `business_launch` because the client
   * omitted `?activity=`. Drives the diagnostic warn below — when an
   * asymmetric severity_hint is composed against a fallback activity, the
   * hint may be reading the wrong activity's tone. The warn surfaces this
   * combination during the Phase A rollout so we can size the impact
   * before Phase B (Task 8.1) removes the fallback. Defaults to false for
   * call sites that haven't threaded the boolean through yet.
   */
  wasActivityFallback?: boolean;
}

/**
 * Compose the picker result + moon phase + (optional) severity hint into
 * the response shape consumed by the mobile app.
 *
 * The return shape MUST match `DailyNoteOutputSchema` in
 * `@inceptio/shared-types/api/daily-note.ts` (the mobile decoder validates
 * with that schema and treats parse failures as fatal cache-miss + retry).
 */
export function composeDisplayable(
  input: ComposeDisplayableInput,
): DailyNoteOutput {
  const { picked, moonPhase, activity, locale, wasActivityFallback = false } = input;

  const condition = ENTRY_TO_CONDITION[picked.entry_id];
  const severityHint = condition
    ? getSeverityHint(condition, activity, locale)
    : undefined;

  // Diagnostic only. The route still serves the response — we just want a
  // log signal when an asymmetric clarifier was rendered against a default
  // activity rather than a client-supplied one. Pre-Phase-B (Task 8.1)
  // mobile rollout should drive this count to zero; after that we delete
  // the fallback branch entirely.
  if (condition && wasActivityFallback) {
    console.warn('[daily-note] severity-hint composed with fallback activity:', {
      date: picked.date,
      condition,
      fallback_activity: 'business_launch',
    });
  }

  // Conditional spread keeps the field truly absent (not `severity_hint:
  // undefined`) when no hint applies — matches the optional Zod field's
  // serialization contract on the mobile side.
  return {
    mood: picked.mood,
    moon_phase: moonPhase,
    date: picked.date,
    headline: picked.headline,
    supporting: picked.supporting,
    ...(picked.exclusion_reason !== undefined
      ? { exclusion_reason: picked.exclusion_reason }
      : {}),
    entry_id: picked.entry_id,
    used_fallback: picked.used_fallback,
    ...(severityHint !== undefined ? { severity_hint: severityHint } : {}),
  };
}
