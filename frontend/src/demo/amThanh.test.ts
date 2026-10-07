import { afterEach, describe, expect, it, vi } from 'vitest';
import { docTiengAnh } from './amThanh';

class UtteranceMock {
  lang = '';
  rate = 1;
  voice: SpeechSynthesisVoice | null = null;
  constructor(public text: string) {}
}

describe('docTiengAnh', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns false when speech synthesis is unavailable', () => {
    vi.stubGlobal('speechSynthesis', undefined);
    vi.stubGlobal('SpeechSynthesisUtterance', undefined);
    expect(docTiengAnh('Hello')).toBe(false);
  });

  it('selects an English voice and queues speech at the requested speed', () => {
    const voice = { lang: 'en-GB' } as SpeechSynthesisVoice;
    const cancel = vi.fn();
    const speak = vi.fn();
    vi.stubGlobal('SpeechSynthesisUtterance', UtteranceMock);
    vi.stubGlobal('speechSynthesis', {
      cancel,
      speak,
      getVoices: () => [{ lang: 'vi-VN' }, voice],
    });

    expect(docTiengAnh('Good morning', 0.8)).toBe(true);
    expect(cancel).toHaveBeenCalledOnce();
    expect(speak).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Good morning', lang: 'en-US', rate: 0.8, voice }),
    );
  });
});
