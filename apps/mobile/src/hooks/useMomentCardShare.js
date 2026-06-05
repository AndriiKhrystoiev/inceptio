// apps/mobile/src/hooks/useMomentCardShare.js
// Orchestrates: resolve provider (from FEATURES gate) → capture the card ref →
// share → surface failures via toast. The card ref is the on-screen MomentCard.
import { useCallback, useState } from 'react';
import { FEATURES } from '../config/features';
import { resolveShareProvider } from '../share/resolve-provider';

export function useMomentCardShare(showToast) {
  const [sharing, setSharing] = useState(false);

  const share = useCallback(async (cardRef) => {
    setSharing(true);
    try {
      const provider = resolveShareProvider(FEATURES.MOMENT_CARD_SHARE_PROVIDER);
      const result = await provider.share(cardRef, { dialogTitle: 'Share this moment' });
      if (!result.ok && result.reason !== 'cancelled') {
        showToast(
          result.reason === 'unavailable'
            ? 'Sharing isn’t available on this device.'
            : 'Couldn’t create the card. Please try again.',
          'warn',
        );
      }
      return result;
    } catch (e) {
      showToast('Couldn’t create the card. Please try again.', 'warn');
      return { ok: false, reason: 'error', message: String(e) };
    } finally {
      setSharing(false);
    }
  }, [showToast]);

  return { share, sharing };
}
