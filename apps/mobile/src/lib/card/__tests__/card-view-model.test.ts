import { describe, it, expect } from 'vitest';
import { buildCardViewModel, defaultShowIntent } from '../card-view-model';

const TZ = 'Europe/Kyiv';
const loc = { city: 'Kyiv', country: 'Ukraine', timezone: TZ, lat: 50.45, lng: 30.52, selected_at: 0 };
const w = {
  start: '2026-06-20T15:24:00+03:00',
  end: '2026-06-20T16:54:00+03:00',
  grade: 'fair',
  score: 72,
  duration_minutes: 90,
  displayable: { headline: 'A tender day for beginnings.' },
};

describe('buildCardViewModel', () => {
  it('default (no location): soft band, generic intent for sensitive, no city/tz, no clock', () => {
    const vm = buildCardViewModel(w, { activity: 'travel', location: loc, showLocation: false, showIntent: defaultShowIntent('travel') });
    expect(vm.headline).toBe('A tender day for beginnings.');
    expect(vm.moodKey).toBe('good');         // fair → win tier
    expect(vm.moonPhase).toBe('waxing-crescent'); // computed from w.start (2026-06-20)
    expect(vm.tierPhrase).toBe('A tender moment');
    expect(vm.intentText).toBe('A moment to begin'); // travel is sensitive → generic by default
    expect(vm.whenPrimary).toBe('Saturday afternoon');
    expect(vm.whenSecondary).toBe('June 20');
    expect(vm.city).toBeNull();
    expect(vm.tzAbbrev).toBeNull();
    expect(vm.whenPrimary).not.toMatch(/\d/); // no clock leaked
  });

  it('wedding shows the activity by default', () => {
    const vm = buildCardViewModel(w, { activity: 'wedding', location: loc, showLocation: false, showIntent: defaultShowIntent('wedding') });
    expect(vm.intentText).toBe('Wedding');
  });

  it('location opt-in: exact clock + tz + city, full date', () => {
    const vm = buildCardViewModel(w, { activity: 'wedding', location: loc, showLocation: true, showIntent: true });
    expect(vm.whenPrimary).toBe('3:24 PM');
    expect(vm.tzAbbrev).toBe('UTC+3'); // offset-derived (Option 2), DST-correct by construction
    expect(vm.city).toBe('Kyiv');
    expect(vm.whenSecondary).toBe('Saturday, June 20');
  });

  it('never emits the word "Fair" anywhere in the view model', () => {
    const vm = buildCardViewModel(w, { activity: 'contracts', location: loc, showLocation: true, showIntent: false });
    expect(JSON.stringify(vm).toLowerCase()).not.toContain('fair');
  });

  it('synthetic window: headline fallback, tier still derived, no crash', () => {
    const syn = { start: '2026-06-20T15:24:00+03:00', grade: 'caution', duration_minutes: null, _synthetic: true };
    const vm = buildCardViewModel(syn, { activity: 'wedding', location: loc, showLocation: false, showIntent: true });
    expect(vm.headline).toBe('A moment to consider.');
    expect(vm.moodKey).toBe('mixed');
    expect(vm.whenPrimary).toBe('Saturday afternoon');
  });

  it('missing location: time STILL derives from the ISO (deterministic), only city/tz are null', () => {
    const vm = buildCardViewModel(w, { activity: 'wedding', location: null, showLocation: false, showIntent: true });
    expect(vm.whenPrimary).toBe('Saturday afternoon'); // from the ISO offset, not device tz
    expect(vm.city).toBeNull();
    expect(vm.tzAbbrev).toBeNull();
  });

  it('THROWS on a missing start (fail-loud contract violation — never fabricate a 1970 date)', () => {
    const noStart = { grade: 'fair' } as unknown as Parameters<typeof buildCardViewModel>[0];
    expect(() =>
      buildCardViewModel(noStart, { activity: 'wedding', location: loc, showLocation: false, showIntent: true }),
    ).toThrow(/start is required/);
  });
});
