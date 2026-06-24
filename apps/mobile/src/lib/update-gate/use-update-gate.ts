import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { VERSION_POLICY_URL } from '../../config/api';
import { getInstalledVersion, fetchPolicy } from './update-store';
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
  // The version policy is a static JSON hosted at VERSION_POLICY_URL (set in
  // apps/mobile/.env). The gate fetches it in production only:
  //   - __DEV__ → no real fetch (Expo Go reports the wrong native version → would
  //     spuriously gate); use the dev simulator below to preview none/soft/force.
  //   - VERSION_POLICY_URL unset → inert (fail-open, never force-upgrades).
  //   - otherwise → fetch + evaluate. Every failure resolves null ≡ fail-open.
  const controller = useMemo(() => createUpdateGateController({
    installed: getInstalledVersion(),
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    fetchPolicy:
      __DEV__ || !VERSION_POLICY_URL ? async () => null : () => fetchPolicy(VERSION_POLICY_URL),
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
