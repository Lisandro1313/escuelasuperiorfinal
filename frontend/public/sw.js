// Service worker mínimo: habilita instalar la app (PWA). No cachea respuestas
// del backend (para no servir datos viejos); solo deja pasar las requests.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // passthrough: usamos la red normalmente.
});
