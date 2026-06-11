import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { API_CONFIG } from '../../config/api'; // Worker baseUrl (re-used by the search client)
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
  // In __DEV__, never run a real fetch (Expo Go reports the wrong native version
  // → would spuriously gate). The gate is exercised via the simulator instead.
  const controller = useMemo(() => createUpdateGateController({
    installed: getInstalledVersion(),
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    fetchPolicy: __DEV__ ? async () => null : () => fetchPolicy(API_CONFIG.baseUrl),
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
