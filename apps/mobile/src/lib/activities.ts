import type { Activity } from '@inceptio/shared-types';

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
