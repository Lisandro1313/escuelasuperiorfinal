import React from 'react';
import SystemStatus from '../components/System/SystemStatus';
import { useAuth } from '../context/AuthContext';

const AboutSystemPage: React.FC = () => {
  const { usuario } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ℹ️ Sobre el Campus Virtual
          </h1>
          <p className="text-gray-600">
            Información técnica y estado del sistema en tiempo real
          </p>
        </div>

        {/* Estado del Sistema */}
        <div className="mb-8">
          <SystemStatus />
        </div>

        {/* Tarjetas de Acceso Rápido */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">🎯 Sistema en Tiempo Real</h3>
            <p className="text-blue-100 mb-4">
              {usuario?.tipo === 'profesor' 
                ? 'Conectado con tus estudiantes en tiempo real'
                : 'Chat, notificaciones y clases en vivo funcionando'
              }
            </p>
            <button className="bg-white text-blue-600 px-4 py-2 rounded-md hover:bg-gray-100 transition duration-200">
              {usuario?.tipo === 'profesor' ? 'Ver Actividad' : 'Ver Notificaciones'}
            </button>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">📈 Backend Completo</h3>
            <p className="text-green-100 mb-4">
              JWT, Socket.IO, APIs REST y base de datos funcionando
            </p>
            <button className="bg-white text-green-600 px-4 py-2 rounded-md hover:bg-gray-100 transition duration-200">
              Ver Estadísticas
            </button>
          </div>
        </div>

        {/* Grid de Funcionalidades */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { icon: '📚', title: 'Explorar Cursos', desc: 'Descubre nuevos cursos' },
            { icon: '📅', title: 'Calendario', desc: 'Gestiona clases y eventos' },
            { icon: '📁', title: 'Gestión de Archivos', desc: 'Sube y gestiona archivos' },
            { icon: '💬', title: 'Chat en Tiempo Real', desc: 'Conectado y funcionando' },
            { icon: '🎥', title: 'Video Player', desc: 'Reproductor avanzado' },
            { icon: '📝', title: 'Evaluaciones', desc: 'Quizzes y exámenes' },
            { icon: '📊', title: 'Analytics', desc: 'Métricas y reportes' },
            { icon: '🏆', title: 'Certificados', desc: 'Genera y gestiona certificados' },
            { icon: '💬', title: 'Foros', desc: 'Discusiones y comunidad' },
            { icon: '🎮', title: 'Gamificación', desc: 'Logros y clasificaciones' },
            { icon: '💳', title: 'Pagos MercadoPago', desc: 'Sistema integrado' },
          ].map((item, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-200"
            >
              <div className="text-3xl mb-2">{item.icon}</div>
              <h4 className="font-medium text-gray-900 text-sm mb-1">{item.title}</h4>
              <p className="text-xs text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Estado de conexión */}
        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-700">🟢 Conectado al backend en tiempo real</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutSystemPage;
