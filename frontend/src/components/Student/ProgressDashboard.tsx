import React, { useState, useEffect } from 'react';
import {
  getMyProgress,
  getMyStats,
  getCourseProgress,
  type CourseProgress,
  type StudentStats
} from '../../services/progressService';

export const ProgressDashboard: React.FC = () => {
  const [allProgress, setAllProgress] = useState<CourseProgress[]>([]);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<CourseProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [progressData, statsData] = await Promise.all([
        getMyProgress(),
        getMyStats()
      ]);
      setAllProgress(progressData);
      setStats(statsData);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar progreso');
    } finally {
      setLoading(false);
    }
  };

  const loadCourseDetails = async (courseId: number) => {
    try {
      setLoading(true);
      const courseData = await getCourseProgress(courseId);
      setSelectedCourse(courseData);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar detalles');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return '0 min';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    if (percentage >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading && !stats) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <p className="text-center text-gray-500">Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* ESTADÍSTICAS GENERALES */}
      {stats && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-6">📊 Mi Progreso General</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-sm opacity-90 mb-1">Cursos Inscritos</p>
              <p className="text-3xl font-bold">{stats.total_courses_enrolled}</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-sm opacity-90 mb-1">Cursos Completados</p>
              <p className="text-3xl font-bold">{stats.courses_completed}</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-sm opacity-90 mb-1">Lecciones Completadas</p>
              <p className="text-3xl font-bold">{stats.total_lessons_completed}</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-sm opacity-90 mb-1">Tiempo Total</p>
              <p className="text-3xl font-bold">{formatTime(stats.total_time_spent)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-sm opacity-90 mb-1">Promedio de Finalización</p>
              <p className="text-2xl font-bold">{stats.average_completion_rate.toFixed(1)}%</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-sm opacity-90 mb-1">Tareas Entregadas</p>
              <p className="text-2xl font-bold">{stats.assignments_submitted}</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-sm opacity-90 mb-1">Promedio de Calificación</p>
              <p className="text-2xl font-bold">
                {stats.average_grade ? stats.average_grade.toFixed(1) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VISTA DETALLADA DE CURSO */}
      {selectedCourse && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <button
            onClick={() => setSelectedCourse(null)}
            className="mb-4 text-blue-600 hover:text-blue-800"
          >
            ← Volver a mis cursos
          </button>

          <h3 className="text-2xl font-bold mb-4">{selectedCourse.course_title}</h3>

          <div className="mb-6 bg-gray-100 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progreso General del Curso
              </span>
              <span className="text-lg font-bold text-blue-600">
                {selectedCourse.completion_percentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-300 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${getProgressColor(
                  selectedCourse.completion_percentage
                )}`}
                style={{ width: `${selectedCourse.completion_percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <span>
                {selectedCourse.completed_lessons} de {selectedCourse.total_lessons} lecciones
              </span>
              {selectedCourse.last_accessed && (
                <span>
                  Último acceso: {new Date(selectedCourse.last_accessed).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* MÓDULOS Y LECCIONES */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-800">Módulos del Curso</h4>
            
            {selectedCourse.modules.map((module) => (
              <div key={module.module_id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="text-md font-semibold text-gray-800">
                    {module.module_title}
                  </h5>
                  <span className="text-sm font-medium text-blue-600">
                    {module.completion_percentage.toFixed(0)}%
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div
                    className={`h-2 rounded-full ${getProgressColor(module.completion_percentage)}`}
                    style={{ width: `${module.completion_percentage}%` }}
                  />
                </div>

                <p className="text-sm text-gray-600 mb-2">
                  {module.completed_lessons} de {module.total_lessons} lecciones completadas
                </p>

                {/* LISTA DE LECCIONES */}
                <div className="space-y-2 mt-3">
                  {module.lessons.map((lesson) => (
                    <div
                      key={lesson.lesson_id}
                      className={`flex items-center gap-3 p-2 rounded ${
                        lesson.completed ? 'bg-green-50' : 'bg-gray-50'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          lesson.completed
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}
                      >
                        {lesson.completed ? '✓' : '○'}
                      </div>
                      
                      <span className={`flex-1 text-sm ${
                        lesson.completed ? 'text-gray-700' : 'text-gray-500'
                      }`}>
                        {lesson.lesson_title}
                      </span>
                      
                      {lesson.completed && lesson.completed_at && (
                        <span className="text-xs text-gray-500">
                          {new Date(lesson.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ESTADÍSTICAS DE TAREAS */}
          {selectedCourse.total_assignments > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">📝 Tareas del Curso</h4>
              <div className="flex gap-6 text-sm">
                <span className="text-gray-700">
                  Completadas: {selectedCourse.assignments_completed}/{selectedCourse.total_assignments}
                </span>
                {selectedCourse.average_grade !== null && selectedCourse.average_grade !== undefined && (
                  <span className="text-gray-700">
                    Promedio: {selectedCourse.average_grade.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LISTA DE CURSOS */}
      {!selectedCourse && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Mis Cursos</h3>

          {allProgress.length === 0 && !loading && (
            <p className="text-center text-gray-500">No estás inscrito en ningún curso</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allProgress.map((course) => (
              <div
                key={course.course_id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition cursor-pointer"
                onClick={() => loadCourseDetails(course.course_id)}
              >
                <h4 className="text-lg font-semibold text-gray-800 mb-2">
                  {course.course_title}
                </h4>

                <div className="mb-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progreso</span>
                    <span className="font-semibold">
                      {course.completion_percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${getProgressColor(
                        course.completion_percentage
                      )}`}
                      style={{ width: `${course.completion_percentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between text-sm text-gray-600">
                  <span>
                    📚 {course.completed_lessons}/{course.total_lessons} lecciones
                  </span>
                  {course.total_assignments > 0 && (
                    <span>
                      📝 {course.assignments_completed}/{course.total_assignments} tareas
                    </span>
                  )}
                </div>

                {course.last_accessed && (
                  <p className="mt-2 text-xs text-gray-500">
                    Último acceso: {new Date(course.last_accessed).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressDashboard;
