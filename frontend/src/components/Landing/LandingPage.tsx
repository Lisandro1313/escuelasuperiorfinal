import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchJSON } from '../../lib/fetchJSON';
import EducatorQuote from '../Common/EducatorQuote';
import ParticlesBackground from '../Common/ParticlesBackground';

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
  'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=250&fit=crop',
  'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&h=250&fit=crop',
];

const BRAND = 'Escuela Superior de Formación';

interface LiveClassItem {
  id: number;
  title: string;
  start_date: string;
  precio: number;
  course_nombre?: string | null;
  instructor_nombre?: string | null;
}

const formatLiveFecha = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

const LandingPage: React.FC = () => {
  const { isAuthenticated, usuario } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [lives, setLives] = useState<LiveClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJSON<Course[]>('/api/courses')
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
    fetchJSON<LiveClassItem[]>('/api/live/upcoming')
      .then((data) => setLives(Array.isArray(data) ? data : []))
      .catch(() => setLives([]));
  }, []);

  const ctaTo = isAuthenticated
    ? usuario?.tipo === 'alumno' ? '/courses' : '/dashboard'
    : '/register';
  const ctaLabel = isAuthenticated
    ? usuario?.tipo === 'alumno' ? 'Ver mis cursos' : 'Ir a mi panel'
    : 'Crear mi cuenta';

  return (
    <div className="min-h-screen bg-white">

      {/* ── Navbar (solo sin sesión) ── */}
      {!isAuthenticated && (
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt={BRAND} className="h-9 w-9 rounded-lg object-contain" />
              <span className="font-bold text-gray-900 leading-tight text-sm sm:text-base">
                Escuela Superior<br className="hidden sm:block" /> de Formación
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 transition">
                Iniciar sesión
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition"
              >
                Registrarse
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Partículas suaves en movimiento */}
          <ParticlesBackground className="absolute inset-0 w-full h-full" />
          {/* Orbes de luz con deriva muy lenta */}
          <div className="hero-orb-a absolute -top-40 -right-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
          <div className="hero-orb-b absolute -bottom-24 -left-24 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
          <img
            src="/logo.png"
            alt={BRAND}
            className="h-24 w-24 mx-auto mb-6 rounded-2xl shadow-2xl shadow-black/40"
          />
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-emerald-200 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Clases en video · A tu ritmo · Certificado
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-5 leading-tight">
            Escuela Superior
            <span className="block bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
              de Formación
            </span>
          </h1>
          <p className="text-lg text-blue-100/80 mb-9 max-w-2xl mx-auto leading-relaxed">
            Formate online con docentes reales. Mirá las clases en video, avanzá a tu ritmo
            y sumate a las clases en vivo cuando quieras.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={ctaTo}
              className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-base font-bold px-8 py-4 rounded-xl shadow-lg transition-all"
            >
              {ctaLabel} →
            </Link>
            <Link
              to="/courses"
              className="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 text-white text-base font-semibold px-8 py-4 rounded-xl border border-white/20 transition-all"
            >
              Ver cursos
            </Link>
          </div>
          {!isAuthenticated && (
            <p className="mt-6 text-sm text-blue-200/70">
              ¿Ya tenés cuenta?{' '}
              <Link to="/login" className="text-emerald-300 hover:underline font-medium">
                Iniciar sesión
              </Link>
            </p>
          )}
        </div>
      </section>

      {/* ── Frase rotativa de educadores ── */}
      <section className="bg-gradient-to-r from-slate-800 to-blue-900 text-white px-6 py-10">
        <div className="max-w-3xl mx-auto text-center">
          <EducatorQuote intervalMs={7000} />
        </div>
      </section>

      {/* ── Franja de valores ── */}
      <section className="border-b border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: '🎥', t: 'Clases en video' },
            { icon: '🔴', t: 'Clases en vivo' },
            { icon: '🏆', t: 'Certificado' },
            { icon: '💳', t: 'Pago seguro' },
          ].map((v) => (
            <div key={v.t} className="flex flex-col items-center gap-1">
              <span className="text-2xl">{v.icon}</span>
              <span className="text-sm font-medium text-gray-700">{v.t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Próximas clases en vivo ── */}
      {lives.length > 0 && (
        <section className="px-6 py-16 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <span className="inline-flex items-center gap-2 bg-red-50 text-red-600 text-xs font-bold px-3 py-1 rounded-full">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> EN VIVO
              </span>
              <h2 className="text-2xl font-bold text-gray-900">Próximas clases en vivo</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lives.slice(0, 4).map((lc) => (
                <Link
                  key={lc.id}
                  to={`/live/${lc.id}`}
                  className="group bg-gradient-to-br from-slate-900 to-blue-900 text-white rounded-2xl p-5 flex items-center justify-between gap-4 hover:-translate-y-0.5 transition shadow-md"
                >
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight line-clamp-2">{lc.title}</p>
                    <p className="text-blue-200 text-xs mt-1 capitalize">📅 {formatLiveFecha(lc.start_date)} hs</p>
                    {lc.instructor_nombre && <p className="text-blue-300 text-xs">con {lc.instructor_nombre}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`block font-bold ${Number(lc.precio) === 0 ? 'text-emerald-300' : 'text-white'}`}>
                      {Number(lc.precio) === 0 ? 'Gratis' : formatARS(lc.precio)}
                    </span>
                    <span className="text-xs text-blue-200 group-hover:underline">Reservar →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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
              <Link to="/courses" className="hidden sm:inline text-sm text-emerald-600 hover:underline font-medium">
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
              <img src="/logo.png" alt={BRAND} className="h-16 w-16 mx-auto mb-4 rounded-xl opacity-90" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Muy pronto</h3>
              <p className="text-gray-400 max-w-xs mx-auto text-sm">
                Estamos preparando los primeros cursos. Registrate para enterarte cuando estén.
              </p>
              <Link
                to="/register"
                className="mt-6 inline-block bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-6 py-3 rounded-xl transition"
              >
                Registrarme gratis
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
                    className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-emerald-200 hover:shadow-xl transition-all duration-300"
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
                      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1">
                        {c.nombre}
                      </h3>
                      <p className="text-xs text-gray-400 mb-2">por {c.profesor}</p>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-4 leading-relaxed">{c.descripcion}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-base font-bold ${c.precio === 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                          {c.precio === 0 ? 'Gratis' : formatARS(c.precio)}
                        </span>
                        <span className="text-xs text-emerald-600 font-medium group-hover:underline">
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
                title: 'Creá tu cuenta',
                desc: 'Registrate gratis en un minuto y entrá al campus desde cualquier dispositivo.',
                icon: '📝',
              },
              {
                num: '02',
                title: 'Elegí y pagá',
                desc: 'Inscribite a un curso completo o pagá clases sueltas con MercadoPago de forma segura.',
                icon: '✅',
              },
              {
                num: '03',
                title: 'Aprendé a tu ritmo',
                desc: 'Mirá las clases cuando puedas, sumate a las clases en vivo y consultá tus dudas.',
                icon: '🎓',
              },
            ].map((step) => (
              <div key={step.num} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-sm">
                  {step.icon}
                </div>
                <span className="text-xs font-bold text-emerald-500 tracking-widest uppercase mb-2">Paso {step.num}</span>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-6 py-20 bg-gradient-to-br from-slate-900 to-blue-950 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <img src="/logo.png" alt={BRAND} className="h-14 w-14 mx-auto mb-5 rounded-xl" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Empezá a formarte hoy</h2>
          <p className="text-blue-100/80 text-lg mb-8 max-w-xl mx-auto">
            Registrate gratis y accedé a los cursos y clases en vivo de la Escuela.
          </p>
          <Link
            to={isAuthenticated ? '/courses' : '/register'}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold px-8 py-4 rounded-xl shadow-lg transition-all"
          >
            {isAuthenticated ? 'Ver cursos disponibles' : 'Crear cuenta gratis'} →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-8 bg-gray-950 text-gray-500 text-center text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src="/logo.png" alt={BRAND} className="h-7 w-7 rounded-md" />
          <span className="font-medium text-gray-300">{BRAND}</span>
        </div>
        <p>© {new Date().getFullYear()} · Todos los derechos reservados</p>
      </footer>
    </div>
  );
};

export default LandingPage;
