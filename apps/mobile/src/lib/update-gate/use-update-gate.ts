import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { getInstalledVersion } from './update-store';
import { createUpdateGateController } from './controller';
import type { UpdateState } from './decision';

export type UseUpdateGate = {
  state: UpdateState;
  pending: boolean;
  recheck: () => Promise<void>;
  // Current-platform store fields, lifted from the snapshot.
  storeUrl: string | null;
  latestVersion: string | null;
  // __DEV__ simulator surface (no-op in prod):
  devOverride: UpdateState | null;
  setDevOverride: (s: UpdateState | null) => void;
};

export function useUpdateGate(): UseUpdateGate {
  // The /version-policy endpoint was dropped with the Cloudflare Worker
  // (decision log "direct-api") — api-public has no such route, so calling it
  // only produced a 404 per launch. Until a version policy is reintroduced
  // (e.g. a static hosted JSON, rewiring update-store.ts#fetchPolicy at it),
  // the gate is INERT: fetchPolicy always resolves null ≡ fail-open, so the app
  // never force-upgrades and makes no network call. (Was already null in __DEV__;
  // now null in production too.)
  const controller = useMemo(() => createUpdateGateController({
    installed: getInstalledVersion(),
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    fetchPolicy: async () => null,
  }), []);

  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

  // Mount check + AppState true-bg→active re-check.
  const prevState = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    if (!__DEV__) void controller.check('mount');
    const sub = AppState.addEventListener('change', (next) => {
      const wasBackground = prevState.current === 'background';
      prevState.current = next;
      if (next === 'active' && wasBackground && !__DEV__) void controller.check('foreground');
    });
    return () => { sub.remove(); controller.dispose(); };
  }, [controller]);

  const [devOverride, setDevOverride] = useState<UpdateState | null>(null);
  const state = __DEV__ && devOverride ? devOverride : snapshot.state;

  return {
    state,
    pending: snapshot.reason === 'pending',
    recheck: controller.recheck,
    storeUrl: snapshot.storeUrl,
    latestVersion: snapshot.latestVersion,
    devOverride,
    setDevOverride,
  };
}
