import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { StudentDashboard } from '../Student/StudentDashboard';

interface CourseStat {
  id: number;
  nombre: string;
  precio: number;
  publicado: number | boolean;
  imagen?: string;
  categoria?: string;
  students: number;
  revenue_month: number;
  total_sold: number;
}

interface DashboardData {
  stats: { courses: number; published: number; students: number; revenue_month: number };
  courses: CourseStat[];
  next_live_class: {
    id: number;
    title: string;
    start_date: string;
    course_name: string;
    meeting_url: string | null;
  } | null;
}

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

const Dashboard: React.FC = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  // Si es alumno, delega al StudentDashboard existente
  if (usuario?.tipo === 'alumno') return <StudentDashboard />;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewCourse, setShowNewCourse] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/professor/dashboard', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('No se pudo cargar');
      const d = await res.json();
      setData(d);
    } catch (e) {
      setError('No se pudo cargar el panel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Cargando panel...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-600">{error || 'Error'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hola, {usuario?.nombre} 👋</h1>
            <p className="text-gray-600 mt-1">
              {usuario?.tipo === 'admin' ? 'Panel de administración' : 'Panel de profesor'}
            </p>
          </div>
          <button
            onClick={() => setShowNewCourse(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-lg shadow-sm transition flex items-center gap-2"
          >
            <span className="text-xl leading-none">+</span> Nuevo curso
          </button>
        </div>

        {/* 4 metricas reales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard label="Cursos" value={`${data.stats.published}/${data.stats.courses}`} sub="publicados" icon="📚" />
          <MetricCard label="Alumnos totales" value={data.stats.students} sub="inscriptos" icon="👥" />
          <MetricCard label="Ingresos del mes" value={formatARS(data.stats.revenue_month)} sub="acreditados" icon="💰" />
          <MetricCard
            label="Próxima clase en vivo"
            value={data.next_live_class ? new Date(data.next_live_class.start_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '—'}
            sub={data.next_live_class ? data.next_live_class.title : 'sin clases programadas'}
            icon="🔴"
          />
        </div>

        {/* Próxima clase: alerta destacada si la hay */}
        {data.next_live_class && (
          <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm uppercase tracking-wide opacity-90">Próxima clase en vivo</div>
              <div className="text-xl font-bold mt-1">{data.next_live_class.title}</div>
              <div className="text-sm mt-1 opacity-90">
                {data.next_live_class.course_name} · {new Date(data.next_live_class.start_date).toLocaleString('es-AR')}
              </div>
            </div>
            {data.next_live_class.meeting_url && (
              <a
                href={data.next_live_class.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-red-600 hover:bg-gray-100 font-semibold px-5 py-3 rounded-lg whitespace-nowrap"
              >
                Entrar a la sala →
              </a>
            )}
          </div>
        )}

        {/* Mis Cursos: tabla simple con acciones */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Mis cursos</h2>
            <Link to="/courses" className="text-blue-600 hover:underline text-sm font-medium">
              Ver catálogo público →
            </Link>
          </div>

          {data.courses.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="text-5xl mb-3">📚</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Todavía no creaste ningún curso</h3>
              <p className="text-gray-600 mb-6">Empezá creando tu primer curso. Después agregás módulos, lecciones, videos y PDFs.</p>
              <button
                onClick={() => setShowNewCourse(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-lg shadow-sm"
              >
                + Crear mi primer curso
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.courses.map((c) => (
                <div key={c.id} className="px-6 py-5 flex flex-col md:flex-row md:items-center gap-4 hover:bg-gray-50 transition">
                  <div className="text-4xl">{c.imagen || '📚'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">{c.nombre}</h3>
                      {c.publicado ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">publicado</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">borrador</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span>👥 {c.students} alumnos</span>
                      <span>💰 {Number(c.precio) === 0 ? 'GRATIS' : formatARS(Number(c.precio))}</span>
                      {Number(c.precio) > 0 && c.revenue_month > 0 && (
                        <span className="text-green-600 font-medium">+{formatARS(c.revenue_month)} este mes</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Link
                      to={`/course/${c.id}/manage`}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap"
                    >
                      ✏️ Editar contenido
                    </Link>
                    <Link
                      to={`/course/${c.id}`}
                      className="bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 whitespace-nowrap"
                    >
                      👁️ Ver
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Acciones secundarias */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <Link to="/students" className="bg-white border border-gray-200 hover:border-blue-400 hover:shadow-sm rounded-lg p-5 transition">
            <div className="text-3xl mb-2">👥</div>
            <h3 className="font-semibold text-gray-900">Mis estudiantes</h3>
            <p className="text-sm text-gray-600">Quién se inscribió, quién pagó</p>
          </Link>
          <Link to="/profile" className="bg-white border border-gray-200 hover:border-blue-400 hover:shadow-sm rounded-lg p-5 transition">
            <div className="text-3xl mb-2">👤</div>
            <h3 className="font-semibold text-gray-900">Mi perfil</h3>
            <p className="text-sm text-gray-600">Datos, foto, contraseña</p>
          </Link>
          {usuario?.tipo === 'admin' && (
            <Link to="/admin" className="bg-white border border-gray-200 hover:border-blue-400 hover:shadow-sm rounded-lg p-5 transition">
              <div className="text-3xl mb-2">⚙️</div>
              <h3 className="font-semibold text-gray-900">Administración</h3>
              <p className="text-sm text-gray-600">Usuarios, configuración general</p>
            </Link>
          )}
        </div>
      </div>

      {showNewCourse && <NewCourseModal onClose={() => setShowNewCourse(false)} onCreated={fetchDashboard} navigate={navigate} />}
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: React.ReactNode; sub?: string; icon: string }> = ({ label, value, sub, icon }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-xl">{icon}</span>
    </div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    {sub && <div className="text-xs text-gray-500 mt-1 truncate">{sub}</div>}
  </div>
);

const NewCourseModal: React.FC<{
  onClose: () => void;
  onCreated: () => void;
  navigate: (to: string) => void;
}> = ({ onClose, onCreated, navigate }) => {
  const [form, setForm] = useState({ nombre: '', descripcion: '', categoria: 'General', precio: 0, duracion: '', imagen: '📚' });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!form.nombre.trim()) {
      setErr('Poné un nombre al curso');
      return;
    }
    setSubmitting(true);
    setErr('');
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Error');
      const newId = (d.course || d).id;
      onCreated();
      onClose();
      navigate(`/course/${newId}/manage`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Crear nuevo curso</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Nombre del curso *">
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Yoga para principiantes"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </Field>
          <Field label="Descripción corta">
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={3}
              placeholder="¿De qué trata el curso? ¿A quién está dirigido?"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoría">
              <input
                type="text"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              />
            </Field>
            <Field label="Duración">
              <input
                type="text"
                value={form.duracion}
                onChange={(e) => setForm({ ...form, duracion: e.target.value })}
                placeholder="Ej: 6 semanas"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio (ARS)">
              <input
                type="number"
                min={0}
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: Number(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Poné 0 para curso gratuito</p>
            </Field>
            <Field label="Emoji">
              <input
                type="text"
                value={form.imagen}
                onChange={(e) => setForm({ ...form, imagen: e.target.value })}
                maxLength={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-2xl text-center"
              />
            </Field>
          </div>
          {err && <p className="text-red-600 text-sm">{err}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium"
          >
            {submitting ? 'Creando...' : 'Crear curso'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

export default Dashboard;
