// DailyHero — backdrop for the daily-note section.
//
// Composition: HeroGradient + Starfield + (mood-haloed Moon | Pulse | error).
// Three variants share the same backdrop so load→loaded→error transitions
// don't reflow the whole zone:
//
//   default export  — DailyHero        (rendered when data is loaded)
//   named LoadingHero                  (rendered while data is fetching)
//   named ErrorHero                    (rendered on fetch error)
//
// Moon halo: wraps the existing Moon primitive in a <View> with
// shadowColor/shadowOpacity/shadowRadius driven by MOOD_TOKENS. Passes
// glow={false} to Moon so its default gold halo doesn't double-draw.
// Moon.js itself stays unchanged — its other consumers (MoonRiseHeader on
// Calendar/You, OnboardingScreen, MomentDetailScreen) keep the default
// gold halo.
//
// Platform note: shadowColor paints a colored halo on iOS. Android's
// elevation falls back to a generic grey material drop-shadow, not a
// colored halo. Acceptable for MVP — halo is decorative.

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import HeroGradient from '../HeroGradient';
import Starfield from '../Starfield';
import Moon from '../Moon';
import Pulse from '../Pulse';
import { MOOD_TOKENS, haloColorSolid, parseHaloAlpha } from './mood-tokens';
import { friendlyMessage } from '../../lib/error-messages';
import { RateLimitError } from '../../lib/api';

function HeroBackdrop({ children }) {
  return (
    <View
      className="overflow-hidden pt-[60px] pb-5 px-6"
      style={{ minHeight: 260 }}>
      <HeroGradient height={300}/>
      <Starfield density="heavy"/>
      <View style={{ position: 'relative' }}>{children}</View>
    </View>
  );
}

/**
 * Default — rendered when daily-note data has loaded.
 * Props:
 *   mood     — one of 'strong' | 'good' | 'mixed' | 'closed' (drives halo/dim)
 *   phase    — one of 8 MoonPhase values (drives the moon glyph)
 *   children — DailyNoteBody (eyebrow + headline + supporting)
 */
export default function DailyHero({ mood = 'good', phase = 'waxing-crescent', children }) {
  const m = MOOD_TOKENS[mood] || MOOD_TOKENS.good;
  return (
    <HeroBackdrop>
      <View
        style={{
          position: 'absolute',
          top: -4,
          right: 0,
          opacity: m.dim ? 0.55 : 1,
          // iOS colored halo via shadow. Android falls back to grey elevation.
          ...(m.halo
            ? {
                shadowColor: haloColorSolid(m.halo),
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: parseHaloAlpha(m.halo),
                shadowRadius: 13,
                elevation: 2,
              }
            : null),
        }}>
        <Moon phase={phase} size={62} glow={false}/>
      </View>
      <View>{children}</View>
    </HeroBackdrop>
  );
}

/**
 * Named export — rendered while useDailyNote.isLoading.
 * Same backdrop, centered Pulse + text, no moon.
 */
export function LoadingHero() {
  return (
    <HeroBackdrop>
      <View className="items-center justify-center" style={{ minHeight: 160 }}>
        <Pulse/>
        <Text className="font-ui text-[14px] text-muted mt-4">
          Looking at the sky for you…
        </Text>
      </View>
    </HeroBackdrop>
  );
}

/**
 * Named export — rendered when useDailyNote.isError.
 * Same backdrop, centered friendlyMessage + retry pressable, no moon.
 */
export function ErrorHero({ error, onRetry }) {
  const isCapped = error instanceof RateLimitError;
  return (
    <HeroBackdrop>
      <View className="items-center justify-center px-4" style={{ minHeight: 160 }}>
        <Text className="font-display-reg text-[20px] leading-7 text-cream text-center">
          {friendlyMessage(error)}
        </Text>
        {!isCapped && (
          <Pressable onPress={onRetry} className="mt-3">
            <Text className="font-ui-med text-[14px] text-primary-glow">Try again</Text>
          </Pressable>
        )}
      </View>
    </HeroBackdrop>
  );
}
