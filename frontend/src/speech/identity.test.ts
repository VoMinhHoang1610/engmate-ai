import { describe, expect, it } from 'vitest';
import { voiceGender } from './identity';

describe('selected voice identity', () => {
  it('prefers catalog metadata and handles legacy IDs without guessing unknown voices', () => {
    expect(voiceGender('custom', 'female')).toBe('female');
    expect(voiceGender('HN-Nam-1-BL', 'female')).toBe('female');
    expect(voiceGender('HN-Nu-2-BL')).toBe('female');
    expect(voiceGender('UK-Nam-1-DT', null)).toBe('male');
    expect(voiceGender('custom')).toBeNull();
  });
});
