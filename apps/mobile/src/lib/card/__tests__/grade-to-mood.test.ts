import { describe, it, expect } from 'vitest';
import { gradeToMood } from '../grade-to-mood';

describe('gradeToMood', () => {
  it('maps exceptional + strong → strong (gold tier)', () => {
    expect(gradeToMood('exceptional')).toBe('strong');
    expect(gradeToMood('strong')).toBe('strong');
  });
  it('lands BOTH good and fair in the win tier → good (violet)', () => {
    expect(gradeToMood('good')).toBe('good');
    expect(gradeToMood('fair')).toBe('good'); // the 72-is-a-win rule
  });
  it('maps caution → mixed, poor → closed', () => {
    expect(gradeToMood('caution')).toBe('mixed');
    expect(gradeToMood('poor')).toBe('closed');
  });
  it('falls back to mixed on unknown upstream grade (enum-drift safe)', () => {
    expect(gradeToMood('some_new_grade')).toBe('mixed');
    expect(gradeToMood(undefined as unknown as string)).toBe('mixed');
  });
});
