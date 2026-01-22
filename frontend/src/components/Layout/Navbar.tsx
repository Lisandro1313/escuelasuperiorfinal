import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationCenter from '../Notifications/NotificationCenter';

const Navbar: React.FC = () => {
  const { usuario, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const getTipoUsuarioColor = (tipo: string) => {
    switch (tipo) {
      case 'profesor': return 'bg-green-100 text-green-800';
      case 'admin': return 'bg-purple-100 text-purple-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getTipoUsuarioTexto = (tipo: string) => {
    switch (tipo) {
      case 'profesor': return 'Profesor';
      case 'admin': return 'Administrador';
      default: return 'Estudiante';
    }
  };

  return (
    <nav className="bg-white shadow-lg border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-blue-600">
                🎓 Campus Virtual
              </span>
            </Link>
            
            <div className="hidden lg:ml-8 lg:flex lg:space-x-4">
              <Link
                to="/dashboard"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-200"
              >
                Dashboard
              </Link>
              <Link
                to="/courses"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-200"
              >
                📚 {usuario?.tipo === 'profesor' ? 'Mis Cursos' : 'Cursos'}
              </Link>
              <Link
                to="/calendar"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-200"
              >
                � Calendario
              </Link>
              <Link
                to="/evaluations"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-200"
              >
                � Evaluaciones
              </Link>
              <Link
                to="/analytics"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-200"
              >
                📊 Analytics
              </Link>
              
              {/* Dropdown Menú Herramientas */}
              <div className="relative group">
                <button className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-200 flex items-center">
                  🛠️ Más
                  <svg className="ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-1">
                    <Link to="/files" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">📁 Archivos</Link>
                    <Link to="/video-player" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">🎥 Video Player</Link>
                    <Link to="/certificados" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">🏆 Certificados</Link>
                    <Link to="/foros" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">💬 Foros</Link>
                    <Link to="/gamificacion" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">🎮 Gamificación</Link>
                    <Link to="/about-system" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t">ℹ️ Sobre el Sistema</Link>
                    {usuario?.tipo === 'admin' && (
                      <>
                        <Link to="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t">🏛️ Panel Admin</Link>
                        <Link to="/admin/users" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">👥 Gestión Usuarios</Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {usuario?.tipo === 'admin' && (
                <Link
                  to="/admin"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-200"
                >
                  ⚙️ Admin
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <NotificationCenter />
            
            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition duration-200"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  {usuario?.avatar || '👤'}
                </div>
                <div className="hidden md:block text-left">
                  <span className="text-sm font-medium block">{usuario?.nombre}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getTipoUsuarioColor(usuario?.tipo || '')}`}>
                    {getTipoUsuarioTexto(usuario?.tipo || '')}
                  </span>
                </div>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b">
                    <div className="font-medium">{usuario?.nombre}</div>
                    <div className="text-gray-500">{usuario?.email}</div>
                  </div>
                  
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowUserMenu(false)}
                  >
                    👤 Mi Perfil
                  </Link>
                  
                  {usuario?.tipo === 'profesor' && (
                    <>
                      <Link
                        to="/mis-clases"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowUserMenu(false)}
                      >
                        📚 Mis Clases
                      </Link>
                      <Link
                        to="/calendario"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowUserMenu(false)}
                      >
                        📅 Calendario
                      </Link>
                    </>
                  )}
                  
                  {usuario?.tipo === 'alumno' && (
                    <>
                      <Link
                        to="/mi-progreso"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowUserMenu(false)}
                      >
                        📊 Mi Progreso
                      </Link>
                      <Link
                        to="/pagos"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowUserMenu(false)}
                      >
                        💳 Mis Pagos
                      </Link>
                    </>
                  )}
                  
                  <div className="border-t">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      🚪 Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;