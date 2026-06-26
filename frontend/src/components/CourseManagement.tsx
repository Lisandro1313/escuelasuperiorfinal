import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast/ToastProvider';

interface Course {
  id: number;
  nombre: string;
  descripcion: string;
  profesor_id: number;
  categoria?: string;
  precio?: number;
  duracion?: string;
  modalidad_precio?: 'curso' | 'modulo' | 'clase';
  drip_habilitado?: boolean;
  drip_intervalo_dias?: number | null;
}

interface Module {
  id: number;
  course_id: number;
  titulo: string;
  descripcion: string;
  orden: number;
  precio?: number;
  unlock_days_offset?: number | null;
  publicado: boolean;
}

interface Lesson {
  id: number;
  module_id: number;
  titulo: string;
  contenido: string;
  tipo: 'texto' | 'video' | 'pdf' | 'quiz';
  orden: number;
  precio?: number;
  unlock_days_offset?: number | null;
  unlock_at?: string | null;
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
  const toast = useToast();

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
    orden: 1,
    precio: 0,
    unlock_days_offset: null as number | null
  });

  const [lessonForm, setLessonForm] = useState({
    titulo: '',
    contenido: '',
    tipo: 'texto' as 'texto' | 'video' | 'pdf' | 'quiz',
    orden: 1,
    precio: 0,
    unlock_days_offset: null as number | null,
    unlock_at: '' as string,
    duracion: 0,
    recursos: [] as Resource[]
  });
  const [courseSettings, setCourseSettings] = useState({
    modalidad_precio: 'curso' as 'curso' | 'modulo' | 'clase',
    unlock_mode: 'abierto' as 'abierto' | 'fecha' | 'secuencial' | 'goteo',
    drip_habilitado: false,
    drip_intervalo_dias: 7,
  });

  const [newResource, setNewResource] = useState({
    tipo: 'video' as 'video' | 'pdf' | 'link' | 'archivo',
    titulo: '',
    url: '',
    descripcion: ''
  });

  const [uploading, setUploading] = useState<'lesson' | 'resource' | null>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [showLiveClassModal, setShowLiveClassModal] = useState(false);
  const [liveClassForm, setLiveClassForm] = useState({ title: '', date: '', time: '', duration: 60, meeting_url: '', precio: 0 });
  const [liveClassResult, setLiveClassResult] = useState<{ url: string; date: string } | null>(null);
  const [scheduling, setScheduling] = useState(false);

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
      setCourseSettings({
        modalidad_precio: (courseData.modalidad_precio || 'curso'),
        unlock_mode: (courseData.unlock_mode || 'abierto'),
        drip_habilitado: !!courseData.drip_habilitado,
        drip_intervalo_dias: Number(courseData.drip_intervalo_dias || 7),
      });

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
        setModuleForm({ titulo: '', descripcion: '', orden: 1, precio: 0, unlock_days_offset: null });
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
        setModuleForm({ titulo: '', descripcion: '', orden: 1, precio: 0, unlock_days_offset: null });
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
          precio: 0,
          unlock_days_offset: null,
          unlock_at: '',
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
          precio: 0,
          unlock_days_offset: null,
          unlock_at: '',
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

  const scheduleLiveClass = async () => {
    if (!liveClassForm.title || !liveClassForm.date || !liveClassForm.time) {
      toast.error('Completá título, fecha y hora');
      return;
    }
    setScheduling(true);
    try {
      const scheduledAt = new Date(`${liveClassForm.date}T${liveClassForm.time}`).toISOString();
      const res = await fetch(`/api/courses/${id}/live-class`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          title: liveClassForm.title,
          scheduled_at: scheduledAt,
          duration_minutes: liveClassForm.duration,
          meeting_url: liveClassForm.meeting_url.trim() || undefined,
          precio: Number(liveClassForm.precio || 0),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Error');
      setLiveClassResult({ url: d.meeting_url, date: scheduledAt });
      setLiveClassForm({ title: '', date: '', time: '', duration: 60, meeting_url: '', precio: 0 });
    } catch (e: any) {
      toast.error(e.message || 'Error al programar la clase');
    } finally {
      setScheduling(false);
    }
  };

  const openEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleForm({
      titulo: module.titulo,
      descripcion: module.descripcion,
      orden: module.orden
      ,precio: Number(module.precio || 0)
      ,unlock_days_offset: module.unlock_days_offset ?? null
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
      precio: Number(lesson.precio || 0),
      unlock_days_offset: lesson.unlock_days_offset ?? null,
      unlock_at: lesson.unlock_at ? String(lesson.unlock_at).slice(0, 10) : '',
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
      precio: 0,
      unlock_days_offset: null,
      unlock_at: '',
      duracion: 0,
      recursos: []
    });
    setShowLessonModal(true);
  };

  const saveCourseSettings = async () => {
    if (!course) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/courses/${course.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre: course.nombre,
          descripcion: course.descripcion,
          categoria: course.categoria || 'general',
          precio: Number(course.precio || 0),
          duracion: course.duracion || 'A tu ritmo',
          ...courseSettings
        })
      });
      if (response.ok) {
        toast.success('Configuración de cobro y desbloqueo actualizada');
        fetchCourseData();
      } else {
        toast.error('No se pudo actualizar la configuración del curso');
      }
    } catch {
      toast.error('Error de conexión al guardar configuración');
    }
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
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-blue-200 hover:text-white text-sm mb-3 flex items-center gap-1"
          >
            ← Volver al panel
          </button>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-emerald-300 text-xs font-semibold uppercase tracking-wide">Armado del curso</p>
              <h1 className="text-2xl md:text-3xl font-bold">{course?.nombre}</h1>
              <p className="text-blue-200 text-sm mt-1">Configurá el cobro, creá módulos (secciones) y cargá las clases.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowLiveClassModal(true)}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-lg font-semibold shadow-lg flex items-center gap-2"
              >
                🔴 Programar clase en vivo
              </button>
              <button
                onClick={() => setShowModuleModal(true)}
                className="bg-white text-blue-600 px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-50 shadow-lg flex items-center gap-2"
              >
                ➕ Nuevo módulo
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Guía rápida de armado */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6">
          <p className="font-bold text-emerald-900 mb-3">Cómo armar tu curso, en 3 pasos</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="flex gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">1</span>
              <span className="text-emerald-900">Elegí <strong>cómo se cobra</strong> (curso entero o clase suelta) y <strong>cómo se desbloquea</strong>.</span>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">2</span>
              <span className="text-emerald-900">Creá <strong>módulos</strong> (las secciones del curso, ej: "Unidad 1").</span>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">3</span>
              <span className="text-emerald-900">Dentro de cada módulo, cargá las <strong>clases</strong> con su material, precio y fecha.</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Paso 1 · Cómo se cobra y se desbloquea</h3>
          <p className="text-sm text-gray-500 mb-4">Esto define cómo los alumnos pagan y en qué orden ven las clases.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modalidad de cobro</label>
              <select
                value={courseSettings.modalidad_precio}
                onChange={(e) => setCourseSettings((p) => ({ ...p, modalidad_precio: e.target.value as 'curso' | 'modulo' | 'clase' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="curso">Curso completo</option>
                <option value="modulo">Módulo</option>
                <option value="clase">Clase individual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modo de desbloqueo</label>
              <select
                value={courseSettings.unlock_mode}
                onChange={(e) => setCourseSettings((p) => ({ ...p, unlock_mode: e.target.value as 'abierto' | 'fecha' | 'secuencial' | 'goteo' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="abierto">Todo abierto</option>
                <option value="fecha">Por fecha (la que ponés en cada clase)</option>
                <option value="secuencial">Al completar la clase anterior</option>
                <option value="goteo">Goteo cada X días desde la inscripción</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {courseSettings.unlock_mode === 'fecha' && 'Cargá la fecha de habilitación en cada clase.'}
                {courseSettings.unlock_mode === 'secuencial' && 'Cada clase se abre cuando el alumno completa la anterior.'}
                {courseSettings.unlock_mode === 'goteo' && 'Usa el intervalo de días de acá abajo.'}
                {courseSettings.unlock_mode === 'abierto' && 'Las clases se ven todas (según el pago).'}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-6 md:mt-0">
              <input
                id="drip_habilitado"
                type="checkbox"
                checked={courseSettings.drip_habilitado}
                onChange={(e) => setCourseSettings((p) => ({ ...p, drip_habilitado: e.target.checked }))}
              />
              <label htmlFor="drip_habilitado" className="text-sm text-gray-700">Desbloqueo gradual activo</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo drip (días)</label>
              <input
                type="number"
                min={1}
                value={courseSettings.drip_intervalo_dias}
                onChange={(e) => setCourseSettings((p) => ({ ...p, drip_intervalo_dias: Number(e.target.value || 7) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <button
            onClick={saveCourseSettings}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold"
          >
            Guardar configuración
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Paso 2 · Módulos y clases</h3>
            <p className="text-sm text-gray-500">Un <strong>módulo</strong> es una sección del curso. Adentro van las <strong>clases</strong>.</p>
          </div>
          {modules.length > 0 && (
            <button
              onClick={() => setShowModuleModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap"
            >
              ➕ Nuevo módulo
            </button>
          )}
        </div>

        {modules.length === 0 ? (
          /* Estado vacío mejorado */
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📚</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Empezá creando el primer módulo</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Un módulo es una sección o unidad (por ejemplo "Unidad 1: Introducción"). Después, adentro de cada módulo vas a cargar las clases.
            </p>
            <button
              onClick={() => setShowModuleModal(true)}
              className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition duration-300 shadow-lg"
            >
              ➕ Crear primer módulo
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
                        <span>Agregar clase</span>
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
                      <p className="text-gray-500 mb-4">Todavía no hay clases en este módulo</p>
                      <button
                        onClick={() => openCreateLesson(module.id)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition duration-200"
                      >
                        ➕ Agregar primera clase
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
                    setModuleForm({ titulo: '', descripcion: '', orden: 1, precio: 0, unlock_days_offset: null });
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
                  setModuleForm({ titulo: '', descripcion: '', orden: 1, precio: 0, unlock_days_offset: null });
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
                    {editingLesson ? '✏️ Editar clase' : '➕ Nueva clase'}
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


              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">Precio de la clase (ARS)</label>
                  <input type="number" min="0" value={lessonForm.precio} onChange={(e) => setLessonForm(prev => ({ ...prev, precio: Number(e.target.value || 0) }))} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">Habilitar en fecha</label>
                  <input type="date" value={lessonForm.unlock_at} onChange={(e) => setLessonForm(prev => ({ ...prev, unlock_at: e.target.value }))} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" />
                  <p className="text-xs text-gray-400 mt-1">Para el modo "Por fecha"</p>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">Desbloquear a los X dias</label>
                  <input type="number" min="0" value={lessonForm.unlock_days_offset ?? ''} onChange={(e) => setLessonForm(prev => ({ ...prev, unlock_days_offset: e.target.value === '' ? null : Number(e.target.value) }))} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl" placeholder="0 = inmediato" />
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

      {/* Modal: Programar clase en vivo */}
      {showLiveClassModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => { setShowLiveClassModal(false); setLiveClassResult(null); }}
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">🔴 Programar clase en vivo</h3>
              <button
                onClick={() => { setShowLiveClassModal(false); setLiveClassResult(null); }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >&times;</button>
            </div>

            {liveClassResult ? (
              <div className="p-6 space-y-4">
                <div className="text-center">
                  <div className="text-5xl mb-3">✅</div>
                  <h4 className="text-xl font-bold text-gray-900">¡Clase programada!</h4>
                  <p className="text-gray-600 mt-2">
                    {new Date(liveClassResult.date).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' })}
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-2">Link de la sala (Jitsi, gratis, sin instalar nada):</p>
                  <a
                    href={liveClassResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all text-sm font-medium"
                  >
                    {liveClassResult.url}
                  </a>
                  <button
                    onClick={() => { navigator.clipboard.writeText(liveClassResult.url); toast.success('Link copiado al portapapeles'); }}
                    className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg"
                  >
                    📋 Copiar link
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Tus alumnos inscriptos ya recibieron la notificación.
                </p>
                <button
                  onClick={() => { setShowLiveClassModal(false); setLiveClassResult(null); }}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg"
                >
                  Listo
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título de la clase *</label>
                  <input
                    type="text"
                    value={liveClassForm.title}
                    onChange={(e) => setLiveClassForm({ ...liveClassForm, title: e.target.value })}
                    placeholder="Ej: Clase 5 - Práctica en vivo"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                    <input
                      type="date"
                      value={liveClassForm.date}
                      onChange={(e) => setLiveClassForm({ ...liveClassForm, date: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora *</label>
                    <input
                      type="time"
                      value={liveClassForm.time}
                      onChange={(e) => setLiveClassForm({ ...liveClassForm, time: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
                    <input
                      type="number"
                      min={15}
                      step={15}
                      value={liveClassForm.duration}
                      onChange={(e) => setLiveClassForm({ ...liveClassForm, duration: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio (ARS)</label>
                    <input
                      type="number"
                      min={0}
                      value={liveClassForm.precio}
                      onChange={(e) => setLiveClassForm({ ...liveClassForm, precio: Number(e.target.value || 0) })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      placeholder="0 = gratis"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link de la transmisión (YouTube en vivo)</label>
                  <input
                    type="url"
                    value={liveClassForm.meeting_url}
                    onChange={(e) => setLiveClassForm({ ...liveClassForm, meeting_url: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    placeholder="https://youtube.com/live/... (recomendado: oculto)"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Con YouTube en vivo (oculto) los alumnos solo miran, no comparten pantalla. Si lo dejás vacío, generamos un Jitsi.
                  </p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  💡 La clase va a aparecer en el inicio. Los alumnos {liveClassForm.precio > 0 ? 'la pagan' : 'reservan'} y entran a la transmisión.
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLiveClassModal(false)}
                    className="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={scheduleLiveClass}
                    disabled={scheduling}
                    className="flex-1 px-5 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg font-semibold"
                  >
                    {scheduling ? 'Programando...' : 'Programar clase'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManagement;
