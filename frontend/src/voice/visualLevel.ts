/** Optional visual analysis never owns media tracks or changes the audio route. */
export function observeAudioLevel(
  context: AudioContext,
  source: AudioNode,
  emit: (level: number) => void,
): () => void {
  if (typeof context.createAnalyser !== 'function') return () => undefined;
  let analyser: AnalyserNode;
  try {
    analyser = context.createAnalyser();
    source.connect(analyser);
  } catch {
    return () => undefined;
  }
  analyser.fftSize = 256;
  const samples = new Float32Array(analyser.fftSize);
  let released = false;
  const timer = setInterval(() => {
    analyser.getFloatTimeDomainData(samples);
    const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
    emit(Math.min(1, rms * 5));
  }, 80);
  return () => {
    if (released) return;
    released = true;
    clearInterval(timer);
    try {
      source.disconnect(analyser);
    } catch {
      /* The transport may already be closed. */
    }
    analyser.disconnect();
    emit(0);
  };
}
