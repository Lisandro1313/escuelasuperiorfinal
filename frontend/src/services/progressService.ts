import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface LessonProgress {
  lesson_id: number;
  lesson_title: string;
  completed: boolean;
  completed_at?: string;
  time_spent?: number;
}

export interface ModuleProgress {
  module_id: number;
  module_title: string;
  lessons: LessonProgress[];
  completed_lessons: number;
  total_lessons: number;
  completion_percentage: number;
}

export interface CourseProgress {
  course_id: number;
  course_title: string;
  modules: ModuleProgress[];
  total_lessons: number;
  completed_lessons: number;
  completion_percentage: number;
  last_accessed?: string;
  assignments_completed: number;
  total_assignments: number;
  average_grade?: number;
}

export interface StudentStats {
  total_courses_enrolled: number;
  courses_completed: number;
  courses_in_progress: number;
  total_lessons_completed: number;
  total_time_spent: number;
  average_completion_rate: number;
  assignments_submitted: number;
  assignments_graded: number;
  average_grade: number;
}

/**
 * Marcar una lección como completada
 */
export const markLessonComplete = async (data: {
  course_id: number;
  lesson_id: number;
  time_spent?: number;
}): Promise<{ message: string; progress: any }> => {
  const response = await axios.post(
    `${API_URL}/progress/complete`,
    data,
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Obtener progreso de un curso específico
 */
export const getCourseProgress = async (
  courseId: number
): Promise<CourseProgress> => {
  const response = await axios.get(`${API_URL}/progress/course/${courseId}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Obtener progreso detallado de módulos
 */
export const getModulesProgress = async (
  courseId: number
): Promise<ModuleProgress[]> => {
  const response = await axios.get(
    `${API_URL}/progress/course/${courseId}/modules`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Obtener todo mi progreso (todos los cursos)
 */
export const getMyProgress = async (): Promise<CourseProgress[]> => {
  const response = await axios.get(`${API_URL}/progress/my-progress`, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Obtener mis estadísticas generales
 */
export const getMyStats = async (): Promise<StudentStats> => {
  const response = await axios.get(`${API_URL}/progress/my-stats`, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Obtener progreso de un estudiante (para profesores)
 */
export const getStudentProgress = async (
  studentId: number,
  courseId: number
): Promise<CourseProgress> => {
  const response = await axios.get(
    `${API_URL}/progress/student/${studentId}/course/${courseId}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export default {
  markLessonComplete,
  getCourseProgress,
  getModulesProgress,
  getMyProgress,
  getMyStats,
  getStudentProgress
};
