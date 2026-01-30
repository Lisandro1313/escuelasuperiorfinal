import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  type: 'class' | 'exam' | 'deadline' | 'event';
  course_name?: string;
}

const Calendario: React.FC = () => {
  const { usuario } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      // Aquí cargarías eventos reales de la API
      // Por ahora, eventos de ejemplo basados en cursos inscritos
      const response = await api.get('/api/enrollments/my-enrollments');
      if (response.data.success) {
        // Generar eventos de ejemplo para los próximos días
        const enrollments = response.data.enrollments || [];
        const generatedEvents: Event[] = [];
        
        enrollments.forEach((enrollment: any, index: number) => {
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + (index * 3));
          
          generatedEvents.push({
            id: index + 1,
            title: `Clase: ${enrollment.course_name}`,
            description: 'Clase programada',
            date: futureDate.toISOString().split('T')[0],
            time: '10:00',
            type: 'class',
            course_name: enrollment.course_name
          });
        });
        
        setEvents(generatedEvents);
      }
    } catch (error) {
      console.error('Error al cargar eventos:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateStr);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const renderCalendar = () => {
    const days = daysInMonth(currentDate);
    const firstDay = firstDayOfMonth(currentDate);
    const calendarDays = [];

    // Días vacíos del mes anterior
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(
        <div key={`empty-${i}`} className="p-2 border border-gray-100 bg-gray-50"></div>
      );
    }

    // Días del mes actual
    for (let day = 1; day <= days; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = selectedDate?.toDateString() === date.toDateString();

      calendarDays.push(
        <div
          key={day}
          onClick={() => setSelectedDate(date)}
          className={`p-2 border border-gray-200 min-h-24 cursor-pointer hover:bg-blue-50 transition-colors ${
            isToday ? 'bg-blue-100' : ''
          } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        >
          <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 2).map((event) => (
              <div
                key={event.id}
                className={`text-xs p-1 rounded truncate ${
                  event.type === 'class' ? 'bg-blue-200 text-blue-800' :
                  event.type === 'exam' ? 'bg-red-200 text-red-800' :
                  event.type === 'deadline' ? 'bg-orange-200 text-orange-800' :
                  'bg-green-200 text-green-800'
                }`}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500">+{dayEvents.length - 2} más</div>
            )}
          </div>
        </div>
      );
    }

    return calendarDays;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'class': return '📚';
      case 'exam': return '📝';
      case 'deadline': return '⏰';
      case 'event': return '🎉';
      default: return '📅';
    }
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando calendario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📅 Calendario</h1>
          <p className="mt-2 text-gray-600">Organiza tus clases y actividades</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendario principal */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              {/* Controles del mes */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={prevMonth}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  ← Anterior
                </button>
                <h2 className="text-xl font-bold text-gray-900">
                  {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  Siguiente →
                </button>
              </div>

              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-0 mb-2">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                  <div key={day} className="text-center text-sm font-semibold text-gray-600 p-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid del calendario */}
              <div className="grid grid-cols-7 gap-0 border-t border-l border-gray-200">
                {renderCalendar()}
              </div>

              {/* Leyenda */}
              <div className="mt-6 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-200 rounded mr-2"></div>
                  <span>Clases</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-200 rounded mr-2"></div>
                  <span>Exámenes</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-orange-200 rounded mr-2"></div>
                  <span>Entregas</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-200 rounded mr-2"></div>
                  <span>Eventos</span>
                </div>
              </div>
            </div>
          </div>

          {/* Panel lateral - Eventos del día seleccionado */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {selectedDate ? (
                  <>
                    📅 {selectedDate.toLocaleDateString('es-ES', { 
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })}
                  </>
                ) : (
                  'Selecciona un día'
                )}
              </h3>

              {selectedDate && selectedDateEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateEvents.map((event) => (
                    <div
                      key={event.id}
                      className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start">
                        <span className="text-2xl mr-3">{getEventIcon(event.type)}</span>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{event.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          <p className="text-sm text-gray-500 mt-2">⏰ {event.time}</p>
                          {event.course_name && (
                            <p className="text-xs text-blue-600 mt-1">📚 {event.course_name}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectedDate ? (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl block mb-2">📭</span>
                  <p>No hay eventos para este día</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <span className="text-4xl block mb-2">👆</span>
                  <p>Haz clic en un día para ver eventos</p>
                </div>
              )}

              {/* Próximos eventos */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">🔜 Próximos eventos</h4>
                <div className="space-y-2">
                  {events.slice(0, 3).map((event) => (
                    <div key={event.id} className="text-sm">
                      <div className="flex items-center">
                        <span className="mr-2">{getEventIcon(event.type)}</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{event.title}</p>
                          <p className="text-gray-500 text-xs">
                            {new Date(event.date).toLocaleDateString('es-ES', { 
                              day: 'numeric',
                              month: 'short'
                            })} • {event.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {events.length === 0 && (
                    <p className="text-gray-500 text-sm">No hay eventos próximos</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendario;
