import React, { useEffect, useState } from 'react';

interface LiveClass {
  id: number;
  title: string;
  start_date: string;
  precio: number;
  anotados: number;
  pagaron: number;
  recaudado: number;
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
  coursePerformance: { id: number; nombre: string; students: number; usersWithProgress: number }[];
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

      {data.liveClasses && data.liveClasses.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 overflow-x-auto">
          <h3 className="font-bold text-gray-900 mb-3">🔴 Clases en vivo</h3>
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="pb-2 font-medium">Clase</th>
                <th className="pb-2 font-medium">Fecha</th>
                <th className="pb-2 font-medium text-center">Anotados</th>
                <th className="pb-2 font-medium text-center">Pagaron</th>
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
                  <td className="py-2.5 text-right font-semibold text-emerald-600">{Number(l.precio) > 0 ? ars(l.recaudado) : 'Gratis'}</td>
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
