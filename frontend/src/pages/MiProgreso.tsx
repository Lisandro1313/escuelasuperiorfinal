import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface CourseProgress {
  id: number;
  course_id: number;
  course_name: string;
  course_image: string;
  progress: number;
  completed: boolean;
  enrolled_at: string;
  completed_lessons: number;
  total_lessons: number;
}

const MiProgreso: React.FC = () => {
  const { usuario } = useAuth();
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCursos: 0,
    cursosCompletados: 0,
    progresoPromedio: 0,
    leccionesCompletadas: 0
  });

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/enrollments/my-enrollments');
      const data = response.data;
      
      if (data.success) {
        const enrollments = data.enrollments || [];
        setCourses(enrollments);
        
        // Calcular estadísticas
        const completados = enrollments.filter((e: CourseProgress) => e.completed).length;
        const promedioProgreso = enrollments.length > 0
          ? enrollments.reduce((sum: number, e: CourseProgress) => sum + (e.progress || 0), 0) / enrollments.length
          : 0;
        const totalLecciones = enrollments.reduce((sum: number, e: CourseProgress) => sum + (e.completed_lessons || 0), 0);
        
        setStats({
          totalCursos: enrollments.length,
          cursosCompletados: completados,
          progresoPromedio: Math.round(promedioProgreso),
          leccionesCompletadas: totalLecciones
        });
      }
    } catch (error) {
      console.error('Error al cargar progreso:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando tu progreso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📊 Mi Progreso</h1>
          <p className="mt-2 text-gray-600">Seguimiento de tu aprendizaje</p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <span className="text-2xl">📚</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Cursos Inscritos</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalCursos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completados</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.cursosCompletados}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                <span className="text-2xl">📈</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Progreso Promedio</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.progresoPromedio}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <span className="text-2xl">📖</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Lecciones</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.leccionesCompletadas}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Cursos */}
        {courses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <span className="text-6xl mb-4 block">📚</span>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No estás inscrito en ningún curso
            </h3>
            <p className="text-gray-600 mb-6">
              Explora nuestro catálogo y comienza tu viaje de aprendizaje
            </p>
            <Link
              to="/courses"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              🔍 Ver Cursos Disponibles
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
              >
                <div className="md:flex">
                  {/* Imagen */}
                  <div className="md:w-48 h-48 bg-gradient-to-r from-blue-500 to-purple-600 flex-shrink-0">
                    {course.course_image ? (
                      <img
                        src={course.course_image}
                        alt={course.course_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-6xl">📚</span>
                      </div>
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {course.course_name}
                        </h3>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                          <span className="flex items-center">
                            📖 {course.completed_lessons}/{course.total_lessons} lecciones
                          </span>
                          <span className="flex items-center">
                            📅 Inscrito: {new Date(course.enrolled_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Barra de progreso */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Progreso del curso
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {Math.round(course.progress || 0)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full ${getProgressColor(course.progress || 0)} transition-all duration-500`}
                              style={{ width: `${course.progress || 0}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Badge de estado */}
                        {course.completed && (
                          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mb-4">
                            ✅ Curso Completado
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botones */}
                    <div className="flex space-x-3">
                      <Link
                        to={`/course/${course.course_id}/view`}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        {course.completed ? '🔄 Revisar Curso' : '▶️ Continuar Aprendiendo'}
                      </Link>
                      
                      {course.completed && (
                        <Link
                          to={`/certificados?course=${course.course_id}`}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          🏆 Ver Certificado
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MiProgreso;
