import React, { useEffect, useState } from 'react';

interface Question {
  id: number;
  question_text: string;
  options: string[];
  correct_answer: string;
  points: number;
}
interface Attempt {
  user_name: string;
  user_email: string;
  score: number;
  max_score: number;
  percentage: number;
  completed_at: string;
  answers: Record<string, string>;
}
interface ResultsData {
  title: string;
  passing_score?: number;
  questions: Question[];
  attempts: Attempt[];
}

const fecha = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

const QuizResultsModal: React.FC<{ quizId: number; onClose: () => void }> = ({ quizId, onClose }) => {
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/quizzes/${quizId}/results`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [quizId]);

  const avg = data && data.attempts.length
    ? Math.round(data.attempts.reduce((a, x) => a + x.percentage, 0) / data.attempts.length)
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white p-5 rounded-t-2xl flex items-center justify-between sticky top-0">
          <div>
            <h3 className="text-lg font-bold">📊 Resultados</h3>
            <p className="text-blue-200 text-xs">{data?.title}</p>
          </div>
          <button onClick={onClose} className="bg-white/15 hover:bg-white/25 rounded-lg w-8 h-8">✕</button>
        </div>

        <div className="p-5">
          {loading ? (
            <p className="text-center text-gray-500 py-8">Cargando…</p>
          ) : !data ? (
            <p className="text-center text-gray-500 py-8">No se pudieron cargar los resultados.</p>
          ) : data.attempts.length === 0 ? (
            <div className="text-center text-gray-400 py-10">
              <div className="text-4xl mb-2">📭</div>
              Todavía nadie respondió este cuestionario.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{data.attempts.length}</p>
                  <p className="text-xs text-gray-500">Respuestas</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{avg}%</p>
                  <p className="text-xs text-gray-500">Promedio</p>
                </div>
              </div>

              <div className="space-y-2">
                {data.attempts.map((a, i) => {
                  const passed = data.passing_score ? a.percentage >= data.passing_score : a.percentage >= 60;
                  return (
                    <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                      <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between gap-3 p-3 hover:bg-gray-50 text-left">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{a.user_name}</p>
                          <p className="text-xs text-gray-400">{fecha(a.completed_at)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-sm font-bold ${passed ? 'text-emerald-600' : 'text-orange-500'}`}>{a.percentage}%</span>
                          <span className="text-xs text-gray-400">({a.score}/{a.max_score})</span>
                          <span className="text-gray-300">{open === i ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {open === i && (
                        <div className="px-3 pb-3 space-y-2 bg-gray-50/60">
                          {data.questions.map((q, qi) => {
                            const given = a.answers[String(q.id)];
                            const correct = String(given) === String(q.correct_answer);
                            return (
                              <div key={q.id} className="text-sm">
                                <p className="font-medium text-gray-700">{qi + 1}. {q.question_text}</p>
                                <p className={correct ? 'text-emerald-600' : 'text-red-500'}>
                                  {correct ? '✓' : '✗'} Respondió: {given != null && q.options[Number(given)] != null ? q.options[Number(given)] : '—'}
                                </p>
                                {!correct && (
                                  <p className="text-gray-500 text-xs">Correcta: {q.options[Number(q.correct_answer)] ?? '—'}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizResultsModal;
