import type { VersionPolicy } from '@inceptio/shared-types';
import { evaluateUpdateState, type UpdateReason, type UpdateState } from './decision';

export type GateSnapshot = { state: UpdateState; reason: UpdateReason | 'pending' };
export type CheckReason = 'mount' | 'foreground' | 'poll' | 'manual';

export type ControllerOptions = {
  installed: string | null;
  platform: 'ios' | 'android';
  fetchPolicy: () => Promise<VersionPolicy | null>;
  pollMs?: number;     // default 60_000
  throttleMs?: number; // default 60_000
  now?: () => number;  // injectable clock (default Date.now)
};

export type UpdateGateController = {
  getSnapshot: () => GateSnapshot;
  subscribe: (listener: () => void) => () => void;
  check: (reason: CheckReason) => Promise<void>;
  recheck: () => Promise<void>; // manual (Retry button) — never throttled
  dispose: () => void;
};

const PENDING: GateSnapshot = { state: 'none', reason: 'pending' };

export function createUpdateGateController(opts: ControllerOptions): UpdateGateController {
  const pollMs = opts.pollMs ?? 60_000;
  const throttleMs = opts.throttleMs ?? 60_000;
  const now = opts.now ?? (() => Date.now());

  let snapshot: GateSnapshot = PENDING;
  let lastCheckAt = 0;
  let inFlight: Promise<void> | null = null;
  let pollHandle: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();

  const gated = () => snapshot.state === 'force';
  const emit = () => { for (const l of listeners) l(); };

  function setSnapshot(next: GateSnapshot) {
    if (next.state === snapshot.state && next.reason === snapshot.reason) return;
    snapshot = next;
    emit();
  }

  function stopPoll() { if (pollHandle) { clearTimeout(pollHandle); pollHandle = null; } }
  function ensurePoll() {
    if (pollHandle) return;
    pollHandle = setTimeout(() => { pollHandle = null; void check('poll'); }, pollMs);
  }

  async function runFetch(reason: CheckReason): Promise<void> {
    const policy = await opts.fetchPolicy();
    // Throttle baseline tracks only foreground re-checks (the sole throttled
    // surface). Mount/poll/manual must not poison the window, or the first
    // foreground after mount would be spuriously throttled.
    if (reason === 'foreground') lastCheckAt = now();
    if (policy === null) {
      // FAIL-OPEN: never create or clear a gate on a failed fetch. If pending,
      // resolve to 'none' (let in). If already forced, KEEP it (no bypass).
      if (snapshot.reason === 'pending') setSnapshot({ state: 'none', reason: 'unparseable_policy' });
    } else {
      const d = evaluateUpdateState(opts.installed, policy, opts.platform);
      setSnapshot({ state: d.state, reason: d.reason });
    }
    // Manage the while-gated poll.
    if (gated()) ensurePoll(); else stopPoll();
  }

  function check(reason: CheckReason): Promise<void> {
    // Throttle ONLY foreground re-checks while NOT gated. Mount/poll/manual and
    // any check while gated are never throttled (kill-switch must reach gated
    // users fastest).
    if (reason === 'foreground' && !gated() && now() - lastCheckAt < throttleMs) {
      return Promise.resolve();
    }
    if (inFlight) return inFlight; // in-flight dedup
    inFlight = runFetch(reason).finally(() => { inFlight = null; });
    return inFlight;
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
    check,
    recheck: () => check('manual'),
    dispose: () => { stopPoll(); listeners.clear(); },
  };
}
