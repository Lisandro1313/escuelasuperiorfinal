import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface CourseProgress {
  cursoId: number;
  nombreCurso: string;
  progreso: number;
  leccionesCompletadas: number;
  leccionesTotales: number;
  tiempoEstudio: string;
  ultimaActividad: string;
  proximaClase?: string;
  profesor: string;
}

interface ModuleProgress {
  moduleId: number;
  moduleName: string;
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  status: 'completed' | 'in-progress' | 'pending';
}

export const StudentProgressTracker: React.FC = () => {
  const { usuario } = useAuth();
  const [progreso, setProgreso] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [modulesProgress, setModulesProgress] = useState<{ [courseId: number]: ModuleProgress[] }>({});

  useEffect(() => {
    fetchDetailedProgress();
  }, []);

  const fetchDetailedProgress = async () => {
    try {
      // Agregar timestamp para evitar cache
      const timestamp = new Date().getTime();
      const response = await api.get(`/api/student/detailed-progress?t=${timestamp}`);
      console.log('📊 Response completo:', response);
      console.log('📊 Response.data:', response.data);
      console.log('📊 Progress array:', response.data.progress);
      
      // La API devuelve { success: true, progress: [...] }
      setProgreso(response.data.progress || []);
    } catch (error) {
      console.error('Error fetching detailed progress:', error);
      setProgreso([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchModulesProgress = async (courseId: number) => {
    try {
      const timestamp = new Date().getTime();
      const response = await api.get(`/api/student/course/${courseId}/modules-progress?t=${timestamp}`);
      console.log('📚 Módulos del curso', courseId, ':', response.data);
      
      setModulesProgress(prev => ({
        ...prev,
        [courseId]: response.data.modules || []
      }));
    } catch (error) {
      console.error('Error fetching modules progress:', error);
    }
  };

  const handleToggleCourseDetails = (courseId: number) => {
    if (selectedCourse === courseId) {
      setSelectedCourse(null);
    } else {
      setSelectedCourse(courseId);
      // Si no tenemos los módulos cargados, obtenerlos
      if (!modulesProgress[courseId]) {
        fetchModulesProgress(courseId);
      }
    }
  };

  const getModuleStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'in-progress':
        return '📝';
      case 'pending':
        return '⏳';
      default:
        return '📄';
    }
  };

  const getModuleStatusText = (module: ModuleProgress) => {
    if (module.status === 'completed') {
      return <span className="text-green-600">✓ Completado</span>;
    } else if (module.status === 'in-progress') {
      return <span className="text-yellow-600">📝 En Progreso ({module.percentage}%)</span>;
    } else {
      return <span className="text-gray-400">⏳ Pendiente</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Cargando tu progreso...</div>
      </div>
    );
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getProgressTextColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mi Progreso Académico</h1>
          <p className="text-gray-600">
            Seguimiento detallado de tu avance en cada curso
          </p>
        </div>

        {/* Resumen General */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Resumen General</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {progreso.length}
              </div>
              <div className="text-sm text-gray-500">Cursos Activos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {progreso.length > 0 
                  ? Math.round(progreso.reduce((acc, p) => acc + p.progreso, 0) / progreso.length)
                  : 0}%
              </div>
              <div className="text-sm text-gray-500">Progreso Promedio</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {progreso.reduce((acc, p) => acc + p.leccionesCompletadas, 0)}
              </div>
              <div className="text-sm text-gray-500">Lecciones Completadas</div>
            </div>
          </div>
        </div>

        {/* Progreso por Curso */}
        <div className="space-y-6">
          {progreso.map((curso) => (
            <div key={curso.cursoId} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{curso.nombreCurso}</h3>
                    <p className="text-sm text-gray-500">Profesor: {curso.profesor}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getProgressTextColor(curso.progreso)}`}>
                      {curso.progreso}%
                    </div>
                    <div className="text-sm text-gray-500">Completado</div>
                  </div>
                </div>

                {/* Barra de Progreso */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progreso</span>
                    <span>{curso.leccionesCompletadas} / {curso.leccionesTotales} lecciones</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(curso.progreso)}`}
                      style={{ width: `${curso.progreso}%` }}
                    ></div>
                  </div>
                </div>

                {/* Información Adicional */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Tiempo de Estudio</div>
                    <div className="text-sm text-gray-900">{curso.tiempoEstudio}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Última Actividad</div>
                    <div className="text-sm text-gray-900">{curso.ultimaActividad}</div>
                  </div>
                  {curso.proximaClase && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">Próxima Clase</div>
                      <div className="text-sm text-gray-900">{curso.proximaClase}</div>
                    </div>
                  )}
                </div>

                {/* Botones de Acción */}
                <div className="flex space-x-3 mt-4">
                  <button 
                    onClick={() => handleToggleCourseDetails(curso.cursoId)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {selectedCourse === curso.cursoId ? 'Ocultar Detalles' : 'Ver Detalles'}
                  </button>
                  <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors">
                    Continuar Estudiando
                  </button>
                </div>

                {/* Detalles Expandidos */}
                {selectedCourse === curso.cursoId && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Detalles del Progreso</h4>
                    
                    {modulesProgress[curso.cursoId] ? (
                      <>
                        <div className="space-y-2">
                          {modulesProgress[curso.cursoId].map((module) => (
                            <div key={module.moduleId} className="flex justify-between text-sm">
                              <span>{module.moduleName}</span>
                              {getModuleStatusText(module)}
                            </div>
                          ))}
                        </div>
                        
                        {curso.leccionesCompletadas === 0 && (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                            <p className="text-sm text-blue-800">
                              💡 <strong>Tip:</strong> Comienza por la primera lección para empezar a acumular progreso. 
                              ¡Cada lección completada suma!
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-sm text-gray-500 mt-2">Cargando módulos...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {progreso.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">📚</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tienes cursos inscritos
            </h3>
            <p className="text-gray-500 mb-4">
              Inscríbete en algunos cursos para comenzar a ver tu progreso aquí
            </p>
            <button className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700">
              Explorar Cursos
            </button>
          </div>
        )}
      </div>
    </div>
  );
};