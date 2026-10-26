import { useSyncExternalStore } from 'react';

export interface SpeechPreferences {
  readonly voiceEn: string;
  readonly voiceVi: string;
  readonly dialogueVoice: string | null;
  readonly rate: number;
}

const defaults: SpeechPreferences = Object.freeze({
  voiceEn: 'UK-Nu-1-TM',
  voiceVi: 'HN-Nam-1-BL',
  dialogueVoice: null,
  rate: 1,
});
const invalidVoiceCharacter = /[^A-Za-z0-9_-]/;
const allowedRates = new Set([0.75, 1, 1.25]);
const listeners = new Set<() => void>();
let activeUsername: string | null = null;
let snapshot = defaults;

function validVoice(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= 120 &&
    !invalidVoiceCharacter.test(value)
  );
}

function readStored(username: string): SpeechPreferences {
  try {
    const raw = localStorage.getItem(`engmate-speech:${username}`);
    if (!raw) return defaults;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
    const record = value as Record<string, unknown>;
    if (
      Object.keys(record).length !== 5 ||
      record.version !== 1 ||
      !validVoice(record.voiceEn) ||
      !validVoice(record.voiceVi) ||
      (record.dialogueVoice !== null && !validVoice(record.dialogueVoice)) ||
      typeof record.rate !== 'number' ||
      !allowedRates.has(record.rate)
    ) {
      return defaults;
    }
    return Object.freeze({
      voiceEn: record.voiceEn,
      voiceVi: record.voiceVi,
      dialogueVoice: record.dialogueVoice as string | null,
      rate: record.rate,
    });
  } catch {
    // Private browsing and damaged browser storage must not block learning.
    return defaults;
  }
}

function apply(next: SpeechPreferences) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.speechVoice = next.voiceEn;
    document.documentElement.dataset.speechVoiceVi = next.voiceVi;
    document.documentElement.dataset.speechRate = String(next.rate);
  }
  if (
    snapshot.voiceEn === next.voiceEn &&
    snapshot.voiceVi === next.voiceVi &&
    snapshot.dialogueVoice === next.dialogueVoice &&
    snapshot.rate === next.rate
  ) {
    return;
  }
  snapshot = Object.freeze(next);
  listeners.forEach((listener) => listener());
}

function persist(): boolean {
  if (!activeUsername) return false;
  try {
    localStorage.setItem(
      `engmate-speech:${activeUsername}`,
      JSON.stringify({ version: 1, ...snapshot }),
    );
    return true;
  } catch {
    // The selected voice remains usable for this session without persistence.
    return false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Read the active learner's stable voice preferences without subscribing. */
export function getSpeechPreferences(): SpeechPreferences {
  return snapshot;
}

/** Subscribe to the active learner's shared voice and playback settings. */
export function useSpeechPreferences(): SpeechPreferences {
  return useSyncExternalStore(subscribe, getSpeechPreferences, () => defaults);
}

/** Restore this account's browser settings, or reset them when signing out. */
export function activateSpeechPreferences(username: string | null): void {
  activeUsername = username || null;
  apply(activeUsername ? readStored(activeUsername) : defaults);
}

/** Choose a reading voice and use that most recent selection for dialogue too. */
export function setSpeechVoice(language: 'en' | 'vi', id: string): boolean {
  if ((language !== 'en' && language !== 'vi') || !validVoice(id)) return false;
  apply({ ...snapshot, [language === 'en' ? 'voiceEn' : 'voiceVi']: id, dialogueVoice: id });
  return persist();
}

/** Apply one of the supported playback rates and report whether it was saved. */
export function setSpeechRate(rate: number): boolean {
  if (!allowedRates.has(rate)) return false;
  apply({ ...snapshot, rate });
  return persist();
}
