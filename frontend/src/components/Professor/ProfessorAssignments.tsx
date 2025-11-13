import React, { useState, useEffect } from 'react';
import {
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignmentsByCourse,
  getAssignmentSubmissions,
  gradeSubmission,
  type Assignment,
  type AssignmentSubmission
} from '../../services/assignmentService';

interface Props {
  courseId: number;
}

export const ProfessorAssignments: React.FC<Props> = ({ courseId }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    max_score: 100,
    attachments: null as File | null
  });

  const [gradingData, setGradingData] = useState<{
    submissionId: number | null;
    score: number;
    feedback: string;
  }>({
    submissionId: null,
    score: 0,
    feedback: ''
  });

  useEffect(() => {
    loadAssignments();
  }, [courseId]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const data = await getAssignmentsByCourse(courseId);
      setAssignments(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar tareas');
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async (assignmentId: number) => {
    try {
      setLoading(true);
      const data = await getAssignmentSubmissions(assignmentId);
      setSubmissions(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar entregas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await createAssignment({
        course_id: courseId,
        ...formData
      });
      setIsCreating(false);
      setFormData({
        title: '',
        description: '',
        due_date: '',
        max_score: 100,
        attachments: null
      });
      loadAssignments();
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear tarea');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta tarea?')) return;
    
    try {
      setLoading(true);
      await deleteAssignment(id);
      loadAssignments();
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al eliminar tarea');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingData.submissionId) return;

    try {
      setLoading(true);
      await gradeSubmission(
        gradingData.submissionId,
        gradingData.score,
        gradingData.feedback
      );
      loadSubmissions(selectedAssignment!.id);
      setGradingData({ submissionId: null, score: 0, feedback: '' });
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al calificar');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubmissions = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    loadSubmissions(assignment.id);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Tareas</h2>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {isCreating ? 'Cancelar' : '+ Nueva Tarea'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* FORMULARIO DE CREACIÓN */}
      {isCreating && (
        <form onSubmit={handleCreateAssignment} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Nueva Tarea</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Entrega *
              </label>
              <input
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Puntuación Máxima *
              </label>
              <input
                type="number"
                value={formData.max_score}
                onChange={(e) => setFormData({ ...formData, max_score: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="1"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo Adjunto (opcional)
            </label>
            <input
              type="file"
              onChange={(e) => setFormData({ ...formData, attachments: e.target.files?.[0] || null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear Tarea'}
          </button>
        </form>
      )}

      {/* LISTA DE TAREAS */}
      {!selectedAssignment && (
        <div className="space-y-4">
          {loading && <p className="text-center text-gray-500">Cargando...</p>}
          
          {!loading && assignments.length === 0 && (
            <p className="text-center text-gray-500">No hay tareas creadas</p>
          )}

          {assignments.map((assignment) => (
            <div key={assignment.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">{assignment.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{assignment.description}</p>
                  <div className="mt-2 flex gap-4 text-sm text-gray-500">
                    <span>📅 Vence: {new Date(assignment.due_date).toLocaleString()}</span>
                    <span>📊 Puntos: {assignment.max_score}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewSubmissions(assignment)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                  >
                    Ver Entregas
                  </button>
                  <button
                    onClick={() => handleDeleteAssignment(assignment.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ENTREGAS DE UNA TAREA */}
      {selectedAssignment && (
        <div>
          <button
            onClick={() => {
              setSelectedAssignment(null);
              setSubmissions([]);
            }}
            className="mb-4 text-blue-600 hover:text-blue-800"
          >
            ← Volver a lista de tareas
          </button>

          <h3 className="text-xl font-bold mb-4">
            Entregas de: {selectedAssignment.title}
          </h3>

          <div className="space-y-4">
            {submissions.length === 0 && (
              <p className="text-center text-gray-500">No hay entregas aún</p>
            )}

            {submissions.map((submission) => (
              <div key={submission.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold">{submission.student_name}</p>
                    <p className="text-sm text-gray-500">
                      Entregado: {new Date(submission.submitted_at).toLocaleString()}
                    </p>
                  </div>
                  
                  {submission.score !== null && submission.score !== undefined ? (
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        {submission.score}/{selectedAssignment.max_score}
                      </p>
                      <p className="text-xs text-gray-500">Calificado</p>
                    </div>
                  ) : (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">
                      Pendiente
                    </span>
                  )}
                </div>

                {submission.submission_text && (
                  <p className="text-sm text-gray-700 mb-2">{submission.submission_text}</p>
                )}

                {submission.file_path && (
                  <a
                    href={`http://localhost:5000${submission.file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline block mb-3"
                  >
                    📎 Ver archivo adjunto
                  </a>
                )}

                {submission.feedback && (
                  <div className="mt-2 p-2 bg-blue-50 rounded">
                    <p className="text-sm font-medium text-blue-800">Retroalimentación:</p>
                    <p className="text-sm text-gray-700">{submission.feedback}</p>
                  </div>
                )}

                {/* FORMULARIO DE CALIFICACIÓN */}
                {(submission.score === null || submission.score === undefined) && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setGradingData({ ...gradingData, submissionId: submission.id });
                      handleGradeSubmission(e);
                    }}
                    className="mt-4 pt-4 border-t border-gray-200"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Calificación (0-{selectedAssignment.max_score})
                        </label>
                        <input
                          type="number"
                          value={gradingData.submissionId === submission.id ? gradingData.score : 0}
                          onChange={(e) => setGradingData({
                            submissionId: submission.id,
                            score: parseInt(e.target.value),
                            feedback: gradingData.feedback
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          min="0"
                          max={selectedAssignment.max_score}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Retroalimentación
                        </label>
                        <input
                          type="text"
                          value={gradingData.submissionId === submission.id ? gradingData.feedback : ''}
                          onChange={(e) => setGradingData({
                            submissionId: submission.id,
                            score: gradingData.score,
                            feedback: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="Comentarios para el estudiante"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading || gradingData.submissionId !== submission.id}
                      className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      Calificar
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessorAssignments;
