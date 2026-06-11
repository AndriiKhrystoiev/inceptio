import { parseSemver, compareSemver, type VersionPolicy } from '@inceptio/shared-types';

export type UpdateState = 'force' | 'soft' | 'none';
export type UpdateReason =
  | 'force'
  | 'soft'
  | 'up_to_date'
  | 'force_disabled'
  | 'min_exceeds_latest'
  | 'unparseable_installed'
  | 'missing_platform'
  | 'unparseable_policy';

/** TIME-FREE, TOTAL, FAIL-OPEN. The only lockout-capable code path, and there
 *  is no OTA escape — so its only failure mode is 'none' ("let the user in").
 *  Never throws, never spuriously forces. Force is unconditional/stateless:
 *  it consults no time, cooldown, or suppression. */
export function evaluateUpdateState(
  installed: unknown,
  policy: VersionPolicy,
  platform: 'ios' | 'android',
): { state: UpdateState; reason: UpdateReason } {
  const inst = parseSemver(installed);
  if (!inst) return { state: 'none', reason: 'unparseable_installed' };

  const p = policy?.[platform];
  if (!p) return { state: 'none', reason: 'missing_platform' };

  const min = parseSemver(p.minVersion);
  const latest = parseSemver(p.latestVersion);
  if (!min || !latest) return { state: 'none', reason: 'unparseable_policy' };

  const belowLatest = compareSemver(inst, latest) < 0;

  // Incoherent policy backstop (Worker also guards this) — never force.
  if (compareSemver(min, latest) > 0) {
    return belowLatest
      ? { state: 'soft', reason: 'min_exceeds_latest' }
      : { state: 'none', reason: 'min_exceeds_latest' };
  }

  if (compareSemver(inst, min) < 0) {
    if (policy.forceEnabled) return { state: 'force', reason: 'force' };
    // Killed force degrades to a soft nudge (inst < min ≤ latest ⟹ inst < latest).
    return { state: 'soft', reason: 'force_disabled' };
  }

  if (belowLatest) return { state: 'soft', reason: 'soft' };
  return { state: 'none', reason: 'up_to_date' };
}
