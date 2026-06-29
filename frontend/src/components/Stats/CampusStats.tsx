import React, { useEffect, useMemo, useState } from 'react';

interface Overview {
  totalStudents: number;
  totalCourses: number;
  totalQuizzes: number;
  averageScore: number;
  completionRate: number;
  totalRevenue: number;
  totalPayments: number;
  totalEnrollments: number;
  liveClassesCount: number;
  liveAnotados: number;
  liveRecaudado: number;
}
interface CoursePerf { id: number; nombre: string; anotados: number; pagaron: number; completaron: number; totalLessons: number; avancePromedio: number; }
interface LiveClass { id: number; title: string; start_date: string; precio: number; course_name: string | null; anotados: number; pagaron: number; asistieron: number; recaudado: number; }
interface QuizPerf { id: number; title: string; attempts: number; avg_percentage: number | null; }
interface Analytics {
  overview: Overview;
  coursePerformance: CoursePerf[];
  liveClasses: LiveClass[];
  quizAnalytics: QuizPerf[];
  revenueData: { month: string; revenue: number }[];
}

const ars = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(n || 0));
const fecha = (iso: string) => { try { return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }); } catch { return ''; } };
const mesLabel = (m: string) => { try { return new Date(m + '-01T00:00:00').toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }); } catch { return m; } };

const LiveTable: React.FC<{ rows: LiveClass[] }> = ({ rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm min-w-[600px]">
      <thead>
        <tr className="text-left text-gray-400 border-b border-gray-100">
          <th className="pb-2 font-medium">Clase</th>
          <th className="pb-2 font-medium">Fecha</th>
          <th className="pb-2 font-medium text-center">Anotados</th>
          <th className="pb-2 font-medium text-center">Pagaron</th>
          <th className="pb-2 font-medium text-center">Asistieron</th>
          <th className="pb-2 font-medium text-right">Recaudado</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((l) => (
          <tr key={l.id} className="border-b border-gray-50 last:border-0">
            <td className="py-2.5 font-medium text-gray-900">
              {l.title}
              {l.course_name && <span className="block text-xs text-gray-400 font-normal">{l.course_name}</span>}
            </td>
            <td className="py-2.5 text-gray-500 whitespace-nowrap">{fecha(l.start_date)}</td>
            <td className="py-2.5 text-center text-gray-700">{l.anotados}</td>
            <td className="py-2.5 text-center text-gray-700">{Number(l.precio) > 0 ? l.pagaron : '—'}</td>
            <td className="py-2.5 text-center text-gray-700">{l.asistieron}</td>
            <td className="py-2.5 text-right font-semibold text-emerald-600">{Number(l.precio) > 0 ? ars(l.recaudado) : 'Gratis'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const CampusStats: React.FC = () => {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/analytics', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => setError('No se pudieron cargar las estadísticas.'))
      .finally(() => setLoading(false));
  }, []);

  const months = useMemo(() => (data ? [...data.revenueData].reverse() : []), [data]);
  const maxRev = Math.max(1, ...months.map((m) => Number(m.revenue || 0)));

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up: LiveClass[] = []; const pa: LiveClass[] = [];
    (data?.liveClasses || []).forEach((l) => {
      (new Date(l.start_date).getTime() >= now ? up : pa).push(l);
    });
    up.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    return { upcoming: up, past: pa };
  }, [data]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-gray-200">
        <div className="text-5xl mb-3">📊</div>
        <p className="text-gray-500">{error || 'Sin datos'}</p>
      </div>
    );
  }

  const o = data.overview;
  const cards = [
    { label: 'Recaudado', value: ars(o.totalRevenue), sub: `${o.totalPayments} pagos`, color: 'text-emerald-600' },
    { label: 'Alumnos', value: String(o.totalStudents ?? 0), sub: `${o.totalEnrollments} inscripciones`, color: 'text-blue-600' },
    { label: 'Cursos', value: String(o.totalCourses ?? 0), sub: 'publicados/creados', color: 'text-indigo-600' },
    { label: 'Completado', value: `${Math.round(o.completionRate || 0)}%`, sub: 'de los cursos', color: 'text-purple-600' },
    { label: 'Clases en vivo', value: String(o.liveClassesCount ?? 0), sub: `${o.liveAnotados} anotados`, color: 'text-rose-600' },
    { label: 'Nota promedio', value: `${Math.round(o.averageScore || 0)}%`, sub: 'en cuestionarios', color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-8">
      {/* Tarjetas */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-gray-400 mb-1">{c.label}</p>
            <p className={`text-2xl font-extrabold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Recaudación por mes */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">💰 Recaudación por mes</h2>
        <p className="text-xs text-gray-400 mb-5">Pagos acreditados (cursos + clases en vivo)</p>
        {months.length === 0 ? (
          <p className="text-gray-400 text-sm">Todavía no hay pagos registrados.</p>
        ) : (
          <>
            <div className="flex items-end gap-2 h-44">
              {months.map((m) => (
                <div key={m.month} className="flex-1 group relative flex flex-col justify-end h-full">
                  <div
                    className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t transition-all"
                    style={{ height: `${Math.max(2, (Number(m.revenue || 0) / maxRev) * 100)}%` }}
                  />
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-900 text-white text-[11px] rounded px-2 py-1 whitespace-nowrap z-10">
                    {mesLabel(m.month)}: {ars(m.revenue)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              {months.map((m) => (
                <div key={m.month} className="flex-1 text-center text-[11px] text-gray-400 truncate">{mesLabel(m.month)}</div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Por curso */}
      {data.coursePerformance.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-x-auto">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📚 Por curso</h2>
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="pb-2 font-medium">Curso</th>
                <th className="pb-2 font-medium text-center">Anotados</th>
                <th className="pb-2 font-medium text-center">Pagaron</th>
                <th className="pb-2 font-medium text-center">Completaron</th>
                <th className="pb-2 font-medium text-right">Avance prom.</th>
              </tr>
            </thead>
            <tbody>
              {data.coursePerformance.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 font-medium text-gray-900">{c.nombre}</td>
                  <td className="py-2.5 text-center text-gray-700">{c.anotados}</td>
                  <td className="py-2.5 text-center text-gray-700">{c.pagaron}</td>
                  <td className="py-2.5 text-center text-gray-700">{c.completaron}</td>
                  <td className="py-2.5 text-right">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden hidden sm:inline-block">
                        <span className="block h-full bg-blue-500" style={{ width: `${c.avancePromedio}%` }} />
                      </span>
                      <span className="font-semibold text-blue-600">{c.avancePromedio}%</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Clases en vivo: próximas */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">🔴 Clases en vivo · Próximas</h2>
        {upcoming.length === 0 ? (
          <p className="text-gray-400 text-sm">No hay clases en vivo programadas.</p>
        ) : <LiveTable rows={upcoming} />}
      </div>

      {/* Clases en vivo: pasadas (histórico) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">🕓 Clases en vivo · Pasadas (histórico)</h2>
        <p className="text-xs text-gray-400 mb-4">Anotados, asistencia y lo recaudado de las clases que ya pasaron</p>
        {past.length === 0 ? (
          <p className="text-gray-400 text-sm">Todavía no hay clases en vivo finalizadas.</p>
        ) : <LiveTable rows={past} />}
      </div>

      {/* Cuestionarios */}
      {data.quizAnalytics.filter((q) => q.attempts > 0).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-x-auto">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📝 Cuestionarios</h2>
          <table className="w-full text-sm min-w-[360px]">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="pb-2 font-medium">Cuestionario</th>
                <th className="pb-2 font-medium text-center">Rindieron</th>
                <th className="pb-2 font-medium text-right">Nota promedio</th>
              </tr>
            </thead>
            <tbody>
              {data.quizAnalytics.filter((q) => q.attempts > 0).map((q) => (
                <tr key={q.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 font-medium text-gray-900">{q.title}</td>
                  <td className="py-2.5 text-center text-gray-700">{q.attempts}</td>
                  <td className="py-2.5 text-right font-semibold text-amber-600">{Math.round(Number(q.avg_percentage || 0))}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CampusStats;
