import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { courseService } from '../../services/api';
import socketService from '../../services/socket';

import { StudentDashboard } from '../Student/StudentDashboard';
import EnrolledStudents from '../Professor/EnrolledStudents';

interface Course {
  id: number;
  nombre: string;
  descripcion: string;
  profesor: string;
  profesor_id: number;
  categoria: string;
  precio: number;
  duracion: string;
  estudiantes: number;
  rating: number;
  imagen: string;
}

const Dashboard: React.FC = () => {
  const { usuario } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showEnrolledStudents, setShowEnrolledStudents] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Conectar Socket.IO
        const token = localStorage.getItem('token');
        if (token) {
          socketService.connect(token);
        }

        // Cargar cursos
        const coursesData = await courseService.getAllCourses();
        setCourses(coursesData);
      } catch (error) {
        console.error('Error cargando datos:', error);
        setError('Error conectando con el servidor');
      } finally {
        setLoading(false);
      }
    };

    if (usuario) {
      loadData();
    }

    return () => {
      // Limpiar conexión Socket.IO al desmontar
      socketService.disconnect();
    };
  }, [usuario]);

  // Datos específicos según el tipo de usuario
  const getStatsForUser = () => {
    if (usuario?.tipo === 'profesor') {
      const misCursos = courses.filter(c => c.profesor_id === usuario.id);
      return {
        cursosActivos: misCursos.length,
        estudiantesTotales: 0, // Se actualizará con datos reales
        proximaClase: "No hay clases programadas",
        ingresosMes: 0 // Se calculará con datos reales
      };
    } else if (usuario?.tipo === 'admin') {
      return {
        cursosTotal: courses.length,
        usuariosActivos: 0, // Se calculará con datos reales
        ingresosMes: 0, // Se calculará con datos reales
        nuevosRegistros: 0 // Se calculará con datos reales
      };
    } else {
      // Estudiante
      return {
        cursosActivos: usuario?.cursosInscritos?.length || 0,
        clasesTomadas: 0, // Se calculará con progreso real
        proximaClase: "No hay clases programadas",
        saldoPendiente: 0 // Se calculará con datos reales
      };
    }
  };

  const stats = getStatsForUser();

  // Si es estudiante, mostrar el dashboard especializado
  if (usuario?.tipo === 'alumno') {
    return <StudentDashboard />;
  }

  const getCursosForUser = () => {
    if (usuario?.tipo === 'profesor') {
      return courses.filter(curso => curso.profesor_id === usuario.id);
    } else if (usuario?.tipo === 'admin') {
      return courses;
    } else {
      return courses.filter(curso => usuario?.cursosInscritos?.includes(curso.id));
    }
  };

  const cursosRelevantes = getCursosForUser();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Cargando datos del servidor...</span>
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
                Verifica que el backend esté funcionando en http://localhost:5000
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderStatsCards = () => {
    if (usuario?.tipo === 'profesor') {
      return (
        <>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0"><span className="text-2xl">📚</span></div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Cursos que Dicto</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.cursosActivos}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0"><span className="text-2xl">👥</span></div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Estudiantes Totales</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.estudiantesTotales}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0"><span className="text-2xl">⏰</span></div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Próxima Clase</dt>
                    <dd className="text-sm font-medium text-gray-900">{stats.proximaClase}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0"><span className="text-2xl">💰</span></div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Ingresos del Mes</dt>
                    <dd className="text-lg font-medium text-gray-900">${stats.ingresosMes}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    } else if (usuario?.tipo === 'admin') {
      return (
        <>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0"><span className="text-2xl">📚</span></div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Cursos</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.cursosTotal}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0"><span className="text-2xl">👥</span></div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Usuarios Activos</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.usuariosActivos}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0"><span className="text-2xl">💰</span></div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Ingresos del Mes</dt>
                    <dd className="text-lg font-medium text-gray-900">${stats.ingresosMes}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0"><span className="text-2xl">📈</span></div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Nuevos Registros</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.nuevosRegistros}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    } else {
      // Estudiante
      return (
        <>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0"><span className="text-2xl">📚</span></div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Cursos Activos</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.cursosActivos}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0"><span className="text-2xl">✅</span></div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Clases Tomadas</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.clasesTomadas}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0"><span className="text-2xl">⏰</span></div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Próxima Clase</dt>
                    <dd className="text-sm font-medium text-gray-900">{stats.proximaClase}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0"><span className="text-2xl">💰</span></div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Saldo Pendiente</dt>
                    <dd className="text-lg font-medium text-gray-900">${stats.saldoPendiente}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }
  };

  const getSaludoPersonalizado = () => {
    const nombre = usuario?.nombre?.split(' ')[0] || 'Usuario';
    if (usuario?.tipo === 'profesor') {
      return `¡Bienvenido/a ${nombre}! 👨‍🏫`;
    } else if (usuario?.tipo === 'admin') {
      return `¡Bienvenido/a Administrador/a ${nombre}! 👩‍💼`;
    } else {
      return `¡Bienvenido/a ${nombre}! 👩‍🎓`;
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Indicador de conexión */}
      <div className="mb-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-green-500 mr-2">🟢</span>
              <span className="text-sm text-green-700">Conectado al backend en tiempo real</span>
            </div>
            <span className="text-xs text-green-600">
              {socketService.getConnectionStatus() ? '✅ Socket.IO' : '⏳ Conectando...'}
            </span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{getSaludoPersonalizado()}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {usuario?.tipo === 'profesor' 
                ? 'Gestiona tus clases y estudiantes'
                : usuario?.tipo === 'admin'
                ? 'Panel de administración del campus'
                : 'Continúa tu aprendizaje donde lo dejaste'
              }
            </p>
          </div>
          <div className="flex space-x-4">
            <Link
              to="/courses"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
            >
              {usuario?.tipo === 'profesor' ? 'Mis Cursos' : 'Explorar Cursos'}
            </Link>
            {usuario?.tipo === 'profesor' && (
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowCreateCourse(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center"
                >
                  <span className="mr-2">➕</span>
                  Crear Curso
                </button>
                <button
                  onClick={() => setShowEnrolledStudents(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center"
                >
                  <span className="mr-2">👥</span>
                  Ver Estudiantes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {renderStatsCards()}
      </div>

      {/* Enlaces rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link
          to="/courses"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition duration-200 border-l-4 border-blue-500"
        >
          <div className="flex items-center">
            <span className="text-3xl mr-4">📚</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Explorar Cursos</h3>
              <p className="text-gray-600 text-sm">Descubre nuevos cursos</p>
            </div>
          </div>
        </Link>

        <Link
          to="/calendar"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition duration-200 border-l-4 border-green-500"
        >
          <div className="flex items-center">
            <span className="text-3xl mr-4">�</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Calendario</h3>
              <p className="text-gray-600 text-sm">Gestiona clases y eventos</p>
            </div>
          </div>
        </Link>

        <Link
          to="/files"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition duration-200 border-l-4 border-orange-500"
        >
          <div className="flex items-center">
            <span className="text-3xl mr-4">📁</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Gestión de Archivos</h3>
              <p className="text-gray-600 text-sm">Sube y gestiona archivos</p>
            </div>
          </div>
        </Link>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center">
            <span className="text-3xl mr-4">💬</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Chat en Tiempo Real</h3>
              <p className="text-gray-600 text-sm">Conectado y funcionando</p>
            </div>
          </div>
        </div>

        <Link
          to="/video-player"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition duration-200 border-l-4 border-red-500"
        >
          <div className="flex items-center">
            <span className="text-3xl mr-4">🎥</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Video Player</h3>
              <p className="text-gray-600 text-sm">Reproductor avanzado</p>
            </div>
          </div>
        </Link>

        <Link
          to="/evaluations"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition duration-200 border-l-4 border-indigo-500"
        >
          <div className="flex items-center">
            <span className="text-3xl mr-4">📝</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Evaluaciones</h3>
              <p className="text-gray-600 text-sm">Quizzes y exámenes</p>
            </div>
          </div>
        </Link>

        <Link
          to="/analytics"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition duration-200 border-l-4 border-pink-500"
        >
          <div className="flex items-center">
            <span className="text-3xl mr-4">📊</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
              <p className="text-gray-600 text-sm">Métricas y reportes</p>
            </div>
          </div>
        </Link>

        <Link
          to="/certificados"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition duration-200 border-l-4 border-yellow-500"
        >
          <div className="flex items-center">
            <span className="text-3xl mr-4">🏆</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Certificados</h3>
              <p className="text-gray-600 text-sm">Genera y gestiona certificados</p>
            </div>
          </div>
        </Link>

        <Link
          to="/foros"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition duration-200 border-l-4 border-green-500"
        >
          <div className="flex items-center">
            <span className="text-3xl mr-4">💬</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Foros</h3>
              <p className="text-gray-600 text-sm">Discusiones y comunidad</p>
            </div>
          </div>
        </Link>

        <Link
          to="/gamificacion"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition duration-200 border-l-4 border-purple-500"
        >
          <div className="flex items-center">
            <span className="text-3xl mr-4">🎮</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Gamificación</h3>
              <p className="text-gray-600 text-sm">Logros y clasificaciones</p>
            </div>
          </div>
        </Link>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="flex items-center">
            <span className="text-3xl mr-4">💳</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Pagos MercadoPago</h3>
              <p className="text-gray-600 text-sm">Sistema integrado</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cursos Relevantes */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            {usuario?.tipo === 'profesor' 
              ? 'Mis Cursos'
              : usuario?.tipo === 'admin'
              ? 'Todos los Cursos'
              : 'Mis Cursos Activos'
            } ({cursosRelevantes.length})
          </h3>
          
          {cursosRelevantes.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">📚</span>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {usuario?.tipo === 'profesor' ? 'No has creado cursos aún' : 'No hay cursos disponibles'}
              </h4>
              <p className="text-gray-600 mb-4">
                {usuario?.tipo === 'profesor' 
                  ? 'Crea tu primer curso para comenzar a enseñar'
                  : 'Los cursos aparecerán aquí cuando estén disponibles'
                }
              </p>
              {usuario?.tipo === 'profesor' && (
                <button
                  onClick={() => setShowCreateCourse(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
                >
                  Crear Primer Curso
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {cursosRelevantes.map((curso) => (
                <div key={curso.id} className="border rounded-lg p-4 hover:bg-gray-50 transition duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-2xl">{curso.imagen}</span>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{curso.nombre}</h4>
                          <p className="text-sm text-gray-500">👨‍🏫 {curso.profesor}</p>
                        </div>
                      </div>
                      
                      {usuario?.tipo === 'alumno' && usuario.progreso && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Progreso</span>
                            <span>{usuario.progreso[curso.id] || 0}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${usuario.progreso[curso.id] || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {usuario?.tipo === 'profesor' && (
                        <div className="mt-2 flex space-x-4 text-sm text-gray-500">
                          <span>👥 {curso.estudiantes} estudiantes</span>
                          <span>⏱️ {curso.duracion}</span>
                          <span>⭐ {curso.rating}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4 flex space-x-2">
                      <Link
                        to={`/course/${curso.id}`}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-md text-sm transition duration-200"
                      >
                        {usuario?.tipo === 'profesor' ? 'Ver' : 'Ver Curso'}
                      </Link>
                      {usuario?.tipo === 'profesor' && curso.profesor_id === usuario.id && (
                        <Link
                          to={`/course/${curso.id}/manage`}
                          className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded-md text-sm transition duration-200 inline-block"
                        >
                          📝 Gestionar
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>



      {/* Modal para Crear Curso */}
      {showCreateCourse && (
        <CreateCourseModal 
          onClose={() => setShowCreateCourse(false)}
          onCourseCreated={(newCourse) => {
            setCourses([...courses, newCourse]);
            setShowCreateCourse(false);
          }}
        />
      )}

      {/* Modal para Estudiantes Inscriptos */}
      {showEnrolledStudents && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Estudiantes Inscriptos</h2>
                <button
                  onClick={() => setShowEnrolledStudents(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <EnrolledStudents />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente Modal para Crear Curso
const CreateCourseModal: React.FC<{
  onClose: () => void;
  onCourseCreated: (course: Course) => void;
}> = ({ onClose, onCourseCreated }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    categoria: 'programacion',
    precio: '',
    duracion: '',
    imagen: '📚'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newCourse = await courseService.createCourse({
        ...formData,
        precio: parseFloat(formData.precio) || 0
      });
      onCourseCreated(newCourse);
    } catch (error) {
      console.error('Error creando curso:', error);
      alert('Error al crear el curso. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Crear Nuevo Curso</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Curso
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <select
              value={formData.categoria}
              onChange={(e) => setFormData({...formData, categoria: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="programacion">Programación</option>
              <option value="matematicas">Matemáticas</option>
              <option value="ciencias">Ciencias</option>
              <option value="arte">Arte</option>
              <option value="idiomas">Idiomas</option>
              <option value="negocios">Negocios</option>
            </select>
          </div>

          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio ($)
              </label>
              <input
                type="number"
                value={formData.precio}
                onChange={(e) => setFormData({...formData, precio: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duración
              </label>
              <input
                type="text"
                value={formData.duracion}
                onChange={(e) => setFormData({...formData, duracion: e.target.value})}
                placeholder="ej: 8 semanas"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emoji del Curso
            </label>
            <select
              value={formData.imagen}
              onChange={(e) => setFormData({...formData, imagen: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="📚">📚 Libro</option>
              <option value="💻">💻 Programación</option>
              <option value="🧮">🧮 Matemáticas</option>
              <option value="🎨">🎨 Arte</option>
              <option value="🌍">🌍 Idiomas</option>
              <option value="⚗️">⚗️ Ciencias</option>
              <option value="💼">💼 Negocios</option>
            </select>
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-md transition duration-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition duration-200"
            >
              Crear Curso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Dashboard;