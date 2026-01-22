import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface Course {
  id: number;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
  estudiantes: number;
  imagen: string;
  publicado: boolean;
  created_at: string;
}

const MisClases: React.FC = () => {
  const { usuario } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCursos: 0,
    totalEstudiantes: 0,
    cursosPublicados: 0,
    cursosBorradores: 0
  });

  useEffect(() => {
    loadMyCourses();
  }, []);

  const loadMyCourses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/courses/my-courses');
      const data = response.data;
      
      if (data.success) {
        setCourses(data.courses || []);
        
        // Calcular estadísticas
        const totalEstudiantes = (data.courses || []).reduce((sum: number, course: Course) => sum + (course.estudiantes || 0), 0);
        const publicados = (data.courses || []).filter((c: Course) => c.publicado).length;
        
        setStats({
          totalCursos: data.courses?.length || 0,
          totalEstudiantes,
          cursosPublicados: publicados,
          cursosBorradores: (data.courses?.length || 0) - publicados
        });
      }
    } catch (error) {
      console.error('Error al cargar cursos:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async (courseId: number, currentStatus: boolean) => {
    try {
      await api.put(`/courses/${courseId}`, {
        publicado: !currentStatus
      });
      
      loadMyCourses();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('Error al cambiar el estado del curso');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando tus clases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📚 Mis Clases</h1>
          <p className="mt-2 text-gray-600">Gestiona todos tus cursos desde aquí</p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <span className="text-2xl">📚</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Cursos</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalCursos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Estudiantes</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalEstudiantes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-600 rounded-md p-3">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Publicados</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.cursosPublicados}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <span className="text-2xl">📝</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Borradores</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.cursosBorradores}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botón Crear Curso */}
        <div className="mb-6">
          <Link
            to="/course/new"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            ➕ Crear Nuevo Curso
          </Link>
        </div>

        {/* Lista de Cursos */}
        {courses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <span className="text-6xl mb-4 block">📚</span>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No tienes cursos creados
            </h3>
            <p className="text-gray-600 mb-6">
              Comienza creando tu primer curso para compartir conocimiento con tus estudiantes
            </p>
            <Link
              to="/course/new"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              ➕ Crear Mi Primer Curso
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
              >
                {/* Imagen del curso */}
                <div className="relative h-48 bg-gradient-to-r from-blue-500 to-purple-600">
                  {course.imagen ? (
                    <img
                      src={course.imagen}
                      alt={course.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-6xl">📚</span>
                    </div>
                  )}
                  
                  {/* Badge de estado */}
                  <div className="absolute top-2 right-2">
                    {course.publicado ? (
                      <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                        ✅ Publicado
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-full">
                        📝 Borrador
                      </span>
                    )}
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {course.nombre}
                  </h3>
                  
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {course.descripcion || 'Sin descripción'}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span className="flex items-center">
                      <span className="mr-1">👥</span>
                      {course.estudiantes || 0} estudiantes
                    </span>
                    <span className="flex items-center">
                      <span className="mr-1">💰</span>
                      {course.precio > 0 ? `$${course.precio}` : 'Gratis'}
                    </span>
                  </div>

                  {/* Botones de acción */}
                  <div className="space-y-2">
                    <Link
                      to={`/course/${course.id}/manage`}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      👁️ Ver
                    </Link>
                    
                    <button
                      onClick={() => togglePublish(course.id, course.publicado)}
                      className={`w-full inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md ${
                        course.publicado
                          ? 'border-yellow-500 text-yellow-700 bg-yellow-50 hover:bg-yellow-100'
                          : 'border-green-500 text-green-700 bg-green-50 hover:bg-green-100'
                      }`}
                    >
                      {course.publicado ? '📝 Despublicar' : '✅ Publicar'}
                    </button>
                    
                    <Link
                      to={`/course/${course.id}`}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      👁️ Ver Curso
                    </Link>
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

export default MisClases;
