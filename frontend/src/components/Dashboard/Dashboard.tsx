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
      setData(await res.json());
    } catch {
      setError('No se pudo cargar el panel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Cargando panel...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-3">{error || 'Error al cargar'}</p>
          <button onClick={fetchDashboard} className="text-blue-600 hover:underline text-sm">Reintentar</button>
        </div>
      </div>
    );
  }

  const metrics = [
    {
      label: 'Cursos publicados',
      value: `${data.stats.published}`,
      sub: `de ${data.stats.courses} total`,
      icon: '📚',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Alumnos inscriptos',
      value: `${data.stats.students}`,
      sub: 'en todos tus cursos',
      icon: '👥',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Ingresos del mes',
      value: formatARS(data.stats.revenue_month),
      sub: 'pagos acreditados',
      icon: '💰',
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Próxima clase en vivo',
      value: data.next_live_class
        ? new Date(data.next_live_class.start_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
        : '—',
      sub: data.next_live_class ? data.next_live_class.title : 'Sin clases programadas',
      icon: '🔴',
      color: 'bg-red-50 text-red-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">
                Hola, {usuario?.nombre?.split(' ')[0]} 👋
              </h1>
              <p className="text-gray-500 mt-1">
                {usuario?.tipo === 'admin' ? 'Panel de administración' : 'Panel de profesora'}
              </p>
            </div>
            <button
              onClick={() => setShowNewCourse(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-sm"
            >
              <span className="text-lg leading-none font-bold">+</span> Nuevo curso
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <div key={m.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${m.color}`}>
                {m.icon}
              </div>
              <p className="text-xs text-gray-500 mb-1">{m.label}</p>
              <p className="text-2xl font-extrabold text-gray-900 leading-tight">{m.value}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Banner clase en vivo */}
        {data.next_live_class && (
          <div className="bg-linear-to-r from-red-500 to-rose-600 text-white rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-lg shadow-red-100">
            <div>
              <p className="text-xs uppercase tracking-widest text-red-200 mb-1">Próxima clase en vivo</p>
              <p className="text-xl font-bold">{data.next_live_class.title}</p>
              <p className="text-sm text-red-100 mt-1">
                {data.next_live_class.course_name} · {new Date(data.next_live_class.start_date).toLocaleString('es-AR')}
              </p>
            </div>
            {data.next_live_class.meeting_url && (
              <a
                href={data.next_live_class.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 bg-white text-red-600 hover:bg-red-50 font-bold px-6 py-3 rounded-xl whitespace-nowrap transition"
              >
                Entrar a la sala →
              </a>
            )}
          </div>
        )}

        {/* Mis cursos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Mis cursos</h2>
            <Link to="/courses" className="text-sm text-blue-600 hover:underline font-medium">
              Ver catálogo →
            </Link>
          </div>

          {data.courses.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">📚</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Todavía no creaste ningún curso</h3>
              <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
                Empezá creando tu primer curso. Después agregás módulos, lecciones y videos.
              </p>
              <button
                onClick={() => setShowNewCourse(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-sm transition"
              >
                + Crear mi primer curso
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.courses.map((c) => (
                <div key={c.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-gray-50/50 transition">
                  {/* Color block en vez de emoji */}
                  <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl shrink-0">
                    {c.imagen || '📚'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 truncate">{c.nombre}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.publicado ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.publicado ? 'Publicado' : 'Borrador'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-400">
                      <span>👥 {c.students} alumnos</span>
                      <span>{Number(c.precio) === 0 ? 'Gratis' : formatARS(Number(c.precio))}</span>
                      {Number(c.precio) > 0 && c.revenue_month > 0 && (
                        <span className="text-green-600 font-medium">+{formatARS(c.revenue_month)} este mes</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link
                      to={`/course/${c.id}/manage`}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap transition"
                    >
                      Editar
                    </Link>
                    <Link
                      to={`/course/${c.id}`}
                      className="bg-white hover:bg-gray-50 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 whitespace-nowrap transition"
                    >
                      Ver
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accesos rápidos */}
        <div className={`grid gap-4 ${usuario?.tipo === 'admin' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {[
            { to: '/students', icon: '👥', title: 'Mis estudiantes', desc: 'Quién se inscribió y quién pagó' },
            { to: '/profile', icon: '👤', title: 'Mi perfil', desc: 'Nombre, foto y contraseña' },
            ...(usuario?.tipo === 'admin' ? [{ to: '/admin/users', icon: '🛡️', title: 'Gestión de usuarios', desc: 'Crear profesoras y gestionar cuentas' }] : []),
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md rounded-2xl p-5 transition"
            >
              <div className="w-10 h-10 bg-gray-50 group-hover:bg-blue-50 rounded-xl flex items-center justify-center text-2xl mb-3 transition">
                {item.icon}
              </div>
              <h3 className="font-bold text-gray-900 mb-0.5">{item.title}</h3>
              <p className="text-sm text-gray-400">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {showNewCourse && (
        <NewCourseModal
          onClose={() => setShowNewCourse(false)}
          onCreated={fetchDashboard}
          navigate={navigate}
        />
      )}
    </div>
  );
};

/* ─── Modal nuevo curso ─── */
const NewCourseModal: React.FC<{
  onClose: () => void;
  onCreated: () => void;
  navigate: (to: string) => void;
}> = ({ onClose, onCreated, navigate }) => {
  const [form, setForm] = useState({ nombre: '', descripcion: '', categoria: 'General', precio: 0, duracion: '', imagen: '📚' });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!form.nombre.trim()) { setErr('Poné un nombre al curso'); return; }
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
      onCreated();
      onClose();
      navigate(`/course/${(d.course || d).id}/manage`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Crear nuevo curso</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl transition">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Nombre del curso *">
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Costura para principiantes"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
          </Field>
          <Field label="Descripción">
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={3}
              placeholder="¿De qué trata el curso? ¿A quién está dirigido?"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition resize-none"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoría">
              <input
                type="text"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition"
              />
            </Field>
            <Field label="Duración">
              <input
                type="text"
                value={form.duracion}
                onChange={(e) => setForm({ ...form, duracion: e.target.value })}
                placeholder="Ej: 6 semanas"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio en ARS">
              <input
                type="number"
                min={0}
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: Number(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition"
              />
              <p className="text-xs text-gray-400 mt-1">Poné 0 para curso gratuito</p>
            </Field>
            <Field label="Emoji o ícono">
              <input
                type="text"
                value={form.imagen}
                onChange={(e) => setForm({ ...form, imagen: e.target.value })}
                maxLength={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition text-2xl text-center"
              />
            </Field>
          </div>
          {err && <p className="text-red-500 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{err}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-semibold transition"
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
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    {children}
  </div>
);

export default Dashboard;
