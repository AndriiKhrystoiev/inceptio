import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createUpdateGateController } from '../controller';
import type { VersionPolicy } from '@inceptio/shared-types';

const url = 'https://apps.apple.com/app/id1';
const forcePolicy: VersionPolicy = { forceEnabled: true, ios: { minVersion: '2.0.0', latestVersion: '2.0.0', storeUrl: url } };
const okPolicy: VersionPolicy = { forceEnabled: true, ios: { minVersion: '1.0.0', latestVersion: '1.0.0', storeUrl: url } };

function make(fetchImpl: () => Promise<VersionPolicy | null>) {
  const fetchPolicy = vi.fn(fetchImpl);
  const c = createUpdateGateController({
    installed: '1.0.0', platform: 'ios', fetchPolicy, pollMs: 60_000, throttleMs: 60_000,
  });
  return { c, fetchPolicy };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.runOnlyPendingTimers(); vi.useRealTimers(); });

describe('update-gate controller', () => {
  it('fail-open entry: a failed first fetch never creates a gate', async () => {
    const { c } = make(async () => null);
    await c.check('mount');
    expect(c.getSnapshot().state).toBe('none');
  });

  it('enters force only on a successful fetch', async () => {
    const { c } = make(async () => forcePolicy);
    await c.check('mount');
    expect(c.getSnapshot().state).toBe('force');
  });

  it('persistence: a failed re-check does NOT clear an active force', async () => {
    let policy: VersionPolicy | null = forcePolicy;
    const { c } = make(async () => policy);
    await c.check('mount');
    expect(c.getSnapshot().state).toBe('force');
    policy = null; // go offline
    await c.check('foreground');
    expect(c.getSnapshot().state).toBe('force'); // stays gated
  });

  it('exit: a successful non-force re-check clears the gate', async () => {
    let policy: VersionPolicy | null = forcePolicy;
    const { c } = make(async () => policy);
    await c.check('mount');
    policy = okPolicy; // kill-switch / fixed
    await c.check('foreground');
    expect(c.getSnapshot().state).toBe('none');
  });

  it('throttle when NOT gated: a 2nd foreground within throttleMs is skipped', async () => {
    const { c, fetchPolicy } = make(async () => okPolicy);
    await c.check('mount');          // 1 (none)
    await c.check('foreground');     // 2
    await c.check('foreground');     // skipped (within 60s)
    expect(fetchPolicy).toHaveBeenCalledTimes(2);
  });

  it('NO throttle when gated: every foreground re-checks', async () => {
    const { c, fetchPolicy } = make(async () => forcePolicy);
    await c.check('mount');          // 1 (force)
    await c.check('foreground');     // 2
    await c.check('foreground');     // 3 — gated → not throttled
    expect(fetchPolicy).toHaveBeenCalledTimes(3);
  });

  it('polls while gated and stops after clear', async () => {
    let policy: VersionPolicy | null = forcePolicy;
    const { c, fetchPolicy } = make(async () => policy);
    await c.check('mount');                 // 1 (force) → poll scheduled
    await vi.advanceTimersByTimeAsync(60_000); // poll → 2
    expect(fetchPolicy).toHaveBeenCalledTimes(2);
    policy = okPolicy;
    await vi.advanceTimersByTimeAsync(60_000); // poll → 3, clears, stops polling
    expect(c.getSnapshot().state).toBe('none');
    await vi.advanceTimersByTimeAsync(120_000); // no more polls
    expect(fetchPolicy).toHaveBeenCalledTimes(3);
    c.dispose();
  });

  it('dedups concurrent checks into one fetch', async () => {
    let resolve!: (p: VersionPolicy | null) => void;
    const { c, fetchPolicy } = make(() => new Promise((r) => { resolve = r; }));
    const a = c.check('mount');
    const b = c.check('foreground');
    resolve(okPolicy);
    await Promise.all([a, b]);
    expect(fetchPolicy).toHaveBeenCalledTimes(1);
  });
});
