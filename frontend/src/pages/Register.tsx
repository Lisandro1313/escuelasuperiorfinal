import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({ nombre: '', email: '', password: '', confirmPassword: '' });

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    return s;
  })();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.nombre.trim() || !form.email.trim() || !form.password) {
      setError('Completá todos los campos');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      const ok = await register(form.email.trim().toLowerCase(), form.password, form.nombre.trim(), 'alumno');
      if (ok) navigate('/dashboard');
      else setError('No pudimos crear tu cuenta. Probá con otro email.');
    } catch (err: any) {
      setError(err?.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const strengthLabel = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];
  const strengthColor = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo — brand */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] bg-linear-to-br from-indigo-600 to-blue-700 px-12 py-10 text-white">
        <Link to="/" className="text-2xl font-bold tracking-tight">Campus Norma</Link>
        <div>
          <h2 className="text-3xl font-semibold leading-snug mb-4">
            Empezá a aprender hoy, sin costo.
          </h2>
          <ul className="space-y-3 text-blue-100 text-sm">
            {['Clases en video a tu ritmo', 'Acceso desde cualquier dispositivo', 'Certificado al completar el curso'].map(item => (
              <li key={item} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-blue-300 text-xs">© {new Date().getFullYear()} Campus Norma</p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden block text-xl font-bold text-blue-600 mb-8">Campus Norma</Link>

          <h1 className="text-3xl font-bold text-gray-900 mb-1">Crear cuenta gratis</h1>
          <p className="text-gray-500 mb-8">Completá el formulario y empezá ahora</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre completo</label>
              <input
                name="nombre"
                type="text"
                value={form.nombre}
                onChange={onChange}
                autoComplete="name"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                placeholder="Tu nombre y apellido"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                autoComplete="email"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                placeholder="tucorreo@ejemplo.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={onChange}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  placeholder="Mínimo 6 caracteres"
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
              {form.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor[strength] : 'bg-gray-200'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">{strengthLabel[strength]}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar contraseña</label>
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={onChange}
                autoComplete="new-password"
                className={`w-full px-4 py-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 outline-none transition ${
                  form.confirmPassword && form.confirmPassword !== form.password
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                    : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                }`}
                placeholder="Repetí la contraseña"
                required
              />
              {form.confirmPassword && form.confirmPassword !== form.password && (
                <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition shadow-sm shadow-blue-200 mt-2"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-semibold">Iniciá sesión</Link>
          </p>
          <p className="text-center text-xs text-gray-400 mt-3">
            ¿Vas a publicar cursos? Pedile al administrador que te asigne una cuenta de profesora.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
