import { useEffect, useState } from 'react';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

type VoiceScene = {
  state: VoiceState;
  duration: number;
  text: string;
  speaker: 'Mate' | 'Bạn · ví dụ';
  word?: string;
  tip?: string;
};

const scenes: VoiceScene[] = [
  { state: 'idle', duration: 1000, text: '', speaker: 'Mate' },
  {
    state: 'speaking',
    duration: 4400,
    text: "Hi! Let's order a coffee together.",
    speaker: 'Mate',
    word: 'coffee',
    tip: 'coffee /ˈkɒfi/ · Nhấn âm đầu.',
  },
  {
    state: 'listening',
    duration: 5000,
    text: "I'd like a coffee, please.",
    speaker: 'Bạn · ví dụ',
    word: 'please',
    tip: 'please /pliːz/ · Kéo dài âm /iː/.',
  },
  {
    state: 'thinking',
    duration: 1800,
    text: "I'd like a coffee, please.",
    speaker: 'Bạn · ví dụ',
  },
  {
    state: 'speaking',
    duration: 4800,
    text: 'Great! Would you like it hot or iced?',
    speaker: 'Mate',
    word: 'iced',
    tip: 'iced /aɪst/ · Giữ nhẹ âm /t/ cuối.',
  },
  {
    state: 'listening',
    duration: 5000,
    text: 'Iced, please. Thank you!',
    speaker: 'Bạn · ví dụ',
    word: 'Thank',
    tip: 'thank /θæŋk/ · Đặt lưỡi nhẹ giữa răng.',
  },
  {
    state: 'thinking',
    duration: 1800,
    text: 'Iced, please. Thank you!',
    speaker: 'Bạn · ví dụ',
  },
  {
    state: 'speaking',
    duration: 4600,
    text: 'You did well. Shall we try again?',
    speaker: 'Mate',
    word: 'again',
    tip: 'again /əˈɡen/ · Nhấn âm cuối.',
  },
];

/** Replace this hook with a voice adapter when live sessions are introduced. */
export function useMockVoice() {
  const [sceneStep, setSceneStep] = useState(0);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const sceneIndex = sceneStep === 0 ? 0 : ((sceneStep - 1) % (scenes.length - 1)) + 1;
  const scene = scenes[sceneIndex];

  useEffect(() => {
    if (paused || muted) return;

    const timer = window.setTimeout(() => {
      setSceneStep((step) => step + 1);
    }, scene.duration);

    return () => window.clearTimeout(timer);
  }, [sceneStep, scene.duration, paused, muted]);

  return {
    scene,
    sceneKey: sceneStep,
    state: paused || muted ? ('idle' as const) : scene.state,
    muted,
    paused,
    toggleMute: () => setMuted((value) => !value),
    togglePause: () => setPaused((value) => !value),
  };
}
