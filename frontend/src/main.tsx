import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/classic-theme.css';
import { API_BASE } from './config';

// Interceptor global de fetch: los componentes que usan fetch directo (sin
// axios) con rutas /api o /uploads se redirigen al backend de Render. Así
// funcionan en producción donde frontend (Vercel) y backend (Render) viven
// en orígenes distintos. Base centralizada en config.ts.
if (API_BASE) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && (input.startsWith('/api') || input.startsWith('/uploads'))) {
      return originalFetch(API_BASE + input, init);
    }
    return originalFetch(input, init);
  };
}

// PWA: registramos el service worker para poder instalar la app.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* sin SW, la app igual funciona */ });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
