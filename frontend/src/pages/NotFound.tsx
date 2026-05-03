import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NotFound: React.FC = () => {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
        <div className="text-6xl mb-4">🤔</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Página no encontrada</h1>
        <p className="text-gray-600 mb-6">
          La dirección que buscás no existe o fue movida.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg"
          >
            {isAuthenticated ? 'Volver al panel' : 'Ir al inicio'}
          </Link>
          <Link
            to="/courses"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-5 py-2.5 rounded-lg"
          >
            Ver cursos
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
