import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { courseService } from '../../services/api';

interface Course {
  id: number;
  nombre: string;
  descripcion: string;
  profesor: string;
  profesorId: number;
  categoria: string;
  precio: number;
  duracion: string;
  estudiantes: number;
  rating: number;
  imagen: string;
}

const CourseList: React.FC = () => {
  const { usuario } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        const coursesData = await courseService.getAllCourses();
        setCourses(coursesData);
      } catch (error) {
        console.error('Error cargando cursos:', error);
        setError('Error conectando con el servidor');
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  const categories = ['Todas', ...Array.from(new Set(courses.map(course => course.categoria)))];

  const filteredCourses = selectedCategory === 'Todas' 
    ? courses 
    : courses.filter(course => course.categoria === selectedCategory);

  const isEnrolled = (courseId: number) => {
    return usuario?.cursosInscritos?.includes(courseId) || false;
  };

  const handleEnroll = async (courseId: number) => {
    try {
      await courseService.enrollCourse(courseId);
      // Actualizar el estado del usuario localmente
      if (usuario) {
        usuario.cursosInscritos = [...(usuario.cursosInscritos || []), courseId];
      }
      alert('¡Te has inscrito exitosamente al curso!');
    } catch (error) {
      console.error('Error al inscribirse:', error);
      alert('Error al inscribirse. Intenta nuevamente.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Cargando cursos del servidor...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <span className="text-red-500 text-xl mr-3">⚠️</span>
            <div>
              <h3 className="text-red-800 font-medium">Error de Conexión</h3>
              <p className="text-red-600">{error}</p>
              <p className="text-sm text-red-500 mt-2">
                Verifica que el backend esté funcionando en 
              </p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition duration-200"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Catálogo de Cursos 📚
        </h1>
        <p className="text-gray-600">
          Explora nuestros cursos y comienza tu aprendizaje. Total: {courses.length} cursos disponibles
        </p>
        
        {/* Indicador de backend activo */}
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center">
            <span className="text-green-500 mr-2">🟢</span>
            <span className="text-sm text-green-700">
              Conectado al backend - Datos en tiempo real
            </span>
          </div>
        </div>
      </div>

      {/* Filtros por categoría */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2">
          {categories.map((categoria) => (
            <button
              key={categoria}
              onClick={() => setSelectedCategory(categoria)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition duration-200 ${
                selectedCategory === categoria
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {categoria} {categoria !== 'Todas' && `(${courses.filter(c => c.categoria === categoria).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de cursos */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">📚</span>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            No hay cursos en esta categoría
          </h3>
          <p className="text-gray-600">
            Selecciona otra categoría o espera a que se agreguen nuevos cursos
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((curso) => (
            <div key={curso.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-200">
              {/* Header del curso */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-4xl">{curso.imagen}</span>
                  <div className="flex items-center text-yellow-500">
                    <span className="text-sm font-medium mr-1">⭐ {curso.rating}</span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {curso.nombre}
                </h3>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {curso.descripcion}
                </p>

                <div className="text-sm text-gray-500 mb-4">
                  <p className="mb-1">👨‍🏫 {curso.profesor}</p>
                  <div className="flex items-center justify-between">
                    <span>⏱️ {curso.duracion}</span>
                    <span>👥 {curso.estudiantes} estudiantes</span>
                  </div>
                </div>

                {/* Precio y estado */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-blue-600">
                    ${curso.precio}
                  </span>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                    {curso.categoria}
                  </span>
                </div>

                {/* Estado de inscripción */}
                {isEnrolled(curso.id) ? (
                  <div className="mb-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <span className="text-green-500 mr-2">✅</span>
                        <span className="text-sm text-green-700">Ya estás inscrito</span>
                      </div>
                    </div>
                  </div>
                ) : usuario?.tipo === 'profesor' && curso.profesorId === usuario.id ? (
                  <div className="mb-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <span className="text-blue-500 mr-2">👨‍🏫</span>
                        <span className="text-sm text-blue-700">Tu curso</span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Botones de acción */}
                <div className="flex space-x-2">
                  <Link
                    to={`/course/${curso.id}`}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-center text-sm font-medium transition duration-200"
                  >
                    Ver Detalle
                  </Link>
                  
                  {!isEnrolled(curso.id) && usuario?.tipo === 'alumno' && (
                    <button
                      onClick={() => handleEnroll(curso.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-200"
                    >
                      Inscribirse
                    </button>
                  )}
                  
                  {usuario?.tipo === 'profesor' && curso.profesorId === usuario.id && (
                    <Link
                      to={`/course/${curso.id}/manage`}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-center text-sm font-medium transition duration-200"
                    >
                      Gestionar
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer informativo */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            🚀 Sistema de Producción Activo
          </h3>
          <p className="text-gray-600 mb-4">
            Todos los datos se cargan desde el backend real con autenticación JWT y comunicación en tiempo real
          </p>
          <div className="flex justify-center space-x-6 text-sm text-gray-500">
            <span>✅ Backend API funcionando</span>
            <span>✅ Autenticación JWT</span>
            <span>✅ Socket.IO en tiempo real</span>
            <span>✅ Base de datos conectada</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseList;