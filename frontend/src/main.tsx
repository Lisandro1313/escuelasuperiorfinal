import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Interceptor global de fetch: si VITE_API_URL esta seteado y el path empieza
// con / (relativo), lo prefijeamos al backend. Asi los componentes que usan
// fetch directo (sin axios) tambien funcionan en produccion donde el frontend
// y el backend viven en origenes distintos (Render).
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
if (API_BASE) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && (input.startsWith('/api') || input.startsWith('/uploads'))) {
      return originalFetch(API_BASE + input, init);
    }
    return originalFetch(input, init);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
