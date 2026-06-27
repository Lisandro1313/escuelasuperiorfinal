import React, { useEffect, useState } from 'react';

interface Question {
  id: number;
  question_text: string;
  options: string[];
}

interface QuizData {
  id: number;
  title: string;
  passing_score?: number;
  questions: Question[];
}

interface QuizResult {
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
}

interface TakeQuizModalProps {
  quizId: number;
  onClose: () => void;
}

const TakeQuizModal: React.FC<TakeQuizModalProps> = ({ quizId, onClose }) => {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/quizzes/${quizId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setQuiz(d))
      .catch(() => setError('No se pudo cargar el cuestionario.'))
      .finally(() => setLoading(false));
  }, [quizId]);

  const submit = async () => {
    if (!quiz) return;
    if (Object.keys(answers).length < quiz.questions.length) {
      setError('Respondé todas las preguntas antes de enviar.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ answers, timeSpent: 0 }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo enviar');
      setResult(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white p-5 rounded-t-2xl flex items-center justify-between sticky top-0">
          <h3 className="text-lg font-bold">📝 {quiz?.title || 'Cuestionario'}</h3>
          <button onClick={onClose} className="bg-white/15 hover:bg-white/25 rounded-lg w-8 h-8">✕</button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="py-10 text-center text-gray-500">Cargando...</div>
          ) : result ? (
            <div className="text-center py-6">
              <div className="text-6xl mb-3">{result.passed ? '🎉' : '💪'}</div>
              <h4 className="text-2xl font-bold text-gray-900 mb-1">
                {result.percentage}% ({result.score}/{result.maxScore})
              </h4>
              <p className={`font-semibold mb-6 ${result.passed ? 'text-emerald-600' : 'text-orange-500'}`}>
                {result.passed ? '¡Aprobaste! 👏' : 'No llegaste esta vez, pero seguí practicando.'}
              </p>
              <button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg">
                Cerrar
              </button>
            </div>
          ) : quiz ? (
            <div className="space-y-5">
              {quiz.questions.map((q, qi) => (
                <div key={q.id}>
                  <p className="font-semibold text-gray-900 mb-2">{qi + 1}. {q.question_text}</p>
                  <div className="space-y-2">
                    {q.options.map((o, oi) => (
                      <label
                        key={oi}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition ${
                          answers[q.id] === String(oi) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={answers[q.id] === String(oi)}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: String(oi) }))}
                        />
                        <span className="text-sm text-gray-700">{o}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}

              <button onClick={submit} disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold px-5 py-3 rounded-lg">
                {submitting ? 'Corrigiendo...' : 'Enviar respuestas'}
              </button>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">{error || 'No se encontró el cuestionario.'}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TakeQuizModal;
