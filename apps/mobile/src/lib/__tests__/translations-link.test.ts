import { describe, it, expect } from 'vitest';
import { TRANSLATIONS_VERSION, translate } from '@inceptio/translations';

describe('@inceptio/translations link', () => {
  it('resolves the package from mobile', () => {
    expect(typeof translate).toBe('function');
    expect(TRANSLATIONS_VERSION).toBeGreaterThanOrEqual(3);
  });
});
