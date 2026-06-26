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

const PLACEHOLDERS = [
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=220&fit=crop',
  'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400&h=220&fit=crop',
  'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=400&h=220&fit=crop',
  'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&h=220&fit=crop',
  'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=220&fit=crop',
];

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
  const completedCount = myCourses.filter((c) => Number(c.progress) >= 100).length;
  const inProgressCount = myCourses.filter((c) => Number(c.progress) > 0 && Number(c.progress) < 100).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Cargando tu panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header con saludo */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">
                Hola, {usuario?.nombre?.split(' ')[0]} 👋
              </h1>
              <p className="text-gray-500 mt-1">
                {myCourses.length === 0
                  ? 'Explorá el catálogo y empezá a aprender'
                  : `${myCourses.length} curso${myCourses.length > 1 ? 's' : ''} en tu biblioteca`}
              </p>
            </div>
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-sm"
            >
              Explorar cursos →
            </Link>
          </div>

          {/* Mini stats si tiene cursos */}
          {myCourses.length > 0 && (
            <div className="flex gap-6 mt-6 pt-6 border-t border-gray-100">
              <div>
                <p className="text-2xl font-bold text-gray-900">{myCourses.length}</p>
                <p className="text-xs text-gray-500">Inscripto{myCourses.length > 1 ? 's' : ''}</p>
              </div>
              <div className="w-px bg-gray-200" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
                <p className="text-xs text-gray-500">En progreso</p>
              </div>
              <div className="w-px bg-gray-200" />
              <div>
                <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                <p className="text-xs text-gray-500">Completado{completedCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

        {/* Mis cursos en progreso */}
        {myCourses.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-5">Continuá donde dejaste</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {myCourses.map((c, idx) => {
                const courseId = c.id ?? c.course_id;
                const progress = Math.round(Number(c.progress || 0));
                const img = c.imagen && c.imagen.startsWith('http') ? c.imagen : PLACEHOLDERS[idx % PLACEHOLDERS.length];
                const isCompleted = progress >= 100;
                return (
                  <Link
                    key={courseId}
                    to={`/course/${courseId}/view`}
                    className="group bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-xl shadow-sm transition-all duration-300 overflow-hidden flex flex-col"
                  >
                    <div className="relative h-36 overflow-hidden shrink-0">
                      <img
                        src={img}
                        alt={c.nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDERS[idx % PLACEHOLDERS.length]; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isCompleted ? 'bg-green-500 text-white' : 'bg-white/90 text-gray-700'}`}>
                          {isCompleted ? '✅ Completado' : `${progress}% completado`}
                        </span>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="h-1 bg-gray-100">
                      <div
                        className={`h-1 transition-all ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors mb-1">
                        {c.nombre}
                      </h3>
                      {c.profesor && (
                        <p className="text-xs text-gray-400 mb-3">por {c.profesor}</p>
                      )}
                      <div className="mt-auto flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {progress === 0 ? 'Sin empezar' : isCompleted ? 'Finalizado' : 'En curso'}
                        </span>
                        <span className="text-xs text-blue-600 font-semibold group-hover:underline">
                          {progress === 0 ? 'Comenzar →' : isCompleted ? 'Repasar →' : 'Continuar →'}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Estado vacío si no tiene cursos */}
        {myCourses.length === 0 && recommended.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">¡Bienvenido a Escuela Superior de Formación!</h3>
            <p className="text-gray-400 mb-6 max-w-xs mx-auto text-sm">
              Todavía no hay cursos publicados. Pronto van a aparecer acá.
            </p>
            <Link
              to="/courses"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition"
            >
              Ver catálogo
            </Link>
          </div>
        )}

        {/* Recomendados / disponibles */}
        {recommended.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">
                {myCourses.length === 0 ? 'Cursos disponibles' : 'Te puede interesar'}
              </h2>
              <Link to="/courses" className="text-sm text-blue-600 hover:underline font-medium">
                Ver todos →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {recommended.map((c, idx) => {
                const img = c.imagen && c.imagen.startsWith('http') ? c.imagen : PLACEHOLDERS[idx % PLACEHOLDERS.length];
                return (
                  <Link
                    key={c.id}
                    to={`/course/${c.id}`}
                    className="group bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-xl shadow-sm transition-all duration-300 overflow-hidden flex flex-col"
                  >
                    <div className="relative h-36 overflow-hidden shrink-0">
                      <img
                        src={img}
                        alt={c.nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDERS[idx % PLACEHOLDERS.length]; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors mb-1">{c.nombre}</h3>
                      <p className="text-xs text-gray-400 mb-2">por {c.profesor}</p>
                      <p className="text-sm text-gray-500 line-clamp-2 flex-1 mb-3">{c.descripcion}</p>
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c.categoria}</span>
                        <span className={`font-bold text-sm ${Number(c.precio) === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                          {Number(c.precio) === 0 ? 'Gratis' : formatARS(Number(c.precio))}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
