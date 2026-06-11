import * as Application from 'expo-application';
import { VersionPolicySchema, type VersionPolicy } from '@inceptio/shared-types';
import { storage } from '../storage';
import type { SoftSuppression } from './banner-policy';

const FETCH_TIMEOUT_MS = 5000;

const K = {
  softDismissedVersion: 'update.softDismissedVersion',
  softDismissedAt: 'update.softDismissedAt',
} as const;

/** Installed NATIVE marketing version (OTA-independent). NOTE: inside Expo Go
 *  this returns Expo Go's version — correct only in a standalone/dev-client
 *  build. The __DEV__ simulator (use-update-gate) is the local-test path. */
export function getInstalledVersion(): string | null {
  return Application.nativeApplicationVersion ?? null;
}

/** GET <baseUrl>/version-policy with its OWN ~5s timeout (never reuse the 60s
 *  API_CONFIG.timeout). EVERY failure — network, timeout, non-200, bad JSON,
 *  schema mismatch — returns null ≡ fail-open. A malformed policy can never
 *  produce 'force'. */
export async function fetchPolicy(baseUrl: string): Promise<VersionPolicy | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/version-policy`, { signal: controller.signal });
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = VersionPolicySchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function loadSuppression(): SoftSuppression {
  return {
    dismissedForVersion: storage.getString(K.softDismissedVersion) ?? null,
    dismissedAt: storage.getString(K.softDismissedAt) ?? null,
  };
}

export function recordSoftDismiss(latestVersion: string, now: Date = new Date()): void {
  storage.set(K.softDismissedVersion, latestVersion);
  storage.set(K.softDismissedAt, now.toISOString());
}
