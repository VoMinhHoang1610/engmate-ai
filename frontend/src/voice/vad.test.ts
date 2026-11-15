import { describe, expect, it } from 'vitest';
import { EnergyVad } from './vad';

const frame = (sample = 0) => new Int16Array(1600).fill(sample);

describe('unchanged energy VAD contract', () => {
  it('rejects invalid frames without breaking consecutive onset or pre-roll', () => {
    const vad = new EnergyVad();
    expect(vad.push(frame(600), 100).type).toBe('pending');
    expect(vad.push(new Int16Array(12), 150).type).toBe('invalid');
    const second = frame(601);
    const result = vad.push(second, 200);
    expect(result.type).toBe('start');
    if (result.type === 'start') expect(result.frames).toEqual([frame(600), second]);
  });

  it('keeps the integer PCM threshold boundary and ignores isolated impulses', () => {
    const vad = new EnergyVad();
    for (let i = 0; i < 20; i++) {
      expect(vad.push(frame(590), i * 300).type).toBe('pending');
      expect(vad.push(frame(589), i * 300 + 100).type).toBe('pending');
      expect(vad.push(frame(), i * 300 + 200).type).toBe('pending');
    }
    expect(vad.push(frame(-590), 6100).type).toBe('pending');
    expect(vad.push(frame(590), 6200).type).toBe('start');
  });

  it('retains exactly three pre-roll frames and endpoints a 200 ms short answer after 900 ms', () => {
    const vad = new EnergyVad();
    const preRoll = frame(100);
    for (let i = 0; i < 10; i++) vad.push(preRoll, i * 100);
    const first = frame(900);
    const second = frame(-900);
    vad.push(first, 1000);
    const start = vad.push(second, 1100);
    expect(start).toEqual({ type: 'start', frames: [preRoll, first, second] });
    for (let i = 1; i <= 9; i++) {
      const result = vad.push(frame(), 1100 + i * 100);
      expect(result).toMatchObject({
        type: 'frame',
        speaking: false,
        lastVoicedAt: 1100,
        endpointReason: i === 9 ? 'silence' : undefined,
      });
      if (result.type === 'frame') expect(result.frames).toHaveLength(3 + i);
    }
  });

  it('resets the silence counter when speech resumes and counts pre-roll toward the cap', () => {
    const vad = new EnergyVad();
    vad.push(frame(), 0);
    vad.push(frame(900), 100);
    vad.push(frame(900), 200);
    for (let i = 3; i < 11; i++) vad.push(frame(), i * 100);
    expect(vad.push(frame(900), 1100)).toMatchObject({
      endpointReason: undefined,
      lastVoicedAt: 1100,
    });
    for (let i = 12; i < 299; i++)
      expect(vad.push(frame(900), i * 100)).toMatchObject({ endpointReason: undefined });
    expect(vad.push(frame(900), 29900)).toMatchObject({
      endpointReason: 'max_duration',
      frames: expect.any(Array),
    });
  });

  it('gives silence precedence when the cap and hangover coincide', () => {
    const vad = new EnergyVad();
    for (let i = 0; i < 291; i++) vad.push(frame(900), i * 100);
    for (let i = 291; i < 299; i++) vad.push(frame(), i * 100);
    expect(vad.push(frame(), 29900)).toMatchObject({ endpointReason: 'silence' });
  });

  it('drops onset and active capture on reset without mutating a previously returned recording', () => {
    const vad = new EnergyVad();
    vad.push(frame(900), 100);
    vad.reset();
    expect(vad.push(frame(900), 200).type).toBe('pending');
    const result = vad.push(frame(900), 300);
    expect(result.type).toBe('start');
    vad.reset();
    expect(vad.push(frame(900), 400).type).toBe('pending');
    expect(vad.push(frame(900), 500).type).toBe('start');
    if (result.type === 'start') expect(result.frames).toHaveLength(2);
  });
});
