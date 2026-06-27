import React, { useEffect, useState } from 'react';
import { useToast } from '../Toast/ToastProvider';
import { API_BASE } from '../../config';

interface Sub {
  id: number;
  user_name: string;
  user_email: string;
  files: string[];
  comment: string | null;
  grade: string | null;
  feedback: string | null;
  status: string;
  created_at: string;
}

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const fileUrl = (u: string) => (u.startsWith('http') ? u : `${API_BASE}${u}`);
const esImagen = (u: string) => /\.(jpg|jpeg|png|gif|webp|heic)($|\?)/i.test(u) || /\/image\/upload\//.test(u);
const fecha = (iso: string) => { try { return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

const Row: React.FC<{ courseId: number; s: Sub; onSaved: () => void }> = ({ courseId, s, onSaved }) => {
  const toast = useToast();
  const [openRow, setOpenRow] = useState(false);
  const [grade, setGrade] = useState(s.grade || '');
  const [feedback, setFeedback] = useState(s.feedback || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch(`/api/courses/${courseId}/assignments/submission/${s.id}/grade`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...auth() },
        body: JSON.stringify({ grade, feedback }),
      });
      if (r.ok) { toast.success('Corrección guardada'); onSaved(); }
      else toast.error('No se pudo guardar');
    } finally { setSaving(false); }
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpenRow((o) => !o)} className="w-full flex items-center justify-between gap-3 p-3 hover:bg-gray-50 text-left">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{s.user_name}</p>
          <p className="text-xs text-gray-400">{fecha(s.created_at)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {s.status === 'corregido'
            ? <span className="text-xs font-semibold text-emerald-600">✓ {s.grade || 'Corregida'}</span>
            : <span className="text-xs font-semibold text-blue-600">Sin corregir</span>}
          <span className="text-gray-300">{openRow ? '▲' : '▼'}</span>
        </div>
      </button>

      {openRow && (
        <div className="px-3 pb-3 bg-gray-50/60 space-y-3">
          {/* Lo que entregó el alumno */}
          {s.files.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {s.files.map((u, i) => (
                esImagen(u)
                  ? <a key={i} href={fileUrl(u)} target="_blank" rel="noreferrer" className="block border rounded-lg overflow-hidden"><img src={fileUrl(u)} alt="" className="w-full h-20 object-cover" /></a>
                  : <a key={i} href={fileUrl(u)} target="_blank" rel="noreferrer" className="flex items-center justify-center h-20 text-2xl bg-white border rounded-lg">📄</a>
              ))}
            </div>
          )}
          {s.comment && <p className="text-sm text-gray-700 bg-white border rounded-lg p-2 whitespace-pre-wrap">💬 {s.comment}</p>}

          {/* Corrección */}
          <div className="bg-white border rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-600">Tu corrección</p>
            <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Nota (ej: 9, Aprobado, 10/10)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-400" />
            <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} placeholder="Devolución / comentario para el alumno…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-400 resize-none" />
            <div className="flex justify-end">
              <button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm">
                {saving ? 'Guardando…' : 'Guardar corrección'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AssignmentSubmissionsModal: React.FC<{ courseId: number; assignmentId: number; onClose: () => void }> = ({ courseId, assignmentId, onClose }) => {
  const [data, setData] = useState<{ assignment: { title: string }; submissions: Sub[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch(`/api/courses/${courseId}/assignments/${assignmentId}/submissions`, { headers: auth() })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };
  useEffect(load, [courseId, assignmentId]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white p-5 rounded-t-2xl flex items-center justify-between sticky top-0">
          <div>
            <h3 className="text-lg font-bold">📥 Entregas</h3>
            <p className="text-blue-200 text-xs">{data?.assignment?.title}</p>
          </div>
          <button onClick={onClose} className="bg-white/15 hover:bg-white/25 rounded-lg w-8 h-8">✕</button>
        </div>
        <div className="p-5">
          {loading ? <p className="text-center text-gray-500 py-8">Cargando…</p>
            : !data ? <p className="text-center text-gray-500 py-8">No se pudieron cargar las entregas.</p>
            : data.submissions.length === 0 ? (
              <div className="text-center text-gray-400 py-10"><div className="text-4xl mb-2">📭</div>Todavía nadie entregó esta tarea.</div>
            ) : (
              <div className="space-y-2">
                {data.submissions.map((s) => <Row key={s.id} courseId={courseId} s={s} onSaved={load} />)}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AssignmentSubmissionsModal;
