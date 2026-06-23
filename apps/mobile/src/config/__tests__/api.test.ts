import { describe, it, expect } from 'vitest';
import { API_CONFIG, resolveApiConfig } from '../api';

const PUBLIC_URL = 'https://api-public.astrology-api.io/api/v3';

describe('API_CONFIG (resolved under vitest, where __DEV__ is undefined → prod)', () => {
  it('points at the public upstream directly', () => {
    expect(API_CONFIG.baseUrl).toBe(PUBLIC_URL);
  });
  it('uses a ~20s timeout (upstream is now 50-500ms, no worker cold start)', () => {
    expect(API_CONFIG.timeout).toBe(20_000);
  });
  it('sends no API key (production is keyless)', () => {
    expect(API_CONFIG.apiKey).toBeNull();
  });
});

describe('resolveApiConfig', () => {
  it('production ignores any base-URL override and key (keyless on api-public)', () => {
    const cfg = resolveApiConfig({
      isDev: false,
      baseUrlOverride: 'https://api.astrology-api.io/api/v3',
      devApiKey: 'dev-secret',
    });
    expect(cfg.baseUrl).toBe(PUBLIC_URL);
    expect(cfg.apiKey).toBeNull();
  });

  it('dev honors the base-URL override and dev API key', () => {
    const cfg = resolveApiConfig({
      isDev: true,
      baseUrlOverride: 'https://api.astrology-api.io/api/v3',
      devApiKey: 'dev-secret',
    });
    expect(cfg.baseUrl).toBe('https://api.astrology-api.io/api/v3');
    expect(cfg.apiKey).toBe('dev-secret');
  });

  it('dev without env falls back to the keyless public default', () => {
    const cfg = resolveApiConfig({ isDev: true });
    expect(cfg.baseUrl).toBe(PUBLIC_URL);
    expect(cfg.apiKey).toBeNull();
  });

  it('dev treats blank/whitespace env values as unset', () => {
    const cfg = resolveApiConfig({ isDev: true, baseUrlOverride: '  ', devApiKey: '   ' });
    expect(cfg.baseUrl).toBe(PUBLIC_URL);
    expect(cfg.apiKey).toBeNull();
  });
});
