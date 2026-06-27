import React, { useEffect, useState } from 'react';
import { useToast } from '../Toast/ToastProvider';

interface Thread {
  id: number;
  title: string;
  content: string;
  author_name: string;
  author_tipo?: string;
  reply_count?: number;
  is_pinned?: number | boolean;
  user_id: number;
  created_at: string;
}
interface Reply {
  id: number;
  content: string;
  author_name: string;
  author_tipo?: string;
  user_id: number;
  created_at: string;
}

interface Props {
  courseId: number;
  currentUserId: number;
  canModerate: boolean;
}

const fecha = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const esDocente = (tipo?: string) => tipo === 'profesor' || tipo === 'admin';

const CourseForum: React.FC<Props> = ({ courseId, currentUserId, canModerate }) => {
  const toast = useToast();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [open, setOpen] = useState<{ thread: Thread; replies: Reply[] } | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  const loadThreads = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/courses/${courseId}/forum`, { headers: auth() });
      const d = await r.json();
      setThreads(Array.isArray(d) ? d : []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { loadThreads(); /* eslint-disable-next-line */ }, [courseId]);

  // Abre un tema. Si se pasa el tema de la lista, lo muestra al instante y luego
  // actualiza con las respuestas (evita la pantalla en blanco mientras carga).
  const openThread = async (id: number, optimistic?: Thread) => {
    if (optimistic) setOpen({ thread: optimistic, replies: open?.thread.id === id ? open.replies : [] });
    else setOpeningId(id);
    try {
      const r = await fetch(`/api/courses/${courseId}/forum/${id}`, { headers: auth() });
      const d = await r.json();
      if (!r.ok) throw new Error();
      setOpen({ thread: d.thread, replies: d.replies || [] });
    } catch { if (!optimistic) toast.error('No se pudo abrir el tema'); }
    finally { setOpeningId(null); }
  };

  const createThread = async () => {
    if (form.title.trim().length < 3) { toast.error('Poné un título un poco más largo.'); return; }
    if (!form.content.trim()) { toast.error('Escribí tu mensaje.'); return; }
    setSending(true);
    try {
      const r = await fetch(`/api/courses/${courseId}/forum`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth() }, body: JSON.stringify(form) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { toast.success('Tema publicado'); setForm({ title: '', content: '' }); setCreating(false); loadThreads(); if (d.id) openThread(d.id); }
      else toast.error(d.error || 'No se pudo publicar');
    } finally { setSending(false); }
  };

  const sendReply = async () => {
    if (!open || !replyText.trim() || sending) return;
    setSending(true);
    try {
      const r = await fetch(`/api/courses/${courseId}/forum/${open.thread.id}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth() }, body: JSON.stringify({ content: replyText }) });
      if (r.ok) { setReplyText(''); openThread(open.thread.id, open.thread); loadThreads(); }
      else { const d = await r.json().catch(() => ({})); toast.error(d.error || 'No se pudo responder'); }
    } finally { setSending(false); }
  };

  const deleteThread = async (t: Thread) => {
    if (!confirm('¿Eliminar este tema y sus respuestas?')) return;
    const r = await fetch(`/api/courses/${courseId}/forum/thread/${t.id}`, { method: 'DELETE', headers: auth() });
    if (r.ok) { toast.success('Tema eliminado'); setOpen(null); loadThreads(); }
    else toast.error('No se pudo eliminar');
  };
  const deleteReply = async (id: number) => {
    if (!open || !confirm('¿Eliminar esta respuesta?')) return;
    const r = await fetch(`/api/courses/${courseId}/forum/reply/${id}`, { method: 'DELETE', headers: auth() });
    if (r.ok) openThread(open.thread.id, open.thread); else toast.error('No se pudo eliminar');
  };
  const togglePin = async (t: Thread) => {
    const r = await fetch(`/api/courses/${courseId}/forum/thread/${t.id}/pin`, { method: 'POST', headers: auth() });
    if (r.ok) { loadThreads(); if (open) openThread(open.thread.id, open.thread); }
  };

  // ---- Vista: detalle del tema ----
  if (open) {
    const t = open.thread;
    const canDelThread = canModerate || t.user_id === currentUserId;
    return (
      <div>
        <button onClick={() => setOpen(null)} className="text-blue-600 hover:underline text-base mb-4">← Volver al foro</button>
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-xl font-bold text-gray-900">{t.title}</h3>
            <div className="flex gap-2 shrink-0">
              {canModerate && <button onClick={() => togglePin(t)} title="Fijar" className="text-gray-400 hover:text-amber-500">📌</button>}
              {canDelThread && <button onClick={() => deleteThread(t)} title="Eliminar" className="text-gray-400 hover:text-red-500">🗑️</button>}
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {t.author_name} {esDocente(t.author_tipo) && <span className="text-blue-600 font-medium">· Docente</span>} · {fecha(t.created_at)}
          </p>
          <p className="text-gray-800 mt-3 whitespace-pre-wrap text-lg leading-relaxed">{t.content}</p>
        </div>

        <h4 className="font-bold text-gray-700 mt-6 mb-3">{open.replies.length} respuesta{open.replies.length === 1 ? '' : 's'}</h4>
        <div className="space-y-3">
          {open.replies.map((r) => (
            <div key={r.id} className={`rounded-2xl p-4 border ${esDocente(r.author_tipo) ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-gray-800">
                  {r.author_name} {esDocente(r.author_tipo) && <span className="text-blue-600">· Docente</span>}
                </p>
                {(canModerate || r.user_id === currentUserId) && (
                  <button onClick={() => deleteReply(r.id)} className="text-gray-300 hover:text-red-500 text-sm">🗑️</button>
                )}
              </div>
              <p className="text-gray-800 mt-1 whitespace-pre-wrap text-base leading-relaxed">{r.content}</p>
              <p className="text-xs text-gray-400 mt-1">{fecha(r.created_at)}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 bg-white border border-gray-200 rounded-2xl p-3">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Escribí tu respuesta..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-base outline-none focus:border-blue-400 resize-none"
          />
          <div className="flex justify-end mt-2">
            <button onClick={sendReply} disabled={!replyText.trim() || sending} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold px-5 py-2.5 rounded-xl">
              {sending ? 'Enviando…' : 'Responder'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Vista: lista de temas ----
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">💬 Foro del curso</h3>
          <p className="text-sm text-gray-500">Hacé tu consulta o respondé a tus compañeros. El docente también participa.</p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl whitespace-nowrap">
            ✏️ Nuevo tema
          </button>
        )}
      </div>

      {creating && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
          <input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Título (ej: ¿Cómo entrego la tarea?)"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-base mb-2 outline-none focus:border-blue-400"
          />
          <textarea
            value={form.content}
            onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
            placeholder="Escribí tu consulta o mensaje..."
            rows={4}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-base outline-none focus:border-blue-400 resize-none"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => { setCreating(false); setForm({ title: '', content: '' }); }} className="px-4 py-2.5 text-gray-600">Cancelar</button>
            <button onClick={createThread} disabled={sending} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl">{sending ? 'Publicando…' : 'Publicar'}</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-center py-8">Cargando…</p>
      ) : threads.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center text-gray-400">
          Todavía no hay temas. ¡Animate a hacer la primera consulta! 👋
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <button key={t.id} onClick={() => openThread(t.id, t)} disabled={openingId === t.id} className="w-full text-left bg-white border border-gray-200 hover:border-blue-300 hover:shadow-sm rounded-2xl p-4 transition disabled:opacity-60">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-gray-900 text-base">
                  {!!t.is_pinned && <span className="mr-1">📌</span>}{t.title}
                </p>
                <span className="text-sm text-gray-400 shrink-0">{t.reply_count || 0} 💬</span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {t.author_name} {esDocente(t.author_tipo) && <span className="text-blue-600">· Docente</span>} · {fecha(t.created_at)}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseForum;
