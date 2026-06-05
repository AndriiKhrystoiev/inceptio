import type { ShareProviderId } from '../config/features';
import type { ShareProvider } from './share-provider';
import { nativeShareProvider } from './native-share-provider';

export function resolveShareProvider(id: ShareProviderId): ShareProvider {
  switch (id) {
    case 'native-share':
      return nativeShareProvider;
    case 'server-render':
    case 'direct-stories':
      throw new Error(`Share provider "${id}" is not implemented yet.`);
    default:
      throw new Error(`Unknown share provider "${id}".`);
  }
}
