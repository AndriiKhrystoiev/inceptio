import { describe, it, expect } from 'vitest';
import { API_CONFIG } from '../api';

describe('API_CONFIG', () => {
  it('points at the public upstream directly', () => {
    expect(API_CONFIG.baseUrl).toBe('https://api-public.astrology-api.io/api/v3');
  });
  it('uses a ~20s timeout (upstream is now 50-500ms, no worker cold start)', () => {
    expect(API_CONFIG.timeout).toBe(20_000);
  });
});
