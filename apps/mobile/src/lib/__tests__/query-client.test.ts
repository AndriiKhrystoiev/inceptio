import { describe, it, expect } from 'vitest';
import { queryClient } from '../query-client';
import { RateLimitError, UpstreamQuotaError, SchemaMismatchError, ServerError } from '../api';

const retry = queryClient.getDefaultOptions().queries!.retry as (n: number, e: Error) => boolean;

describe('queryClient retry policy', () => {
  it('never retries non-retryable errors', () => {
    expect(retry(0, new RateLimitError(null))).toBe(false);
    expect(retry(0, new UpstreamQuotaError('quota'))).toBe(false);
    expect(retry(0, new SchemaMismatchError([]))).toBe(false);
    expect(retry(0, new ServerError(502, 'x'))).toBe(false);
  });
  it('retries a generic error once', () => {
    expect(retry(0, new Error('flaky'))).toBe(true);
    expect(retry(1, new Error('flaky'))).toBe(false);
  });
  it('does not retry a 4xx ServerError beyond the generic budget', () => {
    expect(retry(0, new ServerError(422, 'bad'))).toBe(true); // <500 falls to generic
    expect(retry(1, new ServerError(422, 'bad'))).toBe(false);
  });
});
