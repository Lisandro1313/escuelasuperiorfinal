import React, { useState, useEffect } from 'react';
import {
  createPaymentPreference,
  validateDiscountCode,
  getMyPaymentHistory,
  getMyPaymentStats,
  type DiscountCode,
  type PaymentHistory,
  type PaymentStats
} from '../../services/enhancedPaymentService';

interface Props {
  courseId: number;
  courseTitle: string;
  coursePrice: number;
  onPaymentSuccess?: () => void;
}

export const EnhancedPaymentGateway: React.FC<Props> = ({
  courseId,
  courseTitle,
  coursePrice,
  onPaymentSuccess
}) => {
  const [discountCode, setDiscountCode] = useState('');
  const [validatedDiscount, setValidatedDiscount] = useState<DiscountCode | null>(null);
  const [finalAmount, setFinalAmount] = useState(coursePrice);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);

  useEffect(() => {
    calculateFinalAmount();
  }, [validatedDiscount, coursePrice]);

  const calculateFinalAmount = () => {
    if (!validatedDiscount) {
      setFinalAmount(coursePrice);
      setDiscountAmount(0);
      return;
    }

    let discount = 0;
    if (validatedDiscount.type === 'percentage') {
      discount = coursePrice * (validatedDiscount.value / 100);
    } else {
      discount = validatedDiscount.value;
    }

    const final = Math.max(0, coursePrice - discount);
    setDiscountAmount(discount);
    setFinalAmount(final);
  };

  const handleValidateDiscount = async () => {
    if (!discountCode.trim()) {
      setError('Ingresa un código de descuento');
      return;
    }

    try {
      setValidating(true);
      setError('');
      const discount = await validateDiscountCode(discountCode);
      setValidatedDiscount(discount);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Código de descuento inválido');
      setValidatedDiscount(null);
    } finally {
      setValidating(false);
    }
  };

  const handleRemoveDiscount = () => {
    setDiscountCode('');
    setValidatedDiscount(null);
    setError('');
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await createPaymentPreference({
        course_id: courseId,
        discount_code: validatedDiscount?.code
      });

      // Redirigir a MercadoPago
      window.location.href = response.init_point;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      const [history, statsData] = await Promise.all([
        getMyPaymentHistory(),
        getMyPaymentStats()
      ]);
      setPaymentHistory(history);
      setStats(statsData);
      setShowHistory(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    
    const labels = {
      approved: 'Aprobado',
      pending: 'Pendiente',
      rejected: 'Rechazado',
      cancelled: 'Cancelado'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (showHistory) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <button
          onClick={() => setShowHistory(false)}
          className="mb-4 text-blue-600 hover:text-blue-800"
        >
          ← Volver
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-6">Mi Historial de Pagos</h2>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Gastado</p>
              <p className="text-2xl font-bold text-blue-600">${stats.total_spent.toFixed(2)}</p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Cursos Comprados</p>
              <p className="text-2xl font-bold text-green-600">{stats.total_courses_purchased}</p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Descuentos Usados</p>
              <p className="text-2xl font-bold text-purple-600">{stats.total_discounts_used}</p>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Ahorrado</p>
              <p className="text-2xl font-bold text-orange-600">${stats.total_saved.toFixed(2)}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {paymentHistory.length === 0 && (
            <p className="text-center text-gray-500">No tienes pagos registrados</p>
          )}

          {paymentHistory.map((payment) => (
            <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800">{payment.course_title}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(payment.created_at).toLocaleString()}
                  </p>
                </div>
                {getStatusBadge(payment.status)}
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monto original:</span>
                  <span className="font-medium">${payment.amount.toFixed(2)}</span>
                </div>
                
                {payment.discount_amount && payment.discount_amount > 0 && (
                  <>
                    <div className="flex justify-between text-green-600">
                      <span>Descuento ({payment.discount_code}):</span>
                      <span className="font-medium">-${payment.discount_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total pagado:</span>
                      <span className="text-blue-600">${payment.final_amount.toFixed(2)}</span>
                    </div>
                  </>
                )}
                
                {(!payment.discount_amount || payment.discount_amount === 0) && (
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total pagado:</span>
                    <span className="text-blue-600">${payment.final_amount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-500 pt-2">
                  <span>Método:</span>
                  <span>{payment.payment_method}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Finalizar Compra</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* INFORMACIÓN DEL CURSO */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-2">{courseTitle}</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-gray-700">
            <span>Precio original:</span>
            <span className={validatedDiscount ? 'line-through text-gray-500' : 'font-bold'}>
              ${coursePrice.toFixed(2)}
            </span>
          </div>
          
          {validatedDiscount && discountAmount > 0 && (
            <>
              <div className="flex justify-between text-green-600">
                <span>Descuento aplicado:</span>
                <span className="font-semibold">
                  -${discountAmount.toFixed(2)}
                  {validatedDiscount.type === 'percentage' && ` (${validatedDiscount.value}%)`}
                </span>
              </div>
              <div className="flex justify-between text-xl font-bold text-blue-600 pt-2 border-t">
                <span>Total a pagar:</span>
                <span>${finalAmount.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* CÓDIGO DE DESCUENTO */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ¿Tienes un código de descuento?
        </label>
        
        {!validatedDiscount ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              placeholder="CODIGO123"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleValidateDiscount}
              disabled={validating || !discountCode.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
            >
              {validating ? 'Validando...' : 'Aplicar'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-300 rounded-lg">
            <span className="text-green-700 font-semibold">
              ✓ Código "{validatedDiscount.code}" aplicado
            </span>
            <button
              onClick={handleRemoveDiscount}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Quitar
            </button>
          </div>
        )}
      </div>

      {/* BOTÓN DE PAGO */}
      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-semibold text-lg mb-4"
      >
        {loading ? 'Procesando...' : `Pagar $${finalAmount.toFixed(2)} con MercadoPago`}
      </button>

      {/* LINK AL HISTORIAL */}
      <button
        onClick={loadPaymentData}
        className="w-full text-center text-blue-600 hover:text-blue-800 text-sm"
      >
        Ver mi historial de pagos
      </button>

      {/* INFORMACIÓN DE SEGURIDAD */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          🔒 Pago seguro procesado por MercadoPago
        </p>
      </div>
    </div>
  );
};

export default EnhancedPaymentGateway;
