import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activateSpeechPreferences,
  getSpeechPreferences,
  setSpeechRate,
  setSpeechVoice,
  useSpeechPreferences,
} from './preferences';

const defaults = {
  voiceEn: 'UK-Nu-1-TM',
  voiceVi: 'HN-Nam-1-BL',
  dialogueVoice: null,
  rate: 1,
};
const saved = {
  version: 1,
  voiceEn: 'UK-Nam-1-DT',
  voiceVi: 'HN-Nu-2-BL',
  dialogueVoice: 'UK-Nam-1-DT',
  rate: 0.75,
};

beforeEach(() => activateSpeechPreferences(null));
afterEach(() => {
  vi.restoreAllMocks();
  activateSpeechPreferences(null);
});

describe('account speech preferences', () => {
  it('starts with separate English and Vietnamese voices and applies them immediately', () => {
    activateSpeechPreferences('learner');
    expect(getSpeechPreferences()).toEqual(defaults);
    expect(document.documentElement.dataset.speechVoice).toBe(defaults.voiceEn);
    expect(document.documentElement.dataset.speechVoiceVi).toBe(defaults.voiceVi);
    expect(document.documentElement.dataset.speechRate).toBe('1');
    expect(localStorage.length).toBe(0);
  });

  it('saves language choices independently and remembers the last dialogue voice', () => {
    activateSpeechPreferences('learner');
    expect(setSpeechVoice('en', saved.voiceEn)).toBe(true);
    expect(setSpeechVoice('vi', saved.voiceVi)).toBe(true);
    expect(setSpeechRate(0.75)).toBe(true);
    expect(getSpeechPreferences()).toEqual({
      voiceEn: saved.voiceEn,
      voiceVi: saved.voiceVi,
      dialogueVoice: saved.voiceVi,
      rate: 0.75,
    });
    const stored: unknown = JSON.parse(localStorage.getItem('engmate-speech:learner')!);
    expect(stored).toEqual({ version: 1, ...getSpeechPreferences() });
    expect(document.documentElement.dataset.speechVoice).toBe(saved.voiceEn);
    expect(document.documentElement.dataset.speechVoiceVi).toBe(saved.voiceVi);
    expect(document.documentElement.dataset.speechRate).toBe('0.75');
  });

  it('restores persisted settings after logout and a fresh activation', () => {
    activateSpeechPreferences('learner');
    setSpeechVoice('en', saved.voiceEn);
    setSpeechRate(1.25);
    activateSpeechPreferences(null);
    expect(getSpeechPreferences()).toEqual(defaults);
    expect(document.documentElement.dataset.speechVoice).toBe(defaults.voiceEn);
    activateSpeechPreferences('learner');
    expect(getSpeechPreferences()).toEqual({
      ...defaults,
      voiceEn: saved.voiceEn,
      dialogueVoice: saved.voiceEn,
      rate: 1.25,
    });
  });

  it('isolates accounts including when the next account has no saved preference', () => {
    localStorage.setItem('engmate-speech:alice', JSON.stringify(saved));
    activateSpeechPreferences('alice');
    expect(getSpeechPreferences().voiceEn).toBe(saved.voiceEn);
    activateSpeechPreferences('bob');
    expect(getSpeechPreferences()).toEqual(defaults);
    setSpeechVoice('vi', 'SG-Nam-1-BL');
    activateSpeechPreferences('alice');
    expect(getSpeechPreferences()).toEqual({
      voiceEn: saved.voiceEn,
      voiceVi: saved.voiceVi,
      dialogueVoice: saved.dialogueVoice,
      rate: saved.rate,
    });
    activateSpeechPreferences('bob');
    expect(getSpeechPreferences().voiceVi).toBe('SG-Nam-1-BL');
    expect(getSpeechPreferences().voiceEn).toBe(defaults.voiceEn);
  });

  it('keeps changes usable in memory and reports a failed storage write', () => {
    activateSpeechPreferences('learner');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'QuotaExceededError');
    });
    expect(setSpeechVoice('en', saved.voiceEn)).toBe(false);
    expect(setSpeechRate(0.75)).toBe(false);
    expect(getSpeechPreferences().voiceEn).toBe(saved.voiceEn);
    expect(getSpeechPreferences().rate).toBe(0.75);
    expect(document.documentElement.dataset.speechVoice).toBe(saved.voiceEn);
    expect(document.documentElement.dataset.speechRate).toBe('0.75');
  });

  it('resets stale account data even when browser storage cannot be read', () => {
    activateSpeechPreferences('alice');
    setSpeechVoice('en', saved.voiceEn);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });
    activateSpeechPreferences('bob');
    expect(getSpeechPreferences()).toEqual(defaults);
    expect(document.documentElement.dataset.speechVoice).toBe(defaults.voiceEn);
  });

  it('does not persist anonymous changes or overwrite an account on logout', () => {
    activateSpeechPreferences('learner');
    setSpeechVoice('en', saved.voiceEn);
    const existing = localStorage.getItem('engmate-speech:learner');
    activateSpeechPreferences(null);
    expect(setSpeechVoice('en', 'TemporaryVoice')).toBe(false);
    expect(getSpeechPreferences().voiceEn).toBe('TemporaryVoice');
    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem('engmate-speech:learner')).toBe(existing);
    activateSpeechPreferences(null);
    expect(getSpeechPreferences()).toEqual(defaults);
  });

  it.each([
    '{',
    'null',
    '[]',
    JSON.stringify({ ...saved, version: 2 }),
    JSON.stringify({ ...saved, extra: 'unknown' }),
    JSON.stringify({ voiceEn: saved.voiceEn }),
    JSON.stringify({ ...saved, voiceEn: '<script>' }),
    JSON.stringify({ ...saved, voiceVi: 123 }),
    JSON.stringify({ ...saved, dialogueVoice: '../voice' }),
    JSON.stringify({ ...saved, rate: '1' }),
    JSON.stringify({ ...saved, rate: 0.85 }),
  ])('ignores malformed or unsupported stored settings (%s)', (raw) => {
    localStorage.setItem('engmate-speech:learner', raw);
    activateSpeechPreferences('learner');
    expect(getSpeechPreferences()).toEqual(defaults);
    expect(localStorage.getItem('engmate-speech:learner')).toBe(raw);
  });

  it.each(['', 'with space', '../voice', 'giọng', 'a'.repeat(121), 'x\ny', 'voice\n'])(
    'rejects an invalid voice ID without changing playback (%s)',
    (id) => {
      activateSpeechPreferences('learner');
      const previous = getSpeechPreferences();
      expect(setSpeechVoice('en', id)).toBe(false);
      expect(getSpeechPreferences()).toBe(previous);
      expect(document.documentElement.dataset.speechVoice).toBe(defaults.voiceEn);
      expect(localStorage.length).toBe(0);
    },
  );

  it('accepts bounded public voice identifiers containing letters, digits, underscores and hyphens', () => {
    activateSpeechPreferences('learner');
    expect(setSpeechVoice('en', 'A_1-B')).toBe(true);
    expect(setSpeechVoice('vi', 'a'.repeat(120))).toBe(true);
    expect(getSpeechPreferences().voiceVi).toHaveLength(120);
  });

  it.each([0, -1, 0.85, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects unsupported playback speed %s',
    (rate) => {
      activateSpeechPreferences('learner');
      const previous = getSpeechPreferences();
      expect(setSpeechRate(rate)).toBe(false);
      expect(getSpeechPreferences()).toBe(previous);
      expect(document.documentElement.dataset.speechRate).toBe('1');
    },
  );

  it('updates all mounted consumers while keeping unchanged snapshots stable', () => {
    activateSpeechPreferences('learner');
    const first = renderHook(() => useSpeechPreferences());
    const second = renderHook(() => useSpeechPreferences());
    const initial = first.result.current;
    expect(getSpeechPreferences()).toBe(initial);
    act(() => {
      setSpeechRate(1);
      setSpeechVoice('en', 'invalid voice');
    });
    expect(first.result.current).toBe(initial);
    act(() => {
      setSpeechVoice('en', saved.voiceEn);
    });
    expect(first.result.current.voiceEn).toBe(saved.voiceEn);
    expect(second.result.current).toBe(first.result.current);
    const unsubscribed = first.result.current;
    first.unmount();
    act(() => {
      setSpeechRate(0.75);
    });
    expect(first.result.current).toBe(unsubscribed);
    expect(second.result.current.rate).toBe(0.75);
    act(() => activateSpeechPreferences(null));
    expect(second.result.current).toEqual(defaults);
    second.unmount();
  });
});
