import React, { useState } from 'react';

interface QuestionDraft {
  question: string;
  options: string[];
  correctIndex: number;
}

interface CreateQuizModalProps {
  courseId: number;
  onClose: () => void;
  onCreated: () => void;
}

const emptyQuestion = (): QuestionDraft => ({ question: '', options: ['', ''], correctIndex: 0 });

const CreateQuizModal: React.FC<CreateQuizModalProps> = ({ courseId, onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [passingScore, setPassingScore] = useState(60);
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setQ = (i: number, patch: Partial<QuestionDraft>) =>
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  const setOpt = (qi: number, oi: number, value: string) =>
    setQuestions((qs) => qs.map((q, idx) => (idx === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) } : q)));

  const addOption = (qi: number) =>
    setQuestions((qs) => qs.map((q, idx) => (idx === qi && q.options.length < 5 ? { ...q, options: [...q.options, ''] } : q)));

  const save = async () => {
    setError('');
    if (!title.trim()) return setError('Ponele un título al cuestionario.');
    const clean = questions
      .map((q) => ({ ...q, options: q.options.map((o) => o.trim()).filter(Boolean) }))
      .filter((q) => q.question.trim() && q.options.length >= 2);
    if (clean.length === 0) return setError('Agregá al menos una pregunta con 2 opciones.');

    setSaving(true);
    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          title: title.trim(),
          courseId,
          passingScore,
          questions: clean.map((q) => ({
            question: q.question.trim(),
            type: 'multiple-choice',
            options: q.options,
            correctAnswer: String(Math.min(q.correctIndex, q.options.length - 1)),
            points: 1,
          })),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'No se pudo crear el cuestionario');
      }
      onCreated();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white p-5 rounded-t-2xl flex items-center justify-between sticky top-0">
          <h3 className="text-lg font-bold">📝 Nuevo cuestionario</h3>
          <button onClick={onClose} className="bg-white/15 hover:bg-white/25 rounded-lg w-8 h-8">✕</button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Autoevaluación Módulo 1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nota para aprobar (%)</label>
              <input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value || 60))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>

          {questions.map((q, qi) => (
            <div key={qi} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Pregunta {qi + 1}</span>
                {questions.length > 1 && (
                  <button onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))} className="text-xs text-red-500 hover:underline">Quitar</button>
                )}
              </div>
              <input value={q.question} onChange={(e) => setQ(qi, { question: e.target.value })} placeholder="Escribí la pregunta..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3" />
              <p className="text-xs text-gray-500 mb-2">Marcá la opción correcta:</p>
              <div className="space-y-2">
                {q.options.map((o, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${qi}`} checked={q.correctIndex === oi} onChange={() => setQ(qi, { correctIndex: oi })} />
                    <input value={o} onChange={(e) => setOpt(qi, oi, e.target.value)} placeholder={`Opción ${oi + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                ))}
              </div>
              {q.options.length < 5 && (
                <button onClick={() => addOption(qi)} className="text-xs text-blue-600 hover:underline mt-2">+ Agregar opción</button>
              )}
            </div>
          ))}

          <button onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-500 hover:bg-gray-50">
            + Agregar otra pregunta
          </button>

          {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium">Cancelar</button>
            <button onClick={save} disabled={saving} className="flex-1 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-semibold">
              {saving ? 'Guardando...' : 'Crear cuestionario'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateQuizModal;
