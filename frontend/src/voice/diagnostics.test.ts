import { afterEach, expect, it } from 'vitest';
import { setVoiceDiagnostics, voiceDiagnosticsSnapshot } from './diagnostics';

afterEach(() => setVoiceDiagnostics(false));
it('collects only when enabled, caps samples, strips content and clears on account change', () => {
  const emit = () =>
    window.dispatchEvent(
      new CustomEvent('engmate-voice-latency', {
        detail: {
          traceId: 'private',
          text: 'private transcript',
          status: 'completed',
          endpointReason: 'silence',
          sttMode: 'batch',
          stages: { endpoint: 900, text: 'private', unknown: 5, playback_started: 1500 },
        },
      }),
    );
  emit();
  expect(voiceDiagnosticsSnapshot().reports).toHaveLength(0);
  setVoiceDiagnostics(true);
  for (let i = 0; i < 250; i++) emit();
  expect(voiceDiagnosticsSnapshot().reports).toHaveLength(200);
  expect(JSON.stringify(voiceDiagnosticsSnapshot())).not.toContain('private');
  expect(voiceDiagnosticsSnapshot().reports[0].stages).toEqual({
    endpoint: 900,
    playback_started: 1500,
  });
  window.dispatchEvent(new Event('engmate-account-changed'));
  expect(voiceDiagnosticsSnapshot()).toEqual({ enabled: false, reports: [] });
});
