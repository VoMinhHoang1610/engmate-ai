import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { applyTheme, readTheme } from './theme';

const LiveApp = lazy(() => import('./voice-first/LiveApp'));
const VoiceFirstApp = lazy(() => import('./voice-first/VoiceFirstApp'));
const previewMode = new URLSearchParams(window.location.search).get('mode') === 'preview';

applyTheme(readTheme());

const root = document.getElementById('root');
if (!root) throw new Error('Missing application root.');
createRoot(root).render(
  <StrictMode>
    <Suspense fallback={<div role="status">Đang mở EngMate…</div>}>
      {previewMode ? <VoiceFirstApp /> : <LiveApp />}
    </Suspense>
  </StrictMode>,
);
