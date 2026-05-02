import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';

type StatusResp = { status: string; enrolled: boolean; courseId?: number };

export const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const payment_id = searchParams.get('payment_id') || searchParams.get('collection_id');
  const preference_id = searchParams.get('preference_id');

  const [state, setState] = useState<'checking' | 'enrolled' | 'pending' | 'unknown' | 'failed'>('checking');
  const [courseId, setCourseId] = useState<number | undefined>();
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (payment_id) params.set('payment_id', payment_id);
    if (preference_id) params.set('preference_id', preference_id);

    const poll = async (n: number) => {
      try {
        const r = await api.get<StatusResp>(`/api/payments/status?${params.toString()}`);
        if (cancelled) return;
        setCourseId(r.data.courseId);
        if (r.data.enrolled || r.data.status === 'approved') {
          setState('enrolled');
          return;
        }
        if (r.data.status === 'rejected' || r.data.status === 'cancelled') {
          setState('failed');
          return;
        }
        setAttempts(n);
        if (n < 6) setTimeout(() => poll(n + 1), 1500);
        else setState(r.data.status === 'unknown' ? 'unknown' : 'pending');
      } catch {
        if (!cancelled) {
          setAttempts(n);
          if (n < 6) setTimeout(() => poll(n + 1), 1500);
          else setState('unknown');
        }
      }
    };
    poll(1);
    return () => { cancelled = true; };
  }, [payment_id, preference_id]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
        {state === 'checking' && (
          <>
            <div className="text-6xl mb-4">⏳</div>
            <h1 className="text-2xl font-bold mb-2">Confirmando tu pago...</h1>
            <p className="text-gray-600 mb-2">Estamos verificando tu inscripción con MercadoPago.</p>
            <p className="text-sm text-gray-500">Intento {attempts}/6</p>
          </>
        )}
        {state === 'enrolled' && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">¡Pago confirmado!</h1>
            <p className="text-gray-600 mb-6">Quedaste inscripto. Ya podes acceder al contenido del curso.</p>
            <div className="space-y-3">
              {courseId && (
                <button onClick={() => navigate(`/course/${courseId}`)} className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Ir al curso
                </button>
              )}
              <button onClick={() => navigate('/dashboard')} className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                Mi dashboard
              </button>
            </div>
          </>
        )}
        {state === 'pending' && (
          <>
            <div className="text-6xl mb-4">🕒</div>
            <h1 className="text-2xl font-bold text-yellow-600 mb-2">Pago en proceso</h1>
            <p className="text-gray-600 mb-6">MercadoPago todavia no nos confirmo el pago. Cuando se acredite, vas a ver el curso en tu dashboard.</p>
            <button onClick={() => navigate('/dashboard')} className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Mi dashboard
            </button>
          </>
        )}
        {state === 'unknown' && (
          <>
            <div className="text-6xl mb-4">❓</div>
            <h1 className="text-2xl font-bold text-gray-700 mb-2">No pudimos confirmar el pago</h1>
            <p className="text-gray-600 mb-6">Si tu pago salio bien, vas a ver el curso disponible en tu dashboard en unos minutos.</p>
            <button onClick={() => navigate('/dashboard')} className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Mi dashboard
            </button>
          </>
        )}
        {state === 'failed' && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">El pago fue rechazado</h1>
            <p className="text-gray-600 mb-6">Probá de nuevo o usá otro medio de pago.</p>
            <button onClick={() => navigate('/courses')} className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Ver cursos
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export const PaymentFailure: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const getErrorMessage = () => {
    const status = searchParams.get('status');
    const status_detail = searchParams.get('status_detail');
    
    switch (status_detail) {
      case 'cc_rejected_insufficient_amount':
        return 'Fondos insuficientes en la tarjeta';
      case 'cc_rejected_bad_filled_card_number':
        return 'Número de tarjeta incorrecto';
      case 'cc_rejected_bad_filled_date':
        return 'Fecha de vencimiento incorrecta';
      case 'cc_rejected_bad_filled_security_code':
        return 'Código de seguridad incorrecto';
      case 'cc_rejected_call_for_authorize':
        return 'Debes autorizar el pago con tu banco';
      default:
        return 'El pago no pudo ser procesado';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-2xl font-bold text-red-600 mb-2">Pago Fallido</h1>
        <p className="text-gray-600 mb-2">
          {getErrorMessage()}
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Puedes intentar nuevamente con otro método de pago.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => window.history.back()}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Intentar Nuevamente
          </button>
          <button
            onClick={() => navigate('/courses')}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Volver a Cursos
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <p>Si el problema persiste, contacta a soporte.</p>
        </div>
      </div>
    </div>
  );
};

export const PaymentPending: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="text-6xl mb-4">⏳</div>
        <h1 className="text-2xl font-bold text-yellow-600 mb-2">Pago Pendiente</h1>
        <p className="text-gray-600 mb-6">
          Tu pago está siendo procesado. Te notificaremos cuando se complete.
        </p>

        {searchParams.get('payment_id') && (
          <div className="bg-yellow-50 p-4 rounded-lg mb-6 text-left">
            <h3 className="font-medium text-gray-900 mb-2">Información del Pago</h3>
            <div className="text-sm text-gray-600">
              <div>ID de Pago: {searchParams.get('payment_id')}</div>
              <div>Estado: Pendiente de aprobación</div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
          >
            Ir a Mi Dashboard
          </button>
          <button
            onClick={() => navigate('/courses')}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Ver Más Cursos
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <p>Los pagos pueden tardar hasta 48 horas en procesarse.</p>
          <p>Recibirás una notificación cuando se complete.</p>
        </div>
      </div>
    </div>
  );
};