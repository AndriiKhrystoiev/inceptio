// Activity nouns sourced from voice spec §6.3 STATUS_PRE_WINDOW template.
// MUST match the Worker dictionary verbatim — drift breaks the contract.
// Worker side: workers/api-proxy/src/translations/dictionary/status-lines.ts
// ACTIVITY_NOUNS.
//
// Drift-prevention: the enum is enumerated against the locked voice library,
// not hand-rolled per-call. A scaffold-time mistake like
// `business_launch → 'business'` (which would drop the voice-locked noun
// "Launch") is structurally impossible because the value is sourced from
// this table, not invented at call sites.

export const ACTIVITY_NOUNS = {
  wedding:         'Wedding',
  contracts:       'Contract',
  business_launch: 'Launch',
  travel:          'Travel',
};

export function getActivityNoun(activity) {
  return ACTIVITY_NOUNS[activity] ?? 'Window';
}

// Visual tokens for ActivityPlate. Tint/ring rgba literals at scaffold-time
// MUST promote to theme.js semantic tokens before wire-in per the README's
// "Before wire-in" section.
export const ACTIVITY_DISPLAY = {
  wedding:         { emoji: '💍', tint: 'rgba(249,181,200,0.16)', ring: 'rgba(249,181,200,0.30)' },
  contracts:       { emoji: '📋', tint: 'rgba(244,193,154,0.16)', ring: 'rgba(244,193,154,0.30)' },
  business_launch: { emoji: '🚀', tint: 'rgba(229,199,125,0.16)', ring: 'rgba(229,199,125,0.30)' },
  travel:          { emoji: '✈️', tint: 'rgba(103,232,199,0.16)', ring: 'rgba(103,232,199,0.30)' },
};

/**
 * ActivityPlate — emoji-in-tinted-square used by SavedRow, InWindowCard,
 * NewWindowCard.
 *
 * Props:
 *   activity — Activity enum value
 *   size     — pixel size (default 32)
 */
import React from 'react';
import { View, Text } from 'react-native';

export function ActivityPlate({ activity, size = 32 }) {
  const a = ACTIVITY_DISPLAY[activity] || ACTIVITY_DISPLAY.wedding;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 9,
        backgroundColor: a.tint,
        borderWidth: 1,
        borderColor: a.ring,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontSize: size * 0.5 }}>{a.emoji}</Text>
    </View>
  );
}
