import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface Course {
  id: number;
  nombre: string;
  descripcion: string;
  profesor: string;
  precio: number;
  imagen: string;
  categoria: string;
  duracion: string;
}

const PaymentPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCourseData = async () => {
      try {
        setLoading(true);

        if (courseId) {
          // Obtener datos reales del curso
          try {
            const response = await fetch(`http://localhost:5000/api/courses/${courseId}`);
            if (response.ok) {
              const courseData = await response.json();
              setCourse(courseData);
            } else {
              console.error('Curso no encontrado');
              navigate('/courses');
            }
          } catch (error) {
            console.error('Error al cargar curso:', error);
            navigate('/courses');
          }
        }
      } catch (error) {
        console.error('Error loading course:', error);
        setError('Error cargando información del curso');
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      loadCourseData();
    }
  }, [courseId]);

  const handlePayment = async () => {
    if (!course || !usuario) return;

    try {
      setProcessing(true);
      setError('');

      // Crear preferencia de pago en MercadoPago
      const response = await api.post('/api/payments/create-preference', {
        courseId: course.id,
        courses: [course]
      });

      const { initPoint, sandboxInitPoint } = response.data;

      // Redireccionar a MercadoPago
      const paymentUrl = sandboxInitPoint || initPoint;
      
      window.location.href = paymentUrl;

    } catch (error) {
      console.error('Error creating payment:', error);
      setError('Error procesando el pago. Intenta nuevamente.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Cargando información del curso...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Curso no encontrado</h2>
          <button 
            onClick={() => navigate('/courses')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Ver Catálogo de Cursos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">{course.imagen}</div>
              <div>
                <h1 className="text-2xl font-bold">Confirmar Inscripción</h1>
                <p className="text-blue-100">Estás a punto de inscribirte en este curso</p>
              </div>
            </div>
          </div>

          {/* Course Information */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Course Details */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{course.nombre}</h2>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium mr-2">Profesor:</span>
                    <span>{course.profesor}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium mr-2">Duración:</span>
                    <span>{course.duracion}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium mr-2">Categoría:</span>
                    <span className="capitalize">{course.categoria}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-gray-700">{course.descripcion}</p>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Pago</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Precio del curso:</span>
                    <span className="font-medium">{formatCurrency(course.precio)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Descuentos:</span>
                    <span className="font-medium text-green-600">-{formatCurrency(0)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-blue-600">{formatCurrency(course.precio)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Methods Info */}
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-2">Métodos de Pago Aceptados</h4>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>💳</span>
                    <span>Tarjetas de crédito y débito</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                    <span>🏦</span>
                    <span>Transferencias bancarias</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                    <span>📱</span>
                    <span>Billeteras digitales</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <span className="text-red-500 mr-2">⚠️</span>
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/courses')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handlePayment}
                disabled={processing}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    💳 Pagar con MercadoPago
                  </>
                )}
              </button>
            </div>

            {/* Security Notice */}
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start">
                <span className="text-green-500 mr-2 mt-0.5">🔒</span>
                <div className="text-sm text-green-700">
                  <p className="font-medium">Pago Seguro</p>
                  <p>Tu información está protegida por MercadoPago. No almacenamos datos de tarjetas de crédito.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;