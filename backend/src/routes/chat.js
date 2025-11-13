/**
 * Rutas de Chat en Tiempo Real
 */

const Chat = require('../models/Chat');

module.exports = (db, authenticateToken, io) => {
  const express = require('express');
  const router = express.Router();

  // Obtener conversaciones del usuario
  router.get('/chat/conversations', authenticateToken, async (req, res) => {
    try {
      const conversations = await Chat.getUserConversations(db, req.user.id);
      res.json(conversations);
    } catch (error) {
      console.error('Error al obtener conversaciones:', error);
      res.status(500).json({ error: 'Error al obtener conversaciones' });
    }
  });

  // Obtener o crear conversación privada
  router.post('/chat/conversations/private', authenticateToken, async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'userId es requerido' });
      }

      const conversation = await Chat.getOrCreatePrivateConversation(
        db,
        req.user.id,
        userId
      );

      res.json(conversation);
    } catch (error) {
      console.error('Error al crear conversación:', error);
      res.status(500).json({ error: 'Error al crear conversación' });
    }
  });

  // Crear conversación de curso
  router.post('/chat/conversations/course', authenticateToken, async (req, res) => {
    try {
      const { courseId, name } = req.body;

      if (!courseId || !name) {
        return res.status(400).json({ error: 'courseId y name son requeridos' });
      }

      const conversation = await Chat.createCourseConversation(
        db,
        courseId,
        req.user.id,
        name
      );

      res.status(201).json(conversation);
    } catch (error) {
      console.error('Error al crear conversación de curso:', error);
      res.status(500).json({ error: 'Error al crear conversación de curso' });
    }
  });

  // Obtener detalles de una conversación
  router.get('/chat/conversations/:id', authenticateToken, async (req, res) => {
    try {
      const conversation = await Chat.getById(db, req.params.id);

      if (!conversation) {
        return res.status(404).json({ error: 'Conversación no encontrada' });
      }

      // Verificar que el usuario sea participante
      const participants = await Chat.getParticipants(db, req.params.id);
      const isParticipant = participants.some(p => p.id === req.user.id);

      if (!isParticipant) {
        return res.status(403).json({ error: 'No tienes acceso a esta conversación' });
      }

      res.json({
        ...conversation,
        participants
      });
    } catch (error) {
      console.error('Error al obtener conversación:', error);
      res.status(500).json({ error: 'Error al obtener conversación' });
    }
  });

  // Obtener mensajes de una conversación
  router.get('/chat/conversations/:id/messages', authenticateToken, async (req, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;

      // Verificar que el usuario sea participante
      const participants = await Chat.getParticipants(db, req.params.id);
      const isParticipant = participants.some(p => p.id === req.user.id);

      if (!isParticipant) {
        return res.status(403).json({ error: 'No tienes acceso a esta conversación' });
      }

      const messages = await Chat.getMessages(
        db,
        req.params.id,
        parseInt(limit),
        parseInt(offset)
      );

      res.json(messages);
    } catch (error) {
      console.error('Error al obtener mensajes:', error);
      res.status(500).json({ error: 'Error al obtener mensajes' });
    }
  });

  // Enviar mensaje
  router.post('/chat/conversations/:id/messages', authenticateToken, async (req, res) => {
    try {
      const { message, attachment_url } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
      }

      // Verificar que el usuario sea participante
      const participants = await Chat.getParticipants(db, req.params.id);
      const isParticipant = participants.some(p => p.id === req.user.id);

      if (!isParticipant) {
        return res.status(403).json({ error: 'No tienes acceso a esta conversación' });
      }

      const newMessage = await Chat.sendMessage(
        db,
        req.params.id,
        req.user.id,
        message.trim(),
        attachment_url
      );

      // Emitir mensaje por Socket.IO
      io.to(`conversation_${req.params.id}`).emit('new_message', newMessage);

      res.status(201).json(newMessage);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      res.status(500).json({ error: 'Error al enviar mensaje' });
    }
  });

  // Marcar mensajes como leídos
  router.post('/chat/conversations/:id/read', authenticateToken, async (req, res) => {
    try {
      await Chat.markAsRead(db, req.params.id, req.user.id);

      // Emitir evento de lectura
      io.to(`conversation_${req.params.id}`).emit('messages_read', {
        conversationId: req.params.id,
        userId: req.user.id
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error al marcar como leído:', error);
      res.status(500).json({ error: 'Error al marcar como leído' });
    }
  });

  // Agregar participante a conversación
  router.post('/chat/conversations/:id/participants', authenticateToken, async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'userId es requerido' });
      }

      // Verificar que el usuario sea participante
      const participants = await Chat.getParticipants(db, req.params.id);
      const isParticipant = participants.some(p => p.id === req.user.id);

      if (!isParticipant) {
        return res.status(403).json({ error: 'No tienes acceso a esta conversación' });
      }

      await Chat.addParticipant(db, req.params.id, userId);

      // Emitir evento
      io.to(`conversation_${req.params.id}`).emit('participant_added', {
        conversationId: req.params.id,
        userId
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error al agregar participante:', error);
      res.status(500).json({ error: 'Error al agregar participante' });
    }
  });

  // Eliminar mensaje
  router.delete('/chat/messages/:id', authenticateToken, async (req, res) => {
    try {
      await Chat.deleteMessage(db, req.params.id, req.user.id);

      res.json({ success: true });
    } catch (error) {
      console.error('Error al eliminar mensaje:', error);
      res.status(500).json({ error: 'Error al eliminar mensaje' });
    }
  });

  // Buscar mensajes
  router.get('/chat/search', authenticateToken, async (req, res) => {
    try {
      const { q } = req.query;

      if (!q || q.trim().length === 0) {
        return res.status(400).json({ error: 'Parámetro de búsqueda requerido' });
      }

      const results = await Chat.searchMessages(db, req.user.id, q.trim());
      res.json(results);
    } catch (error) {
      console.error('Error al buscar mensajes:', error);
      res.status(500).json({ error: 'Error al buscar mensajes' });
    }
  });

  // Socket.IO handlers
  if (io) {
    io.on('connection', (socket) => {
      console.log('Usuario conectado al chat:', socket.id);

      // Unirse a una conversación
      socket.on('join_conversation', (conversationId) => {
        socket.join(`conversation_${conversationId}`);
        console.log(`Socket ${socket.id} se unió a conversation_${conversationId}`);
      });

      // Salir de una conversación
      socket.on('leave_conversation', (conversationId) => {
        socket.leave(`conversation_${conversationId}`);
        console.log(`Socket ${socket.id} salió de conversation_${conversationId}`);
      });

      // Usuario está escribiendo
      socket.on('typing', ({ conversationId, userId, userName }) => {
        socket.to(`conversation_${conversationId}`).emit('user_typing', {
          userId,
          userName
        });
      });

      // Usuario dejó de escribir
      socket.on('stop_typing', ({ conversationId, userId }) => {
        socket.to(`conversation_${conversationId}`).emit('user_stop_typing', {
          userId
        });
      });

      socket.on('disconnect', () => {
        console.log('Usuario desconectado del chat:', socket.id);
      });
    });
  }

  return router;
};
