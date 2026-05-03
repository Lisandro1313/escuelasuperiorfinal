import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Modal "olvidé mi contraseña"
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-blue-600">🎓 Campus Norma</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Iniciar sesión</h1>
          <p className="text-gray-600 text-sm mt-1">Bienvenido de vuelta</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="tucorreo@ejemplo.com"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Contraseña</label>
              <button
                type="button"
                onClick={() => { setForgotOpen(true); setForgotEmail(email); setForgotResult(null); }}
                className="text-sm text-blue-600 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="Tu contraseña"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition shadow-sm"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          ¿No tenés cuenta? <Link to="/register" className="text-blue-600 hover:underline font-medium">Registrate</Link>
        </p>
      </div>

      {/* Modal Olvidé mi contraseña */}
      {forgotOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setForgotOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Recuperar contraseña</h3>
              <button onClick={() => setForgotOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6">
              {forgotResult ? (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg p-3">
                    {forgotResult.msg}
                  </div>
                  {forgotResult.devLink && (
                    <div className="bg-yellow-50 border border-yellow-200 text-sm rounded-lg p-3">
                      <p className="text-yellow-800 mb-2">
                        <strong>Modo desarrollo:</strong> link directo al reset (en producción se envía por email):
                      </p>
                      <a href={forgotResult.devLink} className="text-blue-600 hover:underline break-all text-xs">
                        {forgotResult.devLink}
                      </a>
                    </div>
                  )}
                  <button
                    onClick={() => setForgotOpen(false)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <form onSubmit={sendForgot} className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Ingresá tu email. Te vamos a enviar un link para crear una contraseña nueva.
                  </p>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg"
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
