import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import socketService from '../../services/socket';

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

interface Class {
  id: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  hora: string;
  duracion: number;
  tipo: string;
  videoUrl?: string;
  materialUrl?: string;
}

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [totalLessons, setTotalLessons] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('contenido');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [enrolled, setEnrolled] = useState(false);
  const [resources, setResources] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);

  useEffect(() => {
    const loadCourseData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const courseId = parseInt(id);
        
        try {
          // Cargar datos reales del curso desde la API
          const response = await fetch(`http://localhost:5000/api/courses/${courseId}`);
          if (response.ok) {
            const courseData = await response.json();
            setCourse(courseData);
            
            // Verificar si el usuario está inscrito en este curso
            if (usuario) {
              const enrollmentResponse = await fetch(`http://localhost:5000/api/courses/${courseId}/enrollment`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              });
              if (enrollmentResponse.ok) {
                const enrollmentData = await enrollmentResponse.json();
                setEnrolled(enrollmentData.enrolled);
              }
            }
          } else {
            console.error('Curso no encontrado');
            navigate('/courses');
            return;
          }
          
          // Cargar módulos y lecciones
          try {
            const modulesResponse = await fetch(`http://localhost:5000/api/courses/${courseId}/modules`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (modulesResponse.ok) {
              const modulesData = await modulesResponse.json();
              setModules(modulesData);
              
              // Contar lecciones totales
              let lessonsCount = 0;
              for (const module of modulesData) {
                const lessonsResponse = await fetch(`http://localhost:5000/api/modules/${module.id}/lessons`, {
                  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (lessonsResponse.ok) {
                  const lessons = await lessonsResponse.json();
                  lessonsCount += lessons.length;
                }
              }
              setTotalLessons(lessonsCount);
            }
          } catch (err) {
            console.log('No se pudieron cargar módulos');
          }
          
          // Por ahora, las clases estarán vacías hasta implementar módulos
          setClasses([]);
          
        } catch (error) {
          console.error('Error al cargar curso:', error);
          navigate('/courses');
          return;
        }
      } catch (error) {
        console.error('Error cargando curso:', error);
        setError('Error cargando los datos del curso');
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [id, usuario]);

  // Efecto separado para el chat
  useEffect(() => {
    if ((enrolled || isInstructor) && id && usuario) {
      const courseId = parseInt(id);
      const token = localStorage.getItem('token');
      if (token) {
        // Conectar socket
        socketService.connect(token);
        socketService.joinCourse(courseId);
        
        // Cargar mensajes existentes
        fetch(`http://localhost:5000/api/courses/${courseId}/messages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(messages => setChatMessages(messages))
        .catch(err => console.error('Error cargando mensajes:', err));
        
        // Escuchar nuevos mensajes
        socketService.onNewMessage((messageData: any) => {
          setChatMessages(prev => [...prev, messageData]);
        });
      }

      return () => {
        socketService.offNewMessage();
      };
    }
  }, [enrolled, id, usuario, isInstructor]);

  // Cargar recursos del curso
  useEffect(() => {
    if ((enrolled || isInstructor) && id) {
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`http://localhost:5000/api/courses/${id}/resources`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => setResources(data))
        .catch(err => console.error('Error cargando recursos:', err));
      }
    }
  }, [enrolled, id, isInstructor]);

  // Cargar calificaciones
  useEffect(() => {
    if ((enrolled || isInstructor) && id) {
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`http://localhost:5000/api/courses/${id}/grades`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => setGrades(data))
        .catch(err => console.error('Error cargando calificaciones:', err));
      }
    }
  }, [enrolled, id, isInstructor]);

  const isInstructor = useMemo(() => {
    return course && usuario?.tipo === 'profesor' && course.profesor_id === usuario.id;
  }, [course, usuario]);

  const handleEnroll = async () => {
    if (!course) return;
    
    // Verificar que el usuario esté autenticado
    if (!usuario) {
      alert('Debes iniciar sesión para inscribirte en un curso');
      navigate('/login');
      return;
    }
    
    // Si el curso es gratuito, inscribir directamente
    if (course.precio === 0) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/courses/${course.id}/enroll`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          setEnrolled(true);
          alert('¡Te has inscrito exitosamente al curso gratuito!');
          // Recargar la página para actualizar el estado
          window.location.reload();
        } else {
          const error = await response.json();
          alert(`Error al inscribirse: ${error.error}`);
        }
      } catch (error) {
        console.error('Error al inscribirse:', error);
        alert('Error de conexión al inscribirse');
      }
    } else {
      // Si el curso tiene precio, redirigir a la página de pago
      navigate(`/course/${course.id}/payment`);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !course || !usuario) return;
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/courses/${course.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: newMessage })
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    }
  };

  const handleJoinClass = async (_classId: number) => {
    try {
      // Simular unirse a la clase
      alert('¡Te has unido a la clase!');
    } catch (error) {
      console.error('Error al unirse a la clase:', error);
      alert('Error al unirse a la clase. Intenta nuevamente.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Cargando curso del servidor...</span>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <span className="text-red-500 text-xl mr-3">⚠️</span>
            <div>
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-600">{error || 'Curso no encontrado'}</p>
              <Link 
                to="/courses" 
                className="mt-4 inline-block bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition duration-200"
              >
                Volver a Cursos
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Header del curso */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-4">
                <span className="text-6xl mr-4">{course.imagen}</span>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{course.nombre}</h1>
                  <p className="text-gray-600 mt-1">👨‍🏫 {course.profesor}</p>
                  <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                    <span>⏱️ {course.duracion}</span>
                    <span>👥 {course.estudiantes} estudiantes</span>
                    <span>⭐ {course.rating}</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {course.categoria}
                    </span>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-700 text-lg">{course.descripcion}</p>

              {/* Estado de conexión */}
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">🟢</span>
                  <span className="text-sm text-green-700">
                    Conectado al backend - Chat y clases en tiempo real disponibles
                  </span>
                </div>
              </div>
            </div>

            <div className="ml-8 flex flex-col items-end">
              <div className="text-3xl font-bold text-blue-600 mb-4">
                {course.precio === 0 ? (
                  <span className="text-green-600">GRATIS</span>
                ) : (
                  `$${course.precio}`
                )}
              </div>
              
              {enrolled ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <span className="text-green-700 font-medium">✅ Inscrito</span>
                  <p className="text-sm text-green-600 mt-1">Tienes acceso completo</p>
                  <Link
                    to={`/course/${course.id}/view`}
                    className="mt-2 bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 transition duration-200 inline-block"
                  >
                    Ver Contenido del Curso
                  </Link>
                </div>
              ) : isInstructor ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <span className="text-blue-700 font-medium block mb-2">👨‍🏫 Eres el instructor</span>
                  <Link
                    to={`/course/${course.id}/manage`}
                    className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition duration-200"
                  >
                    ⚙️ Gestionar Curso
                  </Link>
                </div>
              ) : (
                <button
                  onClick={handleEnroll}
                  className={`px-6 py-3 rounded-lg font-medium transition duration-200 flex items-center ${
                    course.precio === 0 
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {course.precio === 0 ? (
                    <>🆓 Inscribirse Gratis</>
                  ) : (
                    <>💳 Comprar Curso - ${course.precio}</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div className="mb-6">
        <nav className="flex space-x-8 border-b border-gray-200">
          {[
            { id: 'contenido', label: '📚 Contenido', badge: totalLessons },
            { id: 'chat', label: '💬 Chat del Curso', badge: chatMessages.length },
            { id: 'recursos', label: '📁 Recursos' },
            { id: 'calificaciones', label: '📊 Calificaciones' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition duration-200 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <span className="ml-2 bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido de las pestañas */}
      <div className="bg-white shadow rounded-lg">
        {activeTab === 'contenido' && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Contenido del Curso ({totalLessons} lecciones)
            </h3>
            
            {modules.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-4xl mb-4 block">📝</span>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  No hay contenido disponible
                </h4>
                <p className="text-gray-600">
                  El contenido aparecerá aquí cuando el instructor publique módulos y lecciones
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {modules.map((module, index) => (
                  <div key={module.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">
                          Módulo {module.orden}: {module.titulo}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          module.publicado 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {module.publicado ? '✅ Publicado' : '🔒 Borrador'}
                        </span>
                      </div>
                      {module.descripcion && (
                        <p className="text-sm text-gray-600 mt-1">{module.descripcion}</p>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-500 mb-2">
                        Este módulo tiene contenido disponible para estudiantes inscritos.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Chat del Curso en Tiempo Real 💬
            </h3>
            
            {enrolled || isInstructor ? (
              <div className="space-y-4">
                {/* Mensajes del chat */}
                <div className="border rounded-lg p-4 h-64 overflow-y-auto bg-gray-50">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-20">
                      <span className="text-2xl block mb-2">💬</span>
                      <p>No hay mensajes aún. ¡Sé el primero en escribir!</p>
                    </div>
                  ) : (
                    chatMessages.map((message, index) => (
                      <div key={index} className="mb-3 p-3 bg-white rounded shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {message.user_name || message.userName}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">{message.message}</div>
                          </div>
                          <div className="text-xs text-gray-400 ml-2">
                            {new Date(message.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Input para nuevo mensaje */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Escribe tu mensaje..."
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition duration-200"
                  >
                    Enviar
                  </button>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <span className="text-blue-500 mr-2">🔄</span>
                    <span className="text-sm text-blue-700">
                      Chat en tiempo real - Los mensajes aparecen al instante
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="text-4xl mb-4 block">🔒</span>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Chat solo para estudiantes inscritos
                </h4>
                <p className="text-gray-600 mb-4">
                  Inscríbete al curso para participar en el chat en tiempo real
                </p>
                <button
                  onClick={handleEnroll}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
                >
                  💳 Comprar Curso
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'recursos' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Recursos del Curso</h3>
              {isInstructor && (
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
                  + Agregar Recurso
                </button>
              )}
            </div>

            {enrolled || isInstructor ? (
              <div className="space-y-3">
                {resources.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-4xl mb-4 block">📁</span>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      No hay recursos disponibles
                    </h4>
                    <p className="text-gray-600">
                      {isInstructor 
                        ? 'Agrega recursos para compartir con tus estudiantes'
                        : 'Los recursos aparecerán aquí cuando el instructor los agregue'}
                    </p>
                  </div>
                ) : (
                  resources.map((resource) => (
                    <div key={resource.id} className="border rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <span className="text-3xl">
                            {resource.type === 'pdf' ? '📄' : 
                             resource.type === 'video' ? '🎥' :
                             resource.type === 'link' ? '🔗' : '📎'}
                          </span>
                          <div>
                            <h4 className="font-medium text-gray-900">{resource.title}</h4>
                            {resource.description && (
                              <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Subido por {resource.uploaded_by_name} • {new Date(resource.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded text-sm"
                        >
                          Descargar
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="text-4xl mb-4 block">🔒</span>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Recursos solo para estudiantes inscritos
                </h4>
                <p className="text-gray-600 mb-4">
                  Inscríbete al curso para acceder a los recursos
                </p>
                <button
                  onClick={handleEnroll}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  💳 Comprar Curso
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'calificaciones' && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {isInstructor ? 'Calificaciones del Curso' : 'Mis Calificaciones'}
            </h3>
            
            {enrolled || isInstructor ? (
              <div>
                {grades.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-4xl mb-4 block">📊</span>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {isInstructor ? 'No hay calificaciones registradas' : 'Aún no tienes calificaciones'}
                    </h4>
                    <p className="text-gray-600">
                      {isInstructor 
                        ? 'Agrega calificaciones para evaluar el progreso de tus estudiantes'
                        : 'Las calificaciones aparecerán aquí cuando el instructor las publique'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {isInstructor ? (
                      // Vista de profesor: todas las calificaciones
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estudiante</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calificación</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comentario</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {grades.map((grade) => (
                              <tr key={grade.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {grade.student_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {grade.assignment_type}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <span className={`px-2 py-1 rounded-full font-medium ${
                                    grade.grade >= 70 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {grade.grade}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                  {grade.feedback || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(grade.created_at).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      // Vista de estudiante: sus calificaciones
                      <div className="space-y-3">
                        {grades.map((grade) => (
                          <div key={grade.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="font-medium text-gray-900">{grade.assignment_type}</span>
                                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                                    grade.grade >= 70 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {grade.grade}
                                  </span>
                                </div>
                                {grade.feedback && (
                                  <p className="text-sm text-gray-600 mb-2">
                                    <strong>Comentario:</strong> {grade.feedback}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500">
                                  Calificado por {grade.professor_name} • {new Date(grade.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Promedio */}
                        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">Promedio General</span>
                            <span className="text-2xl font-bold text-blue-600">
                              {(grades.reduce((sum, g) => sum + parseFloat(g.grade), 0) / grades.length).toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="text-4xl mb-4 block">🔒</span>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Calificaciones solo para estudiantes inscritos
                </h4>
                <p className="text-gray-600 mb-4">
                  Inscríbete al curso para ver tus calificaciones
                </p>
                <button
                  onClick={handleEnroll}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  💳 Comprar Curso
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseDetail;