import React, { useEffect, useState } from 'react';

interface LiveClass {
  id: number;
  title: string;
  start_date: string;
  precio: number;
  anotados: number;
  pagaron: number;
  asistieron: number;
  recaudado: number;
}
interface CoursePerf {
  id: number;
  nombre: string;
  anotados: number;
  pagaron: number;
  completaron: number;
  totalLessons: number;
  avancePromedio: number;
}
interface QuizPerf {
  id: number;
  title: string;
  attempts: number;
  avg_percentage: number | null;
}
interface Analytics {
  overview: {
    totalStudents: number;
    totalRevenue: number;
    totalPayments: number;
    totalEnrollments: number;
    completionRate: number;
    averageScore: number;
  };
  liveClasses: LiveClass[];
  coursePerformance: CoursePerf[];
  quizAnalytics: QuizPerf[];
}

const ars = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(n || 0));
const fecha = (iso: string) => { try { return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }); } catch { return ''; } };

const TeacherAnalytics: React.FC = () => {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return null;

  const o = data.overview;
  const cards = [
    { label: 'Recaudado', value: ars(o.totalRevenue), sub: `${o.totalPayments} pagos`, color: 'text-emerald-600' },
    { label: 'Inscripciones', value: String(o.totalEnrollments ?? 0), sub: `${o.totalStudents} alumnos`, color: 'text-blue-600' },
    { label: 'Completado', value: `${Math.round(o.completionRate || 0)}%`, sub: 'de los cursos', color: 'text-indigo-600' },
    { label: 'Nota promedio', value: `${Math.round(o.averageScore || 0)}%`, sub: 'en cuestionarios', color: 'text-amber-600' },
  ];

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-3">📈 Estadísticas</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-xs text-gray-400">{c.label}</p>
            <p className={`text-2xl font-extrabold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-400">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Rendimiento por curso */}
      {data.coursePerformance && data.coursePerformance.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 overflow-x-auto mb-5">
          <h3 className="font-bold text-gray-900 mb-3">📚 Por curso</h3>
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

      {/* Clases en vivo */}
      {data.liveClasses && data.liveClasses.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 overflow-x-auto mb-5">
          <h3 className="font-bold text-gray-900 mb-3">🔴 Clases en vivo</h3>
          <table className="w-full text-sm min-w-[560px]">
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
              {data.liveClasses.map((l) => (
                <tr key={l.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 font-medium text-gray-900">{l.title}</td>
                  <td className="py-2.5 text-gray-500">{fecha(l.start_date)}</td>
                  <td className="py-2.5 text-center text-gray-700">{l.anotados}</td>
                  <td className="py-2.5 text-center text-gray-700">{Number(l.precio) > 0 ? l.pagaron : '—'}</td>
                  <td className="py-2.5 text-center text-gray-700">{l.asistieron}</td>
                  <td className="py-2.5 text-right font-semibold text-emerald-600">{Number(l.precio) > 0 ? ars(l.recaudado) : 'Gratis'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cuestionarios */}
      {data.quizAnalytics && data.quizAnalytics.filter((q) => q.attempts > 0).length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 overflow-x-auto">
          <h3 className="font-bold text-gray-900 mb-3">📝 Cuestionarios</h3>
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

export default TeacherAnalytics;
