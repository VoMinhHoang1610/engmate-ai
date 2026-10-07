/** Browser speech synthesis, with an explicit unsupported-browser result. */
export function docTiengAnh(text: string, rate = 1): boolean {
  if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== 'function')
    return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  const preference = Number(document.documentElement.dataset.speechRate ?? 1);
  utterance.rate = rate * ([0.75, 1, 1.25].includes(preference) ? preference : 1);
  const voice = window.speechSynthesis.getVoices().find((item) => item.lang.startsWith('en'));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
  return true;
}
