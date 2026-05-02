import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Course {
  id: number;
  nombre: string;
  descripcion: string;
  profesor_id: number;
}

interface Module {
  id: number;
  course_id: number;
  titulo: string;
  descripcion: string;
  orden: number;
  publicado: boolean;
}

interface Lesson {
  id: number;
  module_id: number;
  titulo: string;
  contenido: string;
  tipo: 'texto' | 'video' | 'pdf' | 'quiz';
  orden: number;
  duracion: number;
  recursos: Resource[];
  publicado: boolean;
}

interface Resource {
  tipo: 'video' | 'pdf' | 'link' | 'archivo';
  titulo: string;
  url: string;
  descripcion?: string;
}

const CourseManagement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<{ [moduleId: number]: Lesson[] }>({});
  const [loading, setLoading] = useState(true);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);

  const [moduleForm, setModuleForm] = useState({
    titulo: '',
    descripcion: '',
    orden: 1
  });

  const [lessonForm, setLessonForm] = useState({
    titulo: '',
    contenido: '',
    tipo: 'texto' as 'texto' | 'video' | 'pdf' | 'quiz',
    orden: 1,
    duracion: 0,
    recursos: [] as Resource[]
  });

  const [newResource, setNewResource] = useState({
    tipo: 'video' as 'video' | 'pdf' | 'link' | 'archivo',
    titulo: '',
    url: '',
    descripcion: ''
  });

  const [uploading, setUploading] = useState<'lesson' | 'resource' | null>(null);
  const [uploadError, setUploadError] = useState<string>('');

  // Sube un archivo al backend y devuelve la URL servida (/uploads/xxx).
  const uploadFile = async (file: File): Promise<string | null> => {
    setUploadError('');
    if (file.size > 500 * 1024 * 1024) {
      setUploadError('El archivo supera los 500MB.');
      return null;
    }
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || 'Error al subir el archivo');
        return null;
      }
      return data.url as string;
    } catch (err) {
      console.error(err);
      setUploadError('Error de conexion al subir el archivo');
      return null;
    }
  };

  useEffect(() => {
    fetchCourseData();
  }, [id]);

  const fetchCourseData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Obtener datos del curso
      const courseResponse = await fetch(`/api/courses/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const courseData = await courseResponse.json();
      setCourse(courseData);

      // Verificar permisos
      if (courseData.profesor_id !== usuario?.id) {
        navigate('/dashboard');
        return;
      }

      // Obtener módulos
      const modulesResponse = await fetch(`/api/courses/${id}/modules`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const modulesData = await modulesResponse.json();
      setModules(modulesData);

      // Obtener lecciones para cada módulo
      const lessonsData: { [moduleId: number]: Lesson[] } = {};
      for (const module of modulesData) {
        const lessonsResponse = await fetch(`/api/modules/${module.id}/lessons`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const moduleLinks = await lessonsResponse.json();
        lessonsData[module.id] = moduleLinks;
      }
      setLessons(lessonsData);

    } catch (error) {
      console.error('Error al cargar datos del curso:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModule = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/courses/${id}/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(moduleForm)
      });

      if (response.ok) {
        fetchCourseData();
        setShowModuleModal(false);
        setModuleForm({ titulo: '', descripcion: '', orden: 1 });
      }
    } catch (error) {
      console.error('Error al crear módulo:', error);
    }
  };

  const handleUpdateModule = async () => {
    if (!editingModule) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/modules/${editingModule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...moduleForm, publicado: true })
      });

      if (response.ok) {
        fetchCourseData();
        setShowModuleModal(false);
        setEditingModule(null);
        setModuleForm({ titulo: '', descripcion: '', orden: 1 });
      }
    } catch (error) {
      console.error('Error al actualizar módulo:', error);
    }
  };

  const handleDeleteModule = async (moduleId: number) => {
    if (!confirm('¿Estás seguro de eliminar este módulo? Se eliminarán todas las lecciones.')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/modules/${moduleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchCourseData();
      }
    } catch (error) {
      console.error('Error al eliminar módulo:', error);
    }
  };

  const handleCreateLesson = async () => {
    if (!selectedModuleId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/modules/${selectedModuleId}/lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(lessonForm)
      });

      if (response.ok) {
        fetchCourseData();
        setShowLessonModal(false);
        setLessonForm({
          titulo: '',
          contenido: '',
          tipo: 'texto',
          orden: 1,
          duracion: 0,
          recursos: []
        });
      }
    } catch (error) {
      console.error('Error al crear lección:', error);
    }
  };

  const handleUpdateLesson = async () => {
    if (!editingLesson) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/lessons/${editingLesson.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...lessonForm, publicado: true })
      });

      if (response.ok) {
        fetchCourseData();
        setShowLessonModal(false);
        setEditingLesson(null);
        setLessonForm({
          titulo: '',
          contenido: '',
          tipo: 'texto',
          orden: 1,
          duracion: 0,
          recursos: []
        });
      }
    } catch (error) {
      console.error('Error al actualizar lección:', error);
    }
  };

  const handleDeleteLesson = async (lessonId: number) => {
    if (!confirm('¿Estás seguro de eliminar esta lección?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchCourseData();
      }
    } catch (error) {
      console.error('Error al eliminar lección:', error);
    }
  };

  const addResource = () => {
    if (!newResource.titulo || !newResource.url) return;

    setLessonForm(prev => ({
      ...prev,
      recursos: [...prev.recursos, { ...newResource }]
    }));

    setNewResource({
      tipo: 'video',
      titulo: '',
      url: '',
      descripcion: ''
    });
  };

  const removeResource = (index: number) => {
    setLessonForm(prev => ({
      ...prev,
      recursos: prev.recursos.filter((_, i) => i !== index)
    }));
  };

  const openEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleForm({
      titulo: module.titulo,
      descripcion: module.descripcion,
      orden: module.orden
    });
    setShowModuleModal(true);
  };

  const openEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      titulo: lesson.titulo,
      contenido: lesson.contenido,
      tipo: lesson.tipo,
      orden: lesson.orden,
      duracion: lesson.duracion,
      recursos: lesson.recursos || []
    });
    setShowLessonModal(true);
  };

  const openCreateLesson = (moduleId: number) => {
    setSelectedModuleId(moduleId);
    setEditingLesson(null);
    setLessonForm({
      titulo: '',
      contenido: '',
      tipo: 'texto',
      orden: 1,
      duracion: 0,
      recursos: []
    });
    setShowLessonModal(true);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando gestión del curso...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header moderno */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Gestión de Contenido</h1>
              <p className="text-blue-100 mt-2">
                {course?.nombre}
              </p>
              <p className="text-blue-200 text-sm mt-1">{course?.descripcion}</p>
            </div>
            <button
              onClick={() => setShowModuleModal(true)}
              className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition duration-300 flex items-center space-x-2 shadow-lg"
            >
              <span className="text-xl">➕</span>
              <span>Nuevo Módulo</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {modules.length === 0 ? (
          /* Estado vacío mejorado */
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📚</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">¡Comienza a crear contenido!</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Crea tu primer módulo para organizar las lecciones de tu curso. Los módulos te ayudan a estructurar el contenido de manera lógica.
            </p>
            <button 
              onClick={() => setShowModuleModal(true)}
              className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition duration-300 shadow-lg"
            >
              🚀 Crear Primer Módulo
            </button>
          </div>
        ) : (
          /* Lista de módulos mejorada */
          <div className="space-y-6">
            {modules.map(module => (
              <div key={module.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition duration-300">
                {/* Header del módulo */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                        {module.orden}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          Módulo {module.orden}: {module.titulo}
                        </h3>
                        <p className="text-gray-600 mt-1">{module.descripcion}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${'bg-green-100 text-green-800'}`}>
                        ✅ Módulo Creado
                      </span>
                      <button 
                        onClick={() => openCreateLesson(module.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition duration-200 flex items-center space-x-2"
                      >
                        <span>➕</span>
                        <span>Lección</span>
                      </button>
                      <button 
                        onClick={() => openEditModule(module)}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition duration-200"
                      >
                        ✏️ Editar
                      </button>
                      <button 
                        onClick={() => handleDeleteModule(module.id)}
                        className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-medium hover:bg-red-200 transition duration-200"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista de lecciones */}
                <div className="p-6">
                  {(lessons[module.id] || []).length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📝</span>
                      </div>
                      <p className="text-gray-500 mb-4">No hay lecciones en este módulo</p>
                      <button 
                        onClick={() => openCreateLesson(module.id)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition duration-200"
                      >
                        ➕ Crear Primera Lección
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lessons[module.id].map((lesson, index) => (
                        <div key={lesson.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition duration-200">
                          <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-semibold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{lesson.titulo}</h4>
                              <div className="flex items-center space-x-4 mt-1">
                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                                  lesson.tipo === 'video' ? 'bg-red-100 text-red-700' :
                                  lesson.tipo === 'texto' ? 'bg-blue-100 text-blue-700' :
                                  lesson.tipo === 'pdf' ? 'bg-green-100 text-green-700' :
                                  'bg-purple-100 text-purple-700'
                                }`}>
                                  {lesson.tipo === 'video' ? '🎥 Video' :
                                   lesson.tipo === 'texto' ? '📄 Texto' :
                                   lesson.tipo === 'pdf' ? '📋 PDF' : '🧩 Quiz'}
                                </span>
                                <span className="text-gray-500 text-sm">⏱️ {lesson.duracion} min</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => openEditLesson(lesson)}
                              className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg font-medium hover:bg-blue-200 transition duration-200 text-sm"
                            >
                              ✏️ Editar
                            </button>
                            <button 
                              onClick={() => handleDeleteLesson(lesson.id)}
                              className="bg-red-100 text-red-700 px-3 py-2 rounded-lg font-medium hover:bg-red-200 transition duration-200 text-sm"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para crear/editar módulo */}
      {showModuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">
                    {editingModule ? '✏️ Editar Módulo' : '➕ Nuevo Módulo'}
                  </h3>
                  <p className="text-blue-100 text-sm mt-1">
                    Los módulos organizan las lecciones de tu curso
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setShowModuleModal(false);
                    setEditingModule(null);
                    setModuleForm({ titulo: '', descripcion: '', orden: 1 });
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm">
                  📌 Título del módulo *
                </label>
                <input
                  type="text"
                  value={moduleForm.titulo}
                  onChange={(e) => setModuleForm(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ej: Introducción a React"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring focus:ring-blue-200 transition duration-200 text-base"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm">
                  📝 Descripción
                </label>
                <textarea
                  value={moduleForm.descripcion}
                  onChange={(e) => setModuleForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Describe qué aprenderán en este módulo..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring focus:ring-blue-200 transition duration-200 text-base resize-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm">
                  🔢 Orden de aparición
                </label>
                <input
                  type="number"
                  value={moduleForm.orden}
                  onChange={(e) => setModuleForm(prev => ({ ...prev, orden: parseInt(e.target.value) }))}
                  min="1"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring focus:ring-blue-200 transition duration-200 text-base"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Define en qué posición aparecerá este módulo
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-8 py-4 rounded-b-2xl flex items-center justify-end space-x-3">
              <button 
                onClick={() => {
                  setShowModuleModal(false);
                  setEditingModule(null);
                  setModuleForm({ titulo: '', descripcion: '', orden: 1 });
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition duration-200"
              >
                Cancelar
              </button>
              <button 
                onClick={editingModule ? handleUpdateModule : handleCreateModule}
                disabled={!moduleForm.titulo}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
              >
                {editingModule ? '💾 Actualizar' : '✨ Crear'} Módulo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para crear/editar lección */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-teal-700 text-white p-6 rounded-t-2xl sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">
                    {editingLesson ? '✏️ Editar Lección' : '➕ Nueva Lección'}
                  </h3>
                  <p className="text-green-100 text-sm mt-1">
                    Crea contenido de calidad para tus estudiantes
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setShowLessonModal(false);
                    setEditingLesson(null);
                    setSelectedModuleId(null);
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-8 space-y-6">
              {/* Título */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm">
                  📌 Título de la lección *
                </label>
                <input
                  type="text"
                  value={lessonForm.titulo}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ej: Instalación y configuración"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring focus:ring-green-200 transition duration-200 text-base"
                />
              </div>
              
              {/* Fila con Tipo, Orden y Duración */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">
                    🎯 Tipo de lección
                  </label>
                  <select
                    value={lessonForm.tipo}
                    onChange={(e) => setLessonForm(prev => ({ 
                      ...prev, 
                      tipo: e.target.value as 'texto' | 'video' | 'pdf' | 'quiz' 
                    }))}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring focus:ring-green-200 transition duration-200 text-base"
                  >
                    <option value="texto">📝 Texto</option>
                    <option value="video">🎥 Video</option>
                    <option value="pdf">📋 PDF</option>
                    <option value="quiz">🧩 Quiz</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">
                    🔢 Orden
                  </label>
                  <input
                    type="number"
                    value={lessonForm.orden}
                    onChange={(e) => setLessonForm(prev => ({ ...prev, orden: parseInt(e.target.value) }))}
                    min="1"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring focus:ring-green-200 transition duration-200 text-base"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">
                    ⏱️ Duración (min)
                  </label>
                  <input
                    type="number"
                    value={lessonForm.duracion}
                    onChange={(e) => setLessonForm(prev => ({ ...prev, duracion: parseInt(e.target.value) }))}
                    min="0"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring focus:ring-green-200 transition duration-200 text-base"
                  />
                </div>
              </div>

              {/* Contenido */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm">
                  {lessonForm.tipo === 'video' ? '🎥 URL del video o subir archivo' :
                    lessonForm.tipo === 'pdf' ? '📋 URL del PDF o subir archivo' :
                      '📄 Contenido de la lección'}
                </label>
                {(lessonForm.tipo === 'video' || lessonForm.tipo === 'pdf') ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={lessonForm.contenido}
                      onChange={(e) => setLessonForm(prev => ({ ...prev, contenido: e.target.value }))}
                      placeholder={lessonForm.tipo === 'video' ? 'https://youtu.be/... o /uploads/clase.mp4' : 'https://... o /uploads/apunte.pdf'}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 text-base"
                    />
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className={`inline-flex items-center px-4 py-2 rounded-xl border-2 border-dashed border-green-400 bg-green-50 text-green-700 font-semibold cursor-pointer hover:bg-green-100 transition ${uploading === 'lesson' ? 'opacity-60 cursor-wait' : ''}`}>
                        {uploading === 'lesson' ? '⏳ Subiendo...' : '⬆️ Subir desde mi PC'}
                        <input
                          type="file"
                          accept={lessonForm.tipo === 'video' ? 'video/*' : '.pdf'}
                          className="hidden"
                          disabled={uploading !== null}
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            setUploading('lesson');
                            const url = await uploadFile(f);
                            setUploading(null);
                            if (url) setLessonForm(prev => ({ ...prev, contenido: url }));
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {lessonForm.contenido && (
                        <span className="text-xs text-gray-500 truncate flex-1">📎 {lessonForm.contenido}</span>
                      )}
                    </div>
                    {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
                  </div>
                ) : (
                  <textarea
                    value={lessonForm.contenido}
                    onChange={(e) => setLessonForm(prev => ({ ...prev, contenido: e.target.value }))}
                    placeholder="Texto o explicacion de la leccion..."
                    rows={6}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 text-base resize-none"
                  />
                )}
              </div>

              {/* Sección de Recursos */}
              <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200">
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  📎 Recursos Adicionales
                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {lessonForm.recursos.length}
                  </span>
                </h4>
                
                {/* Lista de recursos agregados */}
                {lessonForm.recursos.length > 0 && (
                  <div className="space-y-3 mb-6">
                    {lessonForm.recursos.map((resource, index) => (
                      <div key={index} className="bg-white border-2 border-gray-200 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition duration-200">
                        <div className="flex items-center space-x-3 flex-1">
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                            resource.tipo === 'video' ? 'bg-red-100 text-red-700' :
                            resource.tipo === 'pdf' ? 'bg-orange-100 text-orange-700' :
                            resource.tipo === 'link' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {resource.tipo === 'video' ? '🎥' : 
                             resource.tipo === 'pdf' ? '📋' : 
                             resource.tipo === 'link' ? '🔗' : '📁'} {resource.tipo.toUpperCase()}
                          </span>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800">{resource.titulo}</p>
                            <p className="text-xs text-gray-500 truncate">{resource.url}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeResource(index)}
                          className="bg-red-100 text-red-700 px-3 py-2 rounded-lg font-medium hover:bg-red-200 transition duration-200 ml-3"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulario para agregar nuevo recurso */}
                <div className="bg-white rounded-xl p-4 border-2 border-dashed border-gray-300">
                  <h5 className="font-semibold text-gray-700 mb-3">➕ Agregar Nuevo Recurso</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-gray-600 text-xs font-medium mb-1">Tipo</label>
                      <select
                        value={newResource.tipo}
                        onChange={(e) => setNewResource(prev => ({ 
                          ...prev, 
                          tipo: e.target.value as 'video' | 'pdf' | 'link' | 'archivo' 
                        }))}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 text-sm"
                      >
                        <option value="video">🎥 Video</option>
                        <option value="pdf">📋 PDF</option>
                        <option value="link">🔗 Enlace</option>
                        <option value="archivo">📁 Archivo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs font-medium mb-1">Título</label>
                      <input
                        type="text"
                        value={newResource.titulo}
                        onChange={(e) => setNewResource(prev => ({ ...prev, titulo: e.target.value }))}
                        placeholder="Título del recurso"
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs font-medium mb-1">URL o subir archivo</label>
                      <input
                        type="text"
                        value={newResource.url}
                        onChange={(e) => setNewResource(prev => ({ ...prev, url: e.target.value }))}
                        placeholder="https://... o usa el boton de abajo"
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 items-center mb-3">
                    <label className={`inline-flex items-center px-3 py-2 rounded-lg border border-dashed border-blue-400 bg-blue-50 text-blue-700 text-sm font-semibold cursor-pointer hover:bg-blue-100 ${uploading === 'resource' ? 'opacity-60 cursor-wait' : ''}`}>
                      {uploading === 'resource' ? '⏳ Subiendo...' : '⬆️ Subir desde mi PC'}
                      <input
                        type="file"
                        className="hidden"
                        disabled={uploading !== null}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setUploading('resource');
                          const url = await uploadFile(f);
                          setUploading(null);
                          if (url) setNewResource(prev => ({
                            ...prev,
                            url,
                            titulo: prev.titulo || f.name,
                          }));
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {uploadError && <span className="text-xs text-red-600">{uploadError}</span>}
                  </div>
                  <button
                    onClick={addResource}
                    disabled={!newResource.titulo || !newResource.url}
                    className="w-full bg-green-100 text-green-700 px-4 py-2 rounded-lg font-semibold hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                  >
                    ➕ Agregar Recurso
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-8 py-4 rounded-b-2xl flex items-center justify-end space-x-3 sticky bottom-0 z-10">
              <button 
                onClick={() => {
                  setShowLessonModal(false);
                  setEditingLesson(null);
                  setSelectedModuleId(null);
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition duration-200"
              >
                Cancelar
              </button>
              <button 
                onClick={editingLesson ? handleUpdateLesson : handleCreateLesson}
                disabled={!lessonForm.titulo}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-700 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
              >
                {editingLesson ? '💾 Actualizar' : '✨ Crear'} Lección
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManagement;