import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { FRAME_SAMPLES, RATE, type Scenario, type Span } from './signals';

/** Accept only the capture format; silently resampling would change the experiment. */
export function decodeWav(bytes: Uint8Array): Int16Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset: number) => String.fromCharCode(...bytes.slice(offset, offset + 4));
  if (
    bytes.length < 44 ||
    tag(0) !== 'RIFF' ||
    tag(8) !== 'WAVE' ||
    view.getUint32(4, true) + 8 !== bytes.length
  )
    throw new Error('WAV must be complete RIFF/WAVE PCM16 mono 16 kHz');
  let format = false;
  let data: Uint8Array | undefined;
  for (let offset = 12; offset < bytes.length;) {
    if (offset + 8 > bytes.length) throw new Error('Truncated WAV chunk');
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (start + size + (size % 2) > bytes.length) throw new Error('Truncated WAV chunk');
    if (tag(offset) === 'fmt ') {
      if (
        format ||
        size < 16 ||
        view.getUint16(start, true) !== 1 ||
        view.getUint16(start + 2, true) !== 1 ||
        view.getUint32(start + 4, true) !== RATE ||
        view.getUint32(start + 8, true) !== RATE * 2 ||
        view.getUint16(start + 12, true) !== 2 ||
        view.getUint16(start + 14, true) !== 16
      )
        throw new Error('WAV must be PCM16 mono 16 kHz');
      format = true;
    }
    if (tag(offset) === 'data') {
      if (data) throw new Error('Duplicate WAV data');
      data = bytes.subarray(start, start + size);
    }
    offset = start + size + (size % 2);
  }
  if (!format || !data?.length || data.length % (FRAME_SAMPLES * 2))
    throw new Error('WAV must contain complete 100 ms frames (no implicit padding)');
  const samples = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return Int16Array.from({ length: data.length / 2 }, (_, index) =>
    samples.getInt16(index * 2, true),
  );
}

function inside(root: string, file: string): boolean {
  const path = relative(root, file);
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

function readBounded(file: string, maxBytes: number): Buffer {
  if (statSync(file).size > maxBytes) throw new Error('Local corpus file exceeds size limit');
  return readFileSync(file);
}

function spans(value: unknown, durationMs: number): Span[] {
  if (!Array.isArray(value)) throw new Error('Expected explicit speech/playback label arrays');
  let end = 0;
  return value.map((span: unknown) => {
    if (
      !span ||
      typeof span !== 'object' ||
      !('startMs' in span) ||
      !('endMs' in span) ||
      typeof span.startMs !== 'number' ||
      typeof span.endMs !== 'number' ||
      !Number.isFinite(span.startMs) ||
      !Number.isFinite(span.endMs) ||
      span.startMs < end ||
      span.endMs <= span.startMs ||
      span.endMs > durationMs
    )
      throw new Error('Labels must be ordered, nonoverlapping and inside the WAV');
    end = span.endMs;
    return { startMs: span.startMs, endMs: span.endMs };
  });
}

/** Read only opt-in local files. Reports use ordinal names, never paths or transcript labels. */
export function* localScenarios(directory: string, repoRoot: string): Generator<Scenario> {
  const root = realpathSync(directory);
  const repo = realpathSync(repoRoot);
  // Keep private recordings out of tracked trees, even if the caller forgets gitignore.
  if (inside(repo, root) && !inside(resolve(repo, '.artifacts'), root))
    throw new Error('Place the private corpus outside the repository or inside .artifacts');
  const manifest = realpathSync(resolve(root, 'labels.json'));
  if (!inside(root, manifest)) throw new Error('Manifest must stay inside the corpus directory');
  const entries: unknown = JSON.parse(readBounded(manifest, 1024 * 1024).toString('utf8'));
  if (!Array.isArray(entries) || !entries.length || entries.length > 100)
    throw new Error('Expected 1..100 labeled WAV entries');
  for (let index = 0; index < entries.length; index++) {
    const entry: unknown = entries[index];
    if (
      !entry ||
      typeof entry !== 'object' ||
      !('file' in entry) ||
      typeof entry.file !== 'string' ||
      !entry.file.toLowerCase().endsWith('.wav') ||
      !('speech' in entry) ||
      !('playback' in entry)
    )
      throw new Error('Expected file, speech and playback labels');
    const file = realpathSync(resolve(root, entry.file));
    if (!inside(root, file)) throw new Error('WAV must stay inside the corpus directory');
    const pcm = decodeWav(readBounded(file, 20 * 1024 * 1024));
    const durationMs = (pcm.length / RATE) * 1000;
    yield {
      name: `local-${index + 1}`,
      pcm,
      speech: spans(entry.speech, durationMs),
      playback: spans(entry.playback, durationMs),
    };
  }
}
