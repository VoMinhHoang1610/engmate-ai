import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '');
  return {
    define: {
      'import.meta.env.VITE_VOICE_DEBUG': JSON.stringify(env.VITE_VOICE_DEBUG ?? 'false'),
      'import.meta.env.VITE_VOICE_SOFT_GATE': JSON.stringify(env.VITE_VOICE_SOFT_GATE ?? 'false'),
      'import.meta.env.VITE_VOICE_ADAPTIVE_VAD': JSON.stringify(
        env.VITE_VOICE_ADAPTIVE_VAD ?? 'false',
      ),
    },
    plugins: [react(), tailwindcss()],
    server: {
      host: '127.0.0.1',
      port: 5174,
      strictPort: true,
      proxy: {
        '/api': {
          target: process.env.BACKEND_URL ?? env.BACKEND_URL ?? 'http://127.0.0.1:8010',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
