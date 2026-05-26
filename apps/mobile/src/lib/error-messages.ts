import {
  DateRangeError,
  NetworkError,
  RateLimitError,
  SchemaMismatchError,
  TimeoutError,
  ServerError,
  UpstreamQuotaError,
} from './api';

/**
 * Maps typed API errors to user-facing copy in the Mystical Premium tone.
 * Every screen's error branch should call this — one place to update copy.
 */
export function friendlyMessage(err: unknown): string {
  if (err instanceof NetworkError)
    return "We can't reach the sky right now. Check your connection.";
  if (err instanceof TimeoutError)
    return "The sky is taking longer than usual. Try again in a moment.";
  if (err instanceof RateLimitError)
    return "You've explored 10 moments this month. Try again in a few days.";
  if (err instanceof UpstreamQuotaError)
    return "The sky's observatory is full today. Please try again later.";
  if (err instanceof SchemaMismatchError)
    return 'Something unexpected came back. Please try again.';
  if (err instanceof DateRangeError)
    return 'That date range is too long. Try one year or less.';
  if (err instanceof ServerError) return 'Something went wrong. Please try again.';
  return 'Something went wrong. Please try again.';
}
