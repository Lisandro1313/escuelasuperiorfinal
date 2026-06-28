// Tracking de visitas propio (sin servicios externos). Guarda un id anónimo de
// visitante en el navegador y avisa al backend en cada cambio de página.

const VISITOR_KEY = 'campus-visitor';

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : 'v-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

export function trackPageView(path: string): void {
  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    // keepalive: que el ping sobreviva aunque se navegue/cierre la pestaña.
    fetch('/api/track', {
      method: 'POST',
      headers,
      body: JSON.stringify({ path, visitorId: getVisitorId() }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* el tracking nunca debe romper la app */
  }
}
