import React, { useState, useEffect } from 'react';
import {
  getAssignmentsByCourse,
  submitAssignment,
  getMySubmissions,
  type Assignment,
  type AssignmentSubmission
} from '../../services/assignmentService';

interface Props {
  courseId: number;
}

export const StudentAssignments: React.FC<Props> = ({ courseId }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [mySubmissions, setMySubmissions] = useState<AssignmentSubmission[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [submissionData, setSubmissionData] = useState({
    submission_text: '',
    file: null as File | null
  });

  useEffect(() => {
    loadData();
  }, [courseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assignmentsData, submissionsData] = await Promise.all([
        getAssignmentsByCourse(courseId),
        getMySubmissions()
      ]);
      setAssignments(assignmentsData);
      setMySubmissions(submissionsData);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    try {
      setLoading(true);
      await submitAssignment({
        assignment_id: selectedAssignment.id,
        submission_text: submissionData.submission_text || undefined,
        file: submissionData.file || undefined
      });
      
      setSuccess('¡Tarea entregada exitosamente!');
      setSubmissionData({ submission_text: '', file: null });
      setSelectedAssignment(null);
      loadData();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al entregar tarea');
    } finally {
      setLoading(false);
    }
  };

  const getSubmissionForAssignment = (assignmentId: number) => {
    return mySubmissions.find(s => s.assignment_id === assignmentId);
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const canSubmit = (assignment: Assignment) => {
    const submission = getSubmissionForAssignment(assignment.id);
    return !submission && !isOverdue(assignment.due_date);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Mis Tareas</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      {loading && <p className="text-center text-gray-500">Cargando...</p>}

      {/* FORMULARIO DE ENTREGA */}
      {selectedAssignment && (
        <div className="mb-6 p-6 bg-blue-50 rounded-lg">
          <button
            onClick={() => setSelectedAssignment(null)}
            className="mb-4 text-blue-600 hover:text-blue-800"
          >
            ← Volver
          </button>

          <h3 className="text-xl font-bold mb-2">{selectedAssignment.title}</h3>
          <p className="text-gray-700 mb-4">{selectedAssignment.description}</p>
          
          <div className="flex gap-4 text-sm text-gray-600 mb-6">
            <span>📅 Vence: {new Date(selectedAssignment.due_date).toLocaleString()}</span>
            <span>📊 Puntos: {selectedAssignment.max_score}</span>
          </div>

          <form onSubmit={handleSubmitAssignment}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Respuesta de texto
              </label>
              <textarea
                value={submissionData.submission_text}
                onChange={(e) => setSubmissionData({ ...submissionData, submission_text: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={6}
                placeholder="Escribe tu respuesta aquí..."
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivo adjunto (opcional)
              </label>
              <input
                type="file"
                onChange={(e) => setSubmissionData({ ...submissionData, file: e.target.files?.[0] || null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              {submissionData.file && (
                <p className="mt-2 text-sm text-gray-600">
                  Archivo seleccionado: {submissionData.file.name}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (!submissionData.submission_text && !submissionData.file)}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-semibold"
            >
              {loading ? 'Enviando...' : 'Entregar Tarea'}
            </button>
          </form>
        </div>
      )}

      {/* LISTA DE TAREAS */}
      {!selectedAssignment && (
        <div className="space-y-4">
          {assignments.length === 0 && !loading && (
            <p className="text-center text-gray-500">No hay tareas disponibles</p>
          )}

          {assignments.map((assignment) => {
            const submission = getSubmissionForAssignment(assignment.id);
            const overdue = isOverdue(assignment.due_date);
            const canSubmitTask = canSubmit(assignment);

            return (
              <div
                key={assignment.id}
                className={`p-4 border rounded-lg transition ${
                  submission
                    ? 'border-green-300 bg-green-50'
                    : overdue
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 bg-white hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {assignment.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {assignment.description}
                    </p>
                    
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                      <span className={`${overdue ? 'text-red-600' : 'text-gray-600'}`}>
                        📅 Vence: {new Date(assignment.due_date).toLocaleString()}
                      </span>
                      <span className="text-gray-600">
                        📊 Puntos: {assignment.max_score}
                      </span>
                      
                      {submission && (
                        <>
                          <span className="text-green-600 font-semibold">
                            ✅ Entregado
                          </span>
                          {submission.score !== null && submission.score !== undefined && (
                            <span className="text-blue-600 font-semibold">
                              🎯 Calificación: {submission.score}/{assignment.max_score}
                            </span>
                          )}
                        </>
                      )}
                      
                      {!submission && overdue && (
                        <span className="text-red-600 font-semibold">
                          ⚠️ Vencida
                        </span>
                      )}
                    </div>

                    {submission && submission.feedback && (
                      <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                        <p className="text-sm font-semibold text-blue-800 mb-1">
                          Retroalimentación del profesor:
                        </p>
                        <p className="text-sm text-gray-700">{submission.feedback}</p>
                      </div>
                    )}

                    {submission && submission.submitted_at && (
                      <p className="mt-2 text-xs text-gray-500">
                        Entregado el: {new Date(submission.submitted_at).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="ml-4">
                    {canSubmitTask && (
                      <button
                        onClick={() => setSelectedAssignment(assignment)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        Entregar
                      </button>
                    )}
                    
                    {submission && (
                      <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-3xl">✓</span>
                        </div>
                      </div>
                    )}

                    {!submission && overdue && (
                      <div className="text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-3xl">✗</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;
