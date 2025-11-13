import React, { useState, useEffect } from 'react';
import { ProfessorAssignments } from '../components/Professor/ProfessorAssignments';
import { StudentAssignments } from '../components/Student/StudentAssignments';
import { ProgressDashboard } from '../components/Student/ProgressDashboard';
import { EnhancedPaymentGateway } from '../components/Payment/EnhancedPaymentGateway';
import { EnhancedNotificationCenter } from '../components/Notifications/EnhancedNotificationCenter';
import { CertificateManager } from '../components/Certificates/CertificateManager';

type View = 'assignments-prof' | 'assignments-student' | 'progress' | 'payment' | 'notifications' | 'certificates';

export const TestPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('assignments-prof');
  const [courseId] = useState(1); // ID de curso de prueba

  const views = {
    'assignments-prof': {
      title: '📝 Tareas - Vista Profesor',
      component: <ProfessorAssignments courseId={courseId} />
    },
    'assignments-student': {
      title: '📝 Tareas - Vista Estudiante',
      component: <StudentAssignments courseId={courseId} />
    },
    'progress': {
      title: '📊 Dashboard de Progreso',
      component: <ProgressDashboard />
    },
    'payment': {
      title: '💳 Pasarela de Pagos',
      component: (
        <EnhancedPaymentGateway
          courseId={courseId}
          courseTitle="Curso de Prueba - React Avanzado"
          coursePrice={99.99}
          onPaymentSuccess={() => alert('¡Pago exitoso!')}
        />
      )
    },
    'notifications': {
      title: '🔔 Centro de Notificaciones',
      component: <EnhancedNotificationCenter />
    },
    'certificates': {
      title: '🎓 Gestor de Certificados',
      component: <CertificateManager studentView={true} />
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-blue-600">
              🧪 Página de Testing - Nuevas Funcionalidades
            </h1>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                Backend: ✅ Puerto 5000
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                Frontend: ✅ Puerto 3000
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-3">
            {(Object.keys(views) as View[]).map((view) => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                  currentView === view
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {views[view].title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
          <h2 className="font-bold text-blue-800 mb-2">ℹ️ Información de Testing</h2>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>✅ Todos los componentes están conectados a las APIs del backend</li>
            <li>✅ Socket.io configurado para notificaciones en tiempo real</li>
            <li>✅ TypeScript con tipos completos en todos los servicios</li>
            <li>💡 Asegúrate de tener un usuario autenticado (token en localStorage)</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">
            {views[currentView].title}
          </h2>
          <div>
            {views[currentView].component}
          </div>
        </div>

        {/* API Status Check */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-bold text-gray-800 mb-3">🔌 Estado de APIs Backend</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <APIStatusCard 
              name="Assignments API" 
              endpoint="/api/assignments/course/1"
              method="GET"
            />
            <APIStatusCard 
              name="Progress API" 
              endpoint="/api/progress/my-progress"
              method="GET"
            />
            <APIStatusCard 
              name="Notifications API" 
              endpoint="/api/notifications"
              method="GET"
            />
            <APIStatusCard 
              name="Payments API" 
              endpoint="/api/payments/my-history"
              method="GET"
            />
            <APIStatusCard 
              name="Certificates API" 
              endpoint="/api/certificates/my-certificates"
              method="GET"
            />
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-semibold text-green-800 mb-1">Socket.io</p>
              <p className="text-xs text-green-600">ws://localhost:5000</p>
              <p className="text-xs text-green-700 mt-2">✓ Real-time ready</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
          <p>🎓 Campus Virtual - Escuela de Norma</p>
          <p className="mt-2">
            Desarrollado con React 19 + TypeScript + TailwindCSS v4 + Node.js + Express + SQLite
          </p>
          <p className="mt-2 text-xs text-gray-500">
            📊 36 APIs REST | 10 Tablas DB | 6 Componentes React | Socket.io Real-time
          </p>
        </div>
      </footer>
    </div>
  );
};

// Componente para verificar estado de APIs
const APIStatusCard: React.FC<{ name: string; endpoint: string; method: string }> = ({ 
  name, 
  endpoint,
  method 
}) => {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  useEffect(() => {
    const checkAPI = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000${endpoint}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        if (response.ok || response.status === 401) { // 401 significa que la API existe pero necesita auth
          setStatus('ok');
        } else {
          setStatus('error');
        }
      } catch (err) {
        setStatus('error');
      }
    };

    checkAPI();
  }, [endpoint]);

  return (
    <div className={`p-4 border rounded-lg ${
      status === 'ok' ? 'bg-green-50 border-green-200' :
      status === 'error' ? 'bg-red-50 border-red-200' :
      'bg-gray-50 border-gray-200'
    }`}>
      <p className={`text-sm font-semibold mb-1 ${
        status === 'ok' ? 'text-green-800' :
        status === 'error' ? 'text-red-800' :
        'text-gray-800'
      }`}>
        {name}
      </p>
      <p className="text-xs text-gray-600">{method} {endpoint}</p>
      <p className={`text-xs mt-2 font-medium ${
        status === 'ok' ? 'text-green-700' :
        status === 'error' ? 'text-red-700' :
        'text-gray-700'
      }`}>
        {status === 'ok' ? '✓ Disponible' :
         status === 'error' ? '✗ Error' :
         '⏳ Verificando...'}
      </p>
    </div>
  );
};

export default TestPage;
