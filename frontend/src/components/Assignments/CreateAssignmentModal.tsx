import React, { useState } from 'react';
import { useToast } from '../Toast/ToastProvider';

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const CreateAssignmentModal: React.FC<{ courseId: number; onClose: () => void; onCreated: () => void }> = ({ courseId, onClose, onCreated }) => {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/upload', { method: 'POST', headers: auth(), body: fd });
      if (r.ok) { const d = await r.json(); if (d.url) setAttachment(d.url); }
      else toast.error('No se pudo subir el archivo');
    } finally { setUploading(false); }
  };

  const save = async () => {
    if (title.trim().length < 3) { toast.error('Poné un título.'); return; }
    setSaving(true);
    try {
      const r = await fetch(`/api/courses/${courseId}/assignments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...auth() },
        body: JSON.stringify({ title, description, attachment_url: attachment || null }),
      });
      if (r.ok) { onCreated(); onClose(); }
      else { const d = await r.json().catch(() => ({})); toast.error(d.error || 'No se pudo crear'); }
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white p-5 rounded-t-2xl flex items-center justify-between">
          <h3 className="text-lg font-bold">📥 Nueva tarea</h3>
          <button onClick={onClose} className="bg-white/15 hover:bg-white/25 rounded-lg w-8 h-8">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Ejercicios de la clase 3"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-base outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Consigna / instrucciones</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
              placeholder="Explicá qué tienen que hacer y entregar…"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-base outline-none focus:border-blue-400 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Material adjunto (opcional)</label>
            {attachment ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                📎 Archivo cargado
                <button onClick={() => setAttachment('')} className="text-red-500 hover:underline">quitar</button>
              </div>
            ) : (
              <label className="flex items-center justify-center h-16 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 text-sm text-gray-500">
                {uploading ? '⏳ Subiendo…' : '📎 Subir un PDF o imagen con los ejercicios'}
                <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
              </label>
            )}
          </div>
          <button onClick={save} disabled={saving || uploading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-5 py-3 rounded-xl">
            {saving ? 'Guardando…' : 'Crear tarea'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateAssignmentModal;
