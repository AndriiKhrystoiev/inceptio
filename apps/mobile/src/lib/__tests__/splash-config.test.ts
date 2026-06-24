import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const APP_JSON = join(dirname(fileURLToPath(import.meta.url)), '../../../app.json');
const app = JSON.parse(readFileSync(APP_JSON, 'utf8'));

describe('app.json splash configuration', () => {
  it('has no legacy expo.splash block', () => {
    expect(app.expo.splash).toBeUndefined();
  });

  it('configures the expo-splash-screen plugin', () => {
    const entry = app.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen');
    expect(entry).toBeDefined();
    expect(entry[1].image).toBe('./assets/splash-icon.png');
    expect(entry[1].backgroundColor).toBe('#0F0A1F');
    expect(entry[1].resizeMode).toBe('contain');
    expect(entry[1].dark.backgroundColor).toBe('#0F0A1F');
  });
});
