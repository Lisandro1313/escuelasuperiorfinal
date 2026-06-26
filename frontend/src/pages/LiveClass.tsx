import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast/ToastProvider';

interface LiveDetail {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  precio: number;
  cover_url: string | null;
  course_id: number;
  course_nombre: string | null;
  access: boolean;
  meeting_url: string | null;
}

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

const formatFechaHora = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

const LiveClass: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [data, setData] = useState<LiveDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReserve = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setWorking(true);
    try {
      const res = await fetch(`/api/live/${id}/register`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        toast.success('¡Lugar reservado! Ya podés entrar.');
        await load();
      } else {
        const d = await res.json();
        toast.error(d.error || 'No se pudo reservar.');
      }
    } catch {
      toast.error('Error de conexión.');
    } finally {
      setWorking(false);
    }
  };

  const handlePay = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setWorking(true);
    try {
      const res = await fetch('/api/payments/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ targetType: 'live', eventId: Number(id) }),
      });
      const d = await res.json();
      if (res.ok && (d.initPoint || d.sandboxInitPoint)) {
        window.location.href = d.initPoint || d.sandboxInitPoint;
      } else {
        toast.error(d.error || 'No se pudo iniciar el pago.');
      }
    } catch {
      toast.error('Error de conexión.');
    } finally {
      setWorking(false);
    }
  };

  const handleEnter = async () => {
    setWorking(true);
    try {
      const res = await fetch(`/api/live/${id}/join`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const d = await res.json();
      if (res.ok && d.meeting_url) {
        window.open(d.meeting_url, '_blank', 'noopener');
      } else {
        toast.error(d.error || 'No se pudo entrar.');
      }
    } catch {
      toast.error('Error de conexión.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="text-gray-700">No encontramos esta clase en vivo.</p>
        <Link to="/" className="text-blue-600 font-medium hover:underline">Volver al inicio</Link>
      </div>
    );
  }

  const isFree = Number(data.precio) === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 text-white">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <button onClick={() => navigate(-1)} className="text-blue-200 text-sm hover:text-white mb-4">← Volver</button>
          <div className="inline-flex items-center gap-2 bg-red-500/90 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> CLASE EN VIVO
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{data.title}</h1>
          {data.course_nombre && <p className="text-blue-200">Del curso “{data.course_nombre}”</p>}
          <p className="text-blue-100 mt-2 capitalize">📅 {formatFechaHora(data.start_date)} hs</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 text-center">
          {data.access ? (
            <>
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Ya tenés tu lugar</h2>
              <p className="text-gray-500 mb-6">Entrá a la transmisión cuando arranque. Vas a verla en vivo (no se comparte pantalla).</p>
              <button
                onClick={handleEnter}
                disabled={working}
                className="bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-4 rounded-xl shadow-lg disabled:opacity-60"
              >
                🔴 Entrar a la clase en vivo
              </button>
            </>
          ) : (
            <>
              <div className="text-5xl mb-3">{isFree ? '🎟️' : '💳'}</div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {isFree ? 'Reservá tu lugar gratis' : `Sumate por ${formatARS(data.precio)}`}
              </h2>
              <p className="text-gray-500 mb-6">
                {isFree
                  ? 'Es gratis para alumnos del curso. Reservá y entrás el día de la clase.'
                  : 'Pagás una vez y entrás a la transmisión en vivo.'}
              </p>
              {!isAuthenticated && (
                <p className="text-sm text-gray-500 mb-4">
                  Necesitás <Link to="/login" className="text-blue-600 font-medium">iniciar sesión</Link> o{' '}
                  <Link to="/register" className="text-blue-600 font-medium">crear una cuenta</Link>.
                </p>
              )}
              <button
                onClick={isFree ? handleReserve : handlePay}
                disabled={working}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl shadow-lg disabled:opacity-60"
              >
                {working ? 'Procesando...' : isFree ? '🎟️ Reservar mi lugar' : `💳 Pagar ${formatARS(data.precio)}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveClass;
