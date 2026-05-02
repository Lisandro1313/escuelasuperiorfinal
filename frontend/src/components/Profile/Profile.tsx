import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const Profile: React.FC = () => {
  const { usuario, actualizarUsuario } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    nombre: usuario?.nombre || '',
    email: usuario?.email || '',
    telefono: usuario?.telefono || '',
    biografia: usuario?.biografia || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (usuario) {
      setFormData({
        nombre: usuario.nombre || '',
        email: usuario.email || '',
        telefono: usuario.telefono || '',
        biografia: usuario.biografia || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  }, [usuario]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!usuario) return;

    // Validaciones
    if (!formData.nombre.trim()) {
      setMessage({ type: 'error', text: 'El nombre es obligatorio' });
      return;
    }

    if (!formData.email.trim()) {
      setMessage({ type: 'error', text: 'El email es obligatorio' });
      return;
    }

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      return;
    }

    if (formData.newPassword && !formData.currentPassword) {
      setMessage({ type: 'error', text: 'Debes ingresar tu contraseña actual para cambiarla' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const updateData: any = {
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono,
        biografia: formData.biografia
      };

      // Si se quiere cambiar contraseña
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const updatedUser = await response.json();
        actualizarUsuario(updatedUser);
        setIsEditing(false);
        setMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
        
        // Limpiar campos de contraseña
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Error al actualizar perfil' });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      nombre: usuario?.nombre || '',
      email: usuario?.email || '',
      telefono: usuario?.telefono || '',
      biografia: usuario?.biografia || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setMessage(null);
  };

  if (!usuario) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8">
            <div className="flex items-center">
              <div className="bg-white p-2 rounded-full">
                <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center text-3xl">
                  👤
                </div>
              </div>
              <div className="ml-6">
                <h1 className="text-2xl font-bold text-white">{usuario.nombre}</h1>
                <p className="text-blue-100">{usuario.email}</p>
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                  usuario.tipo === 'profesor' 
                    ? 'bg-green-100 text-green-800' 
                    : usuario.tipo === 'admin'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {usuario.tipo === 'profesor' ? 'Profesor' : 
                   usuario.tipo === 'admin' ? 'Administrador' : 'Estudiante'}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {/* Message */}
            {message && (
              <div className={`mb-6 p-4 rounded-md ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {message.text}
              </div>
            )}

            {/* Edit Button */}
            {!isEditing && (
              <div className="mb-6">
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  ✏️ Editar Perfil
                </button>
              </div>
            )}

            {/* Profile Form */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Información Personal */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Información Personal
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isEditing 
                        ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isEditing 
                        ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Número de teléfono"
                    className={`w-full px-3 py-2 border rounded-md ${
                      isEditing 
                        ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Biografía
                  </label>
                  <textarea
                    name="biografia"
                    value={formData.biografia}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    rows={4}
                    placeholder="Cuéntanos sobre ti..."
                    className={`w-full px-3 py-2 border rounded-md ${
                      isEditing 
                        ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                </div>
              </div>

              {/* Cambiar Contraseña */}
              {isEditing && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Cambiar Contraseña
                  </h2>
                  <p className="text-sm text-gray-600">
                    Deja estos campos vacíos si no quieres cambiar tu contraseña
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña actual
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nueva contraseña
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmar nueva contraseña
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Información de Cuenta (solo lectura) */}
              {!isEditing && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Información de Cuenta
                  </h2>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de usuario
                    </label>
                    <p className="text-gray-900 capitalize">{usuario.tipo}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de registro
                    </label>
                    <p className="text-gray-900">
                      {usuario.fechaRegistro 
                        ? new Date(usuario.fechaRegistro).toLocaleDateString('es-ES') 
                        : 'No disponible'}
                    </p>
                  </div>

                  {usuario.tipo === 'alumno' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cursos completados
                        </label>
                        <p className="text-gray-900">{usuario.cursosCompletados || 0}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Progreso general
                        </label>
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ 
                                width: `${typeof usuario.progreso === 'object' 
                                  ? Object.values(usuario.progreso).reduce((acc, val) => acc + val, 0) / Object.keys(usuario.progreso).length 
                                  : usuario.progreso || 0}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">
                            {typeof usuario.progreso === 'object' 
                              ? Object.values(usuario.progreso).reduce((acc, val) => acc + val, 0) / Object.keys(usuario.progreso).length 
                              : usuario.progreso || 0}%
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="mt-8 flex space-x-4">
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Guardando...' : '💾 Guardar Cambios'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
                >
                  ❌ Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;