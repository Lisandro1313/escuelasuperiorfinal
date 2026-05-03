import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationCenter from '../Notifications/NotificationCenter';

const Navbar: React.FC = () => {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/');
  };

  const isProfesor = usuario?.tipo === 'profesor' || usuario?.tipo === 'admin';

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + nav */}
          <div className="flex items-center gap-8">
            <Link to={usuario ? '/dashboard' : '/'} className="text-xl font-bold text-blue-600">
              🎓 Campus Norma
            </Link>

            {usuario && (
              <div className="hidden md:flex gap-1">
                <NavLink to="/dashboard">Mi panel</NavLink>
                <NavLink to="/courses">{isProfesor ? 'Catálogo' : 'Cursos'}</NavLink>
                {isProfesor && <NavLink to="/students">Estudiantes</NavLink>}
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {!usuario ? (
              <>
                <Link to="/login" className="text-gray-700 hover:text-gray-900 font-medium px-4 py-2">
                  Iniciar sesión
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg"
                >
                  Registrarse
                </Link>
              </>
            ) : (
              <>
                <NotificationCenter />

                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowUserMenu((v) => !v)}
                    className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2 py-1.5 transition"
                  >
                    <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                      {usuario.nombre?.[0]?.toUpperCase() || '👤'}
                    </div>
                    <div className="hidden md:block text-left">
                      <div className="text-sm font-medium text-gray-900 leading-tight">{usuario.nombre}</div>
                      <div className="text-xs text-gray-500 capitalize leading-tight">{usuario.tipo}</div>
                    </div>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <div className="font-medium text-gray-900 truncate">{usuario.nombre}</div>
                        <div className="text-xs text-gray-500 truncate">{usuario.email}</div>
                      </div>

                      <Link
                        to="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Mi perfil
                      </Link>

                      {isProfesor && (
                        <Link
                          to="/students"
                          onClick={() => setShowUserMenu(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 md:hidden"
                        >
                          Mis estudiantes
                        </Link>
                      )}

                      {usuario.tipo === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setShowUserMenu(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Panel admin
                        </Link>
                      )}

                      <div className="border-t border-gray-100 mt-1">
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Cerrar sesión
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

const NavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link
    to={to}
    className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm font-medium transition"
  >
    {children}
  </Link>
);

export default Navbar;
