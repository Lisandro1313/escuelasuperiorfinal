import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface MyCourse {
  id: number;
  course_id: number;
  nombre: string;
  descripcion?: string;
  profesor?: string;
  imagen?: string;
  categoria?: string;
  precio: number;
  progress?: number;
  completed?: number | boolean;
  enrolled_at?: string;
}

interface CatalogCourse {
  id: number;
  nombre: string;
  descripcion: string;
  profesor: string;
  categoria: string;
  precio: number;
  imagen?: string;
}

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

export const StudentDashboard: React.FC = () => {
  const { usuario } = useAuth();
  const [myCourses, setMyCourses] = useState<MyCourse[]>([]);
  const [catalog, setCatalog] = useState<CatalogCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    Promise.all([
      fetch('/api/my-courses', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch('/api/courses').then((r) => r.json()),
    ])
      .then(([mine, all]) => {
        setMyCourses(Array.isArray(mine) ? mine : []);
        setCatalog(Array.isArray(all) ? all : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const enrolledIds = new Set(myCourses.map((c) => c.id ?? c.course_id));
  const recommended = catalog.filter((c) => !enrolledIds.has(c.id)).slice(0, 6);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Hola, {usuario?.nombre} 👋</h1>
          <p className="text-gray-600 mt-1">
            {myCourses.length === 0
              ? 'Todavía no estás inscripto en ningún curso. Mirá el catálogo y sumate al que te guste.'
              : `Tenés ${myCourses.length} curso${myCourses.length > 1 ? 's' : ''} en marcha`}
          </p>
        </div>

        {/* Mis cursos (en progreso) */}
        {myCourses.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Continuá donde dejaste</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {myCourses.map((c) => {
                const courseId = c.id ?? c.course_id;
                const progress = Math.round(Number(c.progress || 0));
                return (
                  <Link
                    key={courseId}
                    to={`/course/${courseId}/view`}
                    className="bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition overflow-hidden"
                  >
                    <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white p-6 flex items-center justify-between">
                      <span className="text-5xl">{c.imagen || '📚'}</span>
                      <span className="text-3xl font-bold">{progress}%</span>
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{c.nombre}</h3>
                      {c.profesor && <p className="text-sm text-gray-500 mb-3">por {c.profesor}</p>}
                      <div className="bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {progress === 0 ? 'Empezá ahora' : progress >= 100 ? '✅ Completado' : 'En progreso'}
                        </span>
                        <span className="text-blue-600 font-medium">Continuar →</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Catálogo: recomendados o estado vacío */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {myCourses.length === 0 ? 'Cursos disponibles' : 'Te puede interesar'}
            </h2>
            <Link to="/courses" className="text-blue-600 hover:underline text-sm font-medium">
              Ver todo el catálogo →
            </Link>
          </div>

          {recommended.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
              <p className="text-gray-500">Estás al día. Pronto vamos a tener más cursos para vos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {recommended.map((c) => (
                <Link
                  key={c.id}
                  to={`/course/${c.id}`}
                  className="bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition p-5"
                >
                  <div className="text-4xl mb-3">{c.imagen || '📚'}</div>
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{c.nombre}</h3>
                  <p className="text-sm text-gray-500 mb-3">por {c.profesor}</p>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4">{c.descripcion}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      {c.categoria}
                    </span>
                    <span
                      className={`font-bold ${
                        Number(c.precio) === 0 ? 'text-green-600' : 'text-blue-600'
                      }`}
                    >
                      {Number(c.precio) === 0 ? 'GRATIS' : formatARS(Number(c.precio))}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default StudentDashboard;
