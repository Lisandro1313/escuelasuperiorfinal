import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CampusStats from '../components/Stats/CampusStats';
import WebStats from '../components/Stats/WebStats';

const Estadisticas: React.FC = () => {
  const { usuario } = useAuth();
  const location = useLocation();
  const isAdmin = usuario?.tipo === 'admin';
  const [tab, setTab] = useState<'campus' | 'web'>(isAdmin && location.hash === '#web' ? 'web' : 'campus');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">← Volver al panel</Link>
          <h1 className="text-3xl font-extrabold text-gray-900 mt-2 mb-1">Estadísticas</h1>
          <p className="text-gray-500">
            {tab === 'campus' ? 'Cursos, recaudación, alumnos y clases en vivo' : 'Visitas, visitantes y crecimiento del sitio'}
          </p>

          {/* Pestañas (la de Web solo para admin) */}
          {isAdmin && (
            <div className="inline-flex mt-6 bg-gray-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setTab('campus')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${tab === 'campus' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >
                🎓 Campus
              </button>
              <button
                onClick={() => setTab('web')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${tab === 'web' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >
                🌐 Web
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tab === 'web' && isAdmin ? <WebStats /> : <CampusStats />}
      </div>
    </div>
  );
};

export default Estadisticas;
