import { describe, it, expect } from 'vitest';
import en from '../../locales/en/location.json';
import de from '../../locales/de/location.json';
import fr from '../../locales/fr/location.json';
import es419 from '../../locales/es-419/location.json';
import ptBR from '../../locales/pt-BR/location.json';

describe('location ns', () => {
  it('CHROME keys exist in all 5 locales', () => {
    const keys = Object.keys(en);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) {
      for (const loc of [de, fr, es419, ptBR]) {
        expect(loc).toHaveProperty(k);
      }
    }
  });

  it('declares the core search + geocoder chrome keys', () => {
    for (const k of [
      'searchTitle',
      'searchSubtitle',
      'placeholder',
      'typeMore',
      'noResults',
      'geocoderBusy',
      'geocoderUnreachable',
      'useCurrent',
      'useCurrentLoading',
      'currentNoCity',
      'currentUnreachable',
      'permissionTitle',
      'permissionBody',
      'openSettings',
      'skyView',
      'findMoments',
      'whereSuffix',
      'defaultHeading',
    ]) {
      expect(en).toHaveProperty(k);
    }
  });
});
