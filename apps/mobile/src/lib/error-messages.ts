import i18n from '../i18n';
import {
  DateRangeError,
  NetworkError,
  RateLimitError,
  SchemaMismatchError,
  TimeoutError,
  ServerError,
  UpstreamQuotaError,
} from './api';

// keys are passed ns-prefixed ('errors:network'); nsSeparator ':' routes them.
const t = (key: string) => i18n.t(key);

/**
 * Maps typed API errors to user-facing copy in the Mystical Premium tone.
 * Every screen's error branch should call this — one place to update copy.
 * Copy lives in the `errors` i18n namespace (locales/<loc>/errors.json), CHROME
 * (all 5 locales). The RateLimitError string carries a locked invariant: names
 * "searches", anchors to "midnight", and is count- and monetization-free.
 */
export function friendlyMessage(err: unknown): string {
  if (err instanceof NetworkError) return t('errors:network');
  if (err instanceof TimeoutError) return t('errors:timeout');
  if (err instanceof RateLimitError) return t('errors:rateLimit');
  if (err instanceof UpstreamQuotaError) return t('errors:quota');
  if (err instanceof SchemaMismatchError) return t('errors:schema');
  if (err instanceof DateRangeError) return t('errors:dateRange');
  if (err instanceof ServerError) return t('errors:server');
  return t('errors:server');
}
