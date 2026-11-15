export const RATE = 16_000;
export const FRAME_SAMPLES = 1600;
export const FRAME_MS = 100;

export interface Span {
  startMs: number;
  endMs: number;
}

export interface Scenario {
  name: string;
  pcm: Int16Array;
  speech: Span[];
  playback: Span[];
  snrDb?: number;
}

/** Deterministic noise, independent of Math.random or wall-clock time. */
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return (state / 0x100000000) * 2 - 1;
  };
}

function scaled(signal: Float64Array, rms: number): Float64Array {
  const energy = signal.reduce((sum, value) => sum + value * value, 0);
  const gain = energy ? rms / Math.sqrt(energy / signal.length) : 0;
  return signal.map((sample) => sample * gain);
}

function noise(length: number, pink: boolean, seed: number): Float64Array {
  const next = random(seed);
  // Octave-held random sources approximate pink noise; not a calibrated 1/f source.
  const octaves = new Float64Array(12);
  return Float64Array.from({ length }, (_, index) => {
    if (!pink) return next();
    for (let octave = 0; octave < octaves.length; octave++)
      if (index % 2 ** octave === 0) octaves[octave] = next();
    return octaves.reduce((sum, value) => sum + value, 0) / octaves.length;
  });
}

function speechLike(seconds: number): Float64Array {
  return Float64Array.from({ length: Math.round(seconds * RATE) }, (_, index) => {
    const t = index / RATE;
    const envelope =
      (0.25 + 0.75 * Math.sin(Math.PI * 4 * t) ** 2) * Math.min(1, t / 0.03, (seconds - t) / 0.03);
    return (
      envelope *
      (Math.sin(2 * Math.PI * 170 * t) +
        0.45 * Math.sin(2 * Math.PI * 340 * t) +
        0.2 * Math.sin(2 * Math.PI * 680 * t))
    );
  });
}

function add(target: Float64Array, source: Float64Array, startMs: number): void {
  const offset = Math.round((startMs * RATE) / 1000);
  source.forEach((value, index) => {
    target[offset + index] += value;
  });
}

function pcm(signal: Float64Array): Int16Array {
  return Int16Array.from(signal, (sample) => {
    if (Math.abs(sample) >= 1) throw new Error('Synthetic signal clipped');
    return Math.round(sample * 32767);
  });
}

/** Synthetic microphone PCM, after the browser processing boundary; no recorded voices. */
export function* syntheticScenarios(): Generator<Scenario> {
  const length = 60 * RATE;
  for (const pink of [false, true]) {
    const base = noise(length, pink, 20261113);
    for (const level of [0.004, 0.012, 0.024, 0.04]) {
      yield {
        name: `${pink ? 'pink' : 'white'}-${level}`,
        pcm: pcm(scaled(base, level)),
        speech: [],
        playback: [],
      };
    }
  }
  for (const level of [0.008, 0.03]) {
    const hum = Float64Array.from(
      { length },
      (_, i) =>
        Math.sin((2 * Math.PI * 60 * i) / RATE) + 0.3 * Math.sin((2 * Math.PI * 120 * i) / RATE),
    );
    yield { name: `hum-${level}`, pcm: pcm(scaled(hum, level)), speech: [], playback: [] };
  }
  for (const [name, seconds] of [
    ['clicks', 0.005],
    ['keyboard', 0.03],
    ['door', 0.25],
  ] as const) {
    const signal = scaled(noise(length, false, 17), 0.004);
    const burst = noise(Math.round(seconds * RATE), false, 42).map(
      (value, i) => value * Math.exp((-3 * i) / (seconds * RATE)),
    );
    for (let startMs = 2000; startMs < 58_000; startMs += name === 'keyboard' ? 700 : 4000)
      add(signal, scaled(burst, name === 'door' ? 0.12 : 0.08), startMs + 75);
    yield { name, pcm: pcm(signal), speech: [], playback: [] };
  }
  // Fixed true intervals permit comparable misses and endpoint delays across implementations.
  for (const noiseRms of [0.004, 0.012, 0.024]) {
    for (const snrDb of [0, 5, 10, 20]) {
      const signal = scaled(noise(length, false, 91), noiseRms);
      const speech: Span[] = [];
      for (let startMs = 2000; startMs < 54_000; startMs += 8000) {
        const durationMs = startMs % 16_000 === 2000 ? 300 : 1600;
        const voice = scaled(speechLike(durationMs / 1000), noiseRms * 10 ** (snrDb / 20));
        add(signal, voice, startMs);
        speech.push({ startMs, endMs: startMs + durationMs });
      }
      yield {
        name: `speech-noise-${noiseRms}-snr-${snrDb}`,
        pcm: pcm(signal),
        speech,
        playback: [],
        snrDb,
      };
    }
  }
  for (const level of [0.008, 0.025, 0.05]) {
    const signal = scaled(noise(length, false, 11), 0.004);
    const playback: Span[] = [];
    for (let startMs = 2000; startMs < 58_000; startMs += 5000) {
      playback.push({ startMs, endMs: startMs + 2500 });
      // Delayed, attenuated and smeared synthetic output; NOT a room/AEC model.
      const voice = scaled(speechLike(2), level);
      add(signal, voice, startMs + 100);
      add(
        signal,
        voice.map((value) => value * 0.35),
        startMs + 200,
      );
    }
    yield { name: `mate-echo-${level}`, pcm: pcm(signal), speech: [], playback };
  }
}
