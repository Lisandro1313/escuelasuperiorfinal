import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RotatingQuote from '../components/Common/RotatingQuote';

const onboardingQuotes = [
  'Planificar tambien es ensenar: ordena la experiencia de aprendizaje.',
  'Una clase clara empieza por objetivos claros.',
  'La educacion no cambia al mundo, cambia a las personas que van a cambiar el mundo. - Paulo Freire',
  'Donde hay una buena pregunta, hay aprendizaje.',
  'Docencia real: acompanar procesos, no solo contenidos.',
];

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ nombre: '', email: '', password: '', confirmPassword: '', tipo: 'alumno', teacherCode: '' });

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.nombre.trim() || !form.email.trim() || !form.password) {
      setError('Completa todos los campos');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Las contrasenas no coinciden');
      return;
    }
    if (form.password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const ok = await register(
        form.email.trim().toLowerCase(),
        form.password,
        form.nombre.trim(),
        form.tipo,
        form.teacherCode.trim() || undefined
      );
      if (ok) navigate('/dashboard');
      else setError('No pudimos crear tu cuenta. Proba con otro email.');
    } catch (err: any) {
      setError(err?.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-blue-600">Campus Norma</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Crear una cuenta</h1>
          <p className="text-gray-600 text-sm mt-1">Sumate y empeza a aprender</p>
          <RotatingQuote quotes={onboardingQuotes} className="mt-4" />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de cuenta</label>
            <select
              name="tipo"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="alumno">Alumno</option>
              <option value="profesor">Docente</option>
            </select>
          </div>

          {form.tipo === 'profesor' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Codigo docente</label>
              <input
                name="teacherCode"
                type="text"
                value={form.teacherCode}
                onChange={onChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="Codigo entregado por administracion"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={onChange}
              autoComplete="name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="Tu nombre y apellido"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              autoComplete="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="tucorreo@ejemplo.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              autoComplete="new-password"
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="Minimo 6 caracteres"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contrasena</label>
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={onChange}
              autoComplete="new-password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="Repeti la contrasena"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition shadow-sm"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Ya tenes cuenta? <Link to="/login" className="text-blue-600 hover:underline font-medium">Inicia sesion</Link>
        </p>

        <p className="text-center text-xs text-gray-400 mt-6">
          Si vas a publicar cursos, pedi al administrador tu codigo docente.
        </p>
      </div>
    </div>
  );
};

export default Register;
