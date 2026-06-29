import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

interface Win { views: number; visitors: number; }
interface Analytics {
  days: number;
  from: string;
  to: string;
  custom: boolean;
  excludeStaff: boolean;
  totals: Win;
  today: Win;
  last7: Win;
  last30: Win;
  online_now: number;
  users: { total: number; alumnos: number; new7: number; new30: number };
  split: { logueados: number; anonimos: number };
  series: { dia: string; views: number; visitors: number }[];
  top_pages: { path: string; views: number; visitors: number }[];
  course_visits: { course_id: number; nombre: string; views: number; visitors: number }[];
  top_countries: { country: string; views: number; visitors: number }[];
  top_regions: { country: string; region: string; views: number; visitors: number }[];
}

const labelPath = (p: string): string => {
  if (p === '/') return 'Inicio (landing)';
  if (p === '/dashboard') return 'Panel';
  if (p === '/courses') return 'Catálogo / Tienda';
  if (p === '/login') return 'Iniciar sesión';
  if (p === '/register') return 'Registro';
  if (p === '/students') return 'Mis estudiantes';
  if (p === '/profile') return 'Mi perfil';
  if (p === '/mis-compras') return 'Mis compras';
  if (p === '/tienda/pedidos') return 'Pedidos de la tienda';
  if (p === '/estadisticas' || p === '/admin/estadisticas') return 'Estadísticas';
  if (p === '/admin/users') return 'Gestión de usuarios';
  if (p === '/ayuda') return 'Ayuda';
  if (/^\/course\/\d+\/aula/.test(p) || /^\/course\/\d+\/view/.test(p)) return 'Aula (cursando)';
  if (/^\/course\/\d+\/manage/.test(p)) return 'Editar curso';
  if (/^\/course\/\d+\/certificado/.test(p)) return 'Certificado';
  if (/^\/course\/\d+/.test(p)) return 'Detalle de curso';
  if (/^\/live\//.test(p)) return 'Clase en vivo';
  return p;
};

const daysBetween = (from: string, to: string): string[] => {
  const out: string[] = [];
  const start = new Date(from + 'T00:00:00Z').getTime();
  const end = new Date(to + 'T00:00:00Z').getTime();
  if (isNaN(start) || isNaN(end) || end < start) return out;
  for (let t = start; t <= end && out.length < 200; t += 86400000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
};

const todayYMD = () => new Date().toISOString().slice(0, 10);

const RANGES: { value: number; label: string }[] = [
  { value: 7, label: '7 días' },
  { value: 30, label: '30 días' },
  { value: 90, label: '90 días' },
];

const WebStats: React.FC = () => {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [customFrom, setCustomFrom] = useState(() => new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(() => todayYMD());
  const [excludeStaff, setExcludeStaff] = useState(true);

  const load = () => {
    setLoading(true);
    setError('');
    const params = mode === 'custom' ? `from=${customFrom}&to=${customTo}` : `days=${days}`;
    const qs = `${params}&excludeStaff=${excludeStaff ? 1 : 0}`;
    fetch(`/api/admin/analytics?${qs}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then((r) => { if (!r.ok) throw new Error('No se pudo cargar'); return r.json(); })
      .then((d) => setData(d))
      .catch(() => setError('No se pudieron cargar las estadísticas.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [days, excludeStaff, mode]);

  const chart = useMemo(() => {
    if (!data) return [];
    const map = new Map(data.series.map((s) => [s.dia, s]));
    return daysBetween(data.from, data.to).map((dia) => ({
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
    <div>
      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => { setMode('preset'); setDays(r.value); }}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${mode === 'preset' && days === r.value ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {r.label}
            </button>
          ))}
          <button
            onClick={() => setMode('custom')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${mode === 'custom' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Personalizado
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 rounded-xl px-3 py-2 cursor-pointer select-none">
          <input type="checkbox" checked={excludeStaff} onChange={(e) => setExcludeStaff(e.target.checked)} className="w-4 h-4" />
          Excluir mis visitas (staff)
        </label>
        <button onClick={load} className="text-sm font-medium text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition">
          ↻ Actualizar
        </button>
      </div>

      {mode === 'custom' && (
        <div className="mb-6 flex flex-wrap items-end gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input type="date" value={customTo} min={customFrom} max={todayYMD()} onChange={(e) => setCustomTo(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm outline-none focus:border-blue-500" />
          </div>
          <button onClick={load} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition">
            Aplicar
          </button>
        </div>
      )}

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
        <div className="space-y-8">
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
              <h2 className="text-lg font-bold text-gray-900">
                Visitas por día {data.custom ? '(rango elegido)' : `(últimos ${data.days})`}
              </h2>
              <span className="text-xs text-gray-400">Pico: {maxViews.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex items-end gap-1 h-44">
              {chart.map((c) => (
                <div key={c.dia} className="flex-1 group relative flex flex-col justify-end h-full">
                  <div
                    className="w-full bg-blue-500 hover:bg-blue-600 rounded-t transition-all"
                    style={{ height: `${Math.max(2, (c.views / maxViews) * 100)}%` }}
                  />
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-900 text-white text-[11px] rounded px-2 py-1 whitespace-nowrap z-10">
                    {new Date(c.dia + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}: {c.views} visitas · {c.visitors} visitantes
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[11px] text-gray-400">
              <span>{chart[0] ? new Date(chart[0].dia + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : ''}</span>
              <span>{data.custom ? new Date(data.to + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : 'hoy'}</span>
            </div>
          </div>

          {/* Ubicación: países y provincias/regiones */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">🌎 Países</h2>
              <p className="text-xs text-gray-400 mb-4">De dónde son las visitas</p>
              {data.top_countries.length === 0 ? (
                <p className="text-gray-400 text-sm">Todavía no hay datos de ubicación en este período.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.top_countries.map((c) => {
                    const max = Math.max(1, ...data.top_countries.map((x) => x.views));
                    return (
                      <div key={c.country} className="flex items-center gap-3">
                        <div className="w-36 shrink-0 truncate text-sm text-gray-700" title={c.country}>{c.country}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div className="bg-sky-500 h-full rounded-full" style={{ width: `${(c.views / max) * 100}%` }} />
                        </div>
                        <div className="w-24 text-right text-sm text-gray-500 shrink-0">{c.views} ({c.visitors}👤)</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">📍 Provincias / Regiones</h2>
              <p className="text-xs text-gray-400 mb-4">Aproximado según la conexión (puede no ser exacto)</p>
              {data.top_regions.length === 0 ? (
                <p className="text-gray-400 text-sm">Todavía no hay datos de ubicación en este período.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.top_regions.map((r) => {
                    const max = Math.max(1, ...data.top_regions.map((x) => x.views));
                    return (
                      <div key={`${r.country}-${r.region}`} className="flex items-center gap-3">
                        <div className="w-40 shrink-0 truncate text-sm text-gray-700" title={`${r.region} · ${r.country}`}>
                          {r.region} <span className="text-gray-400">· {r.country}</span>
                        </div>
                        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div className="bg-violet-500 h-full rounded-full" style={{ width: `${(r.views / max) * 100}%` }} />
                        </div>
                        <div className="w-20 text-right text-sm text-gray-500 shrink-0">{r.views} ({r.visitors}👤)</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cursos más visitados */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Cursos más visitados ({data.days} días)</h2>
            <p className="text-xs text-gray-400 mb-4">Cuánta gente entró a la ficha o el aula de cada curso</p>
            {data.course_visits.length === 0 ? (
              <p className="text-gray-400 text-sm">Todavía no hubo visitas a cursos en este período.</p>
            ) : (
              <div className="space-y-2.5">
                {data.course_visits.map((c) => {
                  const max = Math.max(1, ...data.course_visits.map((x) => x.views));
                  return (
                    <div key={c.course_id} className="flex items-center gap-3">
                      <div className="w-48 shrink-0 truncate text-sm text-gray-700" title={c.nombre}>
                        <Link to={`/course/${c.course_id}`} className="hover:text-blue-600 hover:underline">{c.nombre || `Curso #${c.course_id}`}</Link>
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(c.views / max) * 100}%` }} />
                      </div>
                      <div className="w-28 text-right text-sm text-gray-500 shrink-0">{c.views} visitas · {c.visitors}👤</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Páginas más vistas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Páginas más visitadas ({data.days} días)</h2>
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
              Logueados: {data.split.logueados.toLocaleString('es-AR')} · Anónimos: {data.split.anonimos.toLocaleString('es-AR')} (visitas de los últimos {data.days} días{data.excludeStaff ? ', sin staff' : ''})
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebStats;
