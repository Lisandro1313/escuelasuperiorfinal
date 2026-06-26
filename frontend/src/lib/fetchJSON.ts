// fetch con reintentos. Render free se "duerme" y la primera request tras el
// spin-down puede tardar/fallar; reintentamos para que la UI no quede vacía.
export async function fetchJSON<T = unknown>(
  url: string,
  opts?: RequestInit,
  retries = 2,
  delayMs = 1500
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, opts);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}
