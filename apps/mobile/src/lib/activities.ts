import type { Activity } from '@inceptio/shared-types';

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

export function getActivityLabel(activity: Activity): string {
  return ACTIVITY_LABELS[activity];
}

export function getActivityNoun(activity: Activity): string {
  return ACTIVITY_NOUNS[activity];
}

export function getActivityEyebrowPhrase(activity: Activity): string {
  return ACTIVITY_EYEBROW_PHRASES[activity];
}
