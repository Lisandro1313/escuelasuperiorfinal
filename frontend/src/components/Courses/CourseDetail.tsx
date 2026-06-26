import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Toast/ToastProvider';

interface Course {
  id: number;
  nombre: string;
  descripcion: string;
  profesor: string;
  profesor_id: number;
  categoria: string;
  precio: number;
  duracion: string;
  estudiantes: number;
  rating: number;
  imagen: string;
}

interface Module {
  id: number;
  titulo: string;
  descripcion?: string;
  orden: number;
  publicado: number | boolean;
}

interface Lesson {
  id: number;
  titulo: string;
  tipo: string;
  duracion: number;
}

interface LiveClass {
  id: number;
  title: string;
  start_date: string;
  meeting_url: string;
}

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessonsByModule, setLessonsByModule] = useState<Record<number, Lesson[]>>({});
  const [enrolled, setEnrolled] = useState(false);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState('');

  const isInstructor = useMemo(
    () => course && usuario && (usuario.tipo === 'admin' || course.profesor_id === usuario.id),
    [course, usuario]
  );

  const totalLessons = useMemo(
    () => Object.values(lessonsByModule).reduce((acc, arr) => acc + arr.length, 0),
    [lessonsByModule]
  );

  const totalMinutes = useMemo(
    () => Object.values(lessonsByModule).flat().reduce((acc, l) => acc + (l.duracion || 0), 0),
    [lessonsByModule]
  );

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem('token');
    setLoading(true);

    (async () => {
      try {
        // Curso (publico)
        const r = await fetch(`/api/courses/${id}`);
        if (!r.ok) {
          setError('Curso no encontrado');
          setLoading(false);
          return;
        }
        const c = await r.json();
        setCourse(c);

        // Si esta autenticado: estado de inscripcion + intentar cargar contenido
        if (token && usuario) {
          const enrollRes = await fetch(`/api/courses/${id}/enrollment`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (enrollRes.ok) {
            const d = await enrollRes.json();
            setEnrolled(!!d.enrolled);
          }

          // Modulos (paywall puede dar 402; en ese caso quedan vacios)
          const modRes = await fetch(`/api/courses/${id}/modules`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (modRes.ok) {
            const mods = await modRes.json();
            setModules(mods);

            // Cargar lecciones de cada modulo
            const lmap: Record<number, Lesson[]> = {};
            await Promise.all(
              mods.map(async (m: Module) => {
                const lr = await fetch(`/api/modules/${m.id}/lessons`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (lr.ok) lmap[m.id] = await lr.json();
              })
            );
            setLessonsByModule(lmap);
          }

          // Clases en vivo (solo si tiene acceso)
          const lcRes = await fetch(`/api/courses/${id}/live-classes`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (lcRes.ok) {
            const live = await lcRes.json();
            setLiveClasses(Array.isArray(live) ? live : []);
          }
        }
      } catch (e) {
        setError('Error cargando el curso');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, usuario]);

  const handleEnroll = async () => {
    if (!course) return;
    if (!usuario) {
      navigate('/login');
      return;
    }
    setEnrolling(true);

    if (Number(course.precio) === 0) {
      try {
        const res = await fetch(`/api/courses/${course.id}/enroll`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (res.ok) {
          setEnrolled(true);
          toast.success('¡Te inscribiste! Te llevamos al aula...');
          setTimeout(() => navigate(`/course/${course.id}/aula`), 800);
        } else {
          const d = await res.json();
          toast.error(d.error || 'Error al inscribirse');
        }
      } finally {
        setEnrolling(false);
      }
    } else {
      navigate(`/course/${course.id}/payment`);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando...</div>;
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md">
          <div className="text-5xl mb-3">😕</div>
          <h2 className="text-xl font-bold mb-2">{error || 'Curso no encontrado'}</h2>
          <Link to="/courses" className="text-blue-600 hover:underline">Volver al catálogo</Link>
        </div>
      </div>
    );
  }

  const isFree = Number(course.precio) === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero del curso */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link to="/courses" className="text-blue-100 hover:text-white text-sm">← Volver al catálogo</Link>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4 items-start">
            <div className="lg:col-span-2">
              <span className="inline-block bg-white/20 text-white text-xs font-medium px-3 py-1 rounded-full mb-3">
                {course.categoria}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">{course.nombre}</h1>
              <p className="text-blue-100 text-lg mb-4">{course.descripcion}</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <span>👨‍🏫 {course.profesor}</span>
                <span>⏱️ {course.duracion || 'A tu ritmo'}</span>
                {totalLessons > 0 && <span>🎬 {totalLessons} lecciones</span>}
                {totalMinutes > 0 && <span>📺 {Math.round(totalMinutes / 60) || totalMinutes} {totalMinutes >= 60 ? 'h' : 'min'}</span>}
              </div>
            </div>

            {/* Card de compra/acceso */}
            <div className="bg-white text-gray-900 rounded-xl shadow-xl p-6 lg:sticky lg:top-20">
              <div className="text-5xl mb-3 text-center">{course.imagen || '📚'}</div>
              <div className="text-center mb-4">
                {isFree ? (
                  <div className="text-3xl font-bold text-green-600">GRATIS</div>
                ) : (
                  <div className="text-3xl font-bold text-blue-600">{formatARS(course.precio)}</div>
                )}
              </div>

              {enrolled ? (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <div className="text-green-700 font-semibold">✅ Ya tenés acceso</div>
                  </div>
                  <Link
                    to={`/course/${course.id}/aula`}
                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-3 rounded-lg font-semibold"
                  >
                    Entrar al aula →
                  </Link>
                </div>
              ) : isInstructor ? (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center text-sm">
                    👨‍🏫 Sos el profesor de este curso
                  </div>
                  <Link
                    to={`/course/${course.id}/manage`}
                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-3 rounded-lg font-semibold"
                  >
                    Gestionar contenido
                  </Link>
                  <Link
                    to={`/course/${course.id}/aula`}
                    className="block w-full border border-blue-600 text-blue-700 hover:bg-blue-50 text-center py-2.5 rounded-lg font-semibold"
                  >
                    Ver el aula
                  </Link>
                </div>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className={`w-full text-white font-semibold py-4 rounded-lg shadow-md transition ${
                    isFree ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                  } disabled:opacity-60`}
                >
                  {enrolling ? 'Procesando...' : isFree ? '🆓 Inscribirme gratis' : `💳 Comprar - ${formatARS(course.precio)}`}
                </button>
              )}

              <div className="mt-5 pt-5 border-t border-gray-200 space-y-2 text-sm text-gray-600">
                <Feature icon="📺">Acceso a todas las clases en video</Feature>
                <Feature icon="📥">Materiales descargables</Feature>
                <Feature icon="🔴">Clases en vivo con el profesor</Feature>
                <Feature icon="♾️">Acceso de por vida</Feature>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Próxima clase en vivo (solo si tiene acceso) */}
          {(enrolled || isInstructor) && liveClasses.filter((l) => new Date(l.start_date) > new Date()).slice(0, 1).map((lc) => (
            <div key={lc.id} className="bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide opacity-90">🔴 Próxima clase en vivo</div>
                <div className="text-lg font-bold mt-1">{lc.title}</div>
                <div className="text-sm opacity-90 mt-1">{new Date(lc.start_date).toLocaleString('es-AR')}</div>
              </div>
              <a
                href={lc.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-red-600 hover:bg-gray-100 font-semibold px-5 py-3 rounded-lg whitespace-nowrap"
              >
                Entrar a la sala →
              </a>
            </div>
          ))}

          {/* Currículum */}
          <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Contenido del curso</h2>
              <p className="text-sm text-gray-500 mt-1">
                {modules.length > 0
                  ? `${modules.length} ${modules.length === 1 ? 'módulo' : 'módulos'} · ${totalLessons} lecciones`
                  : 'El profesor todavía no publicó contenido'}
              </p>
            </div>
            {modules.length === 0 && !enrolled && !isInstructor ? (
              <div className="p-8 text-center text-gray-500 bg-gray-50">
                <p className="mb-2">🔒 El contenido se desbloquea al inscribirte</p>
                <p className="text-sm">Inscribite o pagá el curso para ver los módulos.</p>
              </div>
            ) : modules.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Todavía no hay módulos publicados.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {modules.map((m, idx) => {
                  const lessons = lessonsByModule[m.id] || [];
                  return (
                    <div key={m.id} className="px-6 py-4">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Módulo {idx + 1}: {m.titulo}
                      </h3>
                      {m.descripcion && <p className="text-sm text-gray-600 mb-3">{m.descripcion}</p>}
                      {lessons.length > 0 ? (
                        <ul className="space-y-1">
                          {lessons.map((l) => (
                            <li key={l.id} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-400">{l.tipo === 'video' ? '🎬' : l.tipo === 'pdf' ? '📄' : '📝'}</span>
                                <span className="text-gray-800">{l.titulo}</span>
                              </div>
                              {l.duracion > 0 && <span className="text-xs text-gray-500">{l.duracion} min</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Sin lecciones todavía</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar info */}
        <aside className="space-y-6">
          <section className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Sobre el profesor</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-lg">
                {course.profesor[0]?.toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-gray-900">{course.profesor}</div>
                <div className="text-sm text-gray-500">Instructor</div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Sobre este curso</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <Detail label="Categoría" value={course.categoria || '—'} />
              <Detail label="Duración" value={course.duracion || 'A tu ritmo'} />
              {totalLessons > 0 && <Detail label="Lecciones" value={String(totalLessons)} />}
              {totalMinutes > 0 && <Detail label="Tiempo total" value={`${Math.round(totalMinutes / 60)}h ${totalMinutes % 60}min`} />}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
};

const Feature: React.FC<{ icon: string; children: React.ReactNode }> = ({ icon, children }) => (
  <div className="flex items-start gap-2">
    <span className="text-base">{icon}</span>
    <span>{children}</span>
  </div>
);

const Detail: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <li className="flex justify-between gap-2">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-gray-900 text-right">{value}</span>
  </li>
);

export default CourseDetail;
