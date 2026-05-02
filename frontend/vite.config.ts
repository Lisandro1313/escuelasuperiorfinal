import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const BACKEND = process.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default defineConfig({
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
});
