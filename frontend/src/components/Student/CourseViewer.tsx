import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './CourseViewer.css';

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

interface Progress {
  moduleId: number;
  moduleTitle: string;
  lessons: {
    lessonId: number;
    lessonTitle: string;
    completed: boolean;
  }[];
}

interface Course {
  id: number;
  nombre: string;
  descripcion: string;
  profesor: string;
}

const CourseViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<{ [moduleId: number]: Lesson[] }>({});
  const [progress, setProgress] = useState<Progress[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    checkEnrollmentAndLoadContent();
  }, [id]);

  const checkEnrollmentAndLoadContent = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Verificar inscripción
      const enrollmentResponse = await fetch(`/api/courses/${id}/enrollment`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const enrollmentData = await enrollmentResponse.json();
      
      if (!enrollmentData.enrolled) {
        setIsEnrolled(false);
        setLoading(false);
        return;
      }
      
      setIsEnrolled(true);
      
      // Obtener datos del curso
      const courseResponse = await fetch(`/api/courses/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const courseData = await courseResponse.json();
      setCourse(courseData);

      // Obtener módulos
      const modulesResponse = await fetch(`/api/courses/${id}/modules`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const modulesData = await modulesResponse.json();
      setModules(modulesData.filter((m: Module) => m.publicado));

      // Obtener lecciones para cada módulo
      const lessonsData: { [moduleId: number]: Lesson[] } = {};
      for (const module of modulesData) {
        if (module.publicado) {
          const lessonsResponse = await fetch(`/api/modules/${module.id}/lessons`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const moduleLinks = await lessonsResponse.json();
          lessonsData[module.id] = moduleLinks.filter((l: Lesson) => l.publicado);
        }
      }
      setLessons(lessonsData);

      // Obtener progreso del estudiante
      const progressResponse = await fetch(`/api/courses/${id}/progress`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const progressData = await progressResponse.json();
      setProgress(progressData);

      // Seleccionar primera lección si no hay ninguna seleccionada
      const firstModule = modulesData.find((m: Module) => m.publicado && lessonsData[m.id]?.length > 0);
      if (firstModule && lessonsData[firstModule.id]?.length > 0) {
        setSelectedLesson(lessonsData[firstModule.id][0]);
      }

    } catch (error) {
      console.error('Error al cargar contenido del curso:', error);
    } finally {
      setLoading(false);
    }
  };

  const markLessonComplete = async (lessonId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        // Actualizar progreso local
        setProgress(prev => prev.map(moduleProgress => ({
          ...moduleProgress,
          lessons: moduleProgress.lessons.map(lesson => 
            lesson.lessonId === lessonId 
              ? { ...lesson, completed: true }
              : lesson
          )
        })));

        // Recargar el progreso del curso desde el servidor
        const progressResponse = await fetch(`/api/courses/${id}/progress`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (progressResponse.ok) {
          const updatedProgress = await progressResponse.json();
          console.log('✅ Progreso del curso actualizado:', updatedProgress);
          
          // Actualizar el progreso en el AuthContext
          if (updatedProgress.courseProgress !== undefined) {
            console.log(`📊 Nuevo progreso: ${updatedProgress.courseProgress}%`);
            // Importar y usar el contexto para actualizar
            window.dispatchEvent(new CustomEvent('courseProgressUpdated', {
              detail: { courseId: id, progress: updatedProgress.courseProgress }
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error al marcar lección como completada:', error);
    }
  };

  const getLessonProgress = (lessonId: number) => {
    for (const moduleProgress of progress) {
      const lessonProgress = moduleProgress.lessons.find(l => l.lessonId === lessonId);
      if (lessonProgress) {
        return lessonProgress.completed;
      }
    }
    return false;
  };

  const getModuleProgress = (moduleId: number) => {
    const moduleProgress = progress.find(p => p.moduleId === moduleId);
    if (!moduleProgress || moduleProgress.lessons.length === 0) return 0;
    
    const completed = moduleProgress.lessons.filter(l => l.completed).length;
    return Math.round((completed / moduleProgress.lessons.length) * 100);
  };

  // Helper: convierte una URL a un nodo embeddable.
  // Soporta: YouTube, Vimeo, MP4/WebM/MOV (archivos), PDF, links externos.
  const renderEmbed = (rawUrl: string): React.ReactNode => {
    if (!rawUrl) return null;
    const url = rawUrl.trim();

    // Prefijo del backend para uploads relativos (en prod frontend y backend pueden estar en distintos origenes)
    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    const absoluteUrl = url.startsWith('/uploads')
      ? (apiBase ? apiBase + url : url)
      : url;

    // YouTube
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
    if (yt) {
      return (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 8 }}>
          <iframe
            src={`https://www.youtube.com/embed/${yt[1]}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
          />
        </div>
      );
    }

    // Vimeo
    const vimeo = url.match(/vimeo\.com\/(\d+)/);
    if (vimeo) {
      return (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 8 }}>
          <iframe
            src={`https://player.vimeo.com/video/${vimeo[1]}`}
            title="Vimeo video"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
          />
        </div>
      );
    }

    // Archivo de video subido o externo
    if (/\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i.test(url)) {
      return (
        <video controls src={absoluteUrl} style={{ width: '100%', maxHeight: 600, borderRadius: 8, background: '#000' }}>
          Tu navegador no soporta el reproductor de video.
        </video>
      );
    }

    // Audio
    if (/\.(mp3|wav|m4a|ogg)(\?.*)?$/i.test(url)) {
      return <audio controls src={absoluteUrl} style={{ width: '100%' }} />;
    }

    // PDF
    if (/\.pdf(\?.*)?$/i.test(url)) {
      return (
        <iframe
          src={absoluteUrl}
          title="PDF"
          style={{ width: '100%', height: 700, border: '1px solid #e5e7eb', borderRadius: 8 }}
        />
      );
    }

    // Link generico
    return (
      <a href={absoluteUrl} target="_blank" rel="noopener noreferrer" className="resource-link">
        Abrir recurso ↗
      </a>
    );
  };

  const renderLessonContent = (lesson: Lesson) => {
    if (!lesson) return null;
    const completed = getLessonProgress(lesson.id);
    const isUrl = lesson.contenido && /^(https?:\/\/|\/uploads\/)/.test(lesson.contenido.trim());

    return (
      <div className="lesson-content">
        <div className="lesson-header">
          <div className="lesson-title-section">
            <span className={`lesson-type lesson-type-${lesson.tipo}`}>{lesson.tipo.toUpperCase()}</span>
            <h2>{lesson.titulo}</h2>
            {lesson.duracion > 0 && <span className="lesson-duration">{lesson.duracion} min</span>}
          </div>
          <button
            className={`btn ${completed ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => markLessonComplete(lesson.id)}
            disabled={completed}
          >
            {completed ? '✓ Completada' : 'Marcar como completada'}
          </button>
        </div>

        <div className="lesson-body">
          {/* Si el contenido es URL y la leccion es video/pdf, embedear el reproductor */}
          {isUrl && (lesson.tipo === 'video' || lesson.tipo === 'pdf') && (
            <div style={{ marginBottom: 16 }}>{renderEmbed(lesson.contenido)}</div>
          )}

          {/* Texto descriptivo / lecciones de tipo texto */}
          {lesson.contenido && (lesson.tipo === 'texto' || !isUrl) && (
            <div className="lesson-text" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {lesson.contenido}
            </div>
          )}

          {/* Si es URL pero el tipo es 'texto', mostrar tambien el link */}
          {isUrl && lesson.tipo === 'texto' && (
            <p style={{ marginTop: 8 }}>
              <a href={lesson.contenido} target="_blank" rel="noopener noreferrer">{lesson.contenido}</a>
            </p>
          )}

          {lesson.recursos && lesson.recursos.length > 0 && (
            <div className="lesson-resources">
              <h3>Recursos de la lección</h3>
              <div className="resources-grid">
                {lesson.recursos.map((resource, index) => (
                  <div key={index} className="resource-card">
                    <div className="resource-header">
                      <span className={`resource-type resource-type-${resource.tipo}`}>{resource.tipo.toUpperCase()}</span>
                      <h4>{resource.titulo}</h4>
                    </div>
                    {resource.descripcion && <p className="resource-description">{resource.descripcion}</p>}
                    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="resource-link">
                      {resource.tipo === 'video' ? 'Ver video' :
                        resource.tipo === 'pdf' ? 'Abrir PDF' :
                          resource.tipo === 'archivo' ? 'Descargar archivo' : 'Abrir enlace'}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando contenido del curso...</p>
      </div>
    );
  }

  if (!isEnrolled) {
    return (
      <div className="not-enrolled">
        <h2>Acceso restringido</h2>
        <p>Necesitas estar inscrito en este curso para ver su contenido.</p>
        <button 
          className="btn btn-primary"
          onClick={() => navigate(`/course/${id}`)}
        >
          Ver detalles del curso
        </button>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="no-content">
        <h2>Contenido en preparación</h2>
        <p>El profesor aún no ha publicado contenido para este curso.</p>
        <p>Revisa más tarde para ver las lecciones disponibles.</p>
      </div>
    );
  }

  return (
    <div className="course-viewer">
      <div className="course-sidebar">
        <div className="course-info">
          <h1>{course?.nombre}</h1>
          <p>Profesor: {course?.profesor}</p>
        </div>

        <div className="modules-list">
          {modules.map(module => (
            <div key={module.id} className="module-item">
              <div className="module-header">
                <h3>Módulo {module.orden}: {module.titulo}</h3>
                <div className="module-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${getModuleProgress(module.id)}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{getModuleProgress(module.id)}%</span>
                </div>
              </div>
              
              <div className="lessons-list">
                {(lessons[module.id] || []).map(lesson => (
                  <div 
                    key={lesson.id}
                    className={`lesson-item ${selectedLesson?.id === lesson.id ? 'active' : ''} ${getLessonProgress(lesson.id) ? 'completed' : ''}`}
                    onClick={() => setSelectedLesson(lesson)}
                  >
                    <div className="lesson-info">
                      <span className={`lesson-type-small lesson-type-${lesson.tipo}`}>
                        {lesson.tipo.charAt(0).toUpperCase()}
                      </span>
                      <span className="lesson-title">{lesson.titulo}</span>
                      {lesson.duracion > 0 && (
                        <span className="lesson-duration-small">{lesson.duracion}min</span>
                      )}
                    </div>
                    {getLessonProgress(lesson.id) && (
                      <span className="completion-check">✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="course-content">
        {selectedLesson ? (
          renderLessonContent(selectedLesson)
        ) : (
          <div className="select-lesson">
            <h2>Selecciona una lección</h2>
            <p>Elige una lección del menú lateral para comenzar a estudiar.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseViewer;