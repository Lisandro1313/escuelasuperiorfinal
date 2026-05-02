import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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

const CourseCatalog: React.FC = () => {
  const { usuario } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  const categories = ['Todas', 'Tecnología', 'Diseño', 'Marketing', 'Negocios', 'Idiomas'];

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        
        // Obtener cursos reales del backend
        const response = await fetch('/api/courses');
        if (response.ok) {
          const coursesData = await response.json();
          setCourses(coursesData);
        } else {
          console.error('Error al cargar cursos');
          setCourses([]);
        }
      } catch (error) {
        console.error('Error cargando cursos:', error);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.profesor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || course.categoria === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const isEnrolled = (courseId: number) => {
    return usuario?.cursosInscritos?.includes(courseId) || false;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Cargando catálogo de cursos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white shadow rounded-lg mb-6 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📚 Catálogo de Cursos
        </h1>
        <p className="text-gray-600">
          Explora nuestra amplia selección de cursos online de alta calidad
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white shadow rounded-lg mb-6 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              🔍 Buscar cursos
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, descripción o profesor..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Categorías */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              📂 Categoría
            </label>
            <select
              id="category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            Mostrando {filteredCourses.length} de {courses.length} cursos
          </span>
          <span>
            💳 Sistema de pagos con MercadoPago integrado
          </span>
        </div>
      </div>

      {/* Grid de cursos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => (
          <div key={course.id} className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200">
            {/* Header del curso */}
            <div className="p-6">
              <div className="flex items-center mb-4">
                <span className="text-4xl mr-3">{course.imagen}</span>
                <div className="flex-1">
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                    {course.categoria}
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {course.nombre}
              </h3>

              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {course.descripcion}
              </p>

              {/* Info del profesor */}
              <div className="flex items-center mb-4 text-sm text-gray-500">
                <span className="mr-4">👨‍🏫 {course.profesor}</span>
              </div>

              {/* Estadísticas */}
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>⏱️ {course.duracion}</span>
                <span>👥 {course.estudiantes}</span>
                <span>⭐ {course.rating}</span>
              </div>

              {/* Precio */}
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-blue-600">
                  ${course.precio}
                </div>
                
                {isEnrolled(course.id) ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <span className="text-green-700 text-sm font-medium">✅ Inscrito</span>
                  </div>
                ) : (
                  <div className="text-right">
                    <div className="space-y-2">
                      <Link
                        to={`/course/${course.id}`}
                        className="block bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm text-center transition duration-200"
                      >
                        Ver Detalles
                      </Link>
                      <Link
                        to={`/course/${course.id}/payment`}
                        className="block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm text-center transition duration-200"
                      >
                        💳 Comprar
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No results */}
      {filteredCourses.length === 0 && (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <span className="text-4xl mb-4 block">🔍</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No se encontraron cursos
          </h3>
          <p className="text-gray-600 mb-4">
            Intenta ajustar tus filtros de búsqueda
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('Todas');
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition duration-200"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Footer con información */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            🚀 Sistema de Campus Virtual Completo
          </h3>
          <p className="text-blue-700 text-sm">
            • Pagos seguros con MercadoPago • Chat en tiempo real • Clases en vivo y grabadas • 
            Gestión de archivos • Autenticación con JWT • Base de datos PostgreSQL
          </p>
        </div>
      </div>
    </div>
  );
};

export default CourseCatalog;