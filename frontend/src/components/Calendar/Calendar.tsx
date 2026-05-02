import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: 'class' | 'exam' | 'assignment' | 'meeting';
  courseId: number;
  courseName: string;
  instructor?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
}

const Calendar: React.FC = () => {
  const { usuario } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    type: 'class' as 'class' | 'exam' | 'assignment' | 'meeting',
    courseId: ''
  });
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Cargar eventos reales del usuario
    const loadEvents = async () => {
      if (!usuario) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/events', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const formattedEvents = data.map((event: any) => ({
            id: event.id.toString(),
            title: event.title,
            description: event.description || '',
            date: new Date(event.start_date),
            startTime: new Date(event.start_date).toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            endTime: new Date(event.end_date).toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            type: event.type as 'class' | 'exam' | 'assignment' | 'meeting',
            courseId: event.course_id,
            courseName: event.course_name || '',
            instructor: event.instructor_id,
            status: event.status as 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
          }));
          setEvents(formattedEvents);
        } else {
          console.error('Error al cargar eventos');
        }
      } catch (error) {
        console.error('Error al cargar eventos:', error);
      }
    };

    // Cargar cursos si es profesor
    const loadCourses = async () => {
      if (!usuario || usuario.tipo !== 'profesor') return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/courses', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const userCourses = data.filter((course: any) => course.profesor_id === usuario.id);
          setCourses(userCourses);
        }
      } catch (error) {
        console.error('Error al cargar cursos:', error);
      }
    };

    loadEvents();
    loadCourses();
  }, [usuario]);

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'class': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'exam': return 'bg-red-100 text-red-800 border-red-200';
      case 'assignment': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'meeting': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'class': return '📚';
      case 'exam': return '📝';
      case 'assignment': return '📋';
      case 'meeting': return '👥';
      default: return '📅';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || usuario.tipo !== 'profesor') return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const startDateTime = new Date(`${newEvent.date}T${newEvent.startTime}`);
      const endDateTime = new Date(`${newEvent.date}T${newEvent.endTime}`);

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newEvent.title,
          description: newEvent.description,
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
          type: newEvent.type,
          courseId: newEvent.courseId ? parseInt(newEvent.courseId) : null
        })
      });

      if (response.ok) {
        const createdEvent = await response.json();
        // Agregar el nuevo evento a la lista
        const formattedEvent: CalendarEvent = {
          id: createdEvent.id.toString(),
          title: createdEvent.title,
          description: createdEvent.description || '',
          date: new Date(createdEvent.start_date),
          startTime: new Date(createdEvent.start_date).toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          endTime: new Date(createdEvent.end_date).toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          type: createdEvent.type,
          courseId: createdEvent.course_id,
          courseName: createdEvent.course_name || '',
          instructor: createdEvent.instructor_id,
          status: 'scheduled'
        };
        setEvents([...events, formattedEvent]);
        
        // Resetear formulario
        setNewEvent({
          title: '',
          description: '',
          date: '',
          startTime: '',
          endTime: '',
          type: 'class',
          courseId: ''
        });
        setShowCreateModal(false);
      } else {
        console.error('Error al crear evento');
      }
    } catch (error) {
      console.error('Error al crear evento:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const today = new Date();
    
    const days = [];
    
    // Días del mes anterior (espacios vacíos)
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-gray-200"></div>);
    }
    
    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
      
      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-200 p-1 cursor-pointer hover:bg-gray-50 ${
            isToday ? 'bg-blue-50 border-blue-300' : ''
          } ${isSelected ? 'bg-blue-100 border-blue-400' : ''}`}
          onClick={() => setSelectedDate(date)}
        >
          <div className={`text-sm font-medium mb-1 ${
            isToday ? 'text-blue-600' : 'text-gray-900'
          }`}>
            {day}
          </div>
          
          <div className="space-y-1 overflow-hidden">
            {dayEvents.slice(0, 2).map((event) => (
              <div
                key={event.id}
                className={`text-xs p-1 rounded border ${getEventTypeColor(event.type)} truncate`}
              >
                <span className="mr-1">{getEventTypeIcon(event.type)}</span>
                {event.title}
              </div>
            ))}
            
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500">
                +{dayEvents.length - 2} más
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white shadow rounded-lg mb-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              📅 Calendario de Clases
            </h1>
            <p className="text-gray-600 mt-1">
              Gestiona tus clases, exámenes y tareas
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Botón crear evento (solo profesores) */}
            {usuario?.tipo === 'profesor' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200 flex items-center space-x-2"
              >
                <span>➕</span>
                <span>Crear Evento</span>
              </button>
            )}

            {/* Selector de vista */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {['month', 'week', 'day'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition duration-200 ${
                    viewMode === mode
                      ? 'bg-white text-blue-600 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {mode === 'month' ? 'Mes' : mode === 'week' ? 'Semana' : 'Día'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendario principal */}
        <div className="lg:col-span-3">
          <div className="bg-white shadow rounded-lg">
            {/* Header del calendario */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition duration-200"
                >
                  ←
                </button>
                
                <h2 className="text-xl font-semibold text-gray-900">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition duration-200"
                >
                  →
                </button>
              </div>
              
              <button
                onClick={() => setCurrentDate(new Date())}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
              >
                Hoy
              </button>
            </div>

            {/* Grid del calendario */}
            <div className="p-6">
              {/* Encabezados de días */}
              <div className="grid grid-cols-7 gap-0 mb-2">
                {dayNames.map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-gray-700 py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Días del mes */}
              <div className="grid grid-cols-7 gap-0">
                {renderMonthView()}
              </div>
            </div>
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          {/* Eventos del día seleccionado */}
          {selectedDate && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Eventos del {selectedDate.getDate()} de {monthNames[selectedDate.getMonth()]}
              </h3>
              
              <div className="space-y-3">
                {getEventsForDate(selectedDate).length === 0 ? (
                  <p className="text-gray-500 text-sm">No hay eventos para este día</p>
                ) : (
                  getEventsForDate(selectedDate).map((event) => (
                    <div
                      key={event.id}
                      className={`border rounded-lg p-3 ${getEventTypeColor(event.type)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          <span className="mr-2">{getEventTypeIcon(event.type)}</span>
                          <div>
                            <h4 className="font-medium">{event.title}</h4>
                            <p className="text-sm opacity-80">{event.courseName}</p>
                            <p className="text-xs opacity-70">
                              {event.startTime} - {event.endTime}
                            </p>
                          </div>
                        </div>
                        
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(event.status)}`} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Resumen de eventos próximos */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              📋 Próximos Eventos
            </h3>
            
            <div className="space-y-3">
              {events
                .filter(event => new Date(event.date) >= new Date())
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 5)
                .map((event) => (
                  <div key={event.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg">
                    <span>{getEventTypeIcon(event.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.date).toLocaleDateString()} - {event.startTime}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Leyenda */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              🎨 Leyenda
            </h3>
            
            <div className="space-y-2">
              {[
                { type: 'class', label: 'Clases' },
                { type: 'exam', label: 'Exámenes' },
                { type: 'assignment', label: 'Tareas' },
                { type: 'meeting', label: 'Reuniones' }
              ].map(({ type, label }) => (
                <div key={type} className="flex items-center space-x-2">
                  <span>{getEventTypeIcon(type)}</span>
                  <div className={`w-4 h-4 rounded border ${getEventTypeColor(type)}`} />
                  <span className="text-sm text-gray-700">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal para crear evento */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Crear Nuevo Evento</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  required
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Clase de Matemáticas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Descripción del evento..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="class">📚 Clase</option>
                    <option value="exam">📝 Examen</option>
                    <option value="assignment">📋 Tarea</option>
                    <option value="meeting">👥 Reunión</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora Inicio *
                  </label>
                  <input
                    type="time"
                    required
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora Fin *
                  </label>
                  <input
                    type="time"
                    required
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Curso (Opcional)
                </label>
                <select
                  value={newEvent.courseId}
                  onChange={(e) => setNewEvent({ ...newEvent, courseId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar curso...</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition duration-200 disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Crear Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;