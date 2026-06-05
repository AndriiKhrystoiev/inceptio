// Pluggable share-action seam (spec §9). ShareResult mirrors the existing
// CalendarResult discriminated-union idiom (lib/calendar-export.ts).
import type { RefObject } from 'react';

export type ShareResult =
  | { ok: true }
  | { ok: false; reason: 'cancelled' | 'unavailable' | 'capture-failed' | 'error'; message: string };

export interface ShareProvider {
  id: string;
  // Captures the referenced card view and hands it to the platform. The ref is
  // the on-screen MomentCard (its rendered output IS the capture source).
  share(cardRef: RefObject<unknown>, opts: { dialogTitle?: string }): Promise<ShareResult>;
}
