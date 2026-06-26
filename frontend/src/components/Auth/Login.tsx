import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotResult, setForgotResult] = useState<{ msg: string; devLink?: string } | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const ok = await login(email.trim().toLowerCase(), password);
      if (ok) navigate('/dashboard');
      else setError('Email o contraseña incorrectos.');
    } catch {
      setError('Error de conexión. Probá de nuevo en unos segundos.');
    }
  };

  const sendForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotResult(null);
    setForgotLoading(true);
    try {
      const r = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });
      const d = await r.json();
      setForgotResult({ msg: d.message || 'Listo', devLink: d.dev_reset_link });
    } catch {
      setForgotResult({ msg: 'Error de conexión, probá de nuevo' });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo — brand */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] bg-gradient-to-br from-blue-600 to-indigo-700 px-12 py-10 text-white">
        <Link to="/" className="text-2xl font-bold tracking-tight">Escuela Superior de Formación</Link>
        <div>
          <blockquote className="text-3xl font-semibold leading-snug mb-4">
            "Aprendé a tu ritmo, desde donde estés."
          </blockquote>
          <p className="text-blue-200 text-sm">Cursos en video con profesoras reales.</p>
        </div>
        <p className="text-blue-300 text-xs">© {new Date().getFullYear()} Escuela Superior de Formación</p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <Link to="/" className="lg:hidden block text-xl font-bold text-blue-600 mb-8">
            Escuela Superior de Formación
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mb-1">Bienvenido de vuelta</h1>
          <p className="text-gray-500 mb-8">Ingresá a tu cuenta para continuar aprendiendo</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                placeholder="tucorreo@ejemplo.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                <button
                  type="button"
                  onClick={() => { setForgotOpen(true); setForgotEmail(email); setForgotResult(null); }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  placeholder="Tu contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                >
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition shadow-sm shadow-blue-200 mt-2"
            >
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="text-blue-600 hover:underline font-semibold">
              Registrate gratis
            </Link>
          </p>
        </div>
      </div>

      {/* Modal recuperar contraseña */}
      {forgotOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setForgotOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Recuperar contraseña</h3>
              <button onClick={() => setForgotOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl">&times;</button>
            </div>
            <div className="p-6">
              {forgotResult ? (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl p-4">{forgotResult.msg}</div>
                  {forgotResult.devLink && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-amber-800 text-xs font-medium mb-1">Modo desarrollo — link directo:</p>
                      <a href={forgotResult.devLink} className="text-blue-600 hover:underline break-all text-xs">{forgotResult.devLink}</a>
                    </div>
                  )}
                  <button onClick={() => setForgotOpen(false)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl">Cerrar</button>
                </div>
              ) : (
                <form onSubmit={sendForgot} className="space-y-4">
                  <p className="text-sm text-gray-600">Ingresá tu email y te mandamos un link para resetear tu contraseña.</p>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                    required
                  />
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl"
                  >
                    {forgotLoading ? 'Enviando...' : 'Enviar instrucciones'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
