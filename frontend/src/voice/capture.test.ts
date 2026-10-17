import { describe, expect, it } from 'vitest';
import worklet from './capture.worklet.js?raw';

interface Processor {
  port: { onmessage: (() => void) | null };
  process: (inputs: Float32Array[][]) => boolean;
}

describe('PCM capture worklet', () => {
  it.each([16000, 24000, 44100, 48000])(
    'resamples %i Hz to 16 kHz PCM16 in bounded 100 ms chunks',
    (rate) => {
      const chunks: Int16Array[] = [];
      class Base {
        port = {
          onmessage: null as (() => void) | null,
          postMessage: (buffer: ArrayBuffer) => chunks.push(new Int16Array(buffer.slice(0))),
        };
      }
      let Constructor!: new () => Processor;
      const register = (name: string, ctor: new () => Processor) => {
        expect(name).toBe('engmate-pcm');
        Constructor = ctor;
      };
      new Function('AudioWorkletProcessor', 'registerProcessor', 'sampleRate', worklet)(
        Base,
        register,
        rate,
      );
      const processor = new Constructor();
      expect(processor.process([])).toBe(true);
      for (let offset = 0; offset < rate; offset += 128)
        processor.process([[new Float32Array(Math.min(128, rate - offset)).fill(0.5)]]);
      // Fractional device rates may retain one final sample until the next callback.
      processor.process([[new Float32Array(4).fill(0.5)]]);
      expect(chunks).toHaveLength(10);
      expect(
        chunks.every((chunk) => chunk.length === 1600 && chunk.every((value) => value === 16384)),
      ).toBe(true);
      processor.process([[new Float32Array(400).fill(-2)]]);
      processor.port.onmessage?.();
      const previous = chunks.length;
      for (let offset = 0; offset < rate / 10; offset += 1)
        processor.process([[new Float32Array([2])]]);
      processor.process([[new Float32Array(4).fill(2)]]);
      expect(chunks.length).toBe(previous + 1);
      expect(chunks.at(-1)?.every((value) => value === 32767)).toBe(true);
    },
  );
});
