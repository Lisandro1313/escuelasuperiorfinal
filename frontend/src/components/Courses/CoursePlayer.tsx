import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../Toast/ToastProvider';

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
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              <div>
                <p className="text-xs font-semibold text-blue-600">Clase {lessonNumber.get(openLesson.id)}</p>
                <h3 className="text-lg font-bold text-gray-900">{openLesson.titulo}</h3>
              </div>
              <button onClick={() => setOpenLesson(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">
                ✕
              </button>
            </div>

            <div className="p-5">
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
                  {openLesson.contenido ? (
                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap mb-4">
                      {openLesson.contenido}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm mb-4">Sin contenido de texto cargado para esta clase.</p>
                  )}

                  {parseRecursos(openLesson.recursos).length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Material de la clase</p>
                      <ul className="space-y-1">
                        {parseRecursos(openLesson.recursos).map((r, i) => (
                          <li key={i}>
                            {r.url ? (
                              <a href={r.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm">
                                📎 {r.titulo}
                              </a>
                            ) : (
                              <span className="text-gray-700 text-sm">📎 {r.titulo}</span>
                            )}
                          </li>
                        ))}
                      </ul>
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
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursePlayer;
