import { describe, it, expect, beforeEach } from 'vitest';
import { setSelectedWindow, getSelectedWindow, clearSelectedWindow } from '../nav-params';

beforeEach(() => clearSelectedWindow());

describe('nav-params selected-window store', () => {
  it('returns null before anything is set', () => {
    expect(getSelectedWindow()).toBeNull();
  });
  it('stores and returns the window object by reference', () => {
    const w = { start: '2026-07-01T12:00:00+03:00', score: 65 };
    setSelectedWindow(w);
    expect(getSelectedWindow()).toBe(w);
  });
  it('clears the stored window', () => {
    setSelectedWindow({ start: 'x' });
    clearSelectedWindow();
    expect(getSelectedWindow()).toBeNull();
  });
});
