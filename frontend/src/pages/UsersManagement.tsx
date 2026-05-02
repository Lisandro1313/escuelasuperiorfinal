import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface User {
  id: number;
  nombre: string;
  email: string;
  tipo: 'alumno' | 'profesor' | 'admin';
  avatar: string;
  activo: boolean;
  fechaRegistro: string;
  ultimaConexion: string;
}

interface UserStats {
  totalUsuarios: number;
  usuariosActivos: number;
  distribucionTipos: {
    alumnos: number;
    profesores: number;
    admins: number;
  };
  registrosPorDia: Array<{
    fecha: string;
    total: number;
    alumnos: number;
    profesores: number;
  }>;
}

const UsersManagement: React.FC = () => {
  const { usuario } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
    loadStats();
  }, []);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        setError('No tienes permisos para ver los usuarios');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  if (usuario?.tipo !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
          <p className="text-gray-600">Solo los administradores pueden acceder a esta página.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="mt-1 text-sm text-gray-600">
            Administra todos los usuarios registrados en el sistema
          </p>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Usuarios</h3>
              <div className="text-3xl font-bold text-blue-600">{stats.totalUsuarios}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Estudiantes</h3>
              <div className="text-3xl font-bold text-green-600">{stats.distribucionTipos.alumnos}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Profesores</h3>
              <div className="text-3xl font-bold text-purple-600">{stats.distribucionTipos.profesores}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Usuarios Activos</h3>
              <div className="text-3xl font-bold text-orange-600">{stats.usuariosActivos}</div>
            </div>
          </div>
        )}

        {/* Información importante */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">📋 Información del Sistema</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• <strong>Almacenamiento:</strong> Los usuarios se guardan en memoria del servidor (reinicia al reiniciar el servidor)</p>
            <p>• <strong>Código de profesor:</strong> NORMA123 (necesario para registrar profesores)</p>
            <p>• <strong>Tipos de usuario:</strong> Alumno, Profesor, Admin</p>
            <p>• <strong>Autenticación:</strong> JWT con bcrypt para contraseñas</p>
          </div>
        </div>

        {/* Lista de usuarios */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Usuarios Registrados ({users.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
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
                    Última Conexión
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{user.avatar}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.nombre}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {user.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.tipo === 'admin' 
                          ? 'bg-red-100 text-red-800'
                          : user.tipo === 'profesor'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.activo 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.fechaRegistro).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.ultimaConexion).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Registros recientes */}
        {stats && stats.registrosPorDia && (
          <div className="mt-8 bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Registros de los Últimos 7 Días
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-7 gap-4">
                {stats.registrosPorDia.map((dia) => (
                  <div key={dia.fecha} className="text-center">
                    <div className="text-xs text-gray-500 mb-2">
                      {new Date(dia.fecha).toLocaleDateString('es-ES', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="bg-blue-100 rounded-lg p-3">
                      <div className="text-lg font-bold text-blue-800">{dia.total}</div>
                      <div className="text-xs text-blue-600">
                        {dia.alumnos}👩‍🎓 {dia.profesores}👨‍🏫
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersManagement;