import { beforeEach, describe, expect, it } from 'vitest';
import { initialLearning, localDay, readLearning } from './curriculum';

beforeEach(() => localStorage.clear());
describe('learning preferences and self-reported progress', () => {
  it('starts empty and isolates accounts', () => {
    localStorage.setItem(
      'engmate-learning:someone',
      JSON.stringify({ ...initialLearning, completed: ['cafe'] }),
    );
    expect(readLearning('new-user')).toEqual(initialLearning);
    expect(readLearning('someone').completed).toEqual(['cafe']);
  });
  it('ignores malformed storage instead of preventing login', () => {
    localStorage.setItem('engmate-learning:learner', '{broken');
    expect(readLearning('learner')).toEqual(initialLearning);
  });
  it('validates stored preferences and ignores unknown or malicious progress entries', () => {
    localStorage.setItem(
      'engmate-learning:learner',
      JSON.stringify({
        goal: 'anything',
        minutes: 999,
        level: 'C9',
        lessonId: 'missing',
        completed: ['cafe', null, 'fake'],
        remembered: [{}, 'cafe:I’d like…', 'fake'],
        days: [null, {}, 'wrong', '2026-10-18'],
      }),
    );
    expect(readLearning('learner')).toEqual({
      ...initialLearning,
      completed: ['cafe'],
      remembered: ['cafe:I’d like…'],
      days: ['2026-10-18'],
    });
  });
  it('accepts valid preferences, and caps recorded days', () => {
    localStorage.setItem(
      'engmate-learning:learner',
      JSON.stringify({
        goal: 'work',
        minutes: 30,
        level: 'A2',
        lessonId: 'work',
        completed: [],
        remembered: [],
        days: Array(400).fill('2026-10-18'),
      }),
    );
    const state = readLearning('learner');
    expect(state.minutes).toBe(30);
    expect(state.level).toBe('A2');
    expect(state.goal).toBe('work');
    expect(state.lessonId).toBe('work');
    expect(state.days).toHaveLength(365);
  });
  it('uses the local calendar day across midnight boundaries', () => {
    expect(localDay(new Date(2026, 9, 18, 0, 5))).toBe('2026-10-18');
    expect(localDay(new Date(2026, 0, 2, 23, 59))).toBe('2026-01-02');
  });
});
