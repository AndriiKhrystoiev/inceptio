import type { ElectionalSearchRequest } from '@inceptio/shared-types';
import { CACHE_TTL_SECONDS } from './env';
import { TRANSLATIONS_VERSION } from './translations';
import type { Locale } from './translations/types';

// Cache key format:
//   `search:v1:t{TRANSLATIONS_VERSION}:{locale}:{sha256(canonical request)}`.
// Bumping TRANSLATIONS_VERSION on any dictionary/synthesizer change naturally
// invalidates the prior cache entries.
//
// LOCALE IS LOAD-BEARING (VOICE phase, spec §3): the Worker now composes copy
// in the request locale, so two requests that differ ONLY in X-Locale produce
// DIFFERENT translated responses and MUST NOT share a cache entry. The locale
// segment sits in the prefix (before the request hash) so cross-locale entries
// are naturally namespaced and a `grep search:v1:tN:de:` enumerates a locale.
const CACHE_PREFIX = `search:v1:t${TRANSLATIONS_VERSION}:`;

// Stable JSON: keys sorted alphabetically at every depth. Two requests with the
// same fields in different declaration order produce the same cache key.
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map((v) => stableStringify(v)).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    '{' +
    keys
      .map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k]))
      .join(',') +
    '}'
  );
}

export async function computeCacheKey(
  req: ElectionalSearchRequest,
  locale: Locale,
): Promise<string> {
  const canonical = stableStringify(req);
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${CACHE_PREFIX}${locale}:${hex}`;
}

export async function readCache<T>(
  kv: KVNamespace,
  key: string,
): Promise<T | null> {
  return kv.get<T>(key, 'json');
}

export async function writeCache(
  kv: KVNamespace,
  key: string,
  value: unknown,
  ttlSeconds: number = CACHE_TTL_SECONDS,
): Promise<void> {
  await kv.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
}
