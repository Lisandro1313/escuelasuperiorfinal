import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface AnalyticsData {
  overview: {
    totalStudents: number;
    totalCourses: number;
    totalQuizzes: number;
    averageScore: number;
    completionRate: number;
    activeUsers: number;
  };
  studentEngagement: {
    date: string;
    activeUsers: number;
    videoViews: number;
    quizzesTaken: number;
    filesDownloaded: number;
  }[];
  coursePerformance: {
    courseId: number;
    courseName: string;
    enrollments: number;
    completions: number;
    averageScore: number;
    totalRevenue: number;
  }[];
  userActivity: {
    userId: number;
    userName: string;
    lastActive: string;
    coursesCompleted: number;
    averageScore: number;
    totalTimeSpent: number;
  }[];
  quizAnalytics: {
    quizId: string;
    quizTitle: string;
    attempts: number;
    averageScore: number;
    passRate: number;
    averageTime: number;
  }[];
  revenueData: {
    date: string;
    amount: number;
    transactions: number;
  }[];
}

interface ChartProps {
  data: any[];
  title: string;
  type: 'line' | 'bar' | 'doughnut';
  color?: string;
}

const SimpleChart: React.FC<ChartProps> = ({ data, title, type, color = '#3B82F6' }) => {
  const maxValue = Math.max(...data.map(item => item.value || item.amount || item.activeUsers || 0));

  if (type === 'doughnut') {
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    let currentAngle = 0;
    
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center">
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 42 42" className="w-full h-full">
              {data.map((item, index) => {
                const percentage = (item.value / total) * 100;
                const strokeDasharray = `${percentage} ${100 - percentage}`;
                const strokeDashoffset = 100 - currentAngle;
                const currentColor = item.color || `hsl(${index * 60}, 70%, 50%)`;
                
                currentAngle += percentage;
                
                return (
                  <circle
                    key={index}
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke={currentColor}
                    strokeWidth="3"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transform -rotate-90 origin-center"
                  />
                );
              })}
            </svg>
          </div>
          <div className="ml-6 space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color || `hsl(${index * 60}, 70%, 50%)` }}
                />
                <span className="text-sm text-gray-700">{item.label}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <div className="h-64">
        {type === 'line' ? (
          <div className="relative h-full">
            <svg viewBox="0 0 400 200" className="w-full h-full">
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
                  <stop offset="100%" stopColor={color} stopOpacity="0"/>
                </linearGradient>
              </defs>
              
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map(i => (
                <line
                  key={i}
                  x1="40"
                  y1={40 + i * 32}
                  x2="380"
                  y2={40 + i * 32}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              ))}
              
              {/* Line path */}
              {data.length > 1 && (
                <>
                  <path
                    d={`M ${data.map((item, index) => 
                      `${40 + (index * 340) / (data.length - 1)},${200 - 40 - ((item.value || item.amount || item.activeUsers || 0) / maxValue) * 120}`
                    ).join(' L ')}`}
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M ${data.map((item, index) => 
                      `${40 + (index * 340) / (data.length - 1)},${200 - 40 - ((item.value || item.amount || item.activeUsers || 0) / maxValue) * 120}`
                    ).join(' L ')} L ${40 + ((data.length - 1) * 340) / (data.length - 1)},200 L 40,200 Z`}
                    fill="url(#gradient)"
                  />
                </>
              )}
              
              {/* Data points */}
              {data.map((item, index) => (
                <circle
                  key={index}
                  cx={40 + (index * 340) / (data.length - 1)}
                  cy={200 - 40 - ((item.value || item.amount || item.activeUsers || 0) / maxValue) * 120}
                  r="4"
                  fill={color}
                />
              ))}
            </svg>
          </div>
        ) : (
          <div className="flex items-end justify-between h-full space-x-2">
            {data.map((item, index) => {
              const height = ((item.value || item.amount || item.activeUsers || 0) / maxValue) * 100;
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full rounded-t-md transition-all duration-500 hover:opacity-80"
                    style={{ 
                      height: `${height}%`, 
                      backgroundColor: color,
                      minHeight: '4px'
                    }}
                  />
                  <span className="text-xs text-gray-500 mt-2 text-center">
                    {item.label || item.date}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: string;
  color: string;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ title, value, change, icon, color }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {change !== undefined && (
          <p className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center mt-1`}>
            {change >= 0 ? '↗️' : '↘️'} {Math.abs(change)}%
          </p>
        )}
      </div>
      <div className={`text-4xl ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

const AnalyticsDashboard: React.FC = () => {
  const { usuario } = useAuth();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar datos reales del analytics
    const loadAnalyticsData = async () => {
      setLoading(true);
      
      try {
        // Por ahora iniciamos con datos básicos, más tarde implementaremos API
        const emptyData: AnalyticsData = {
          overview: {
            totalStudents: 0,
            totalCourses: 0,
            totalQuizzes: 0,
            averageScore: 0,
            completionRate: 0,
            activeUsers: 0
          },
          studentEngagement: [],
          coursePerformance: [],
          userActivity: [],
          quizAnalytics: [],
          revenueData: []
        };

        setAnalyticsData(emptyData);
        
        // TODO: Implementar API para cargar analytics reales
        // const response = await fetch('/api/analytics', {
        //   headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        // });
        // if (response.ok) {
        //   const data = await response.json();
        //   setAnalyticsData(data);
        // }
      } catch (error) {
        console.error('Error al cargar analytics:', error);
        setAnalyticsData({
          overview: {
            totalStudents: 0,
            totalCourses: 0,
            totalQuizzes: 0,
            averageScore: 0,
            completionRate: 0,
            activeUsers: 0
          },
          studentEngagement: [],
          coursePerformance: [],
          userActivity: [],
          quizAnalytics: [],
          revenueData: []
        });
      } finally {
        setLoading(false);
      }
    };

    loadAnalyticsData();
  }, [timeRange]);

  if (loading || !analyticsData) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando analytics...</p>
        </div>
      </div>
    );
  }

  const engagementChartData = analyticsData.studentEngagement.map(item => ({
    date: new Date(item.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
    activeUsers: item.activeUsers
  }));

  const revenueChartData = analyticsData.revenueData.map(item => ({
    date: new Date(item.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
    amount: item.amount
  }));

  const courseDistributionData = analyticsData.coursePerformance.slice(0, 5).map((course, index) => ({
    label: course.courseName,
    value: course.enrollments,
    color: `hsl(${index * 72}, 70%, 50%)`
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Analytics 📊</h1>
          <p className="text-gray-600 mt-2">
            Métricas detalladas y insights de tu plataforma educativa
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d' | '1y')}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
            <option value="1y">Último año</option>
          </select>

          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition duration-200">
            📈 Exportar Reporte
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <AnalyticsCard
          title="Estudiantes Totales"
          value={analyticsData.overview.totalStudents.toLocaleString()}
          change={12.5}
          icon="👥"
          color="text-blue-600"
        />
        
        <AnalyticsCard
          title="Cursos Activos"
          value={analyticsData.overview.totalCourses}
          change={8.3}
          icon="📚"
          color="text-green-600"
        />
        
        <AnalyticsCard
          title="Evaluaciones"
          value={analyticsData.overview.totalQuizzes}
          change={15.7}
          icon="📝"
          color="text-purple-600"
        />
        
        <AnalyticsCard
          title="Promedio General"
          value={`${analyticsData.overview.averageScore}%`}
          change={3.2}
          icon="🎯"
          color="text-yellow-600"
        />
        
        <AnalyticsCard
          title="Tasa Completitud"
          value={`${analyticsData.overview.completionRate}%`}
          change={-2.1}
          icon="✅"
          color="text-indigo-600"
        />
        
        <AnalyticsCard
          title="Usuarios Activos"
          value={analyticsData.overview.activeUsers.toLocaleString()}
          change={18.9}
          icon="🔥"
          color="text-red-600"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleChart
          data={engagementChartData}
          title="📈 Engagement de Estudiantes"
          type="line"
          color="#3B82F6"
        />
        
        <SimpleChart
          data={revenueChartData}
          title="💰 Ingresos por Período"
          type="bar"
          color="#10B981"
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SimpleChart
          data={courseDistributionData}
          title="📊 Distribución de Cursos"
          type="doughnut"
        />

        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">🏆 Top Performing Courses</h3>
            <div className="space-y-4">
              {analyticsData.coursePerformance.slice(0, 5).map((course, index) => (
                <div key={course.courseId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{course.courseName}</h4>
                      <p className="text-sm text-gray-600">
                        {course.enrollments} inscritos • {course.completions} completados
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{course.averageScore.toFixed(1)}%</p>
                    <p className="text-sm text-green-600">${course.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quiz Analytics */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">📝 Análisis de Evaluaciones</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-700">Quiz</th>
                  <th className="text-center py-2 font-medium text-gray-700">Intentos</th>
                  <th className="text-center py-2 font-medium text-gray-700">Promedio</th>
                  <th className="text-center py-2 font-medium text-gray-700">Aprobación</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.quizAnalytics.slice(0, 5).map((quiz) => (
                  <tr key={quiz.quizId} className="border-b border-gray-100">
                    <td className="py-3">
                      <div>
                        <p className="font-medium text-gray-900">{quiz.quizTitle}</p>
                        <p className="text-xs text-gray-500">{quiz.averageTime} min promedio</p>
                      </div>
                    </td>
                    <td className="text-center py-3 text-gray-700">{quiz.attempts}</td>
                    <td className="text-center py-3">
                      <span className={`font-medium ${
                        quiz.averageScore >= 80 ? 'text-green-600' : 
                        quiz.averageScore >= 70 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {quiz.averageScore.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-center py-3">
                      <span className={`font-medium ${
                        quiz.passRate >= 80 ? 'text-green-600' : 
                        quiz.passRate >= 70 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {quiz.passRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Students */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">⭐ Estudiantes Destacados</h3>
          <div className="space-y-4">
            {analyticsData.userActivity.slice(0, 5).map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                    index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                    index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                    'bg-gradient-to-r from-blue-400 to-blue-600'
                  }`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : user.userName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.userName}</p>
                    <p className="text-sm text-gray-600">
                      {user.coursesCompleted} cursos • {Math.round(user.totalTimeSpent / 60)}h estudiadas
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{user.averageScore.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">{user.lastActive}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">📱 Métricas de Engagement Detalladas</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {analyticsData.studentEngagement.slice(-1).map((engagement) => (
            <React.Fragment key={engagement.date}>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {engagement.activeUsers.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">👥 Usuarios Activos</p>
                <div className="mt-2 bg-blue-100 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{width: '85%'}}></div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {engagement.videoViews.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">🎥 Videos Vistos</p>
                <div className="mt-2 bg-green-100 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{width: '92%'}}></div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {engagement.quizzesTaken.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">📝 Quizzes Realizados</p>
                <div className="mt-2 bg-purple-100 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{width: '76%'}}></div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {engagement.filesDownloaded.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">📁 Archivos Descargados</p>
                <div className="mt-2 bg-orange-100 rounded-full h-2">
                  <div className="bg-orange-600 h-2 rounded-full" style={{width: '68%'}}></div>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;