import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface Notification {
  id: number;
  user_id: number;
  type: 'assignment' | 'grade' | 'payment' | 'message' | 'reminder' | 'system';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: number;
  email_notifications: boolean;
  push_notifications: boolean;
  assignment_notifications: boolean;
  grade_notifications: boolean;
  payment_notifications: boolean;
  message_notifications: boolean;
  reminder_notifications: boolean;
}

let socket: Socket | null = null;

/**
 * Conectar al sistema de notificaciones en tiempo real
 */
export const connectNotifications = (
  userId: number,
  onNotification: (notification: Notification) => void
): Socket => {
  const token = localStorage.getItem('token');
  
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('🔔 Conectado al sistema de notificaciones');
  });

  socket.on('new-notification', (notification: Notification) => {
    console.log('📬 Nueva notificación recibida:', notification);
    onNotification(notification);
  });

  socket.on('disconnect', () => {
    console.log('🔕 Desconectado del sistema de notificaciones');
  });

  socket.on('error', (error: any) => {
    console.error('❌ Error en socket de notificaciones:', error);
  });

  return socket;
};

/**
 * Desconectar del sistema de notificaciones
 */
export const disconnectNotifications = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Obtener mis notificaciones
 */
export const getMyNotifications = async (limit = 50): Promise<Notification[]> => {
  const response = await axios.get(`${API_URL}/notifications`, {
    params: { limit },
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Marcar una notificación como leída
 */
export const markNotificationAsRead = async (
  notificationId: number
): Promise<{ message: string }> => {
  const response = await axios.put(
    `${API_URL}/notifications/${notificationId}/read`,
    {},
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Marcar todas las notificaciones como leídas
 */
export const markAllNotificationsAsRead = async (): Promise<{ message: string }> => {
  const response = await axios.put(
    `${API_URL}/notifications/mark-all-read`,
    {},
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Obtener preferencias de notificaciones
 */
export const getNotificationPreferences = async (): Promise<NotificationPreferences> => {
  const response = await axios.get(`${API_URL}/notifications/preferences`, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Actualizar preferencias de notificaciones
 */
export const updateNotificationPreferences = async (
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> => {
  const response = await axios.put(
    `${API_URL}/notifications/preferences`,
    preferences,
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Enviar notificación de prueba (para testing)
 */
export const sendTestNotification = async (): Promise<{ message: string }> => {
  const response = await axios.post(
    `${API_URL}/notifications/test`,
    {},
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Obtener cantidad de notificaciones no leídas
 */
export const getUnreadCount = async (): Promise<number> => {
  const notifications = await getMyNotifications(1000);
  return notifications.filter(n => !n.read).length;
};

export default {
  connectNotifications,
  disconnectNotifications,
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
  sendTestNotification,
  getUnreadCount
};
