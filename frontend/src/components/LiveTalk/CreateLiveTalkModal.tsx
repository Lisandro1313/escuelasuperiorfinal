import React, { useState } from 'react';
import { useToast } from '../Toast/ToastProvider';

const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

interface LiveToEdit {
  id: number;
  title: string;
  start_date: string;
  end_date?: string;
  precio: number;
  meeting_url?: string | null;
}

const pad = (n: number) => String(n).padStart(2, '0');

const buildInitial = (live?: LiveToEdit | null) => {
  if (!live) return { title: '', date: '', time: '', duration_minutes: 60, meeting_url: '', precio: 0 };
  const d = new Date(live.start_date);
  let dur = 60;
  if (live.end_date) dur = Math.max(15, Math.round((new Date(live.end_date).getTime() - d.getTime()) / 60000));
  return {
    title: live.title || '',
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    duration_minutes: dur,
    meeting_url: live.meeting_url || '',
    precio: Number(live.precio || 0),
  };
};

const CreateLiveTalkModal: React.FC<{ onClose: () => void; onCreated?: () => void; live?: LiveToEdit | null }> = ({ onClose, onCreated, live }) => {
  const toast = useToast();
  const editing = !!live;
  const [form, setForm] = useState(() => buildInitial(live));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (form.title.trim().length < 3) { toast.error('Poné un título.'); return; }
    if (!form.date || !form.time) { toast.error('Poné fecha y hora.'); return; }
    setSaving(true);
    try {
      const scheduled_at = `${form.date}T${form.time}:00`;
      const body = JSON.stringify({ title: form.title, scheduled_at, duration_minutes: form.duration_minutes, meeting_url: form.meeting_url, precio: form.precio });
      const r = await fetch(editing ? `/api/live-class/${live!.id}` : '/api/live-class', {
        method: editing ? 'PUT' : 'POST', headers: auth(), body,
      });
      if (r.ok) {
        toast.success(editing ? 'Clase en vivo actualizada.' : '¡Charla programada! Ya les avisamos a los alumnos.');
        onCreated?.(); onClose();
      } else { const d = await r.json().catch(() => ({})); toast.error(d.error || 'No se pudo guardar'); }
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white p-5 rounded-t-2xl flex items-center justify-between">
          <h3 className="text-lg font-bold">🔴 {editing ? 'Editar clase en vivo' : 'Programar charla en vivo'}</h3>
          <button onClick={onClose} className="bg-white/20 hover:bg-white/30 rounded-lg w-8 h-8">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-500 -mt-1">
            {editing ? 'Editá los datos de la clase. Los cambios se ven al instante.' : 'Una charla abierta, que no es de un curso. Les avisa a todos los alumnos.'}
          </p>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Título</label>
            <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Ej: Charla abierta sobre composición"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-base outline-none focus:border-red-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha</label>
              <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-base outline-none focus:border-red-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Hora</label>
              <input type="time" value={form.time} onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-base outline-none focus:border-red-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Link de la transmisión (Zoom, YouTube en vivo, etc.)</label>
            <input value={form.meeting_url} onChange={(e) => setForm((p) => ({ ...p, meeting_url: e.target.value }))} placeholder="https://us02web.zoom.us/j/..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-base outline-none focus:border-red-400" />
            <p className="text-xs text-gray-400 mt-1">Si lo dejás vacío, te creamos una sala automática. Solo lo ve quien reserva/paga.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Duración (min)</label>
              <input type="number" min={15} value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: Number(e.target.value || 60) }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-base outline-none focus:border-red-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Precio ($, 0 = gratis)</label>
              <input type="number" min={0} value={form.precio} onChange={(e) => setForm((p) => ({ ...p, precio: Number(e.target.value || 0) }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-base outline-none focus:border-red-400" />
            </div>
          </div>
          <button onClick={save} disabled={saving} className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold px-5 py-3 rounded-xl">
            {saving ? 'Guardando…' : editing ? '💾 Guardar cambios' : '🔴 Programar charla'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateLiveTalkModal;
