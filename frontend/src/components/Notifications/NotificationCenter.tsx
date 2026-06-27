import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import socketService from '../../services/socket';

interface Notification {
  id: number;
  type?: string;
  tipo?: string;
  title?: string;
  titulo?: string;
  message?: string;
  mensaje?: string;
  timestamp?: string;
  created_at?: string;
  read?: boolean;
  leida?: boolean | number;
  icon?: string;
  action_url?: string;
}

const NotificationCenter: React.FC = () => {
  const { usuario } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Cargar notificaciones reales del usuario
    const loadNotifications = async () => {
      if (!usuario) return;
      
      try {
        const response = await fetch('/api/notifications', {
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Normalizamos + descartamos notificaciones vacías (sin titulo ni mensaje).
            const list = (data.notifications || [])
              .map((n: Notification) => ({ ...n, read: n.read ?? !!n.leida }))
              .filter((n: Notification) => (n.title || n.titulo || n.message || n.mensaje));
            setNotifications(list);
            setUnreadCount(list.filter((n: Notification) => !n.read).length);
          }
        }
      } catch (error) {
        console.error('Error al cargar notificaciones:', error);
      }
    };

    loadNotifications();

    // Configurar Socket.io para notificaciones en tiempo real
    if (usuario) {
      socketService.connect(localStorage.getItem('token') || '');
      
      socketService.onNotification((notification: Notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Mostrar notificación del navegador si está permitido
        if (Notification.permission === 'granted') {
          new Notification(notification.title || notification.titulo || 'Notificación', {
            body: notification.message || notification.mensaje || '',
            icon: '/favicon.ico'
          });
        }
      });
    }

    // Solicitar permiso para notificaciones del navegador
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      socketService.offNotification();
    };
  }, [usuario]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const formatTimeAgo = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error al marcar como leída:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error al marcar todas como leídas:', error);
    }
  };

  const deleteNotification = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const notification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        if (notification && !notification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Error al eliminar notificación:', error);
    }
  };

  return (
    <div className="relative">
      {/* Botón de notificaciones */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative bg-gray-100 p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition duration-200"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown de notificaciones */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 to-blue-900 text-white">
            <h3 className="text-base font-bold">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-200 hover:text-white font-medium"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          {/* Lista de notificaciones */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <span className="text-4xl mb-2 block">📭</span>
                <h4 className="text-gray-900 font-medium mb-1">
                  No hay notificaciones
                </h4>
                <p className="text-gray-600 text-sm">
                  Las notificaciones aparecerán aquí
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b hover:bg-gray-50 transition duration-200 ${
                    !notification.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${getTypeColor(notification.type || notification.tipo || '')}`}>
                      <span>{notification.icon || '📢'}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className={`text-sm font-medium ${
                            !notification.read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title || notification.titulo || 'Notificación'}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message || notification.mensaje || ''}
                          </p>
                          
                          {notification.action_url && (
                            <a 
                              href={notification.action_url}
                              className="mt-2 text-xs text-blue-600 hover:text-blue-800 block"
                            >
                              Ver más →
                            </a>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-2">
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.created_at || notification.timestamp)}
                          </span>
                          
                          <div className="flex space-x-1">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Marcar como leída"
                              >
                                <span className="text-xs">👁️</span>
                              </button>
                            )}
                            
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Eliminar"
                            >
                              <span className="text-xs">🗑️</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t bg-gray-50">
              <button className="w-full text-center text-sm text-blue-600 hover:text-blue-800">
                Ver todas las notificaciones
              </button>
            </div>
          )}
        </div>
      )}

      {/* Overlay para cerrar dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default NotificationCenter;