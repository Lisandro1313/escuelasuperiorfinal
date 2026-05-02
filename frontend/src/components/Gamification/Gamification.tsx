import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'learning' | 'social' | 'completion' | 'streak' | 'special';
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirements: {
    type: 'courses_completed' | 'quiz_score' | 'forum_posts' | 'login_streak' | 'video_hours' | 'certificates';
    target: number;
    current?: number;
  };
  unlockedAt?: Date;
  isUnlocked: boolean;
  progress: number; // 0-100
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  earnedAt: Date;
  category: string;
}

interface UserStats {
  totalPoints: number;
  level: number;
  pointsToNextLevel: number;
  totalPointsForNextLevel: number;
  coursesCompleted: number;
  quizzesTaken: number;
  forumPosts: number;
  videoHoursWatched: number;
  loginStreak: number;
  certificatesEarned: number;
  badges: Badge[];
  achievements: Achievement[];
}

interface GamificationProps {
  userId?: number;
}

const Gamification: React.FC<GamificationProps> = ({ userId }) => {
  const { usuario } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'badges' | 'leaderboard'>('overview');
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    loadUserStats();
  }, [userId]);

  const loadUserStats = async () => {
    setIsLoading(true);
    try {
      // Por ahora iniciamos con datos básicos, más tarde implementaremos API
      const stats: UserStats = {
        totalPoints: 0,
        level: 1,
        pointsToNextLevel: 100,
        totalPointsForNextLevel: 100,
        coursesCompleted: 0,
        quizzesTaken: 0,
        forumPosts: 0,
        videoHoursWatched: 0,
        loginStreak: 0,
        certificatesEarned: 0,
        badges: [],
        achievements: []
      };

      setUserStats(stats);
      
      // TODO: Implementar API para cargar estadísticas reales
      // const response = await fetch('/api/gamification/stats', {
      //   headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      // });
      // if (response.ok) {
      //   const data = await response.json();
      //   setUserStats(data);
      // }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return 'border-gray-300 bg-gray-50';
      case 'rare': return 'border-blue-300 bg-blue-50';
      case 'epic': return 'border-purple-300 bg-purple-50';
      case 'legendary': return 'border-yellow-300 bg-yellow-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getRarityLabel = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return 'Común';
      case 'rare': return 'Raro';
      case 'epic': return 'Épico';
      case 'legendary': return 'Legendario';
      default: return 'Común';
    }
  };

  const getCategoryIcon = (category: Achievement['category']) => {
    switch (category) {
      case 'learning': return '📚';
      case 'social': return '👥';
      case 'completion': return '✅';
      case 'streak': return '🔥';
      case 'special': return '⭐';
      default: return '🎯';
    }
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const filteredAchievements = userStats?.achievements.filter(achievement => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'unlocked' && achievement.isUnlocked) ||
                         (filter === 'locked' && !achievement.isUnlocked);
    
    const matchesCategory = categoryFilter === 'all' || achievement.category === categoryFilter;
    
    return matchesFilter && matchesCategory;
  }) || [];

  const leaderboardData = [
    { rank: 1, name: 'Ana García', points: 2340, level: 15, avatar: '👩‍🎓' },
    { rank: 2, name: 'Carlos López', points: 2100, level: 14, avatar: '👨‍💻' },
    { rank: 3, name: 'María Rodríguez', points: 1890, level: 13, avatar: '👩‍💻' },
    { rank: 4, name: usuario?.nombre || 'Tu Nombre', points: userStats?.totalPoints || 850, level: userStats?.level || 8, avatar: '👤', isCurrentUser: true },
    { rank: 5, name: 'Pedro Sánchez', points: 720, level: 7, avatar: '👨‍🎓' },
    { rank: 6, name: 'Sofía Chen', points: 680, level: 6, avatar: '👩‍🔬' },
    { rank: 7, name: 'Luis Martín', points: 540, level: 5, avatar: '👨‍🔧' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando sistema de gamificación...</p>
        </div>
      </div>
    );
  }

  if (!userStats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-600">Error cargando datos de gamificación</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header con Progreso del Usuario */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-lg p-8 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-3xl">
              👤
            </div>
            
            <div>
              <h1 className="text-3xl font-bold">{usuario?.nombre || 'Usuario'}</h1>
              <p className="text-blue-100 mb-2">Nivel {userStats.level} - {userStats.totalPoints} puntos</p>
              
              {/* Barra de progreso */}
              <div className="w-64 bg-white bg-opacity-20 rounded-full h-3">
                <div 
                  className="bg-yellow-400 h-3 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${((userStats.totalPointsForNextLevel - userStats.pointsToNextLevel) / userStats.totalPointsForNextLevel) * 100}%` 
                  }}
                />
              </div>
              <p className="text-xs text-blue-100 mt-1">
                {userStats.pointsToNextLevel} puntos para el nivel {userStats.level + 1}
              </p>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{userStats.achievements.filter(a => a.isUnlocked).length}</div>
              <div className="text-xs text-blue-100">Logros</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{userStats.badges.length}</div>
              <div className="text-xs text-blue-100">Insignias</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{userStats.loginStreak}</div>
              <div className="text-xs text-blue-100">Racha</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{userStats.coursesCompleted}</div>
              <div className="text-xs text-blue-100">Cursos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navegación de Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200 bg-white rounded-lg shadow">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🎯 Resumen
            </button>
            
            <button
              onClick={() => setActiveTab('achievements')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'achievements'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🏆 Logros ({userStats.achievements.filter(a => a.isUnlocked).length}/{userStats.achievements.length})
            </button>
            
            <button
              onClick={() => setActiveTab('badges')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'badges'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🎖️ Insignias ({userStats.badges.length})
            </button>
            
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'leaderboard'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Ranking
            </button>
          </nav>
        </div>
      </div>

      {/* Contenido de las Tabs */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Estadísticas principales */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📈 Estadísticas de Progreso</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{userStats.coursesCompleted}</div>
                  <div className="text-sm text-gray-600">Cursos Completados</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{userStats.quizzesTaken}</div>
                  <div className="text-sm text-gray-600">Quizzes Realizados</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{userStats.forumPosts}</div>
                  <div className="text-sm text-gray-600">Posts en Foros</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{userStats.videoHoursWatched}h</div>
                  <div className="text-sm text-gray-600">Video Visto</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{userStats.loginStreak}</div>
                  <div className="text-sm text-gray-600">Racha Actual</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{userStats.certificatesEarned}</div>
                  <div className="text-sm text-gray-600">Certificados</div>
                </div>
              </div>
            </div>

            {/* Próximos logros */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🎯 Próximos Logros</h2>
              
              <div className="space-y-4">
                {userStats.achievements
                  .filter(a => !a.isUnlocked)
                  .sort((a, b) => b.progress - a.progress)
                  .slice(0, 3)
                  .map((achievement) => (
                    <div key={achievement.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <span className="text-2xl">{achievement.icon}</span>
                      
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{achievement.title}</h3>
                        <p className="text-sm text-gray-600">{achievement.description}</p>
                        
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{achievement.requirements.current || 0}/{achievement.requirements.target}</span>
                            <span>{Math.round(achievement.progress)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${achievement.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-bold text-purple-600">+{achievement.points}</div>
                        <div className="text-xs text-gray-500">{getRarityLabel(achievement.rarity)}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Sidebar con logros recientes e insignias */}
          <div className="space-y-6">
            {/* Insignias recientes */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🎖️ Insignias Recientes</h3>
              
              <div className="space-y-3">
                {userStats.badges.slice(0, 3).map((badge) => (
                  <div key={badge.id} className="flex items-center space-x-3">
                    <span className="text-xl">{badge.icon}</span>
                    <div>
                      <h4 className="font-medium text-gray-900">{badge.name}</h4>
                      <p className="text-xs text-gray-600">{badge.description}</p>
                      <p className="text-xs text-gray-500">
                        {badge.earnedAt.toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actividad diaria */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Actividad Semanal</h3>
              
              <div className="grid grid-cols-7 gap-1">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => (
                  <div key={index} className="text-center">
                    <div className="text-xs text-gray-600 mb-1">{day}</div>
                    <div className={`w-8 h-8 rounded ${
                      index < userStats.loginStreak 
                        ? 'bg-green-400' 
                        : index === userStats.loginStreak 
                        ? 'bg-yellow-400' 
                        : 'bg-gray-200'
                    }`} />
                  </div>
                ))}
              </div>
              
              <p className="text-sm text-gray-600 mt-3">
                🔥 Racha actual: {userStats.loginStreak} días
              </p>
            </div>

            {/* Motivación */}
            <div className="bg-gradient-to-r from-green-400 to-blue-500 rounded-lg p-6 text-white">
              <h3 className="text-lg font-semibold mb-2">💪 ¡Sigue Así!</h3>
              <p className="text-sm">
                Estás a solo {userStats.pointsToNextLevel} puntos del nivel {userStats.level + 1}. 
                ¡Completa un quiz para ganar puntos extra!
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div>
          {/* Filtros */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex space-x-4">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Todos los logros</option>
                  <option value="unlocked">Desbloqueados</option>
                  <option value="locked">Bloqueados</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Todas las categorías</option>
                  <option value="learning">📚 Aprendizaje</option>
                  <option value="social">👥 Social</option>
                  <option value="completion">✅ Finalización</option>
                  <option value="streak">🔥 Racha</option>
                  <option value="special">⭐ Especial</option>
                </select>
              </div>

              <div className="text-sm text-gray-500">
                {filteredAchievements.length} logro{filteredAchievements.length !== 1 ? 's' : ''} mostrado{filteredAchievements.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Grid de logros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`rounded-lg border-2 p-6 transition duration-200 hover:shadow-lg ${
                  achievement.isUnlocked 
                    ? getRarityColor(achievement.rarity) 
                    : 'border-gray-200 bg-gray-100 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className={`text-4xl ${achievement.isUnlocked ? '' : 'grayscale'}`}>
                    {achievement.icon}
                  </span>
                  
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      achievement.isUnlocked ? 'text-purple-600' : 'text-gray-400'
                    }`}>
                      +{achievement.points}
                    </div>
                    <div className="text-xs text-gray-500">
                      {getRarityLabel(achievement.rarity)}
                    </div>
                  </div>
                </div>

                <h3 className={`text-lg font-semibold mb-2 ${
                  achievement.isUnlocked ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {achievement.title}
                </h3>
                
                <p className={`text-sm mb-4 ${
                  achievement.isUnlocked ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {achievement.description}
                </p>

                {achievement.isUnlocked ? (
                  <div className="flex items-center space-x-2 text-sm text-green-600">
                    <span>✅</span>
                    <span>Desbloqueado el {achievement.unlockedAt?.toLocaleDateString('es-ES')}</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progreso: {achievement.requirements.current || 0}/{achievement.requirements.target}</span>
                      <span>{Math.round(achievement.progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${achievement.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center space-x-2">
                  <span className="text-sm">{getCategoryIcon(achievement.category)}</span>
                  <span className="text-xs text-gray-500 capitalize">
                    {achievement.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'badges' && (
        <div>
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              🎖️ Colección de Insignias
            </h2>
            <p className="text-gray-600">
              Has ganado {userStats.badges.length} insignia{userStats.badges.length !== 1 ? 's' : ''} hasta ahora
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {userStats.badges.map((badge) => (
              <div key={badge.id} className="bg-white rounded-lg shadow p-6 text-center hover:shadow-lg transition duration-200">
                <div className="text-4xl mb-3">{badge.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{badge.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{badge.description}</p>
                
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                  {badge.category}
                </span>
                
                <p className="text-xs text-gray-500 mt-3">
                  Ganada el {badge.earnedAt.toLocaleDateString('es-ES')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">📊 Ranking de Estudiantes</h2>
            <p className="text-gray-600">Tabla de posiciones basada en puntos totales</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Posición
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estudiante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nivel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Puntos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progreso
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaderboardData.map((student) => (
                  <tr 
                    key={student.rank} 
                    className={`${student.isCurrentUser ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                          student.rank === 1 ? 'bg-yellow-100 text-yellow-600' :
                          student.rank === 2 ? 'bg-gray-100 text-gray-600' :
                          student.rank === 3 ? 'bg-orange-100 text-orange-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {student.rank <= 3 ? (
                            student.rank === 1 ? '🥇' :
                            student.rank === 2 ? '🥈' :
                            '🥉'
                          ) : (
                            student.rank
                          )}
                        </div>
                        {student.isCurrentUser && (
                          <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                            Tú
                          </span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-xl mr-3">{student.avatar}</span>
                        <div className={`text-sm font-medium ${
                          student.isCurrentUser ? 'text-purple-900' : 'text-gray-900'
                        }`}>
                          {student.name}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Nivel {student.level}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {student.points.toLocaleString()} pts
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${Math.min((student.points / 3000) * 100, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gamification;