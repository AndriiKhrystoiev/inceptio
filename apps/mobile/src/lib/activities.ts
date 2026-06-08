import type { Activity } from '@inceptio/shared-types';
import i18n from 'i18next';

// Canonical activity display data for the mobile app. Mirrors the activity
// label / noun / emoji / theme-token / eyebrow-phrase needs of UI surfaces.
//
// INTENTIONAL DIVERGENCE from Worker's status-line dictionary
// (`workers/api-proxy/src/translations/dictionary/status-lines.ts`): the Worker
// holds Title Case display nouns (`Wedding`, `Contract`, `Launch`, `Travel`)
// used internally to compose status-line templates like
// `"{activity_noun} window — tomorrow."`. This module's ACTIVITY_NOUNS is the
// **sentence-context** map used in user-facing eyebrow / scaffold prose like
// `"for your journey"`. The semantic shift `travel → 'journey'` is deliberate —
// it pairs with OnboardingScreen's existing poetic copy
// ("a wedding, a launch, a journey, a fresh page"). Do NOT add a sync test
// asserting the two maps match — they are not mirrors, they are two distinct
// canonical sources for two distinct surfaces.

export const ACTIVITY_LABELS: Record<Activity, string> = {
  wedding: 'Wedding',
  contracts: 'Contract',
  business_launch: 'Business launch',
  travel: 'Travel',
};

export const ACTIVITY_NOUNS: Record<Activity, string> = {
  wedding: 'wedding',
  contracts: 'contract',
  business_launch: 'launch',
  travel: 'journey',
};

export const ACTIVITY_EMOJI: Record<Activity, string> = {
  wedding: '💍',
  contracts: '📝',
  business_launch: '🚀',
  travel: '🧭',
};

// Theme-token-bound tint + ring utility classes. The underlying color names
// in tailwind.config.js are the bare slugs (e.g. 'wedding-tint'). Tailwind
// auto-generates bg-wedding-tint / border-wedding-ring utilities from those
// bare names. Task 1.3 adds the actual token definitions.
export const ACTIVITY_DISPLAY: Record<Activity, { tint: string; ring: string }> = {
  wedding:         { tint: 'bg-wedding-tint',         ring: 'border-wedding-ring' },
  contracts:       { tint: 'bg-contracts-tint',       ring: 'border-contracts-ring' },
  business_launch: { tint: 'bg-business-launch-tint', ring: 'border-business-launch-ring' },
  travel:          { tint: 'bg-travel-tint',          ring: 'border-travel-ring' },
};

// Eyebrow / activity-line copy. Voice spec §3.5 (2026-06-02) owns the canonical
// wording — these mirror it exactly. When voice spec ships a revision (astrologer
// review or copy refinement), update both surfaces in the same PR.
export const ACTIVITY_EYEBROW_PHRASES: Record<Activity, string> = {
  wedding:         'for your wedding',
  contracts:       'for your contracts',
  business_launch: 'for your launch',
  travel:          'for your travels',
};

// Short descriptive subtitles shown beneath the activity title in card layouts.
// Copy is verbatim from ActivityPickerScreen's CARDS constant — do not paraphrase.
// When copy changes, update ActivityPickerScreen.js and this map in the same PR.
export const ACTIVITY_SUBTITLES: Record<Activity, string> = {
  wedding:         'Lasting commitments and unions',
  contracts:       'Important signatures and deals',
  business_launch: 'New ventures and openings',
  travel:          'Journeys and relocations',
};

// Inline rgba tint values for card backgrounds and emoji icon squares.
// These intentionally match ActivityPickerScreen's CARDS tint/tintDeep values
// so both pickers render identically. Kept as raw strings (not Tailwind tokens)
// because Tailwind's purge pass can't see dynamically constructed rgba strings,
// and these colors need fractional opacity that Tailwind tokens don't expose.
export const ACTIVITY_TINTS: Record<Activity, { tint: string; tintDeep: string }> = {
  wedding:         { tint: 'rgba(249,181,200,0.10)', tintDeep: 'rgba(249,181,200,0.18)' },
  contracts:       { tint: 'rgba(244,193,154,0.10)', tintDeep: 'rgba(244,193,154,0.18)' },
  business_launch: { tint: 'rgba(229,199,125,0.10)', tintDeep: 'rgba(229,199,125,0.18)' },
  travel:          { tint: 'rgba(103,232,199,0.10)', tintDeep: 'rgba(103,232,199,0.18)' },
};

// Getters resolve through the i18next singleton at CALL time (not module-load),
// so a locale switch is honored. The English const maps stay as `defaultValue`
// fallbacks: en resolves correctly, and nothing crashes if a key is missing or
// i18n hasn't initialized yet (pre-init the const map is returned directly).
export function getActivityLabel(activity: Activity): string {
  return i18n.isInitialized
    ? i18n.t('activity:label.' + activity, { defaultValue: ACTIVITY_LABELS[activity] })
    : ACTIVITY_LABELS[activity];
}

export function getActivityNoun(activity: Activity): string {
  return i18n.isInitialized
    ? i18n.t('activity:noun.' + activity, { defaultValue: ACTIVITY_NOUNS[activity] })
    : ACTIVITY_NOUNS[activity];
}

export function getActivityEyebrowPhrase(activity: Activity): string {
  return i18n.isInitialized
    ? i18n.t('activity:eyebrow.' + activity, { defaultValue: ACTIVITY_EYEBROW_PHRASES[activity] })
    : ACTIVITY_EYEBROW_PHRASES[activity];
}

export function getActivitySubtitle(activity: Activity): string {
  return i18n.isInitialized
    ? i18n.t('activity:subtitle.' + activity, { defaultValue: ACTIVITY_SUBTITLES[activity] })
    : ACTIVITY_SUBTITLES[activity];
}
