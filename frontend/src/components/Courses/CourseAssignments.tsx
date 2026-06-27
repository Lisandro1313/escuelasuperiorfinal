import React, { useEffect, useState } from 'react';
import { useToast } from '../Toast/ToastProvider';
import { API_BASE } from '../../config';

interface Assignment {
  id: number;
  title: string;
  description: string | null;
  attachment_url: string | null;
  mySubmission: { status: string; grade: string | null } | null;
}
interface Submission {
  files: string[];
  comment: string | null;
  grade: string | null;
  feedback: string | null;
  status: string;
  created_at: string;
  graded_at: string | null;
}

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const fileUrl = (u: string) => (u.startsWith('http') ? u : `${API_BASE}${u}`);
const fecha = (iso?: string | null) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
};
const esImagen = (u: string) => /\.(jpg|jpeg|png|gif|webp|heic)($|\?)/i.test(u) || /\/image\/upload\//.test(u);

const Estado: React.FC<{ s?: { status: string; grade: string | null } | null }> = ({ s }) => {
  if (!s) return <span className="text-xs font-semibold text-gray-400">Pendiente</span>;
  if (s.status === 'corregido') return <span className="text-xs font-semibold text-emerald-600">✓ Corregida{s.grade ? ` · ${s.grade}` : ''}</span>;
  return <span className="text-xs font-semibold text-blue-600">Entregada</span>;
};

const CourseAssignments: React.FC<{ courseId: number }> = ({ courseId }) => {
  const toast = useToast();
  const [list, setList] = useState<Assignment[]>([]);
  const [open, setOpen] = useState<Assignment | null>(null);
  const [sub, setSub] = useState<Submission | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/courses/${courseId}/assignments`, { headers: auth() });
      const d = await r.json();
      setList(Array.isArray(d) ? d : []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [courseId]);

  const openAssignment = async (a: Assignment) => {
    setOpen(a); setSub(null); setFiles([]); setComment('');
    try {
      const r = await fetch(`/api/courses/${courseId}/assignments/${a.id}/submission`, { headers: auth() });
      const d = await r.json();
      if (d.submission) { setSub(d.submission); setFiles(d.submission.files || []); setComment(d.submission.comment || ''); }
    } catch { /* ignore */ }
  };

  const onUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      for (const f of Array.from(fileList)) {
        const fd = new FormData();
        fd.append('file', f);
        const r = await fetch('/api/upload', { method: 'POST', headers: auth(), body: fd });
        if (r.ok) { const d = await r.json(); if (d.url) setFiles((prev) => [...prev, d.url]); }
        else toast.error('No se pudo subir un archivo');
      }
    } finally { setUploading(false); }
  };

  const entregar = async () => {
    if (!open) return;
    if (files.length === 0 && !comment.trim()) { toast.error('Subí al menos un archivo o escribí un comentario.'); return; }
    setSending(true);
    try {
      const r = await fetch(`/api/courses/${courseId}/assignments/${open.id}/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...auth() },
        body: JSON.stringify({ files, comment }),
      });
      if (r.ok) { toast.success('¡Entrega enviada!'); openAssignment(open); load(); }
      else { const d = await r.json().catch(() => ({})); toast.error(d.error || 'No se pudo entregar'); }
    } finally { setSending(false); }
  };

  // ---- Detalle de la tarea ----
  if (open) {
    const yaCorregida = sub?.status === 'corregido';
    return (
      <div>
        <button onClick={() => setOpen(null)} className="text-blue-600 hover:underline text-base mb-4">← Volver a las tareas</button>
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-xl font-bold text-gray-900">{open.title}</h3>
          {open.description && <p className="text-gray-700 mt-2 whitespace-pre-wrap text-[17px] leading-relaxed">{open.description}</p>}
          {open.attachment_url && (
            <a href={fileUrl(open.attachment_url)} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 mt-3 text-blue-600 font-medium hover:underline">
              📎 Descargar el material de la tarea
            </a>
          )}
        </div>

        {/* Devolución del profe (si ya corrigió) */}
        {yaCorregida && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <p className="font-bold text-emerald-800">📝 Devolución del profesor</p>
            {sub?.grade && <p className="text-2xl font-extrabold text-emerald-700 mt-1">{sub.grade}</p>}
            {sub?.feedback && <p className="text-gray-800 mt-1 whitespace-pre-wrap text-[17px]">{sub.feedback}</p>}
            <p className="text-xs text-emerald-700/70 mt-2">Corregida el {fecha(sub?.graded_at)}</p>
          </div>
        )}

        {/* Mi entrega */}
        <div className="mt-4 bg-white border border-gray-200 rounded-2xl p-5">
          <p className="font-bold text-gray-900 mb-2">{sub ? 'Tu entrega' : 'Hacé tu entrega'}</p>
          {sub && <p className="text-xs text-gray-400 mb-3">Entregada el {fecha(sub.created_at)}{yaCorregida ? ' · podés volver a entregar si querés' : ' · esperando corrección'}</p>}

          {/* Archivos subidos */}
          {files.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              {files.map((u, i) => (
                <div key={i} className="relative group border border-gray-200 rounded-xl overflow-hidden">
                  {esImagen(u)
                    ? <a href={fileUrl(u)} target="_blank" rel="noreferrer"><img src={fileUrl(u)} alt="" className="w-full h-24 object-cover" /></a>
                    : <a href={fileUrl(u)} target="_blank" rel="noreferrer" className="flex items-center justify-center h-24 text-3xl bg-gray-50">📄</a>}
                  <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 bg-white/90 border rounded-full w-6 h-6 text-gray-500 text-sm shadow">×</button>
                </div>
              ))}
            </div>
          )}

          <label className="flex items-center justify-center h-20 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 text-sm text-gray-500 mb-3">
            {uploading ? '⏳ Subiendo…' : '📷 Subir fotos o archivos (podés subir varios)'}
            <input type="file" accept="image/*,.pdf" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
          </label>

          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
            placeholder="Comentario para el profe (opcional)…"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-[16px] outline-none focus:border-blue-400 resize-none" />

          <div className="flex justify-end mt-3">
            <button onClick={entregar} disabled={sending || uploading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl">
              {sending ? 'Enviando…' : sub ? 'Volver a entregar' : 'Entregar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Lista de tareas ----
  if (loading) return <p className="text-gray-400 text-center py-6">Cargando…</p>;
  if (list.length === 0) return null; // si no hay tareas, no mostramos la sección

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">📥 Tareas / Entregas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {list.map((a) => (
          <button key={a.id} onClick={() => openAssignment(a)}
            className="text-left bg-white border border-gray-200 hover:border-blue-300 hover:shadow-sm rounded-2xl p-4 transition flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{a.title}</p>
              <Estado s={a.mySubmission} />
            </div>
            <span className="text-2xl shrink-0">📥</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CourseAssignments;
