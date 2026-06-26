import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const BACKEND = env.VITE_BACKEND_URL || 'http://localhost:5000';

  return {
    plugins: [react()],
    server: {
      port: 3000,
      open: false,
      proxy: {
        '/api': { target: BACKEND, changeOrigin: true, ws: true },
        '/uploads': { target: BACKEND, changeOrigin: true },
        '/socket.io': { target: BACKEND, changeOrigin: true, ws: true },
      },
    },
  };
});
