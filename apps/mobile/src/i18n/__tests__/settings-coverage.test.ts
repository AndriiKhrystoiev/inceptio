import { describe, it, expect } from 'vitest';
import en from '../../locales/en/settings.json';
import de from '../../locales/de/settings.json';
import fr from '../../locales/fr/settings.json';
import es419 from '../../locales/es-419/settings.json';
import ptBR from '../../locales/pt-BR/settings.json';

// keySeparator:false — keys are flat literal strings (dots allowed inside a key).
// Use own-property checks, not toHaveProperty (which would treat dots as paths).
const has = (obj: object, k: string) => Object.prototype.hasOwnProperty.call(obj, k);

describe('settings ns', () => {
  it('CHROME keys exist in all 5 locales', () => {
    const keys = Object.keys(en);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) {
      for (const loc of [de, fr, es419, ptBR]) {
        expect(has(loc, k)).toBe(true);
      }
    }
  });

  it('declares the core chrome keys', () => {
    for (const k of [
      'title',
      'subtitle',
      'section.preferences',
      'section.about',
      'section.debug',
      'row.defaultActivity',
      'row.defaultLocation',
      'row.version',
      'row.privacy',
      'row.terms',
      'row.deviceId',
      'row.resetDeviceId',
      'row.clearSavedMoments',
      'detail.notSet',
      'clearLocationHint',
      'copyHint',
      'deviceIdLoading',
      'debugMode.title',
      'debugMode.body',
      'toast.comingSoon',
      'toast.deviceIdCopied',
      'toast.copyFailed',
      'toast.deviceIdReset',
      'toast.savedMomentsCleared',
      'resetDeviceId.title',
      'resetDeviceId.body',
      'resetDeviceId.confirm',
      'clearMoments.title',
      'clearMoments.body',
      'clearMoments.confirm',
    ]) {
      expect(has(en, k)).toBe(true);
    }
  });

  it('settings ns has no voice keys (no voice/settings.json)', () => {
    // B11 owns no voice file; assert chrome keys do not leak into a voice shape.
    expect(has(en, 'pill')).toBe(false);
  });
});
