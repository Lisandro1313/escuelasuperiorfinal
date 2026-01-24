import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import ActivityLogs from './ActivityLogs';
import CourseManagement from '../CourseManagement';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  totalCertificates: number;
  monthlyRevenue: number;
  newUsersThisMonth: number;
}

interface User {
  id: number;
  nombre: string;
  email: string;
  tipo: 'estudiante' | 'profesor' | 'admin';
  fechaRegistro: string;
  activo: boolean;
}

interface Payment {
  id: number;
  usuario: string;
  curso: string;
  monto: number;
  fecha: string;
  estado: string;
}

type TabType = 'dashboard' | 'users' | 'courses' | 'payments' | 'activity' | 'system';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedTab, setSelectedTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsResponse, usersResponse] = await Promise.all([
        api.get('/admin/stats').catch(() => ({ data: getDefaultStats() })),
        api.get('/users').catch(() => ({ data: [] }))
      ]);
      
      setStats(statsResponse.data);
      setUsers(usersResponse.data);

      // Fetch payments if on payments tab
      if (selectedTab === 'payments') {
        const paymentsResponse = await api.get('/payments').catch(() => ({ data: [] }));
        setPayments(paymentsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultStats = (): SystemStats => ({
    totalUsers: 0,
    activeUsers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalRevenue: 0,
    totalCertificates: 0,
    monthlyRevenue: 0,
    newUsersThisMonth: 0
  });

  const toggleUserStatus = async (userId: number) => {
    try {
      await api.patch(`/admin/users/${userId}/toggle-status`);
      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const deleteUser = async (userId: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      try {
        await api.delete(`/admin/users/${userId}`);
        await fetchData(); // Refresh data
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error al eliminar usuario');
      }
    }
  };

  const changeUserRole = async (userId: number, newRole: string) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { tipo: newRole });
      await fetchData();
    } catch (error) {
      console.error('Error changing user role:', error);
      alert('Error al cambiar rol del usuario');
    }
  };

  const filteredUsers = users.filter(user =>
    user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Cargando panel de administración...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-gray-600">Gestiona y supervisa la plataforma Campus Norma</p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setSelectedTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                selectedTab === 'dashboard'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setSelectedTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                selectedTab === 'users'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👥 Usuarios ({users.length})
            </button>
            <button
              onClick={() => setSelectedTab('courses')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                selectedTab === 'courses'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📚 Cursos
            </button>
            <button
              onClick={() => { setSelectedTab('payments'); fetchData(); }}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                selectedTab === 'payments'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💰 Pagos
            </button>
            <button
              onClick={() => setSelectedTab('activity')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                selectedTab === 'activity'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 Actividad
            </button>
            <button
              onClick={() => setSelectedTab('system')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                selectedTab === 'system'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ⚙️ Sistema
            </button>
          </nav>
        </div>

        {/* Dashboard Tab */}
        {selectedTab === 'dashboard' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">👤</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Usuarios</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalUsers}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✅</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Usuarios Activos</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.activeUsers}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">📚</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Cursos</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalCourses}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">🏆</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Certificados</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalCertificates}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Actividad Reciente</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="text-green-600">✅</span>
                    <span className="ml-2 text-sm text-gray-600">Sistema de registro implementado correctamente</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-blue-600">👥</span>
                    <span className="ml-2 text-sm text-gray-600">Panel de gestión de usuarios activado</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-purple-600">🔧</span>
                    <span className="ml-2 text-sm text-gray-600">Navegación administrativa configurada</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Courses Tab */}
        {selectedTab === 'courses' && (
          <div>
            <CourseManagement />
          </div>
        )}

        {/* Payments Tab */}
        {selectedTab === 'payments' && (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Historial de Pagos</h3>
            </div>
            <div className="p-6">
              {payments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">💳</div>
                  <p className="text-gray-500">No hay pagos registrados aún</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Curso</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.usuario}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.curso}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${payment.monto.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(payment.fecha).toLocaleDateString('es-AR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              payment.estado === 'approved' ? 'bg-green-100 text-green-800' :
                              payment.estado === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {payment.estado === 'approved' ? 'Aprobado' :
                               payment.estado === 'pending' ? 'Pendiente' : 'Rechazado'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {selectedTab === 'activity' && (
          <ActivityLogs />
        )}

        {/* Users Tab */}
        {selectedTab === 'users' && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <input
                type="text"
                placeholder="Buscar usuarios por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Users Table */}
            <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Gestión de Usuarios ({filteredUsers.length})</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha Registro
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.nombre}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={user.tipo}
                            onChange={(e) => changeUserRole(user.id, e.target.value)}
                            disabled={user.tipo === 'admin'}
                            className={`text-xs font-semibold px-3 py-1 rounded-full ${
                              user.tipo === 'admin' ? 'bg-red-100 text-red-800 cursor-not-allowed' :
                              user.tipo === 'profesor' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}
                          >
                            <option value="estudiante">Estudiante</option>
                            <option value="profesor">Profesor</option>
                            {user.tipo === 'admin' && <option value="admin">Admin</option>}
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.fechaRegistro).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => toggleUserStatus(user.id)}
                            className={`mr-2 ${
                              user.activo ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                            }`}
                          >
                            {user.activo ? 'Desactivar' : 'Activar'}
                          </button>
                          {user.tipo !== 'admin' && (
                            <button
                              onClick={() => deleteUser(user.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Eliminar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* System Tab */}
        {selectedTab === 'system' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Configuración del Sistema</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Registro de Usuarios</h4>
                      <p className="text-sm text-gray-500">Permitir nuevos registros en la plataforma</p>
                    </div>
                    <button className="bg-green-600 relative inline-flex shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                      <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"></span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Notificaciones por Email</h4>
                      <p className="text-sm text-gray-500">Enviar notificaciones automáticas por correo</p>
                    </div>
                    <button className="bg-gray-200 relative inline-flex shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                      <span className="translate-x-0 pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"></span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Modo Mantenimiento</h4>
                      <p className="text-sm text-gray-500">Activar modo mantenimiento para la plataforma</p>
                    </div>
                    <button className="bg-gray-200 relative inline-flex shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                      <span className="translate-x-0 pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"></span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Información del Sistema</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Versión</dt>
                    <dd className="mt-1 text-sm text-gray-900">Campus Norma v1.0</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tiempo de actividad</dt>
                    <dd className="mt-1 text-sm text-gray-900">{stats?.systemUptime || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Último reinicio</dt>
                    <dd className="mt-1 text-sm text-gray-900">Hoy, 08:00 AM</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Estado del servidor</dt>
                    <dd className="mt-1 text-sm text-green-600">🟢 Operativo</dd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};