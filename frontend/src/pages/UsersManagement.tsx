import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast/ToastProvider';

interface UserRow {
  id: number;
  nombre: string;
  email: string;
  tipo: 'alumno' | 'profesor' | 'admin' | string;
  activo: number | boolean;
  created_at: string;
  telefono?: string | null;
}

const UsersManagement: React.FC = () => {
  const { usuario } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'todos' | 'alumno' | 'profesor' | 'admin'>('todos');
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ nombre: '', email: '', password: '', tipo: 'profesor' as 'alumno' | 'profesor' | 'admin' });
  const [newError, setNewError] = useState('');
  const [newSubmitting, setNewSubmitting] = useState(false);

  const token = localStorage.getItem('token');

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (Array.isArray(d)) setUsers(d);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const isAdmin = usuario?.tipo === 'admin';

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewError('');
    if (!newForm.nombre.trim() || !newForm.email.trim() || !newForm.password) {
      setNewError('Completá todos los campos');
      return;
    }
    if (newForm.password.length < 6) {
      setNewError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setNewSubmitting(true);
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...newForm,
          email: newForm.email.trim().toLowerCase(),
          nombre: newForm.nombre.trim(),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Error');
      setShowNew(false);
      setNewForm({ nombre: '', email: '', password: '', tipo: 'profesor' });
      await load();
    } catch (err: any) {
      setNewError(err.message);
    } finally {
      setNewSubmitting(false);
    }
  };

  const changeRole = async (userId: number, newTipo: string) => {
    if (!window.confirm(`¿Confirmás cambiar el rol a "${newTipo}"?`)) return;
    const r = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tipo: newTipo }),
    });
    if (r.ok) {
      toast.success('Rol actualizado');
      load();
    } else {
      const d = await r.json();
      toast.error(d.error || 'Error al cambiar el rol');
    }
  };

  const toggleActive = async (userId: number) => {
    const r = await fetch(`/api/admin/users/${userId}/toggle-status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) {
      toast.success('Estado actualizado');
      load();
    }
  };

  const deleteUser = async (userId: number, nombre: string) => {
    if (!window.confirm(`¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`)) return;
    const r = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) {
      toast.success(`${nombre} fue eliminado`);
      load();
    } else {
      const d = await r.json();
      toast.error(d.error || 'Error al eliminar');
    }
  };

  const filtered = users.filter((u) => {
    if (filterRole !== 'todos' && u.tipo !== filterRole) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!u.nombre.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Solo el administrador puede acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <Link to="/dashboard" className="text-blue-600 hover:underline text-sm">← Volver al panel</Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Gestión de usuarios</h1>
            <p className="text-gray-600 mt-1">{users.length} usuarios en total</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow-sm flex items-center gap-2"
          >
            <span className="text-xl leading-none">+</span> Crear usuario
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <SummaryCard label="Alumnos" value={users.filter((u) => u.tipo === 'alumno').length} icon="🎓" />
          <SummaryCard label="Profesores" value={users.filter((u) => u.tipo === 'profesor').length} icon="👨‍🏫" />
          <SummaryCard label="Administradores" value={users.filter((u) => u.tipo === 'admin').length} icon="🛡️" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col lg:flex-row gap-3">
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['todos', 'alumno', 'profesor', 'admin'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setFilterRole(r)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition capitalize ${
                  filterRole === r ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {r === 'todos' ? 'Todos' : r === 'alumno' ? 'Alumnos' : r === 'profesor' ? 'Profesores' : 'Admins'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-gray-500">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-500">No hay usuarios con esos filtros</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Usuario</th>
                    <th className="px-4 py-3 font-semibold">Rol</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Registro</th>
                    <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{u.nombre}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.tipo}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                          disabled={u.id === usuario?.id}
                          className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
                        >
                          <option value="alumno">Alumno</option>
                          <option value="profesor">Profesor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {u.activo ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Activo</span>
                        ) : (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Inactivo</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {u.created_at && new Date(u.created_at).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => toggleActive(u.id)}
                            disabled={u.id === usuario?.id}
                            className="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                          >
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            onClick={() => deleteUser(u.id, u.nombre)}
                            disabled={u.id === usuario?.id}
                            className="text-xs px-3 py-1.5 border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50"
                          >
                            Eliminar
                          </button>
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

      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Crear usuario</h3>
              <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={create} className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Acá creás cuentas <strong>directamente</strong>, sin que pasen por el registro público. Útil sobre todo para profesores.
              </p>
              <Field label="Tipo de cuenta">
                <select
                  value={newForm.tipo}
                  onChange={(e) => setNewForm({ ...newForm, tipo: e.target.value as any })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                >
                  <option value="profesor">Profesor</option>
                  <option value="alumno">Alumno</option>
                  <option value="admin">Administrador</option>
                </select>
              </Field>
              <Field label="Nombre completo">
                <input
                  type="text"
                  value={newForm.nombre}
                  onChange={(e) => setNewForm({ ...newForm, nombre: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={newForm.email}
                  onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </Field>
              <Field label="Contraseña inicial">
                <input
                  type="text"
                  value={newForm.password}
                  onChange={(e) => setNewForm({ ...newForm, password: e.target.value })}
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">El usuario podrá cambiarla después desde su perfil.</p>
              </Field>

              {newError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{newError}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="flex-1 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={newSubmitting}
                  className="flex-1 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-semibold"
                >
                  {newSubmitting ? 'Creando...' : 'Crear cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: number; icon: string }> = ({ label, value, icon }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
    <div className="text-2xl">{icon}</div>
    <div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
    </div>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

export default UsersManagement;
