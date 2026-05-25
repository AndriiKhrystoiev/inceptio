import type { ElectionalSearchRequest } from '@inceptio/shared-types';
import { CACHE_TTL_SECONDS } from './env';

const CACHE_PREFIX = 'search:v1:';

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
): Promise<string> {
  const canonical = stableStringify(req);
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return CACHE_PREFIX + hex;
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
