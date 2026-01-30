import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface Payment {
  id: number;
  course_id: number;
  course_name: string;
  amount: number;
  status: string;
  payment_id: string;
  created_at: string;
  payment_method?: string;
}

const MisPagos: React.FC = () => {
  const { usuario } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPagos: 0,
    totalGastado: 0,
    pagosAprobados: 0,
    pagosPendientes: 0
  });

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/payments/my-payments');
      const data = response.data;
      
      if (data.success) {
        const paymentsList = data.payments || [];
        setPayments(paymentsList);
        
        // Calcular estadísticas
        const aprobados = paymentsList.filter((p: Payment) => p.status === 'approved');
        const totalGastado = aprobados.reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0);
        const pendientes = paymentsList.filter((p: Payment) => p.status === 'pending').length;
        
        setStats({
          totalPagos: paymentsList.length,
          totalGastado,
          pagosAprobados: aprobados.length,
          pagosPendientes: pendientes
        });
      }
    } catch (error) {
      console.error('Error al cargar pagos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { bg: string; text: string; icon: string } } = {
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: '✅' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏳' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: '❌' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', icon: '🚫' }
    };
    
    const badge = badges[status] || badges.pending;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        {badge.icon} {status === 'approved' ? 'Aprobado' : status === 'pending' ? 'Pendiente' : status === 'rejected' ? 'Rechazado' : 'Cancelado'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando historial de pagos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">💳 Mis Pagos</h1>
          <p className="mt-2 text-gray-600">Historial completo de transacciones</p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <span className="text-2xl">💳</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Pagos</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalPagos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Gastado</p>
                <p className="text-2xl font-semibold text-gray-900">${stats.totalGastado}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-600 rounded-md p-3">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Aprobados</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pagosAprobados}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <span className="text-2xl">⏳</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pendientes</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pagosPendientes}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Pagos */}
        {payments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <span className="text-6xl mb-4 block">💳</span>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No tienes pagos registrados
            </h3>
            <p className="text-gray-600 mb-6">
              Cuando compres un curso, verás el historial aquí
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Curso
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID Pago
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(payment.created_at).toLocaleDateString('es-AR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">{payment.course_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${payment.amount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {payment.payment_id ? payment.payment_id.substring(0, 20) + '...' : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MisPagos;
