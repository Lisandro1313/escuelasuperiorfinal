import axios from 'axios';

// Configuración del API - cambia automáticamente entre desarrollo y producción
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Crear instancia de axios con configuración base
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Servicios de autenticación
export const authService = {
  login: async (email: string, password: string) => {
    const response = await api.post('/api/auth/login', { email, password });
    const { user, token } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(user));
    
    return { user, token };
  },

  register: async (email: string, password: string, nombre: string, tipo: string = 'alumno', teacherCode?: string) => {
    const requestData: any = { email, password, nombre, tipo };
    if (teacherCode) {
      requestData.teacherCode = teacherCode;
    }
    
    const response = await api.post('/api/auth/register', requestData);
    const { user, token } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(user));
    
    return { user, token };
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/users/me');
    return response.data;
  }
};

// Servicios de cursos
export const courseService = {
  getAllCourses: async () => {
    const response = await api.get('/api/courses');
    return response.data;
  },

  getCourse: async (id: number) => {
    const response = await api.get(`/api/courses/${id}`);
    return response.data;
  },

  createCourse: async (courseData: any) => {
    const response = await api.post('/api/courses', courseData);
    return response.data;
  },

  enrollCourse: async (id: number) => {
    const response = await api.post(`/api/courses/${id}/enroll`);
    return response.data;
  },

  getCourseClasses: async (id: number) => {
    const response = await api.get(`/api/courses/${id}/classes`);
    return response.data;
  },

  // Gestión de contenido del curso
  getCourseContent: async (id: number) => {
    const response = await api.get(`/api/courses/${id}/content`);
    return response.data;
  },

  publishCourse: async (id: number, publicado: boolean) => {
    const response = await api.put(`/api/courses/${id}/publish`, { publicado });
    return response.data;
  },

  // Módulos
  getModules: async (courseId: number) => {
    const response = await api.get(`/api/courses/${courseId}/modules`);
    return response.data;
  },

  createModule: async (courseId: number, moduleData: any) => {
    const response = await api.post(`/api/courses/${courseId}/modules`, moduleData);
    return response.data;
  },

  updateModule: async (moduleId: number, moduleData: any) => {
    const response = await api.put(`/api/modules/${moduleId}`, moduleData);
    return response.data;
  },

  // Lecciones
  getLessons: async (moduleId: number) => {
    const response = await api.get(`/api/modules/${moduleId}/lessons`);
    return response.data;
  },

  createLesson: async (moduleId: number, lessonData: any) => {
    const response = await api.post(`/api/modules/${moduleId}/lessons`, lessonData);
    return response.data;
  },

  updateLesson: async (lessonId: number, lessonData: any) => {
    const response = await api.put(`/api/lessons/${lessonId}`, lessonData);
    return response.data;
  },

  // Recursos
  addResource: async (lessonId: number, resourceData: any) => {
    const response = await api.post(`/api/lessons/${lessonId}/resources`, resourceData);
    return response.data;
  },

  // Progreso
  markLessonComplete: async (lessonId: number, tiempoVisto?: number) => {
    const response = await api.post(`/api/lessons/${lessonId}/complete`, { tiempoVisto });
    return response.data;
  },

  getCourseProgress: async (courseId: number) => {
    const response = await api.get(`/api/courses/${courseId}/progress`);
    return response.data;
  }
};

// Servicios de clases
export const classService = {
  reserveClass: async (classId: number) => {
    const response = await api.post(`/api/classes/${classId}/reserve`);
    return response.data;
  }
};

// Servicios de archivos
export const fileService = {
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }
};

// Servicio para verificar salud del servidor
export const healthService = {
  checkHealth: async () => {
    const response = await api.get('/api/health');
    return response.data;
  }
};

export default api;