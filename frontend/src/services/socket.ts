import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  connect(token?: string): void {
    if (this.socket) {
      return;
    }

    this.socket = io(import.meta.env.VITE_SOCKET_URL || '', {
      auth: {
        token
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('✅ Conectado al servidor Socket.IO');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Desconectado del servidor Socket.IO');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Error de conexión Socket.IO:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Métodos para chat de cursos
  joinCourse(courseId: number): void {
    if (this.socket) {
      this.socket.emit('join-course', courseId);
    }
  }

  sendMessage(courseId: number, message: string, userId: number, userName: string): void {
    if (this.socket) {
      this.socket.emit('send-message', {
        courseId,
        message,
        userId,
        userName
      });
    }
  }

  onNewMessage(callback: (messageData: any) => void): void {
    if (this.socket) {
      this.socket.on('new-message', callback);
    }
  }

  offNewMessage(): void {
    if (this.socket) {
      this.socket.off('new-message');
    }
  }

  // Métodos para clases en vivo
  joinClass(roomId: string): void {
    if (this.socket) {
      this.socket.emit('join-class', roomId);
    }
  }

  leaveClass(roomId: string): void {
    if (this.socket) {
      this.socket.emit('leave-class', roomId);
    }
  }

  // Métodos para notificaciones
  onNotification(callback: (notification: any) => void): void {
    if (this.socket) {
      this.socket.on('newNotification', callback);
    }
  }

  offNotification(): void {
    if (this.socket) {
      this.socket.off('newNotification');
    }
  }

  // Estado de conexión
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

// Instancia singleton
const socketService = new SocketService();
export default socketService;