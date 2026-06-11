import { createContext, useContext } from 'react';
import type { useUpdateGate } from './use-update-gate';

// ONE controller, shared: App.js calls useUpdateGate() once and provides its
// return value; TodayScreen (and any other consumer) reads it via context so
// they never spin up a second controller (which would double-fetch/poll).
export type UpdateGateValue = ReturnType<typeof useUpdateGate>;

export const UpdateGateContext = createContext<UpdateGateValue | null>(null);

export function useUpdateGateContext(): UpdateGateValue {
  const v = useContext(UpdateGateContext);
  if (!v) throw new Error('UpdateGateContext missing');
  return v;
}
