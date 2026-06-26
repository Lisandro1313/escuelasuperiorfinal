import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Course {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  profesor_nombre?: string;
  duracion?: string;
  categoria?: string;
  modalidad_precio?: 'curso' | 'modulo' | 'clase';
}
interface LessonOption { id: number; titulo: string; precio: number; }
interface ModuleOption { id: number; titulo: string; precio: number; lessons: LessonOption[]; }

const PaymentPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [targetType, setTargetType] = useState<'course' | 'module' | 'lesson'>('course');
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/courses/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const courseData = await response.json();
        setCourse(courseData);
        if (courseData.modalidad_precio === 'modulo') setTargetType('module');
        if (courseData.modalidad_precio === 'clase') setTargetType('lesson');
      } else {
        setError('Error al cargar el curso');
      }
      const syllabusRes = await fetch(`/api/courses/${courseId}/syllabus`);
      if (syllabusRes.ok) {
        const syllabusData = await syllabusRes.json();
        setModules(syllabusData.modules || []);
      }
    } catch (error) {
      console.error('Error al cargar curso:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!course) return;
    try {
      setProcessing(true);
      setError('');

      const payload: any = { courseId: course.id, targetType };
      if (targetType === 'module') payload.moduleId = selectedModuleId;
      if (targetType === 'lesson') payload.lessonId = selectedLessonId;
      const response = await fetch('/api/payments/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || data.detail || 'Error al iniciar el pago');
        return;
      }

      // El backend devuelve initPoint (prod) y sandboxInitPoint (test).
      // Si el access token es de sandbox, MP devuelve ambos pero initPoint redirige al sandbox.
      const checkoutUrl = data.initPoint || data.sandboxInitPoint;
      if (!checkoutUrl) {
        setError('No se recibio la URL de pago de MercadoPago');
        return;
      }
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error('Error procesando pago:', err);
      setError('Error de conexion. Intenta nuevamente.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const selectedModule = modules.find((m) => m.id === selectedModuleId) || null;
  const selectedLesson = selectedModule?.lessons?.find((l) => l.id === selectedLessonId) || null;
  const total = targetType === 'course'
    ? Number(course?.precio || 0)
    : targetType === 'module'
      ? Number(selectedModule?.precio || 0)
      : Number(selectedLesson?.precio || 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información del curso...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No se pudo cargar la información del curso</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            ← Volver
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Finalizar Compra</h1>
          <p className="text-gray-600 mt-2">Completa tu inscripción al curso</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Course Information */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Información del Curso</h2>
              
              <div className="flex items-start space-x-4">
                <div className="w-24 h-24 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-3xl">📚</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{course.nombre}</h3>
                  <p className="text-gray-600 mt-1">{course.descripcion}</p>
                  
                  <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                    <span>👨‍🏫 {course.profesor_nombre || 'Instructor'}</span>
                    <span>⏱️ {course.duracion || 'Duración no especificada'}</span>
                    <span>🎓 {course.categoria || 'General'}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* What you'll get */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Qué incluye este curso</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="text-green-500 mr-2">✓</span>
                  Acceso completo al curso
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="text-green-500 mr-2">✓</span>
                  Certificado de finalización
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="text-green-500 mr-2">✓</span>
                  Materiales descargables
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="text-green-500 mr-2">✓</span>
                  Acceso de por vida
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="text-green-500 mr-2">✓</span>
                  Soporte del instructor
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="text-green-500 mr-2">✓</span>
                  Actualizaciones gratuitas
                </div>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Compra</h3>
              
              <div className="space-y-3">
                {course.modalidad_precio && course.modalidad_precio !== 'curso' && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Comprar</label>
                    <select
                      value={targetType}
                      onChange={(e) => {
                        const t = e.target.value as 'course' | 'module' | 'lesson';
                        setTargetType(t);
                        setSelectedModuleId(null);
                        setSelectedLessonId(null);
                      }}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="course">Curso completo</option>
                      <option value="module">Módulo</option>
                      <option value="lesson">Clase individual</option>
                    </select>
                  </div>
                )}
                {targetType === 'module' && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Módulo</label>
                    <select
                      value={selectedModuleId || ''}
                      onChange={(e) => setSelectedModuleId(Number(e.target.value))}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Seleccionar módulo</option>
                      {modules.map((m) => (
                        <option key={m.id} value={m.id}>{m.titulo} - {formatCurrency(Number(m.precio || 0))}</option>
                      ))}
                    </select>
                  </div>
                )}
                {targetType === 'lesson' && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Módulo</label>
                      <select
                        value={selectedModuleId || ''}
                        onChange={(e) => { setSelectedModuleId(Number(e.target.value)); setSelectedLessonId(null); }}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Seleccionar módulo</option>
                        {modules.map((m) => (
                          <option key={m.id} value={m.id}>{m.titulo}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Clase</label>
                      <select
                        value={selectedLessonId || ''}
                        onChange={(e) => setSelectedLessonId(Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Seleccionar clase</option>
                        {(selectedModule?.lessons || []).map((l) => (
                          <option key={l.id} value={l.id}>{l.titulo} - {formatCurrency(Number(l.precio || 0))}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Precio</span>
                  <span className="font-medium">{formatCurrency(total)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Descuento</span>
                  <span className="text-green-600">-{formatCurrency(0)}</span>
                </div>
                
                <hr className="my-3" />
                
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-blue-600">{formatCurrency(total)}</span>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={processing || (targetType === 'module' && !selectedModuleId) || (targetType === 'lesson' && !selectedLessonId)}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Procesando pago...
                  </>
                ) : (
                  <>
                    💳 Procesar Pago
                  </>
                )}
              </button>

              {/* Security Notice */}
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <span className="text-green-500 mr-2 mt-0.5">🔒</span>
                  <div className="text-sm text-green-700">
                    <p className="font-medium">Pago Seguro</p>
                    <p>Integración completa con MercadoPago. Tu información está protegida.</p>
                  </div>
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
