import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Obtener el token del localStorage
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface Assignment {
  id: number;
  course_id: number;
  title: string;
  description: string;
  due_date: string;
  max_score: number;
  attachments?: string;
  created_at: string;
  course_title?: string;
}

export interface AssignmentSubmission {
  id: number;
  assignment_id: number;
  student_id: number;
  submission_text?: string;
  file_path?: string;
  submitted_at: string;
  score?: number;
  feedback?: string;
  graded_at?: string;
  student_name?: string;
  assignment_title?: string;
}

// ==================== PROFESOR ====================

/**
 * Crear una nueva tarea (solo profesores)
 */
export const createAssignment = async (data: {
  course_id: number;
  title: string;
  description: string;
  due_date: string;
  max_score: number;
  attachments?: File;
}): Promise<Assignment> => {
  const formData = new FormData();
  formData.append('course_id', data.course_id.toString());
  formData.append('title', data.title);
  formData.append('description', data.description);
  formData.append('due_date', data.due_date);
  formData.append('max_score', data.max_score.toString());
  
  if (data.attachments) {
    formData.append('attachments', data.attachments);
  }

  const response = await axios.post(`${API_URL}/assignments`, formData, {
    headers: {
      ...getAuthHeader(),
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

/**
 * Actualizar una tarea existente (solo profesores)
 */
export const updateAssignment = async (
  id: number,
  data: Partial<Assignment>
): Promise<Assignment> => {
  const response = await axios.put(`${API_URL}/assignments/${id}`, data, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Eliminar una tarea (solo profesores)
 */
export const deleteAssignment = async (id: number): Promise<void> => {
  await axios.delete(`${API_URL}/assignments/${id}`, {
    headers: getAuthHeader()
  });
};

/**
 * Obtener entregas de una tarea (solo profesores)
 */
export const getAssignmentSubmissions = async (
  assignmentId: number
): Promise<AssignmentSubmission[]> => {
  const response = await axios.get(
    `${API_URL}/assignments/${assignmentId}/submissions`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Calificar una entrega (solo profesores)
 */
export const gradeSubmission = async (
  submissionId: number,
  score: number,
  feedback?: string
): Promise<AssignmentSubmission> => {
  const response = await axios.put(
    `${API_URL}/assignments/submissions/${submissionId}/grade`,
    { score, feedback },
    { headers: getAuthHeader() }
  );
  return response.data;
};

// ==================== ESTUDIANTE ====================

/**
 * Obtener tareas de un curso
 */
export const getAssignmentsByCourse = async (
  courseId: number
): Promise<Assignment[]> => {
  const response = await axios.get(`${API_URL}/assignments/course/${courseId}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Obtener una tarea específica
 */
export const getAssignmentById = async (id: number): Promise<Assignment> => {
  const response = await axios.get(`${API_URL}/assignments/${id}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Entregar una tarea (estudiantes)
 */
export const submitAssignment = async (data: {
  assignment_id: number;
  submission_text?: string;
  file?: File;
}): Promise<AssignmentSubmission> => {
  const formData = new FormData();
  formData.append('assignment_id', data.assignment_id.toString());
  
  if (data.submission_text) {
    formData.append('submission_text', data.submission_text);
  }
  
  if (data.file) {
    formData.append('file', data.file);
  }

  const response = await axios.post(`${API_URL}/assignments/submit`, formData, {
    headers: {
      ...getAuthHeader(),
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

/**
 * Obtener mis entregas (estudiantes)
 */
export const getMySubmissions = async (): Promise<AssignmentSubmission[]> => {
  const response = await axios.get(`${API_URL}/assignments/my-submissions`, {
    headers: getAuthHeader()
  });
  return response.data;
};

export default {
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignmentSubmissions,
  gradeSubmission,
  getAssignmentsByCourse,
  getAssignmentById,
  submitAssignment,
  getMySubmissions
};
