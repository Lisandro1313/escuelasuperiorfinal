import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface Course {
  id: number;
  nombre: string;
  descripcion: string;
  profesor: string;
  precio: number;
  imagen?: string;
  categoria?: string;
}

const LandingPage: React.FC = () => {
  const { isAuthenticated, usuario } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/courses')
      .then((r) => r.json())
      .then((data) => setCourses(data || []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  const ctaTo = isAuthenticated
    ? (usuario?.tipo === 'profesor' || usuario?.tipo === 'admin' ? '/dashboard' : '/courses')
    : '/register';
  const ctaLabel = isAuthenticated
    ? (usuario?.tipo === 'profesor' || usuario?.tipo === 'admin' ? 'Ir a mi panel' : 'Ver mis cursos')
    : 'Empezar gratis';

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="px-6 pt-20 pb-16 max-w-5xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6">
          Aprendé con cursos online
          <span className="block text-blue-600 mt-2">de profesores reales</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Inscribite, mirá las clases en video y avanzá a tu ritmo.
          Cursos gratuitos y de pago, todo en un solo lugar.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={ctaTo}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold px-8 py-4 rounded-lg shadow-md hover:shadow-lg transition"
          >
            {ctaLabel}
          </Link>
          <Link
            to="/courses"
            className="inline-block bg-white hover:bg-gray-50 text-gray-800 text-lg font-semibold px-8 py-4 rounded-lg border-2 border-gray-300 transition"
          >
            Ver catálogo
          </Link>
        </div>
        {!isAuthenticated && (
          <p className="mt-6 text-sm text-gray-500">
            ¿Ya tenés cuenta? <Link to="/login" className="text-blue-600 hover:underline font-medium">Iniciar sesión</Link>
          </p>
        )}
      </section>

      {/* Cursos disponibles (datos reales del backend) */}
      <section className="px-6 py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Cursos disponibles</h2>
              <p className="text-gray-600 mt-1">
                {courses.length > 0 ? `${courses.length} cursos publicados` : 'Pronto vamos a tener cursos para vos'}
              </p>
            </div>
            {courses.length > 0 && (
              <Link to="/courses" className="text-blue-600 hover:underline font-medium hidden sm:inline">
                Ver todos →
              </Link>
            )}
          </div>

          {loading ? (
            <div className="text-center text-gray-500 py-12">Cargando...</div>
          ) : courses.length === 0 ? (
            <div className="text-center text-gray-500 py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-lg">Todavía no hay cursos publicados.</p>
              <p className="text-sm mt-2">Si sos profesor, registrate y empezá a publicar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.slice(0, 6).map((c) => (
                <Link
                  key={c.id}
                  to={`/course/${c.id}`}
                  className="bg-white rounded-xl shadow-sm hover:shadow-lg transition p-6 border border-gray-100"
                >
                  <div className="text-5xl mb-3">{c.imagen || '📚'}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{c.nombre}</h3>
                  <p className="text-sm text-gray-500 mb-3">por {c.profesor}</p>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4">{c.descripcion}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{c.categoria || 'General'}</span>
                    <span className={`font-bold ${c.precio === 0 ? 'text-green-600' : 'text-blue-600'}`}>
                      {c.precio === 0 ? 'GRATIS' : `$${c.precio}`}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">¿Cómo funciona?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">1</div>
            <h3 className="font-semibold text-lg text-gray-900 mb-2">Elegí tu curso</h3>
            <p className="text-gray-600 text-sm">
              Mirá el catálogo, leé las descripciones y elegí el que más te interese.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">2</div>
            <h3 className="font-semibold text-lg text-gray-900 mb-2">Inscribite</h3>
            <p className="text-gray-600 text-sm">
              Si es gratis, te sumás al toque. Si tiene precio, pagás con MercadoPago de forma segura.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">3</div>
            <h3 className="font-semibold text-lg text-gray-900 mb-2">Aprendé a tu ritmo</h3>
            <p className="text-gray-600 text-sm">
              Mirá las clases en video cuando puedas, descargá materiales y sumate a las clases en vivo.
            </p>
          </div>
        </div>
      </section>

      {/* CTA para profesores */}
      <section className="px-6 py-16 bg-blue-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Sos profesor?</h2>
          <p className="text-lg md:text-xl text-blue-100 mb-8">
            Subí tu curso, definí el precio y empezá a vender. Nosotros nos encargamos del resto.
          </p>
          <Link
            to={isAuthenticated ? '/dashboard' : '/register'}
            className="inline-block bg-white text-blue-600 hover:bg-gray-100 font-semibold px-8 py-4 rounded-lg shadow-md transition"
          >
            Empezar a enseñar
          </Link>
        </div>
      </section>

      <footer className="px-6 py-8 bg-gray-900 text-gray-400 text-center text-sm">
        Campus Norma · {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default LandingPage;
