import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface Course {
  id: number;
  nombre: string;
  descripcion: string;
  profesor: string;
  categoria: string;
  precio: number;
  duracion: string;
  estudiantes: number;
  rating: number;
  imagen: string;
}

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

const CourseCatalog: React.FC = () => {
  const { usuario } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'todos' | 'gratis' | 'pago'>('todos');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  useEffect(() => {
    fetch('/api/courses')
      .then((r) => r.json())
      .then((d) => setCourses(Array.isArray(d) ? d : []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  // Categorías derivadas de los cursos reales
  const categories = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => c.categoria && set.add(c.categoria));
    return ['Todas', ...Array.from(set).sort()];
  }, [courses]);

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        const match =
          c.nombre.toLowerCase().includes(q) ||
          (c.descripcion || '').toLowerCase().includes(q) ||
          (c.profesor || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      if (selectedCategory !== 'Todas' && c.categoria !== selectedCategory) return false;
      if (filter === 'gratis' && Number(c.precio) > 0) return false;
      if (filter === 'pago' && Number(c.precio) === 0) return false;
      return true;
    });
  }, [courses, search, selectedCategory, filter]);

  const isEnrolled = (id: number) => usuario?.cursosInscritos?.includes(id) || false;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Catálogo de cursos</h1>
          <p className="text-gray-600 mt-1">Elegí el que más te interese y empezá a aprender</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-col lg:flex-row gap-3">
          <input
            type="text"
            placeholder="Buscar curso, profesor o tema..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {categories.length > 1 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['todos', 'gratis', 'pago'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition capitalize ${
                  filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {f === 'todos' ? 'Todos' : f === 'gratis' ? 'Gratis' : 'De pago'}
              </button>
            ))}
          </div>
        </div>

        {/* Resultado */}
        {loading ? (
          <div className="text-center py-16 text-gray-500">Cargando cursos...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-lg text-gray-700">
              {courses.length === 0 ? 'Todavía no hay cursos publicados' : 'No encontramos cursos con esos filtros'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {courses.length === 0 ? 'Volvé pronto.' : 'Probá quitando algún filtro.'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{filtered.length} {filtered.length === 1 ? 'curso' : 'cursos'}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((c) => (
                <Link
                  key={c.id}
                  to={`/course/${c.id}`}
                  className="bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition overflow-hidden flex flex-col"
                >
                  <div className="bg-gradient-to-br from-blue-500 to-purple-600 h-32 flex items-center justify-center text-6xl">
                    {c.imagen || '📚'}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{c.categoria}</span>
                      {isEnrolled(c.id) && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Inscripto</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{c.nombre}</h3>
                    <p className="text-sm text-gray-500 mb-2">por {c.profesor}</p>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">{c.descripcion}</p>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-xs text-gray-500">{c.duracion || ''}</span>
                      <span className={`font-bold text-lg ${Number(c.precio) === 0 ? 'text-green-600' : 'text-blue-600'}`}>
                        {Number(c.precio) === 0 ? 'GRATIS' : formatARS(Number(c.precio))}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CourseCatalog;
