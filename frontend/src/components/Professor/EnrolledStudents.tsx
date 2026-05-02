import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface Student {
  id: number;
  nombre: string;
  email: string;
  enrolled_at: string;
  progress: number;
  completed: boolean;
}

interface CourseWithStudents {
  courseId: number;
  courseName: string;
  students: Student[];
}

const EnrolledStudents: React.FC = () => {
  const { usuario } = useAuth();
  const [coursesWithStudents, setCoursesWithStudents] = useState<CourseWithStudents[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadEnrolledStudents = async () => {
      if (usuario?.tipo !== 'profesor') return;

      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/professor/enrolled-students', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setCoursesWithStudents(data);
        } else {
          setError('Error al cargar estudiantes');
        }
      } catch (error) {
        console.error('Error al cargar estudiantes:', error);
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    loadEnrolledStudents();
  }, [usuario]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando estudiantes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  const totalStudents = coursesWithStudents.reduce((total, course) => total + course.students.length, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Estudiantes Inscriptos</h2>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            Total: {totalStudents} estudiantes
          </div>
        </div>

        {coursesWithStudents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Aún no tienes estudiantes inscriptos en tus cursos</p>
          </div>
        ) : (
          <div className="space-y-6">
            {coursesWithStudents.map((course) => (
              <div key={course.courseId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{course.courseName}</h3>
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                    {course.students.length} estudiantes
                  </span>
                </div>

                {course.students.length === 0 ? (
                  <p className="text-gray-500 text-sm">No hay estudiantes inscriptos en este curso</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estudiante
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha Inscripción
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Progreso
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {course.students.map((student) => (
                          <tr key={student.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                  {student.nombre.charAt(0).toUpperCase()}
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">{student.nombre}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {student.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(student.enrolled_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                  <div 
                                    className={`h-2 rounded-full ${getProgressColor(student.progress)}`}
                                    style={{ width: `${student.progress}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-600">{student.progress}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                student.completed 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {student.completed ? 'Completado' : 'En Progreso'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnrolledStudents;