// Base del backend para todas las llamadas a /api.
//
// En producción apuntamos SIEMPRE directo al backend de Render. El proxy de
// Vercel (/api -> Render via rewrites) funciona con curl pero falla en el
// navegador (devuelve 405), así que lo evitamos y vamos directo: el backend
// tiene CORS habilitado para el dominio del frontend.
//
// Se puede override con VITE_API_URL (raíz del backend, con o sin /api al
// final). Si VITE_API_URL apunta al propio dominio de Vercel (mal configurado)
// lo ignoramos y usamos el backend de Render.

const FALLBACK_BACKEND = 'https://campus-norma-backend.onrender.com';

const RAW = (import.meta.env.VITE_API_URL || '')
  .replace(/\/+$/, '')   // saca "/" final
  .replace(/\/api$/, ''); // saca "/api" final (las rutas ya incluyen /api)

const isRealBackend = /^https?:\/\//.test(RAW) && !RAW.includes('vercel.app');

export const API_BASE = isRealBackend
  ? RAW
  : (import.meta.env.PROD ? FALLBACK_BACKEND : '');
