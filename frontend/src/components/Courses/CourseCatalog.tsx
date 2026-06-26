import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchJSON } from '../../lib/fetchJSON';

interface Course {
  id: number;
  nombre: string;
  descripcion: string;
  profesor: string;
  categoria: string;
  precio: number;
  duracion?: string;
  imagen?: string;
}

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

const PLACEHOLDERS = [
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=220&fit=crop',
  'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400&h=220&fit=crop',
  'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=400&h=220&fit=crop',
  'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&h=220&fit=crop',
  'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=400&h=220&fit=crop',
  'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=220&fit=crop',
];

const CAT_COLORS: Record<string, string> = {
  Costura: 'bg-pink-100 text-pink-700 border-pink-200',
  Bordado: 'bg-purple-100 text-purple-700 border-purple-200',
  Tejido: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Manualidades: 'bg-green-100 text-green-700 border-green-200',
  Diseño: 'bg-blue-100 text-blue-700 border-blue-200',
  General: 'bg-gray-100 text-gray-600 border-gray-200',
};
const catColor = (c: string) => CAT_COLORS[c] || CAT_COLORS.General;

const CourseCatalog: React.FC = () => {
  const { usuario } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'todos' | 'gratis' | 'pago'>('todos');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  useEffect(() => {
    fetchJSON<Course[]>('/api/courses')
      .then((d) => setCourses(Array.isArray(d) ? d : []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => c.categoria && set.add(c.categoria));
    return ['Todas', ...Array.from(set).sort()];
  }, [courses]);

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !c.nombre.toLowerCase().includes(q) &&
          !(c.descripcion || '').toLowerCase().includes(q) &&
          !(c.profesor || '').toLowerCase().includes(q)
        ) return false;
      }
      if (selectedCategory !== 'Todas' && c.categoria !== selectedCategory) return false;
      if (filter === 'gratis' && Number(c.precio) > 0) return false;
      if (filter === 'pago' && Number(c.precio) === 0) return false;
      return true;
    });
  }, [courses, search, selectedCategory, filter]);

  const isEnrolled = (id: number) => (usuario as any)?.cursosInscritos?.includes(id) || false;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero del catálogo */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Catálogo de cursos</h1>
          <p className="text-gray-500">Elegí el que más te interese y empezá a aprender hoy</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Barra de filtros */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-8 flex flex-col lg:flex-row gap-3 items-center">
          {/* Búsqueda */}
          <div className="relative flex-1 w-full">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Buscar curso, tema o profesora..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-sm"
            />
          </div>

          {/* Categoría */}
          {categories.length > 1 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 outline-none text-sm text-gray-700 min-w-[140px]"
            >
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {/* Precio */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {(['todos', 'gratis', 'pago'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === f
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {f === 'todos' ? 'Todos' : f === 'gratis' ? 'Gratis' : 'De pago'}
              </button>
            ))}
          </div>
        </div>

        {/* Resultado */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
                <div className="h-44 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-200 rounded-full w-1/3" />
                  <div className="h-5 bg-gray-200 rounded-full w-3/4" />
                  <div className="h-4 bg-gray-100 rounded-full w-1/2" />
                  <div className="h-4 bg-gray-100 rounded-full" />
                  <div className="h-4 bg-gray-100 rounded-full w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="text-6xl mb-4">{courses.length === 0 ? '📚' : '🔍'}</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {courses.length === 0 ? 'Próximamente' : 'Sin resultados'}
            </h3>
            <p className="text-gray-400 text-sm">
              {courses.length === 0
                ? 'Los cursos van a aparecer acá en cuanto estén publicados.'
                : 'Probá con otros términos o quitá algún filtro.'}
            </p>
            {(search || selectedCategory !== 'Todas' || filter !== 'todos') && (
              <button
                onClick={() => { setSearch(''); setSelectedCategory('Todas'); setFilter('todos'); }}
                className="mt-5 text-sm text-blue-600 hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-5 font-medium">
              {filtered.length} {filtered.length === 1 ? 'curso' : 'cursos'} encontrados
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((c, idx) => {
                const img = c.imagen && c.imagen.startsWith('http') ? c.imagen : PLACEHOLDERS[idx % PLACEHOLDERS.length];
                const enrolled = isEnrolled(c.id);
                return (
                  <Link
                    key={c.id}
                    to={`/course/${c.id}`}
                    className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-blue-200 hover:shadow-xl shadow-sm transition-all duration-300 flex flex-col"
                  >
                    {/* Imagen */}
                    <div className="relative h-44 overflow-hidden bg-gray-100 shrink-0">
                      <img
                        src={img}
                        alt={c.nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDERS[idx % PLACEHOLDERS.length]; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      {enrolled && (
                        <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                          ✓ Inscripto
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${catColor(c.categoria)}`}>
                          {c.categoria || 'General'}
                        </span>
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-bold text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {c.nombre}
                      </h3>
                      <p className="text-xs text-gray-400 mb-2 font-medium">por {c.profesor}</p>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1 leading-relaxed">{c.descripcion}</p>

                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                        {c.duracion ? (
                          <span className="text-xs text-gray-400">⏱ {c.duracion}</span>
                        ) : <span />}
                        <span className={`font-bold text-base ${Number(c.precio) === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                          {Number(c.precio) === 0 ? 'Gratis' : formatARS(Number(c.precio))}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CourseCatalog;
