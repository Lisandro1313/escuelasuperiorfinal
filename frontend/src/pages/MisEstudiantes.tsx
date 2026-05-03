import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface StudentRow {
  enrollment_id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  course_id: number;
  course_name: string;
  course_price: number;
  enrolled_at: string;
  progress: number;
  completed: number | boolean;
}

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

const MisEstudiantes: React.FC = () => {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/professor/my-students', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const courses = Array.from(new Set(rows.map((r) => r.course_id))).map((id) => {
    const row = rows.find((r) => r.course_id === id)!;
    return { id, name: row.course_name };
  });

  const filtered = rows.filter((r) => {
    if (filterCourse !== 'all' && String(r.course_id) !== filterCourse) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.student_name.toLowerCase().includes(q) && !r.student_email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPaid = filtered.reduce((sum, r) => sum + Number(r.course_price || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link to="/dashboard" className="text-blue-600 hover:underline text-sm">← Volver al panel</Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Mis estudiantes</h1>
            <p className="text-gray-600 mt-1">{rows.length} inscripciones en total</p>
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <SummaryCard label="Inscripciones filtradas" value={filtered.length} icon="👥" />
          <SummaryCard label="Estudiantes únicos" value={new Set(filtered.map((r) => r.student_id)).size} icon="👤" />
          <SummaryCard label="Ingresos totales" value={formatARS(totalPaid)} icon="💰" />
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">Todos los cursos</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-gray-500">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">👥</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {rows.length === 0 ? 'Todavía no tenés alumnos' : 'No hay resultados con esos filtros'}
              </h3>
              <p className="text-gray-600">
                {rows.length === 0 ? 'Cuando alguien se inscriba a tus cursos, aparecerá acá.' : 'Probá con otros filtros'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Alumno</th>
                    <th className="px-4 py-3 font-semibold">Curso</th>
                    <th className="px-4 py-3 font-semibold">Inscripción</th>
                    <th className="px-4 py-3 font-semibold">Pago</th>
                    <th className="px-4 py-3 font-semibold">Progreso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((r) => (
                    <tr key={r.enrollment_id + '-' + r.course_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.student_name}</div>
                        <div className="text-gray-500 text-xs">{r.student_email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.course_name}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {new Date(r.enrolled_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        {Number(r.course_price) === 0 ? (
                          <span className="text-gray-500">Gratis</span>
                        ) : (
                          <span className="text-green-600 font-medium">{formatARS(Number(r.course_price))}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[120px]">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, Number(r.progress || 0))}%` }} />
                          </div>
                          <span className="text-gray-600 text-xs">{Math.round(Number(r.progress || 0))}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: React.ReactNode; icon: string }> = ({ label, value, icon }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
    <div className="text-3xl">{icon}</div>
    <div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
    </div>
  </div>
);

export default MisEstudiantes;
