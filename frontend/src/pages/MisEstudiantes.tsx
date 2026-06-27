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
  const [selected, setSelected] = useState<{ id: number; name: string } | null>(null);

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
                    <tr key={r.enrollment_id + '-' + r.course_id} onClick={() => setSelected({ id: r.student_id, name: r.student_name })} className="hover:bg-blue-50 cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.student_name} <span className="text-blue-500 text-xs">· ver ficha</span></div>
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

      {selected && <StudentDetailModal studentId={selected.id} name={selected.name} onClose={() => setSelected(null)} />}
    </div>
  );
};

interface Detail {
  student: { nombre: string; email: string; avatar: string | null; created_at: string };
  courses: { id: number; nombre: string; progress: number; done: number; total: number; enrolled_at: string }[];
  activity: { action_type: string; action_description: string; created_at: string }[];
  lastLogin: string | null;
}

const fechaHora = (iso?: string | null) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return '—'; }
};

const StudentDetailModal: React.FC<{ studentId: number; name: string; onClose: () => void }> = ({ studentId, name, onClose }) => {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/professor/students/${studentId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [studentId]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white p-5 rounded-t-2xl flex items-center justify-between sticky top-0">
          <div className="flex items-center gap-3 min-w-0">
            {data?.student.avatar
              ? <img src={data.student.avatar.startsWith('http') ? data.student.avatar : data.student.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
              : <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">{name[0]?.toUpperCase()}</span>}
            <div className="min-w-0">
              <h3 className="text-lg font-bold truncate">{data?.student.nombre || name}</h3>
              <p className="text-blue-200 text-xs truncate">{data?.student.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/15 hover:bg-white/25 rounded-lg w-8 h-8 shrink-0">✕</button>
        </div>

        <div className="p-5 space-y-5">
          {loading ? <p className="text-center text-gray-500 py-8">Cargando…</p> : !data ? <p className="text-center text-gray-500 py-8">No se pudo cargar.</p> : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Último ingreso</p>
                  <p className="font-semibold text-gray-900 text-sm">{fechaHora(data.lastLogin)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Se registró</p>
                  <p className="font-semibold text-gray-900 text-sm">{fechaHora(data.student.created_at)}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-2">📚 Sus cursos</h4>
                {data.courses.length === 0 ? <p className="text-sm text-gray-400">No está inscripto en tus cursos.</p> : (
                  <div className="space-y-2">
                    {data.courses.map((c) => (
                      <div key={c.id} className="border border-gray-100 rounded-xl p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-gray-900 text-sm truncate">{c.nombre}</p>
                          <span className="text-xs font-semibold text-blue-600 shrink-0">{c.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${c.progress}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{c.done}/{c.total} clases · inscripto {fechaHora(c.enrolled_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-2">🕑 Actividad reciente</h4>
                {data.activity.length === 0 ? <p className="text-sm text-gray-400">Sin actividad registrada.</p> : (
                  <ul className="space-y-1.5">
                    {data.activity.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-gray-300 mt-0.5">•</span>
                        <span className="text-gray-700 flex-1">{a.action_description}</span>
                        <span className="text-gray-400 text-xs whitespace-nowrap">{fechaHora(a.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
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
