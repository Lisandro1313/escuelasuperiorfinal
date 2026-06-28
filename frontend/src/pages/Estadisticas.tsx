import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

interface Win { views: number; visitors: number; }
interface Analytics {
  totals: Win;
  today: Win;
  last7: Win;
  last30: Win;
  online_now: number;
  users: { total: number; alumnos: number; new7: number; new30: number };
  split: { logueados: number; anonimos: number };
  series: { dia: string; views: number; visitors: number }[];
  top_pages: { path: string; views: number; visitors: number }[];
}

// Etiqueta amigable para las rutas más comunes.
const labelPath = (p: string): string => {
  if (p === '/' ) return 'Inicio (landing)';
  if (p === '/dashboard') return 'Panel';
  if (p === '/courses') return 'Catálogo / Tienda';
  if (p === '/login') return 'Iniciar sesión';
  if (p === '/register') return 'Registro';
  if (p === '/students') return 'Mis estudiantes';
  if (p === '/profile') return 'Mi perfil';
  if (p === '/mis-compras') return 'Mis compras';
  if (p === '/tienda/pedidos') return 'Pedidos de la tienda';
  if (p === '/admin/estadisticas') return 'Estadísticas';
  if (p === '/admin/users') return 'Gestión de usuarios';
  if (p === '/ayuda') return 'Ayuda';
  if (/^\/course\/\d+\/aula/.test(p) || /^\/course\/\d+\/view/.test(p)) return 'Aula (cursando)';
  if (/^\/course\/\d+\/manage/.test(p)) return 'Editar curso';
  if (/^\/course\/\d+\/certificado/.test(p)) return 'Certificado';
  if (/^\/course\/\d+/.test(p)) return 'Detalle de curso';
  if (/^\/live\//.test(p)) return 'Clase en vivo';
  return p;
};

// Últimos 30 días en formato YYYY-MM-DD (UTC, igual que el backend).
const last30Days = (): string[] => {
  const out: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
};

const Estadisticas: React.FC = () => {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then((r) => { if (!r.ok) throw new Error('No se pudo cargar'); return r.json(); })
      .then((d) => setData(d))
      .catch(() => setError('No se pudieron cargar las estadísticas.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const chart = useMemo(() => {
    if (!data) return [];
    const map = new Map(data.series.map((s) => [s.dia, s]));
    return last30Days().map((dia) => ({
      dia,
      views: map.get(dia)?.views || 0,
      visitors: map.get(dia)?.visitors || 0,
    }));
  }, [data]);

  const maxViews = Math.max(1, ...chart.map((c) => c.views));

  const cards = data ? [
    { label: 'En línea ahora', value: data.online_now, sub: 'últimos 5 min', icon: '🟢', color: 'bg-green-50 text-green-600' },
    { label: 'Visitas hoy', value: data.today.views, sub: `${data.today.visitors} visitantes`, icon: '👁️', color: 'bg-blue-50 text-blue-600' },
    { label: 'Visitas (7 días)', value: data.last7.views, sub: `${data.last7.visitors} visitantes`, icon: '📈', color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Visitas (30 días)', value: data.last30.views, sub: `${data.last30.visitors} visitantes`, icon: '🗓️', color: 'bg-purple-50 text-purple-600' },
    { label: 'Usuarios registrados', value: data.users.total, sub: `${data.users.alumnos} alumnos`, icon: '👥', color: 'bg-amber-50 text-amber-600' },
    { label: 'Nuevos usuarios (30 días)', value: data.users.new30, sub: `${data.users.new7} en la última semana`, icon: '✨', color: 'bg-pink-50 text-pink-600' },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">← Volver al panel</Link>
          <div className="flex items-center justify-between gap-4 mt-2">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Estadísticas de la web</h1>
              <p className="text-gray-500">Visitas, visitantes y crecimiento del sitio</p>
            </div>
            <button onClick={load} className="text-sm font-medium text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition shrink-0">
              ↻ Actualizar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
          </div>
        ) : error || !data ? (
          <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="text-5xl mb-3">📊</div>
            <p className="text-gray-500 mb-3">{error || 'Sin datos'}</p>
            <button onClick={load} className="text-blue-600 hover:underline text-sm">Reintentar</button>
          </div>
        ) : (
          <>
            {/* Tarjetas */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((m) => (
                <div key={m.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${m.color}`}>{m.icon}</div>
                  <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                  <p className="text-2xl font-extrabold text-gray-900 leading-tight">{m.value.toLocaleString('es-AR')}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
                </div>
              ))}
            </div>

            {/* Gráfico de visitas por día */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">Visitas por día (últimos 30)</h2>
                <span className="text-xs text-gray-400">Pico: {maxViews.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex items-end gap-1 h-44">
                {chart.map((c) => (
                  <div key={c.dia} className="flex-1 group relative flex flex-col justify-end h-full">
                    <div
                      className="w-full bg-blue-500 hover:bg-blue-600 rounded-t transition-all"
                      style={{ height: `${Math.max(2, (c.views / maxViews) * 100)}%` }}
                    />
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-900 text-white text-[11px] rounded px-2 py-1 whitespace-nowrap z-10">
                      {new Date(c.dia + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}: {c.views} visitas · {c.visitors} visitantes
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[11px] text-gray-400">
                <span>{new Date(chart[0]?.dia + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>
                <span>hoy</span>
              </div>
            </div>

            {/* Páginas más vistas */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Páginas más visitadas (30 días)</h2>
              {data.top_pages.length === 0 ? (
                <p className="text-gray-400 text-sm">Todavía no hay visitas registradas.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.top_pages.map((p) => {
                    const max = Math.max(1, ...data.top_pages.map((x) => x.views));
                    return (
                      <div key={p.path} className="flex items-center gap-3">
                        <div className="w-44 shrink-0 truncate text-sm text-gray-700" title={p.path}>{labelPath(p.path)}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(p.views / max) * 100}%` }} />
                        </div>
                        <div className="w-24 text-right text-sm text-gray-500 shrink-0">{p.views} ({p.visitors}👤)</div>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-4">
                Logueados: {data.split.logueados.toLocaleString('es-AR')} · Anónimos: {data.split.anonimos.toLocaleString('es-AR')} (visitas de los últimos 30 días)
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Estadisticas;
