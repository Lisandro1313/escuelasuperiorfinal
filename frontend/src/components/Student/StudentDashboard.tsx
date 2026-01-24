import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface Course {
  id: number;
  nombre: string;
  descripcion: string;
  profesor: string;
  categoria: string;
  precio: number;
  duracion: string;
  estudiantes: number;
  rating: number;
  imagen: string;
}

interface Progress {
  cursoId: number;
  nombreCurso: string;
  progreso: number;
  ultimaActividad: string;
  proximaClase?: string;
}

interface Achievement {
  id: number;
  titulo: string;
  descripcion: string;
  icono: string;
  fechaObtenido: string;
}

interface Notification {
  id: number;
  tipo: 'info' | 'warning' | 'success';
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
}

export const StudentDashboard: React.FC = () => {
  const { usuario } = useAuth();
  const [cursos, setCursos] = useState<Course[]>([]);
  const [progreso, setProgreso] = useState<Progress[]>([]);
  const [logros, setLogros] = useState<Achievement[]>([]);
  const [notificaciones, setNotificaciones] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentData();

    // Escuchar eventos de actualización de progreso
    const handleProgressUpdate = (event: any) => {
      console.log('🔄 Evento de actualización de progreso recibido:', event.detail);
      fetchStudentData(); // Recargar datos
    };

    window.addEventListener('courseProgressUpdated', handleProgressUpdate);

    return () => {
      window.removeEventListener('courseProgressUpdated', handleProgressUpdate);
    };
  }, []);

  const fetchStudentData = async () => {
    try {
      console.log('🔍 Datos del usuario:', usuario);
      console.log('📚 Cursos inscritos del usuario:', usuario?.cursosInscritos);
      
      // Obtener todos los cursos
      const cursosRes = await api.get('/courses');
      const todosCursos = cursosRes.data || [];
      console.log('📖 Todos los cursos disponibles:', todosCursos.length);
      
      // Filtrar solo los cursos en los que está inscrito el estudiante
      const cursosInscritos = todosCursos.filter((curso: Course) => {
        const isEnrolled = usuario?.cursosInscritos?.includes(curso.id);
        if (isEnrolled) {
          console.log(`✅ Usuario inscrito en: ${curso.nombre} (ID: ${curso.id})`);
        }
        return isEnrolled;
      });
      
      console.log('🎓 Total cursos inscritos encontrados:', cursosInscritos.length);
      setCursos(cursosInscritos);
      
      // Calcular progreso basado en los cursos inscritos
      const progresoData = cursosInscritos.map((curso: Course) => ({
        cursoId: curso.id,
        nombreCurso: curso.nombre,
        progreso: usuario?.progreso?.[curso.id] || 0,
        ultimaActividad: 'Hace 2 días',
        proximaClase: undefined
      }));
      setProgreso(progresoData);
      
      // Por ahora dejamos logros y notificaciones vacías
      setLogros([]);
      setNotificaciones([]);
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const marcarNotificacionLeida = async (notifId: number) => {
    try {
      await api.patch(`/student/notifications/${notifId}/read`);
      setNotificaciones(prev => 
        prev.map(n => n.id === notifId ? { ...n, leida: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Cargando tu dashboard...</div>
      </div>
    );
  }

  const cursosInscritos = cursos.length;
  const progresoPromedio = progreso.length > 0 
    ? Math.round(progreso.reduce((acc, p) => acc + p.progreso, 0) / progreso.length)
    : 0;
  const notificacionesNoLeidas = notificaciones.filter(n => !n.leida).length;
  const logrosRecientes = logros.slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header de Bienvenida */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            ¡Bienvenido de vuelta, {usuario?.nombre}! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Continúa tu camino de aprendizaje. Tienes {cursosInscritos} cursos activos.
          </p>
        </div>

        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">📚</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cursos Inscritos</p>
                <p className="text-2xl font-bold text-gray-900">{cursosInscritos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">📈</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Progreso Promedio</p>
                <p className="text-2xl font-bold text-gray-900">{progresoPromedio}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">🏆</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Logros Obtenidos</p>
                <p className="text-2xl font-bold text-gray-900">{logros.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">🔔</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Notificaciones</p>
                <p className="text-2xl font-bold text-gray-900">{notificacionesNoLeidas}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Progreso de Cursos */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Mi Progreso</h2>
                <Link 
                  to="/courses" 
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Ver todos los cursos →
                </Link>
              </div>

              {progreso.length > 0 ? (
                <div className="space-y-4">
                  {progreso.map((curso) => (
                    <div key={curso.cursoId} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{curso.nombreCurso}</h3>
                        <span className="text-sm text-gray-500">{curso.progreso}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${curso.progreso}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Última actividad: {curso.ultimaActividad}</span>
                        <Link
                          to={`/course/${curso.cursoId}/view`}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          Continuar Aprendiendo →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-6xl mb-4">📚</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Aún no tienes cursos inscritos
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Explora nuestro catálogo y comienza tu aventura de aprendizaje
                  </p>
                  <Link 
                    to="/courses"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Explorar Cursos
                  </Link>
                </div>
              )}
            </div>

            {/* Actividad Reciente */}
            <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Actividad Reciente</h2>
              <div className="space-y-3">
                <div className="text-center py-8 text-gray-500">
                  <p>No hay actividad reciente que mostrar.</p>
                  <p className="text-sm">Tu actividad aparecerá aquí una vez que comiences a interactuar con los cursos.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Logros Recientes */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Logros Recientes</h2>
                <Link 
                  to="/gamificacion" 
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Ver todos
                </Link>
              </div>
              {logrosRecientes.length > 0 ? (
                <div className="space-y-3">
                  {logrosRecientes.map((logro) => (
                    <div key={logro.id} className="flex items-center space-x-3">
                      <div className="text-2xl">{logro.icono}</div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{logro.titulo}</p>
                        <p className="text-xs text-gray-500">{logro.descripcion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Aún no tienes logros. ¡Sigue estudiando!</p>
              )}
            </div>

            {/* Notificaciones */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Notificaciones</h2>
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                  {notificacionesNoLeidas}
                </span>
              </div>
              {notificaciones.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {notificaciones.slice(0, 5).map((notif) => (
                    <div 
                      key={notif.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        notif.leida ? 'bg-gray-50' : 'bg-blue-50 border-l-4 border-blue-500'
                      }`}
                      onClick={() => !notif.leida && marcarNotificacionLeida(notif.id)}
                    >
                      <div className="flex items-start space-x-2">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          notif.tipo === 'info' ? 'bg-blue-500' :
                          notif.tipo === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{notif.titulo}</p>
                          <p className="text-xs text-gray-500">{notif.mensaje}</p>
                          <p className="text-xs text-gray-400 mt-1">{notif.fecha}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No tienes notificaciones nuevas</p>
              )}
            </div>

            {/* Accesos Rápidos */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Accesos Rápidos</h2>
              <div className="space-y-2">
                <Link 
                  to="/courses" 
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg">📚</span>
                  <span className="text-sm font-medium text-gray-700">Mis Cursos</span>
                </Link>
                <Link 
                  to="/progreso" 
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg">📈</span>
                  <span className="text-sm font-medium text-gray-700">Seguimiento Progreso</span>
                </Link>
                <Link 
                  to="/calendar" 
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg">📅</span>
                  <span className="text-sm font-medium text-gray-700">Calendario</span>
                </Link>
                <Link 
                  to="/foros" 
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg">💬</span>
                  <span className="text-sm font-medium text-gray-700">Foros</span>
                </Link>
                <Link 
                  to="/certificados" 
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg">🏆</span>
                  <span className="text-sm font-medium text-gray-700">Certificados</span>
                </Link>
                <Link 
                  to="/gamificacion" 
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg">🎮</span>
                  <span className="text-sm font-medium text-gray-700">Gamificación</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};