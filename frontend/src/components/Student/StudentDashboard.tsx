import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchJSON } from '../../lib/fetchJSON';
import EducatorQuote from '../Common/EducatorQuote';

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

interface LiveItem {
  id: number;
  title: string;
  start_date: string;
  precio: number;
  course_nombre?: string | null;
}

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

const formatLiveFecha = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

const PLACEHOLDERS = [
  'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400&h=220&fit=crop',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=220&fit=crop',
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&h=220&fit=crop',
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=220&fit=crop',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=220&fit=crop',
];

// Imagen estable por curso: si no tiene foto, el placeholder depende del id
// (siempre el mismo para ese curso, no cambia entre renders).
const imgFor = (imagen: string | undefined, seed: number) =>
  imagen && imagen.startsWith('http') ? imagen : PLACEHOLDERS[Math.abs(seed || 0) % PLACEHOLDERS.length];

const motivQuotes = [
  { text: 'El éxito es la suma de pequeños esfuerzos repetidos día tras día.', author: 'Robert Collier' },
  { text: 'Aprender nunca agota la mente.', author: 'Leonardo da Vinci' },
  { text: 'La constancia vence lo que la dicha no alcanza.', author: 'Refrán' },
  { text: 'Un poco cada día logra mucho con el tiempo.', author: 'Anónimo' },
];

export const StudentDashboard: React.FC = () => {
  const { usuario } = useAuth();
  const [myCourses, setMyCourses] = useState<MyCourse[]>([]);
  const [catalog, setCatalog] = useState<CatalogCourse[]>([]);
  const [lives, setLives] = useState<LiveItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    Promise.all([
      fetchJSON<MyCourse[]>('/api/my-courses', { headers: { Authorization: `Bearer ${token}` } }).catch(() => []),
      fetchJSON<CatalogCourse[]>('/api/courses').catch(() => []),
    ])
      .then(([mine, all]) => {
        setMyCourses(Array.isArray(mine) ? mine : []);
        setCatalog(Array.isArray(all) ? all : []);
      })
      .finally(() => setLoading(false));
    fetchJSON<LiveItem[]>('/api/live/upcoming').then((d) => setLives(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const enrolledIds = useMemo(() => new Set(myCourses.map((c) => c.id ?? c.course_id)), [myCourses]);
  const recommended = catalog.filter((c) => !enrolledIds.has(c.id)).slice(0, 6);

  // Gamificación derivada del progreso real (XP = suma de % de avance).
  const xp = useMemo(() => Math.round(myCourses.reduce((acc, c) => acc + Number(c.progress || 0), 0)), [myCourses]);
  const level = Math.floor(xp / 100) + 1;
  const xpIntoLevel = xp % 100;
  const completedCount = myCourses.filter((c) => Number(c.progress) >= 100).length;
  const inProgressCount = myCourses.filter((c) => Number(c.progress) > 0 && Number(c.progress) < 100).length;

  // "Continuá donde dejaste": el curso en progreso con más avance.
  const resume = useMemo(() => {
    const inProg = myCourses
      .filter((c) => Number(c.progress) > 0 && Number(c.progress) < 100)
      .sort((a, b) => Number(b.progress) - Number(a.progress));
    return inProg[0] || myCourses.find((c) => Number(c.progress || 0) === 0) || null;
  }, [myCourses]);

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
      {/* Hero premium con gamificación */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold">
                Hola, {usuario?.nombre?.split(' ')[0]} 👋
              </h1>
              <p className="text-blue-200 mt-1">
                {myCourses.length === 0 ? 'Empezá tu camino de aprendizaje' : 'Seguí sumando, vas muy bien'}
              </p>
              {myCourses.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-6">
                  <div>
                    <p className="text-2xl font-bold">{myCourses.length}</p>
                    <p className="text-xs text-blue-200">Cursos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-300">{inProgressCount}</p>
                    <p className="text-xs text-blue-200">En progreso</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-300">{completedCount}</p>
                    <p className="text-xs text-blue-200">Completados</p>
                  </div>
                </div>
              )}
            </div>

            {/* Tarjeta de nivel / XP */}
            <div className="bg-white/10 border border-white/15 rounded-2xl p-5 w-full lg:w-72 backdrop-blur">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500 text-slate-900 flex items-center justify-center text-xl font-extrabold">
                  {level}
                </div>
                <div>
                  <p className="font-bold leading-tight">Nivel {level}</p>
                  <p className="text-xs text-blue-200">{xp} XP acumulados</p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full bg-emerald-400 transition-all" style={{ width: `${xpIntoLevel}%` }} />
              </div>
              <p className="text-[11px] text-blue-200 mt-1">{100 - xpIntoLevel} XP para el nivel {level + 1}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Continuá donde dejaste (Coursera-style) */}
      {resume && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <Link
            to={`/course/${resume.id ?? resume.course_id}/aula`}
            className="block bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition group"
          >
            <div className="flex flex-col sm:flex-row">
              <div className="sm:w-56 h-36 sm:h-auto overflow-hidden shrink-0">
                <img src={imgFor(resume.imagen, resume.id ?? resume.course_id)} alt={resume.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-center">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Continuá donde dejaste</p>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{resume.nombre}</h2>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden max-w-xs">
                    <div className="h-full bg-blue-500" style={{ width: `${Math.round(Number(resume.progress || 0))}%` }} />
                  </div>
                  <span className="text-sm text-gray-500">{Math.round(Number(resume.progress || 0))}%</span>
                </div>
                <span className="mt-3 inline-flex items-center gap-1 text-blue-600 font-semibold text-sm group-hover:gap-2 transition-all">
                  {Number(resume.progress || 0) === 0 ? 'Empezar curso' : 'Continuar'} →
                </span>
              </div>
            </div>
          </Link>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Próximas clases en vivo (para enterarse) */}
        {lives.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-2 bg-red-50 text-red-600 text-xs font-bold px-3 py-1 rounded-full">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> EN VIVO
              </span>
              <h2 className="text-lg font-bold text-gray-900">Próximas clases en vivo</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {lives.slice(0, 4).map((lc) => (
                <Link
                  key={lc.id}
                  to={`/live/${lc.id}`}
                  className="group bg-white border border-gray-100 hover:border-red-200 hover:shadow-md rounded-2xl p-4 flex items-center justify-between gap-3 transition"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 leading-tight line-clamp-1">{lc.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">📅 {formatLiveFecha(lc.start_date)} hs</p>
                  </div>
                  <span className={`text-xs font-bold whitespace-nowrap ${Number(lc.precio) === 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                    {Number(lc.precio) === 0 ? 'Reservar' : formatARS(lc.precio)} →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Frase motivacional (compacta) */}
        <div className="bg-gradient-to-r from-slate-800 to-blue-900 text-white rounded-2xl px-6 py-5 text-center">
          <EducatorQuote quotes={motivQuotes} intervalMs={8000} compact />
        </div>

        {/* Mis cursos */}
        {myCourses.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-5">Mis cursos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {myCourses.map((c, idx) => {
                const courseId = c.id ?? c.course_id;
                const progress = Math.round(Number(c.progress || 0));
                const isCompleted = progress >= 100;
                return (
                  <Link
                    key={courseId}
                    to={`/course/${courseId}/aula`}
                    className="group bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-xl shadow-sm transition-all duration-300 overflow-hidden flex flex-col"
                  >
                    <div className="relative h-36 overflow-hidden shrink-0">
                      <img
                        src={imgFor(c.imagen, c.id ?? (c as any).course_id)}
                        alt={c.nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDERS[idx % PLACEHOLDERS.length]; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isCompleted ? 'bg-emerald-500 text-white' : 'bg-white/90 text-gray-700'}`}>
                          {isCompleted ? '✅ Completado' : `${progress}% completado`}
                        </span>
                      </div>
                    </div>
                    <div className="h-1 bg-gray-100">
                      <div className={`h-1 transition-all ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors mb-1">{c.nombre}</h3>
                      {c.profesor && <p className="text-xs text-gray-400 mb-3">por {c.profesor}</p>}
                      <div className="mt-auto flex items-center justify-between">
                        <span className="text-xs text-gray-400">{progress === 0 ? 'Sin empezar' : isCompleted ? 'Finalizado' : 'En curso'}</span>
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

        {myCourses.length === 0 && recommended.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <img src="/logo.png" alt="ESF" className="h-16 w-16 mx-auto mb-4 rounded-xl" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">¡Bienvenido a Escuela Superior de Formación!</h3>
            <p className="text-gray-400 mb-6 max-w-xs mx-auto text-sm">Todavía no hay cursos publicados. Pronto van a aparecer acá.</p>
            <Link to="/courses" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition">Ver catálogo</Link>
          </div>
        )}

        {/* Recomendados */}
        {recommended.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">{myCourses.length === 0 ? 'Cursos disponibles' : 'Te puede interesar'}</h2>
              <Link to="/courses" className="text-sm text-blue-600 hover:underline font-medium">Ver todos →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {recommended.map((c, idx) => (
                <Link
                  key={c.id}
                  to={`/course/${c.id}`}
                  className="group bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-xl shadow-sm transition-all duration-300 overflow-hidden flex flex-col"
                >
                  <div className="relative h-36 overflow-hidden shrink-0">
                    <img
                      src={imgFor(c.imagen, c.id ?? (c as any).course_id)}
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
                      <span className={`font-bold text-sm ${Number(c.precio) === 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {Number(c.precio) === 0 ? 'Gratis' : formatARS(Number(c.precio))}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
