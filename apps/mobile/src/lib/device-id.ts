import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { storage } from './storage';

const DEVICE_ID_KEY = 'inceptio.device_id';

/**
 * Stable per-device identifier used as the Worker's `X-Device-Id` header.
 *
 * Resolution order:
 *   1. MMKV cache (fastest; survives app restarts; invalidated by uninstall)
 *   2. Platform-native vendor ID (iOS) or Android ID — stable across launches
 *      but reset on factory reset / app uninstall+reinstall on iOS
 *   3. Synthetic UUID fallback (rare — emulators with no vendor ID)
 *
 * The cached value wins forever once written. We do NOT re-derive on every
 * boot because changing the device_id mid-stream would re-bucket the user's
 * rate-limit counter on the Worker.
 */
export async function getDeviceId(): Promise<string> {
  const cached = storage.getString(DEVICE_ID_KEY);
  if (cached) return cached;

  let id: string | null = null;
  if (Platform.OS === 'ios') {
    id = await Application.getIosIdForVendorAsync();
  } else if (Platform.OS === 'android') {
    id = Application.getAndroidId();
  }

  if (!id) {
    id = `inceptio_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  storage.set(DEVICE_ID_KEY, id);
  return id;
}
