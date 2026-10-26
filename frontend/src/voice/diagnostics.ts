import type { VoiceLatencyReport } from './latency';

let enabled = false;
let reports: VoiceLatencyReport[] = [];
let snapshot = { enabled, reports };
const listeners = new Set<() => void>();
const stages = new Set([
  'endpoint',
  'stt_requested',
  'stt_final',
  'llm_requested',
  'llm_first_text',
  'first_phrase',
  'llm_completed',
  'tts_requested',
  'tts_headers',
  'tts_first_byte',
  'audio_ready',
  'playback_started',
]);
function notify() {
  snapshot = { enabled, reports };
  listeners.forEach((listener) => listener());
}
function receive(event: Event) {
  const data = (event as CustomEvent<VoiceLatencyReport>).detail;
  if (
    !enabled ||
    !data ||
    !['completed', 'failed', 'cancelled'].includes(data.status) ||
    !['silence', 'max_duration'].includes(data.endpointReason) ||
    !data.stages
  )
    return;
  // Keep only numeric stages and mode/status. No arbitrary event payload is retained.
  reports = [
    ...reports.slice(-199),
    {
      traceId: '',
      status: data.status,
      endpointReason: data.endpointReason,
      sttMode: data.sttMode === 'realtime' ? 'realtime' : 'batch',
      stages: Object.fromEntries(
        Object.entries(data.stages).filter(
          ([key, value]) => stages.has(key) && typeof value === 'number' && Number.isFinite(value),
        ),
      ),
    },
  ];
  notify();
}
export function setVoiceDiagnostics(value: boolean) {
  window.removeEventListener('engmate-voice-latency', receive);
  enabled = value;
  reports = [];
  if (enabled) window.addEventListener('engmate-voice-latency', receive);
  notify();
}
window.addEventListener('engmate-account-changed', () => setVoiceDiagnostics(false));
export const voiceDiagnosticsSnapshot = () => snapshot;
export function subscribeVoiceDiagnostics(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
