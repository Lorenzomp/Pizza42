import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const resolveBasePath = (audience?: string) => {
  if (!audience) return '';
  try {
    return new URL(audience).pathname.replace(/\/$/, '');
  } catch {
    return '';
  }
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const audience = env.AUTH0_AUDIENCE;
  const basePath = resolveBasePath(audience);
  const apiPort = Number(env.PORT || 3000);
  const apiTarget = `http://localhost:${Number.isFinite(apiPort) ? apiPort : 3000}`;

  return {
    plugins: [react()],
    envPrefix: ['VITE_', 'AUTH0_'],
    server: basePath
      ? {
        proxy: {
          [basePath]: {
            target: apiTarget,
            changeOrigin: true,
          },
        },
      }
      : undefined,
  };
});
