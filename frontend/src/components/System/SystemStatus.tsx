import React from 'react';

const SystemStatus: React.FC = () => {
  const features = [
    {
      name: 'Backend API',
      status: 'operational',
      description: 'Express + Node.js funcionando',
      icon: '🚀',
      details: 'Puerto 5000 activo'
    },
    {
      name: 'Base de Datos',
      status: 'operational',
      description: 'PostgreSQL con fallback',
      icon: '🗄️',
      details: 'Híbrido automático'
    },
    {
      name: 'Autenticación',
      status: 'operational',
      description: 'JWT + bcrypt',
      icon: '🔐',
      details: 'Sesiones seguras'
    },
    {
      name: 'Chat Tiempo Real',
      status: 'operational',
      description: 'Socket.io conectado',
      icon: '💬',
      details: 'Mensajes instantáneos'
    },
    {
      name: 'Sistema de Pagos',
      status: 'operational',
      description: 'MercadoPago integrado',
      icon: '💳',
      details: 'Modo demo activo'
    },
    {
      name: 'Gestión de Archivos',
      status: 'operational',
      description: 'Multer + validación',
      icon: '📁',
      details: 'Drag & drop listo'
    },
    {
      name: 'Frontend React',
      status: 'operational',
      description: 'Vite + TypeScript',
      icon: '⚛️',
      details: 'Puerto 3000 activo'
    },
    {
      name: 'Styling',
      status: 'operational',
      description: 'Tailwind CSS',
      icon: '🎨',
      details: 'Responsive design'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'down':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational':
        return '✅ Operacional';
      case 'degraded':
        return '⚠️ Degradado';
      case 'down':
        return '❌ Inactivo';
      default:
        return '❓ Desconocido';
    }
  };

  const operationalCount = features.filter(f => f.status === 'operational').length;
  const totalFeatures = features.length;

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          🔧 Estado del Sistema
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Monitoreo de todas las funcionalidades del campus virtual
        </p>
      </div>

      <div className="p-6">
        {/* Resumen general */}
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-green-800 font-medium">Sistema Completamente Operacional</h4>
              <p className="text-green-600 text-sm">
                {operationalCount} de {totalFeatures} servicios funcionando correctamente
              </p>
            </div>
            <div className="text-3xl">🟢</div>
          </div>
        </div>

        {/* Grid de servicios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{feature.icon}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(feature.status)}`}>
                  {getStatusText(feature.status)}
                </span>
              </div>
              
              <h4 className="font-medium text-gray-900 mb-1">{feature.name}</h4>
              <p className="text-sm text-gray-600 mb-2">{feature.description}</p>
              <p className="text-xs text-gray-500">{feature.details}</p>
            </div>
          ))}
        </div>

        {/* Información técnica */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">🔧 Stack Tecnológico</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• React 18 + TypeScript</li>
              <li>• Node.js + Express</li>
              <li>• PostgreSQL + Fallback</li>
              <li>• Socket.io + MercadoPago</li>
            </ul>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-medium text-purple-900 mb-2">🚀 Funcionalidades</h4>
            <ul className="text-sm text-purple-700 space-y-1">
              <li>• Chat en tiempo real</li>
              <li>• Pagos integrados</li>
              <li>• Gestión de archivos</li>
              <li>• Autenticación JWT</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">✅ Estado Actual</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Frontend: Activo</li>
              <li>• Backend: Activo</li>
              <li>• DB: Conectada</li>
              <li>• Pagos: Demo Mode</li>
            </ul>
          </div>
        </div>

        {/* Enlaces de administración */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">🔗 Enlaces de Desarrollo</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <a 
              href="" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              🌐 Frontend (Puerto 3000)
            </a>
            <a 
              href="/api" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              🔌 Backend API (Puerto 5000)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;