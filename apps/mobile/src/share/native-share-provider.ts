// v1 provider: captureRef (view-shot ^5.1.0) → expo-sharing. Verified by the
// on-device capture smoke (Phase 0 spike proved bridgeless-iOS capture).
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import type { ShareProvider, ShareResult } from './share-provider';

export const nativeShareProvider: ShareProvider = {
  id: 'native-share',
  async share(cardRef, opts): Promise<ShareResult> {
    let uri: string;
    try {
      // result:'tmpfile' → file:// URI expo-sharing consumes directly.
      // `as never`: captureRef<T> defaults T to `any`, so RefObject<unknown>
      // isn't assignable through the generic; `never` satisfies the overload
      // without widening the call site to `any`. Intentional, not a smell.
      uri = await captureRef(cardRef as never, { format: 'png', result: 'tmpfile' });
    } catch (e) {
      return { ok: false, reason: 'capture-failed', message: (e as Error)?.message ?? String(e) };
    }
    try {
      if (!(await Sharing.isAvailableAsync())) {
        return { ok: false, reason: 'unavailable', message: 'Sharing is not available on this device.' };
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: opts.dialogTitle });
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: 'error', message: (e as Error)?.message ?? String(e) };
    }
  },
};
