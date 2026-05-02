import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import QuizCreator from '../components/Quiz/QuizCreator';
import QuizTaker from '../components/Quiz/QuizTaker';

interface Quiz {
  id: string;
  title: string;
  description: string;
  courseId: number;
  questions: any[];
  timeLimit: number;
  attempts: number;
  passingScore: number;
  isActive: boolean;
  createdBy: number;
  createdAt: Date;
}

const EvaluationSystemPage: React.FC = () => {
  const { usuario } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'create' | 'take' | 'results'>('dashboard');
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  // Estado con datos reales de la API
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar quizzes del usuario
  useEffect(() => {
    const loadQuizzes = async () => {
      if (!usuario) return;

      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/quizzes', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const formattedQuizzes = data.map((quiz: any) => ({
            id: quiz.id.toString(),
            title: quiz.title,
            description: quiz.description || '',
            courseId: quiz.course_id,
            questions: [], // Se cargarán cuando sea necesario
            timeLimit: quiz.time_limit,
            attempts: quiz.attempts_allowed,
            passingScore: quiz.passing_score,
            isActive: quiz.is_active,
            createdBy: quiz.instructor_id,
            createdAt: new Date(quiz.created_at)
          }));
          setQuizzes(formattedQuizzes);
        } else {
          console.error('Error al cargar quizzes');
        }
      } catch (error) {
        console.error('Error al cargar quizzes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadQuizzes();
  }, [usuario]);

  const getQuizStats = () => {
    const total = quizzes.length;
    const active = quizzes.filter(q => q.isActive).length;
    const myQuizzes = usuario?.tipo === 'profesor' 
      ? quizzes.filter(q => q.createdBy === usuario.id).length
      : quizzes.filter(q => q.isActive).length;
    
    return { total, active, myQuizzes };
  };

  const stats = getQuizStats();

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Evaluaciones</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <div className="text-4xl opacity-80">📊</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Evaluaciones Activas</p>
              <p className="text-3xl font-bold">{stats.active}</p>
            </div>
            <div className="text-4xl opacity-80">✅</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">
                {usuario?.tipo === 'profesor' ? 'Mis Evaluaciones' : 'Disponibles'}
              </p>
              <p className="text-3xl font-bold">{stats.myQuizzes}</p>
            </div>
            <div className="text-4xl opacity-80">
              {usuario?.tipo === 'profesor' ? '👨‍🏫' : '🎯'}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {usuario?.tipo === 'profesor' && (
            <button
              onClick={() => setCurrentView('create')}
              className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-4 transition duration-200 text-left"
            >
              <div className="text-2xl mb-2">📝</div>
              <h3 className="font-medium text-gray-900">Crear Evaluación</h3>
              <p className="text-sm text-gray-600">Diseña un nuevo quiz o examen</p>
            </button>
          )}

          <button
            onClick={() => setCurrentView('take')}
            className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-4 transition duration-200 text-left"
          >
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="font-medium text-gray-900">Tomar Evaluación</h3>
            <p className="text-sm text-gray-600">Realizar un quiz disponible</p>
          </button>

          <button
            onClick={() => setCurrentView('results')}
            className="bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg p-4 transition duration-200 text-left"
          >
            <div className="text-2xl mb-2">📈</div>
            <h3 className="font-medium text-gray-900">Ver Resultados</h3>
            <p className="text-sm text-gray-600">Analiza calificaciones y progreso</p>
          </button>

          <button className="bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg p-4 transition duration-200 text-left">
            <div className="text-2xl mb-2">⚙️</div>
            <h3 className="font-medium text-gray-900">Configuración</h3>
            <p className="text-sm text-gray-600">Ajusta preferencias del sistema</p>
          </button>
        </div>
      </div>

      {/* Recent Quizzes */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {usuario?.tipo === 'profesor' ? 'Mis Evaluaciones Recientes' : 'Evaluaciones Disponibles'}
          </h2>
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            Ver todas →
          </button>
        </div>

        <div className="space-y-4">
          {quizzes
            .filter(quiz => usuario?.tipo === 'profesor' ? quiz.createdBy === usuario.id : quiz.isActive)
            .slice(0, 5)
            .map((quiz) => (
              <div key={quiz.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-gray-900">{quiz.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        quiz.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {quiz.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{quiz.description}</p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>⏱️ {quiz.timeLimit} min</span>
                      <span>🎯 {quiz.passingScore}% mínimo</span>
                      <span>🔄 {quiz.attempts} intentos</span>
                      <span>📅 {quiz.createdAt.toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {usuario?.tipo === 'profesor' ? (
                      <>
                        <button className="text-blue-600 hover:text-blue-800 text-sm">
                          ✏️ Editar
                        </button>
                        <button className="text-green-600 hover:text-green-800 text-sm">
                          📊 Resultados
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedQuizId(quiz.id);
                          setCurrentView('take');
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition duration-200"
                      >
                        🚀 Iniciar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Estadísticas Recientes</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-gray-700">Promedio General</span>
              <span className="text-lg font-bold text-blue-600">85%</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-gray-700">Evaluaciones Aprobadas</span>
              <span className="text-lg font-bold text-green-600">12/15</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-sm text-gray-700">Tiempo Promedio</span>
              <span className="text-lg font-bold text-purple-600">18 min</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Logros Recientes</h3>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl">🥇</div>
              <div>
                <p className="font-medium text-gray-900">Puntuación Perfecta</p>
                <p className="text-sm text-gray-600">Quiz de JavaScript ES6+</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <div className="text-2xl">⚡</div>
              <div>
                <p className="font-medium text-gray-900">Respuesta Rápida</p>
                <p className="text-sm text-gray-600">Completado en tiempo récord</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl">📚</div>
              <div>
                <p className="font-medium text-gray-900">Estudiante Consistente</p>
                <p className="text-sm text-gray-600">5 evaluaciones consecutivas aprobadas</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Sistema de Evaluaciones 📝
        </h1>
        <p className="text-gray-600">
          {currentView === 'dashboard' && 'Gestiona y realiza evaluaciones académicas'}
          {currentView === 'create' && 'Crea nuevas evaluaciones para tus estudiantes'}
          {currentView === 'take' && 'Realiza evaluaciones y demuestra tu conocimiento'}
          {currentView === 'results' && 'Analiza resultados y progreso académico'}
        </p>
      </div>

      <div className="flex items-center space-x-3">
        {currentView !== 'dashboard' && (
          <button
            onClick={() => setCurrentView('dashboard')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition duration-200"
          >
            ← Dashboard
          </button>
        )}

        {usuario?.tipo === 'profesor' && currentView !== 'create' && (
          <button
            onClick={() => setCurrentView('create')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
          >
            📝 Crear Evaluación
          </button>
        )}

        {currentView !== 'take' && (
          <button
            onClick={() => setCurrentView('take')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-200"
          >
            🎯 Tomar Evaluación
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {renderHeader()}

        {currentView === 'dashboard' && renderDashboard()}
        
        {currentView === 'create' && (
          <QuizCreator
            courseId={1}
            onQuizCreated={(quiz) => {
              console.log('Quiz creado:', quiz);
              setCurrentView('dashboard');
            }}
          />
        )}
        
        {currentView === 'take' && (
          <QuizTaker
            quizId={selectedQuizId || '1'}
            onQuizCompleted={(attempt) => {
              console.log('Quiz completado:', attempt);
              // Aquí se podría redirigir a resultados
            }}
          />
        )}
        
        {currentView === 'results' && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Sistema de Resultados
            </h2>
            <p className="text-gray-600 mb-6">
              Esta sección estará disponible próximamente con análisis detallados de resultados.
            </p>
            <button
              onClick={() => setCurrentView('dashboard')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition duration-200"
            >
              Volver al Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EvaluationSystemPage;