import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../Toast/ToastProvider';

// El flipbook (pdf.js) se carga sólo al abrir un material, no en el bundle principal.
const Flipbook = React.lazy(() => import('../Common/Flipbook'));

const isPdfUrl = (url?: string | null): boolean =>
  !!url && (/\.pdf($|\?)/i.test(url) || /\/raw\/upload\//.test(url));

// Convierte una URL de video a algo embebible (YouTube/Vimeo iframe o <video>).
const toVideoEmbed = (url?: string | null): { type: 'iframe' | 'video'; src: string } | null => {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { type: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}` };
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (/\.(mp4|webm|ogg)($|\?)/i.test(url) || /\/video\/upload\//.test(url)) return { type: 'video', src: url };
  return null;
};

interface PlayerLesson {
  id: number;
  module_id: number;
  titulo: string;
  tipo: string;
  orden: number;
  duracion: number;
  precio: number;
  completed: boolean;
  locked: boolean;
  lock_reason: 'pago' | 'fecha' | 'goteo' | 'secuencial' | null;
  unlock_at: string | null;
  can_buy: boolean;
  contenido: string | null;
  recursos: string | null;
  objetivos: string | null;
}

interface PlayerModule {
  id: number;
  titulo: string;
  orden: number;
  lessons: PlayerLesson[];
}

interface PlayerData {
  course: {
    id: number;
    nombre: string;
    descripcion: string;
    imagen: string;
    profesor: string;
    profesor_id: number;
    precio: number;
    modalidad_precio: 'curso' | 'modulo' | 'clase';
    unlock_mode: 'abierto' | 'fecha' | 'secuencial' | 'goteo';
  };
  isOwner: boolean;
  enrolled: boolean;
  progress: { total: number; completed: number; percent: number };
  modules: PlayerModule[];
}

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

const formatFecha = (iso: string | null) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
};

const parseObjetivos = (raw: string | null): string[] =>
  (raw || '').split('\n').map((s) => s.trim().replace(/^[-•*]\s*/, '')).filter(Boolean);

const materialMeta = (titulo: string, url?: string): { icon: string; kind: string } => {
  const t = (titulo || '').toLowerCase();
  if (isPdfUrl(url) || /pdf|apunte|material/.test(t)) return { icon: '📄', kind: 'PDF' };
  if (/present|slide|ppt|diapos/.test(t)) return { icon: '📊', kind: 'Presentación' };
  if (/ejerc|práctic|practic|actividad|tp\b/.test(t)) return { icon: '✏️', kind: 'Ejercicios' };
  if (toVideoEmbed(url)) return { icon: '🎬', kind: 'Video' };
  return { icon: '📎', kind: 'Recurso' };
};

const parseRecursos = (raw: string | null): { titulo: string; url?: string }[] => {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) {
      return v.map((r) => (typeof r === 'string' ? { titulo: r } : { titulo: r.titulo || r.nombre || r.url || 'Recurso', url: r.url }));
    }
    return [];
  } catch {
    return [];
  }
};

const lockText = (l: PlayerLesson): string => {
  switch (l.lock_reason) {
    case 'pago':
      return l.can_buy ? `Clase paga · ${formatARS(l.precio)}` : 'Inscribite al curso para acceder';
    case 'fecha':
      return l.unlock_at ? `Se habilita el ${formatFecha(l.unlock_at)}` : 'Aún no disponible';
    case 'goteo':
      return l.unlock_at ? `Se habilita el ${formatFecha(l.unlock_at)}` : 'Aún no disponible';
    case 'secuencial':
      return 'Completá la clase anterior';
    default:
      return 'No disponible';
  }
};

const CoursePlayer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [data, setData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openLesson, setOpenLesson] = useState<PlayerLesson | null>(null);
  const [flipbook, setFlipbook] = useState<{ url: string; title: string } | null>(null);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${id}/player`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.status === 401) {
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('No se pudo cargar el aula');
      setData(await res.json());
    } catch {
      setError('No pudimos cargar el aula del curso.');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  // Numeración global de clases (Clase 1, 2, 3...) a lo largo de todos los módulos.
  const lessonNumber = useMemo(() => {
    const map = new Map<number, number>();
    let n = 0;
    data?.modules.forEach((m) => m.lessons.forEach((l) => map.set(l.id, ++n)));
    return map;
  }, [data]);

  // Lista plana de clases en orden (para navegar entre clases).
  const allLessons = useMemo(() => (data ? data.modules.flatMap((m) => m.lessons) : []), [data]);
  const openIndex = openLesson ? allLessons.findIndex((l) => l.id === openLesson.id) : -1;
  const prevLesson = openIndex > 0 ? allLessons[openIndex - 1] : null;
  const nextLesson = openIndex >= 0 && openIndex < allLessons.length - 1 ? allLessons[openIndex + 1] : null;

  const handleComplete = async (lesson: PlayerLesson) => {
    setMarking(true);
    try {
      const res = await fetch(`/api/lessons/${lesson.id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error();
      toast?.success?.('¡Clase completada!');
      setOpenLesson(null);
      setLoading(true);
      await load();
    } catch {
      toast?.error?.('No se pudo marcar la clase.');
    } finally {
      setMarking(false);
    }
  };

  const handleBuy = (lesson: PlayerLesson) => {
    if (lesson.can_buy) {
      navigate(`/course/${id}/payment`, {
        state: { targetType: 'clase', lessonId: lesson.id, moduleId: lesson.module_id },
      });
    } else {
      navigate(`/course/${id}/payment`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-blue-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-gray-700">{error || 'Curso no encontrado'}</p>
        <button onClick={() => navigate('/dashboard')} className="text-blue-600 font-medium hover:underline">
          Volver al inicio
        </button>
      </div>
    );
  }

  const { course, progress } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabecera del curso */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <button onClick={() => navigate(-1)} className="text-blue-200 text-sm hover:text-white mb-3">
            ← Volver
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold">{course.nombre}</h1>
          <p className="text-blue-200 mt-1 text-sm">Con {course.profesor}</p>

          <div className="mt-5 max-w-md">
            <div className="flex justify-between text-xs text-blue-100 mb-1">
              <span>Progreso general</span>
              <span>
                {progress.completed}/{progress.total} · {progress.percent}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-emerald-400 transition-all" style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Grilla de clases */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {data.modules.map((m) => (
          <div key={m.id} className="mb-8">
            {data.modules.length > 1 && (
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">{m.titulo}</h2>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {m.lessons.map((l) => {
                const num = lessonNumber.get(l.id);
                return (
                  <button
                    key={l.id}
                    onClick={() => setOpenLesson(l)}
                    className={`relative aspect-square rounded-xl p-3 text-left flex flex-col justify-between transition shadow-sm hover:shadow-md ${
                      l.locked
                        ? 'bg-gray-200 text-gray-500'
                        : 'bg-gradient-to-br from-slate-800 to-blue-900 text-white hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className={`text-[11px] font-medium ${l.locked ? 'text-gray-500' : 'text-blue-200'}`}>
                        Clase {num}
                      </span>
                      {l.completed ? (
                        <span className="text-emerald-500 text-lg leading-none">✓</span>
                      ) : l.locked ? (
                        <span className="text-lg leading-none">🔒</span>
                      ) : (
                        <span className="text-blue-200 text-lg leading-none">▶</span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm leading-tight line-clamp-3">{l.titulo}</p>
                      {l.locked && <p className="text-[10px] mt-1 leading-tight">{lockText(l)}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {progress.total === 0 && (
          <div className="text-center text-gray-500 py-16">
            Todavía no hay clases publicadas en este curso.
          </div>
        )}
      </div>

      {/* Modal de clase */}
      {openLesson && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setOpenLesson(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[88vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-gradient-to-br from-slate-900 to-blue-900 text-white p-6 rounded-t-2xl">
              <button
                onClick={() => setOpenLesson(null)}
                className="absolute top-4 right-4 bg-white/15 hover:bg-white/25 rounded-lg w-8 h-8 flex items-center justify-center text-lg leading-none"
              >
                ✕
              </button>
              <span className="inline-block bg-emerald-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-full mb-2">
                Clase {lessonNumber.get(openLesson.id)} de {allLessons.length}
              </span>
              <h3 className="text-xl md:text-2xl font-bold pr-8">{openLesson.titulo}</h3>
              {openLesson.completed && <p className="text-emerald-300 text-sm mt-1">✓ Ya la completaste</p>}
              <div className="mt-3 h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full bg-emerald-400 transition-all" style={{ width: `${data.progress.percent}%` }} />
              </div>
              <p className="text-blue-200 text-[11px] mt-1">{data.progress.completed}/{data.progress.total} clases completadas · {data.progress.percent}%</p>
            </div>

            <div className="p-6">
              {openLesson.locked ? (
                <div className="text-center py-6">
                  <div className="text-4xl mb-3">🔒</div>
                  <p className="text-gray-700 font-medium mb-1">{lockText(openLesson)}</p>
                  {openLesson.lock_reason === 'pago' ? (
                    <>
                      <p className="text-gray-500 text-sm mb-4">
                        {openLesson.can_buy
                          ? 'Comprá esta clase para verla al instante.'
                          : 'Esta clase es parte del curso.'}
                      </p>
                      <button
                        onClick={() => handleBuy(openLesson)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg"
                      >
                        {openLesson.can_buy ? `Comprar · ${formatARS(openLesson.precio)}` : 'Ir al pago del curso'}
                      </button>
                    </>
                  ) : (
                    <p className="text-gray-500 text-sm">Volvé cuando se habilite y vas a poder verla.</p>
                  )}
                </div>
              ) : (
                <>
                  {parseObjetivos(openLesson.objetivos).length > 0 && (
                    <div className="mb-5 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                      <div className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
                        🎯 Objetivos de aprendizaje
                      </div>
                      <ul className="space-y-1.5">
                        {parseObjetivos(openLesson.objetivos).map((o, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-emerald-600 mt-0.5 font-bold">✓</span>
                            <span>{o}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {openLesson.tipo === 'video' && toVideoEmbed(openLesson.contenido) ? (
                    <div className="mb-4 aspect-video rounded-xl overflow-hidden bg-black shadow">
                      {toVideoEmbed(openLesson.contenido)!.type === 'iframe' ? (
                        <iframe
                          src={toVideoEmbed(openLesson.contenido)!.src}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={openLesson.titulo}
                        />
                      ) : (
                        <video src={toVideoEmbed(openLesson.contenido)!.src} controls className="w-full h-full" />
                      )}
                    </div>
                  ) : openLesson.tipo === 'pdf' && /^(https?:|\/)/.test(openLesson.contenido || '') ? (
                    <button
                      onClick={() => setFlipbook({ url: openLesson.contenido as string, title: openLesson.titulo })}
                      className="w-full mb-4 bg-gradient-to-br from-slate-800 to-blue-900 text-white rounded-xl p-5 flex items-center gap-4 hover:-translate-y-0.5 transition"
                    >
                      <span className="text-3xl">📖</span>
                      <span className="text-left">
                        <span className="block font-semibold">Abrir el material como librito</span>
                        <span className="block text-blue-200 text-xs">Pasás las hojas como un libro real</span>
                      </span>
                    </button>
                  ) : openLesson.contenido ? (
                    <div className="mb-5 bg-gray-50 border border-gray-100 rounded-2xl p-4">
                      <div className="inline-flex items-center gap-2 bg-slate-800 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
                        📋 Sobre esta clase
                      </div>
                      <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                        {openLesson.contenido}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm mb-4">El profe todavía no cargó contenido de texto para esta clase.</p>
                  )}

                  {parseRecursos(openLesson.recursos).length > 0 && (
                    <div className="mb-5">
                      <p className="text-sm font-bold text-gray-900 mb-3">Material de la clase</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {parseRecursos(openLesson.recursos).map((r, i) => {
                          const meta = materialMeta(r.titulo, r.url);
                          const pdf = isPdfUrl(r.url);
                          const cls = 'bg-gray-50 hover:bg-emerald-50 border border-gray-100 hover:border-emerald-200 rounded-2xl p-4 text-left transition block';
                          const inner = (
                            <>
                              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl mb-2">
                                {meta.icon}
                              </div>
                              <span className="block font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{r.titulo}</span>
                              <span className="block text-xs text-gray-400 mt-0.5">{pdf ? '📖 Abrir como librito' : meta.kind}</span>
                            </>
                          );
                          return pdf ? (
                            <button key={i} onClick={() => setFlipbook({ url: r.url as string, title: r.titulo })} className={cls}>{inner}</button>
                          ) : r.url ? (
                            <a key={i} href={r.url} target="_blank" rel="noreferrer" className={cls}>{inner}</a>
                          ) : (
                            <div key={i} className={cls}>{inner}</div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!data.isOwner && (
                    <button
                      onClick={() => handleComplete(openLesson)}
                      disabled={marking || openLesson.completed}
                      className={`w-full font-medium px-5 py-2.5 rounded-lg ${
                        openLesson.completed
                          ? 'bg-emerald-100 text-emerald-700 cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {openLesson.completed ? '✓ Clase completada' : marking ? 'Guardando...' : 'Marcar como completada'}
                    </button>
                  )}

                  <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => prevLesson && setOpenLesson(prevLesson)}
                      disabled={!prevLesson}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-default"
                    >
                      ← Anterior
                    </button>
                    {nextLesson ? (
                      <button
                        onClick={() => setOpenLesson(nextLesson)}
                        className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg max-w-[60%] truncate"
                      >
                        Siguiente: {nextLesson.titulo} →
                      </button>
                    ) : (
                      <span className="text-sm text-emerald-600 font-medium">🎉 Última clase</span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {flipbook && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[60] bg-slate-900/95 flex items-center justify-center text-white">
              Abriendo el material...
            </div>
          }
        >
          <Flipbook fileUrl={flipbook.url} title={flipbook.title} onClose={() => setFlipbook(null)} />
        </Suspense>
      )}
    </div>
  );
};

export default CoursePlayer;
