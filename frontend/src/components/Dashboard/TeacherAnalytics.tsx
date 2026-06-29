import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Analytics {
  overview: {
    totalStudents: number;
    totalRevenue: number;
    totalPayments: number;
    totalEnrollments: number;
    completionRate: number;
    averageScore: number;
    liveClassesCount?: number;
    liveAnotados?: number;
  };
}

const ars = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(n || 0));

// Resumen compacto de estadísticas para el panel. El detalle completo (gráficos,
// tablas, clases en vivo, histórico) vive en la página /estadisticas.
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
    { label: 'Clases en vivo', value: String(o.liveClassesCount ?? 0), sub: `${o.liveAnotados ?? 0} anotados`, color: 'text-rose-600' },
    { label: 'Nota promedio', value: `${Math.round(o.averageScore || 0)}%`, sub: 'en cuestionarios', color: 'text-amber-600' },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900">📈 Estadísticas</h2>
        <Link to="/estadisticas" className="text-sm text-blue-600 hover:underline font-medium">
          Ver estadísticas completas →
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            to="/estadisticas"
            className="bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md rounded-2xl p-4 transition"
          >
            <p className="text-xs text-gray-400">{c.label}</p>
            <p className={`text-2xl font-extrabold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-400">{c.sub}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default TeacherAnalytics;
