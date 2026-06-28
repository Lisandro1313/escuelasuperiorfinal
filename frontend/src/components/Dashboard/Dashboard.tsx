import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { StudentDashboard } from '../Student/StudentDashboard';
import TeacherAnalytics from './TeacherAnalytics';
import CreateLiveTalkModal from '../LiveTalk/CreateLiveTalkModal';

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

interface ProductItem {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  imagen?: string | null;
  tipo: 'fisico' | 'digital';
  archivo_url?: string | null;
  stock?: number | null;
  whatsapp?: string | null;
  permite_pago_online?: boolean | number;
  permite_whatsapp?: boolean | number;
}

interface LiveClassRow {
  id: number;
  title: string;
  start_date: string;
  end_date?: string;
  precio: number;
  meeting_url?: string | null;
  course_id?: number | null;
  course_name?: string | null;
  reservas: number;
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
  const [showLiveTalk, setShowLiveTalk] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClassRow[]>([]);
  const [editingLive, setEditingLive] = useState<LiveClassRow | null>(null);

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

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      setProducts(res.ok ? await res.json() : []);
    } catch {
      setProducts([]);
    }
  };

  const deleteProduct = async (id: number) => {
    if (!window.confirm('¿Eliminar este producto de la tienda?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) fetchProducts();
    } catch { /* noop */ }
  };

  const deleteCourse = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Eliminar el curso "${nombre}"? Se borran sus módulos, clases e inscripciones. No se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/courses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) fetchDashboard();
      else { const d = await res.json().catch(() => ({})); alert(d.error || 'No se pudo eliminar'); }
    } catch { alert('No se pudo eliminar'); }
  };

  const fetchLiveClasses = async () => {
    try {
      const res = await fetch('/api/live-classes/manage', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setLiveClasses(res.ok ? await res.json() : []);
    } catch {
      setLiveClasses([]);
    }
  };

  const deleteLiveClass = async (id: number, title: string) => {
    if (!window.confirm(`¿Eliminar la clase en vivo "${title}"?`)) return;
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) fetchLiveClasses();
      else { const d = await res.json().catch(() => ({})); alert(d.error || 'No se pudo eliminar'); }
    } catch { alert('No se pudo eliminar'); }
  };

  useEffect(() => { fetchDashboard(); fetchProducts(); fetchLiveClasses(); }, []);

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
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowLiveTalk(true)}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
              >
                🔴 Charla en vivo
              </button>
              <button
                onClick={() => { setEditingProduct(null); setShowNewProduct(true); }}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
              >
                🛍️ Nuevo producto
              </button>
              <button
                onClick={() => setShowNewCourse(true)}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-sm"
              >
                <span className="text-lg leading-none font-bold">+</span> Nuevo curso
              </button>
            </div>
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
          <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-lg shadow-red-100">
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
                  {/* Foto del curso (o emoji de fallback) */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl shrink-0">
                    {c.imagen && c.imagen.startsWith('http') ? (
                      <img src={c.imagen} alt={c.nombre} className="w-full h-full object-cover" />
                    ) : (
                      c.imagen || '📚'
                    )}
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
                    <button
                      onClick={() => deleteCourse(c.id, c.nombre)}
                      className="bg-white hover:bg-red-50 text-red-600 text-sm font-medium px-4 py-2 rounded-lg border border-red-200 whitespace-nowrap transition"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clases en vivo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">🔴 Clases en vivo</h2>
            <button
              onClick={() => { setEditingLive(null); setShowLiveTalk(true); }}
              className="text-sm text-red-600 hover:underline font-medium"
            >
              + Nueva charla
            </button>
          </div>

          {liveClasses.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🔴</div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Todavía no hay clases en vivo</h3>
              <p className="text-gray-500 text-sm mb-5 max-w-sm mx-auto">
                Programá una charla en vivo. Les avisamos a los alumnos y se anotan desde acá.
              </p>
              <button
                onClick={() => { setEditingLive(null); setShowLiveTalk(true); }}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition"
              >
                🔴 Programar charla en vivo
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {liveClasses.map((lc) => {
                const past = lc.end_date ? new Date(lc.end_date) < new Date() : new Date(lc.start_date) < new Date();
                return (
                  <div key={lc.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-2xl shrink-0">🔴</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 truncate">{lc.title}</span>
                        {past && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Finalizada</span>}
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(lc.start_date).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} hs
                        {' · '}{lc.precio > 0 ? formatARS(lc.precio) : 'Gratis'}
                        {lc.course_name ? ` · ${lc.course_name}` : ''}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">👥 {lc.reservas} {lc.reservas === 1 ? 'persona anotada' : 'personas anotadas'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { setEditingLive(lc); setShowLiveTalk(true); }}
                        className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteLiveClass(lc.id, lc.title)}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                      >
                        Borrar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tienda: productos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">🛍️ Tienda</h2>
            <div className="flex items-center gap-4">
              <Link to="/tienda/pedidos" className="text-sm text-blue-600 hover:underline font-medium">
                Ver pedidos →
              </Link>
              <button
                onClick={() => { setEditingProduct(null); setShowNewProduct(true); }}
                className="text-sm text-amber-600 hover:underline font-medium"
              >
                + Producto
              </button>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🛍️</div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Todavía no hay productos</h3>
              <p className="text-gray-500 text-sm mb-5 max-w-sm mx-auto">
                Vendé libros, fotocopias o apuntes digitales. Los alumnos los ven en el Catálogo, pestaña Tienda.
              </p>
              <button
                onClick={() => { setEditingProduct(null); setShowNewProduct(true); }}
                className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition"
              >
                🛍️ Subir mi primer producto
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {products.map((p) => (
                <div key={p.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl shrink-0">
                    {p.imagen && p.imagen.startsWith('http') ? (
                      <img src={p.imagen} alt={p.nombre} className="w-full h-full object-cover" />
                    ) : (p.tipo === 'digital' ? '⬇' : '📦')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 truncate">{p.nombre}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.tipo === 'digital' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                        {p.tipo === 'digital' ? 'Digital' : 'Físico'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {Number(p.precio) > 0 ? formatARS(Number(p.precio)) : 'A consultar'}
                      {p.stock != null && ` · stock: ${p.stock}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setEditingProduct(p); setShowNewProduct(true); }}
                      className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Estadísticas (recaudación, inscripciones, clases en vivo) */}
        <TeacherAnalytics />

        {/* Accesos rápidos */}
        <div className={`grid gap-4 ${usuario?.tipo === 'admin' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {[
            { to: '/students', icon: '👥', title: 'Mis estudiantes', desc: 'Quién se inscribió y quién pagó' },
            { to: '/tienda/pedidos', icon: '🧾', title: 'Pedidos de la tienda', desc: 'Compras a coordinar/entregar' },
            { to: '/ayuda', icon: '❓', title: 'Ayuda', desc: 'Guía paso a paso para usar el campus' },
            { to: '/profile', icon: '👤', title: 'Mi perfil', desc: 'Nombre, foto y contraseña' },
            ...(usuario?.tipo === 'admin' ? [
              { to: '/admin/estadisticas', icon: '📊', title: 'Estadísticas de la web', desc: 'Visitas, visitantes y usuarios' },
              { to: '/admin/users', icon: '🛡️', title: 'Gestión de usuarios', desc: 'Crear profesoras y gestionar cuentas' },
            ] : []),
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

      {showLiveTalk && (
        <CreateLiveTalkModal
          live={editingLive}
          onClose={() => { setShowLiveTalk(false); setEditingLive(null); }}
          onCreated={() => { fetchDashboard(); fetchLiveClasses(); setEditingLive(null); }}
        />
      )}

      {showNewCourse && (
        <NewCourseModal
          onClose={() => setShowNewCourse(false)}
          onCreated={fetchDashboard}
          navigate={navigate}
        />
      )}

      {showNewProduct && (
        <NewProductModal
          product={editingProduct}
          defaultWhatsapp={(usuario as any)?.telefono || ''}
          onClose={() => { setShowNewProduct(false); setEditingProduct(null); }}
          onSaved={() => { setShowNewProduct(false); setEditingProduct(null); fetchProducts(); }}
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
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const uploadImage = async (file: File) => {
    setUploading(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: fd,
      });
      const d = await res.json();
      if (res.ok && d.url) setForm((f) => ({ ...f, imagen: d.url }));
      else setErr(d.error || 'No se pudo subir la imagen');
    } catch {
      setErr('No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  };

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
          <Field label="Foto del curso">
            {form.imagen && form.imagen.startsWith('http') ? (
              <div className="relative">
                <img src={form.imagen} alt="Portada" className="w-full h-36 object-cover rounded-xl border border-gray-200" />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, imagen: '📚' })}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full w-7 h-7 flex items-center justify-center text-gray-600 shadow"
                >
                  ×
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                <span className="text-3xl">🖼️</span>
                <span className="text-sm text-gray-500 mt-1">{uploading ? 'Subiendo...' : 'Subir una foto del curso'}</span>
                <span className="text-xs text-gray-400">JPG o PNG</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
                />
              </label>
            )}
          </Field>
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

/* ─── Modal nuevo/editar producto ─── */
const NewProductModal: React.FC<{
  product: ProductItem | null;
  defaultWhatsapp?: string;
  onClose: () => void;
  onSaved: () => void;
}> = ({ product, defaultWhatsapp = '', onClose, onSaved }) => {
  const editing = !!product;
  const [form, setForm] = useState({
    nombre: product?.nombre || '',
    descripcion: product?.descripcion || '',
    precio: Number(product?.precio || 0),
    tipo: (product?.tipo as 'fisico' | 'digital') || 'fisico',
    imagen: product?.imagen || '',
    archivo_url: product?.archivo_url || '',
    stock: product?.stock != null ? String(product.stock) : '',
    whatsapp: product?.whatsapp || defaultWhatsapp || '',
    permite_pago_online: product ? product.permite_pago_online !== false && product.permite_pago_online !== 0 : true,
    permite_whatsapp: product ? product.permite_whatsapp !== false && product.permite_whatsapp !== 0 : true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [err, setErr] = useState('');

  const upload = async (file: File, setBusy: (b: boolean) => void): Promise<string | null> => {
    setBusy(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: fd,
      });
      const d = await res.json();
      if (res.ok && d.url) return d.url as string;
      setErr(d.error || 'No se pudo subir el archivo');
      return null;
    } catch {
      setErr('No se pudo subir el archivo');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!form.nombre.trim()) { setErr('Poné un nombre al producto'); return; }
    if (form.tipo === 'digital' && !form.archivo_url) { setErr('Subí el archivo descargable (PDF, etc.)'); return; }
    if (!form.permite_pago_online && !form.permite_whatsapp) { setErr('Activá al menos una forma de compra (online o WhatsApp)'); return; }
    setSubmitting(true);
    setErr('');
    try {
      const payload = {
        ...form,
        precio: Number(form.precio) || 0,
        stock: form.stock === '' ? null : Number(form.stock),
        imagen: form.imagen || null,
        archivo_url: form.tipo === 'digital' ? (form.archivo_url || null) : null,
      };
      const res = await fetch(editing ? `/api/products/${product!.id}` : '/api/products', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Error');
      onSaved();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-xl font-bold text-gray-900">{editing ? 'Editar producto' : 'Nuevo producto'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl transition">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Nombre *">
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Libro de Costura Básica"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
          </Field>

          <Field label="Descripción">
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={2}
              placeholder="¿Qué incluye? ¿Para qué sirve?"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition resize-none"
            />
          </Field>

          <Field label="Tipo de producto">
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              {([['fisico', '📦 Físico (libro, fotocopias)'], ['digital', '⬇ Digital (PDF descargable)']] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm({ ...form, tipo: val })}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${form.tipo === val ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio en ARS">
              <input
                type="number"
                min={0}
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: Number(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition"
              />
              <p className="text-xs text-gray-400 mt-1">0 = solo consulta</p>
            </Field>
            <Field label="Stock (opcional)">
              <input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                placeholder="Sin límite"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition"
              />
            </Field>
          </div>

          <Field label="Foto del producto">
            {form.imagen && form.imagen.startsWith('http') ? (
              <div className="relative">
                <img src={form.imagen} alt="Producto" className="w-full h-36 object-cover rounded-xl border border-gray-200" />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, imagen: '' })}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full w-7 h-7 flex items-center justify-center text-gray-600 shadow"
                >
                  ×
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                <span className="text-3xl">🖼️</span>
                <span className="text-sm text-gray-500 mt-1">{uploadingImg ? 'Subiendo...' : 'Subir una foto'}</span>
                <span className="text-xs text-gray-400">JPG o PNG</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await upload(f, setUploadingImg); if (url) setForm((s) => ({ ...s, imagen: url })); } }}
                />
              </label>
            )}
          </Field>

          {form.tipo === 'digital' && (
            <Field label="Archivo descargable *">
              {form.archivo_url ? (
                <div className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl bg-green-50">
                  <span className="text-sm text-green-700 truncate">✓ Archivo cargado</span>
                  <button type="button" onClick={() => setForm({ ...form, archivo_url: '' })} className="text-gray-500 hover:text-red-600 text-sm">Quitar</button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                  <span className="text-2xl">📄</span>
                  <span className="text-sm text-gray-500 mt-1">{uploadingFile ? 'Subiendo...' : 'Subir PDF / archivo'}</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                    className="hidden"
                    onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await upload(f, setUploadingFile); if (url) setForm((s) => ({ ...s, archivo_url: url })); } }}
                  />
                </label>
              )}
              <p className="text-xs text-gray-400 mt-1">El alumno lo descarga después de pagar.</p>
            </Field>
          )}

          <Field label="Formas de compra">
            <div className="space-y-2">
              <label className="flex items-center gap-3 px-4 py-2.5 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={form.permite_pago_online} onChange={(e) => setForm({ ...form, permite_pago_online: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm text-gray-700">🛒 Pago online (MercadoPago)</span>
              </label>
              <label className="flex items-center gap-3 px-4 py-2.5 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={form.permite_whatsapp} onChange={(e) => setForm({ ...form, permite_whatsapp: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm text-gray-700">💬 Consultar por WhatsApp</span>
              </label>
            </div>
          </Field>

          {form.permite_whatsapp && (
            <Field label="Número de WhatsApp">
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="Ej: 549351..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition"
              />
              <p className="text-xs text-gray-400 mt-1">Con código de país y área, sin espacios ni +.</p>
            </Field>
          )}

          {err && <p className="text-red-500 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{err}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting || uploadingImg || uploadingFile}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl font-semibold transition"
          >
            {submitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Publicar producto'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
