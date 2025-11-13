import React, { useState, useEffect, useCallback } from 'react';
import {
  connectNotifications,
  disconnectNotifications,
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
  type Notification,
  type NotificationPreferences
} from '../../services/notificationService';

export const EnhancedNotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPreferences, setShowPreferences] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    try {
      const data = await getMyNotifications(50);
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } catch (err: any) {
      console.error('Error loading notifications:', err);
    }
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await getNotificationPreferences();
      setPreferences(prefs);
    } catch (err: any) {
      console.error('Error loading preferences:', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    loadPreferences();

    // Conectar a Socket.io para notificaciones en tiempo real
    const userId = parseInt(localStorage.getItem('userId') || '0');
    const socket = connectNotifications(userId, (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Mostrar notificación del navegador si está permitido
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo.png'
        });
      }
    });

    return () => {
      disconnectNotifications();
    };
  }, [loadNotifications]);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      setError('Error al marcar como leída');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err: any) {
      setError('Error al marcar todas como leídas');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreferences = async (updates: Partial<NotificationPreferences>) => {
    try {
      setLoading(true);
      const updated = await updateNotificationPreferences(updates);
      setPreferences(updated);
      setError('');
    } catch (err: any) {
      setError('Error al actualizar preferencias');
    } finally {
      setLoading(false);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      assignment: '📝',
      grade: '🎯',
      payment: '💳',
      message: '💬',
      reminder: '⏰',
      system: '🔔'
    };
    return icons[type] || '🔔';
  };

  const getNotificationColor = (type: string) => {
    const colors: { [key: string]: string } = {
      assignment: 'bg-blue-100 border-blue-300',
      grade: 'bg-green-100 border-green-300',
      payment: 'bg-purple-100 border-purple-300',
      message: 'bg-yellow-100 border-yellow-300',
      reminder: 'bg-orange-100 border-orange-300',
      system: 'bg-gray-100 border-gray-300'
    };
    return colors[type] || 'bg-gray-100 border-gray-300';
  };

  if (showPreferences && preferences) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto">
        <button
          onClick={() => setShowPreferences(false)}
          className="mb-4 text-blue-600 hover:text-blue-800"
        >
          ← Volver a notificaciones
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-6">⚙️ Preferencias de Notificaciones</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-semibold text-gray-800">Notificaciones del Navegador</p>
              <p className="text-sm text-gray-600">Recibir alertas en el navegador</p>
            </div>
            <button
              onClick={requestNotificationPermission}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              {Notification.permission === 'granted' ? '✓ Activadas' : 'Activar'}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-semibold text-gray-800">Notificaciones por Email</p>
              <p className="text-sm text-gray-600">Recibir resumen diario por correo</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.email_notifications}
                onChange={(e) => handleUpdatePreferences({ email_notifications: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-800 mb-3">Tipos de Notificaciones</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">📝 Nuevas tareas</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.assignment_notifications}
                    onChange={(e) => handleUpdatePreferences({ assignment_notifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">🎯 Calificaciones</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.grade_notifications}
                    onChange={(e) => handleUpdatePreferences({ grade_notifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">💳 Pagos y compras</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.payment_notifications}
                    onChange={(e) => handleUpdatePreferences({ payment_notifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">💬 Mensajes</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.message_notifications}
                    onChange={(e) => handleUpdatePreferences({ message_notifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">⏰ Recordatorios</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.reminder_notifications}
                    onChange={(e) => handleUpdatePreferences({ reminder_notifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🔔 Notificaciones</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-600">
              Tienes {unreadCount} notificación{unreadCount !== 1 ? 'es' : ''} sin leer
            </p>
          )}
        </div>
        
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50"
            >
              Marcar todas como leídas
            </button>
          )}
          <button
            onClick={() => setShowPreferences(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            ⚙️ Preferencias
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {notifications.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔕</div>
            <p className="text-gray-600">No tienes notificaciones</p>
          </div>
        )}

        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 border rounded-lg transition cursor-pointer ${
              notification.read
                ? 'bg-white border-gray-200'
                : `${getNotificationColor(notification.type)} border-2`
            } hover:shadow-md`}
            onClick={() => !notification.read && handleMarkAsRead(notification.id)}
          >
            <div className="flex items-start gap-3">
              <div className="text-3xl">{getNotificationIcon(notification.type)}</div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-gray-800">{notification.title}</h3>
                  {!notification.read && (
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  )}
                </div>
                
                <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{new Date(notification.created_at).toLocaleString()}</span>
                  
                  {notification.link && (
                    <a
                      href={notification.link}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Ver más →
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnhancedNotificationCenter;
