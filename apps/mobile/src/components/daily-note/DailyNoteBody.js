// DailyNoteBody — the actual daily-note content rendered inside DailyHero.
//
// Layout (top → bottom):
//   eyebrow row:  6×6 mood dot (with halo shadow except closed) + date string
//   headline:     Fraunces 500 32/38 cream, max-w 300, tracking -0.02em
//   supporting:   Inter 400 15/22 muted, max-w 318, mt 12
//
// Hard maxima from voice spec §7: headline ≤ 48 chars, supporting ≤ 140.
// Awkward wraps at the limit are COPY-side fixes in the Worker dictionary,
// NOT layout fixes. The Worker lint enforces the maxes; mobile renders.

import React from 'react';
import { View, Text } from 'react-native';
import { MOOD_TOKENS, haloColorSolid, parseHaloAlpha } from './mood-tokens';
import { formatDailyEyebrow } from '../../lib/format-date';

/**
 * Props:
 *   mood           — 'strong' | 'good' | 'mixed' | 'closed' (drives dot color/halo)
 *   date           — ISO YYYY-MM-DD from daily_note.date (event tz)
 *   headline       — locked copy, ≤ 48 chars
 *   supporting     — locked copy, ≤ 140 chars
 *   severityHint   — optional activity-asymmetric clarifier from the Worker, ≤ 150
 *                    chars. Rendered after `supporting` when present. Carries the
 *                    "For a {activity}, …" framing per voice spec §3.3. text-muted
 *                    (#B8B0CC) is binding per EC-9 — do not use text-subtle.
 *   activitySlot   — optional React node rendered between the eyebrow row and the
 *                    headline. Used by DailyNoteSection (Task 5.1) to inject the
 *                    tappable ActivityLine. When absent the layout is unchanged.
 */
export default function DailyNoteBody({ mood = 'good', date, headline, supporting, severityHint, activitySlot }) {
  const m = MOOD_TOKENS[mood] || MOOD_TOKENS.good;
  const eyebrow = date ? formatDailyEyebrow(date) : '';
  return (
    <View>
      <View className="flex-row items-center" style={{ marginBottom: 12 }}>
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            backgroundColor: m.dot,
            ...(m.halo
              ? {
                  shadowColor: haloColorSolid(m.halo),
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: parseHaloAlpha(m.halo),
                  shadowRadius: 4,
                  elevation: 1,
                }
              : null),
            marginRight: 8,
          }}
        />
        <Text className="font-ui-med text-[13px] text-muted lowercase" style={{ letterSpacing: 0.4 }}>
          {eyebrow}
        </Text>
      </View>

      {/* activitySlot: injected by DailyNoteSection when hydrationStatus === 'set'.
          Null when no preference is stored — layout is unchanged in that case. */}
      {activitySlot ?? null}

      <Text
        className="font-display text-cream"
        style={{ fontSize: 32, lineHeight: 38, letterSpacing: -0.6, maxWidth: 300 }}>
        {headline}
      </Text>

      <Text
        className="font-ui text-muted"
        style={{ fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 318 }}>
        {supporting}
      </Text>

      {/* severityHint: activity-asymmetric clarifier, e.g. "For a wedding, …".
          text-muted (#B8B0CC) is binding here — EC-9 forbids text-subtle which
          fails WCAG AA against bg-deep. marginTop 8 (not 12) keeps it visually
          attached to supporting rather than floating as a separate section. */}
      {severityHint ? (
        <Text
          className="font-ui text-muted"
          style={{ fontSize: 15, lineHeight: 22, marginTop: 8, maxWidth: 318 }}>
          {severityHint}
        </Text>
      ) : null}
    </View>
  );
}
