import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface Course {
  id: number;
  nombre: string;
  descripcion: string;
  profesor: string;
  precio: number;
  imagen?: string;
  categoria?: string;
}

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

const CATEGORY_COLORS: Record<string, string> = {
  'Costura': 'bg-pink-100 text-pink-700',
  'Bordado': 'bg-purple-100 text-purple-700',
  'Tejido': 'bg-yellow-100 text-yellow-700',
  'Manualidades': 'bg-green-100 text-green-700',
  'Diseño': 'bg-blue-100 text-blue-700',
  'General': 'bg-gray-100 text-gray-600',
};

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=250&fit=crop',
];

const LandingPage: React.FC = () => {
  const { isAuthenticated, usuario } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/courses')
      .then((r) => r.json())
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  const ctaTo = isAuthenticated
    ? usuario?.tipo === 'alumno' ? '/courses' : '/dashboard'
    : '/register';
  const ctaLabel = isAuthenticated
    ? usuario?.tipo === 'alumno' ? 'Ver mis cursos' : 'Ir a mi panel'
    : 'Empezar ahora';

  return (
    <div className="min-h-screen bg-white">

      {/* Navbar simple solo cuando no hay sesión (cuando hay sesión, App.tsx ya muestra el Navbar global) */}
      {!isAuthenticated && (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <span className="text-xl font-bold text-gray-900">Campus Norma</span>
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 transition">
                Iniciar sesión
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                Registrarse
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-linear-to-br from-blue-50 via-white to-indigo-50">
        {/* Decoración de fondo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full opacity-40 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-indigo-100 rounded-full opacity-50 blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Clases en video · A tu ritmo · Certificado
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 leading-tight">
            Aprendé lo que
            <span className="block bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              siempre quisiste
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Cursos de calidad con profesoras reales. Mirá las clases en video, avanzá a tu ritmo y consultá dudas en cada curso.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={ctaTo}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              {ctaLabel} →
            </Link>
            <Link
              to="/courses"
              className="inline-flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 text-base font-semibold px-8 py-4 rounded-xl border border-gray-200 shadow-sm transition-all"
            >
              Ver cursos
            </Link>
          </div>
          {!isAuthenticated && (
            <p className="mt-6 text-sm text-gray-400">
              ¿Ya tenés cuenta?{' '}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">
                Iniciar sesión
              </Link>
            </p>
          )}
        </div>
      </section>

      {/* ── Cursos disponibles ── */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Cursos disponibles</h2>
              <p className="text-gray-500 mt-1 text-sm">
                {courses.length > 0
                  ? `${courses.length} curso${courses.length !== 1 ? 's' : ''} publicado${courses.length !== 1 ? 's' : ''}`
                  : 'Pronto vas a encontrar cursos acá'}
              </p>
            </div>
            {courses.length > 0 && (
              <Link to="/courses" className="hidden sm:inline text-sm text-blue-600 hover:underline font-medium">
                Ver todos los cursos →
              </Link>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
                  <div className="h-44 bg-gray-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded" />
                    <div className="h-3 bg-gray-100 rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Próximamente</h3>
              <p className="text-gray-400 max-w-xs mx-auto text-sm">
                Los cursos van a aparecer acá en cuanto estén publicados.
              </p>
              <Link
                to="/register"
                className="mt-6 inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-3 rounded-xl transition"
              >
                Registrarme para avisarme
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.slice(0, 6).map((c, idx) => {
                const catColor = CATEGORY_COLORS[c.categoria || ''] || CATEGORY_COLORS['General'];
                const img = c.imagen && c.imagen.startsWith('http') ? c.imagen : PLACEHOLDER_IMAGES[idx % PLACEHOLDER_IMAGES.length];
                return (
                  <Link
                    key={c.id}
                    to={`/course/${c.id}`}
                    className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300"
                  >
                    <div className="relative h-44 overflow-hidden bg-gray-100">
                      <img
                        src={img}
                        alt={c.nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGES[idx % PLACEHOLDER_IMAGES.length];
                        }}
                      />
                      <div className="absolute top-3 right-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${catColor}`}>
                          {c.categoria || 'General'}
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {c.nombre}
                      </h3>
                      <p className="text-xs text-gray-400 mb-2">por {c.profesor}</p>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-4 leading-relaxed">{c.descripcion}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-base font-bold ${c.precio === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                          {c.precio === 0 ? 'Gratis' : formatARS(c.precio)}
                        </span>
                        <span className="text-xs text-blue-600 font-medium group-hover:underline">
                          Ver curso →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {courses.length > 6 && (
            <div className="text-center mt-10">
              <Link
                to="/courses"
                className="inline-block bg-white hover:bg-gray-50 text-gray-700 font-semibold px-6 py-3 rounded-xl border border-gray-200 shadow-sm transition"
              >
                Ver todos los cursos ({courses.length})
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">¿Cómo funciona?</h2>
            <p className="text-gray-500">En tres pasos estás aprendiendo</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                num: '01',
                title: 'Elegí tu curso',
                desc: 'Explorá el catálogo, leé las descripciones y elegí el que más te interese.',
                icon: '🔍',
              },
              {
                num: '02',
                title: 'Inscribite',
                desc: 'Si es gratis, entrás al toque. Si tiene precio, pagás con MercadoPago de forma segura.',
                icon: '✅',
              },
              {
                num: '03',
                title: 'Aprendé a tu ritmo',
                desc: 'Mirá las clases en video cuando puedas y consultá dudas directamente en el curso.',
                icon: '🎓',
              },
            ].map((step) => (
              <div key={step.num} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-sm">
                    {step.icon}
                  </div>
                  <span className="text-xs font-bold text-blue-400 tracking-widest uppercase mb-2">Paso {step.num}</span>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-6 py-20 bg-linear-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Empezá a aprender hoy
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
            Registrate gratis y accedé a todos los cursos disponibles. Sin compromisos.
          </p>
          <Link
            to={isAuthenticated ? '/courses' : '/register'}
            className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 py-4 rounded-xl shadow-lg transition-all"
          >
            {isAuthenticated ? 'Ver cursos disponibles' : 'Crear cuenta gratis'} →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-8 bg-gray-950 text-gray-500 text-center text-sm">
        <p className="font-medium text-gray-300 mb-1">Campus Norma</p>
        <p>© {new Date().getFullYear()} · Todos los derechos reservados</p>
      </footer>
    </div>
  );
};

export default LandingPage;
