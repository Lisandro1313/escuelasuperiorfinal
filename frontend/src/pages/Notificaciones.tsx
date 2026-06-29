import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface Notif {
  id: number;
  title?: string; titulo?: string;
  message?: string; mensaje?: string;
  created_at?: string; timestamp?: string;
  read?: boolean; leida?: boolean | number;
  action_url?: string;
  tipo?: string; type?: string;
}

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });

const tiempo = (n: Notif) => {
  const iso = n.created_at || n.timestamp;
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
};
const iconFor = (n: Notif) => {
  const t = (n.tipo || n.type || '').toLowerCase();
  if (t.includes('vivo') || t.includes('live')) return '🔴';
  if (t.includes('pago') || t.includes('payment')) return '💳';
  if (t.includes('inscri') || t.includes('enroll') || t.includes('estudiante')) return '🎓';
  if (t.includes('curso')) return '📚';
  return '🔔';
};

const Notificaciones: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch('/api/notifications', { headers: auth() })
      .then((r) => (r.ok ? r.json() : { notifications: [] }))
      .then((d) => {
        const list = (d.notifications || [])
          .map((n: Notif) => ({ ...n, read: n.read ?? !!n.leida }))
          .filter((n: Notif) => (n.title || n.titulo || n.message || n.mensaje));
        setItems(list);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: number) => {
    try { await fetch(`/api/notifications/${id}/read`, { method: 'PUT', headers: auth() }); } catch { /* noop */ }
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAll = async () => {
    try { await fetch('/api/notifications/mark-all-read', { method: 'PUT', headers: auth() }); } catch { /* noop */ }
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const remove = async (id: number) => {
    try { await fetch(`/api/notifications/${id}`, { method: 'DELETE', headers: auth() }); } catch { /* noop */ }
    setItems((prev) => prev.filter((n) => n.id !== id));
  };

  const open = (n: Notif) => {
    if (!n.read) markRead(n.id);
    if (n.action_url) navigate(n.action_url);
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">← Volver al panel</Link>
          <div className="flex items-center justify-between gap-4 mt-2">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Notificaciones</h1>
              <p className="text-gray-500">{unread > 0 ? `${unread} sin leer` : 'Estás al día'}</p>
            </div>
            {unread > 0 && (
              <button onClick={markAll} className="text-sm font-medium text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition shrink-0">
                Marcar todas leídas
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="text-6xl mb-4">🔔</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No tenés notificaciones</h3>
            <p className="text-gray-400 text-sm">Te avisamos acá cuando pase algo (inscripciones, clases en vivo, pagos…).</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {items.map((n) => (
              <div key={n.id} className={`px-5 py-4 flex items-start gap-3 ${!n.read ? 'bg-blue-50/40' : ''}`}>
                <div className="text-2xl shrink-0">{iconFor(n)}</div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => open(n)}>
                  <div className="flex items-center gap-2">
                    {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                    <span className="font-semibold text-gray-900">{n.title || n.titulo}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{n.message || n.mensaje}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">{tiempo(n)}</span>
                    {n.action_url && <span className="text-xs text-blue-600 font-medium">Ver más →</span>}
                  </div>
                </div>
                <button onClick={() => remove(n.id)} title="Eliminar" className="text-gray-300 hover:text-red-500 shrink-0 text-lg">🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notificaciones;
