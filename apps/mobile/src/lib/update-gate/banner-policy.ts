import { MS_PER_DAY } from '../rating/eligibility';
import type { UpdateState } from './decision';

export type SoftSuppression = {
  dismissedForVersion: string | null;
  dismissedAt: string | null; // ISO
};
export type SoftBannerConfig = { cooldownDays: number };

/** N is only the cross-bump floor; per-version permanent silence does the
 *  heavy anti-nag work. 7 = "at most weekly". Post-launch dial (manual-feedback
 *  driven; no analytics in scope — spec §9.3). */
export const SOFT_BANNER_CONFIG: SoftBannerConfig = { cooldownDays: 7 };

// Native-Date elapsed days (date-fns is not installed). Reuses MS_PER_DAY from
// the rating core. A future stored timestamp yields a NEGATIVE value, which the
// `< cooldownDays` guard reads as "still cooling down" → suppress (clock-skew safe).
function elapsedDays(now: Date, storedIso: string): number {
  return (now.getTime() - new Date(storedIso).getTime()) / MS_PER_DAY;
}

export function shouldShowSoftBanner(input: {
  state: UpdateState;
  latestVersion: string;
  suppression: SoftSuppression;
  config: SoftBannerConfig;
  now: Date;
}): boolean {
  const { state, latestVersion, suppression, config, now } = input;
  if (state !== 'soft') return false;

  const { dismissedForVersion, dismissedAt } = suppression;
  // Dismissing a version silences THAT version permanently.
  if (dismissedForVersion === latestVersion) return false;
  // Global floor after any dismiss (applies across version bumps).
  if (dismissedAt !== null && elapsedDays(now, dismissedAt) < config.cooldownDays) return false;

  return true;
}
