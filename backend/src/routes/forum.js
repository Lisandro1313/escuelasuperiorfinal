/**
 * Rutas de Foros de Discusión
 */

const Forum = require('../models/Forum');

module.exports = (db, authenticateToken, requireProfessor) => {
  const express = require('express');
  const router = express.Router();

  // Obtener hilos de un curso
  router.get('/forum/course/:courseId/threads', authenticateToken, async (req, res) => {
    try {
      const { sortBy, limit, offset } = req.query;

      const threads = await Forum.getThreadsByCourse(db, req.params.courseId, {
        sortBy,
        limit: limit ? parseInt(limit) : 20,
        offset: offset ? parseInt(offset) : 0
      });

      res.json(threads);
    } catch (error) {
      console.error('Error al obtener hilos:', error);
      res.status(500).json({ error: 'Error al obtener hilos del foro' });
    }
  });

  // Crear nuevo hilo
  router.post('/forum/threads', authenticateToken, async (req, res) => {
    try {
      const { course_id, title, content } = req.body;

      if (!course_id || !title || !content) {
        return res.status(400).json({ 
          error: 'course_id, title y content son requeridos' 
        });
      }

      if (title.trim().length < 5) {
        return res.status(400).json({ 
          error: 'El título debe tener al menos 5 caracteres' 
        });
      }

      if (content.trim().length < 10) {
        return res.status(400).json({ 
          error: 'El contenido debe tener al menos 10 caracteres' 
        });
      }

      const thread = await Forum.createThread(db, {
        course_id,
        user_id: req.user.id,
        title: title.trim(),
        content: content.trim()
      });

      res.status(201).json(thread);
    } catch (error) {
      console.error('Error al crear hilo:', error);
      res.status(500).json({ error: 'Error al crear hilo' });
    }
  });

  // Obtener detalles de un hilo
  router.get('/forum/threads/:id', authenticateToken, async (req, res) => {
    try {
      const thread = await Forum.getThreadById(db, req.params.id);

      if (!thread) {
        return res.status(404).json({ error: 'Hilo no encontrado' });
      }

      res.json(thread);
    } catch (error) {
      console.error('Error al obtener hilo:', error);
      res.status(500).json({ error: 'Error al obtener hilo' });
    }
  });

  // Actualizar hilo
  router.put('/forum/threads/:id', authenticateToken, async (req, res) => {
    try {
      const { title, content, is_pinned, is_locked } = req.body;

      // Solo el creador o un profesor puede actualizar
      const thread = await Forum.getThreadById(db, req.params.id);
      
      if (!thread) {
        return res.status(404).json({ error: 'Hilo no encontrado' });
      }

      if (thread.user_id !== req.user.id && req.user.role !== 'professor') {
        return res.status(403).json({ 
          error: 'No tienes permiso para editar este hilo' 
        });
      }

      const updated = await Forum.updateThread(db, req.params.id, thread.user_id, {
        title,
        content,
        is_pinned,
        is_locked
      });

      res.json(updated);
    } catch (error) {
      console.error('Error al actualizar hilo:', error);
      res.status(500).json({ error: error.message || 'Error al actualizar hilo' });
    }
  });

  // Eliminar hilo
  router.delete('/forum/threads/:id', authenticateToken, async (req, res) => {
    try {
      const thread = await Forum.getThreadById(db, req.params.id);
      
      if (!thread) {
        return res.status(404).json({ error: 'Hilo no encontrado' });
      }

      if (thread.user_id !== req.user.id && req.user.role !== 'professor') {
        return res.status(403).json({ 
          error: 'No tienes permiso para eliminar este hilo' 
        });
      }

      await Forum.deleteThread(db, req.params.id, thread.user_id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error al eliminar hilo:', error);
      res.status(500).json({ error: 'Error al eliminar hilo' });
    }
  });

  // Obtener respuestas de un hilo
  router.get('/forum/threads/:id/replies', authenticateToken, async (req, res) => {
    try {
      const replies = await Forum.getRepliesByThread(db, req.params.id);
      res.json(replies);
    } catch (error) {
      console.error('Error al obtener respuestas:', error);
      res.status(500).json({ error: 'Error al obtener respuestas' });
    }
  });

  // Crear respuesta
  router.post('/forum/threads/:id/replies', authenticateToken, async (req, res) => {
    try {
      const { content, parent_reply_id } = req.body;

      if (!content || content.trim().length < 5) {
        return res.status(400).json({ 
          error: 'El contenido debe tener al menos 5 caracteres' 
        });
      }

      // Verificar que el hilo existe y no está bloqueado
      const thread = await Forum.getThreadById(db, req.params.id);
      
      if (!thread) {
        return res.status(404).json({ error: 'Hilo no encontrado' });
      }

      if (thread.is_locked && req.user.role !== 'professor') {
        return res.status(403).json({ error: 'Este hilo está bloqueado' });
      }

      const reply = await Forum.createReply(db, {
        thread_id: req.params.id,
        user_id: req.user.id,
        content: content.trim(),
        parent_reply_id
      });

      res.status(201).json(reply);
    } catch (error) {
      console.error('Error al crear respuesta:', error);
      res.status(500).json({ error: 'Error al crear respuesta' });
    }
  });

  // Eliminar respuesta
  router.delete('/forum/replies/:id', authenticateToken, async (req, res) => {
    try {
      const reply = await Forum.getReplyById(db, req.params.id);
      
      if (!reply) {
        return res.status(404).json({ error: 'Respuesta no encontrada' });
      }

      if (reply.user_id !== req.user.id && req.user.role !== 'professor') {
        return res.status(403).json({ 
          error: 'No tienes permiso para eliminar esta respuesta' 
        });
      }

      await Forum.deleteReply(db, req.params.id, reply.user_id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error al eliminar respuesta:', error);
      res.status(500).json({ error: 'Error al eliminar respuesta' });
    }
  });

  // Votar hilo o respuesta
  router.post('/forum/vote', authenticateToken, async (req, res) => {
    try {
      const { votable_type, votable_id, vote_type } = req.body;

      if (!['thread', 'reply'].includes(votable_type)) {
        return res.status(400).json({ 
          error: 'votable_type debe ser "thread" o "reply"' 
        });
      }

      if (![1, -1].includes(vote_type)) {
        return res.status(400).json({ 
          error: 'vote_type debe ser 1 (upvote) o -1 (downvote)' 
        });
      }

      await Forum.vote(db, req.user.id, votable_type, votable_id, vote_type);

      res.json({ success: true });
    } catch (error) {
      console.error('Error al votar:', error);
      res.status(500).json({ error: 'Error al registrar voto' });
    }
  });

  // Quitar voto
  router.delete('/forum/vote', authenticateToken, async (req, res) => {
    try {
      const { votable_type, votable_id } = req.body;

      if (!['thread', 'reply'].includes(votable_type)) {
        return res.status(400).json({ 
          error: 'votable_type debe ser "thread" o "reply"' 
        });
      }

      await Forum.removeVote(db, req.user.id, votable_type, votable_id);

      res.json({ success: true });
    } catch (error) {
      console.error('Error al quitar voto:', error);
      res.status(500).json({ error: 'Error al quitar voto' });
    }
  });

  // Marcar mejor respuesta
  router.post('/forum/replies/:id/best-answer', authenticateToken, async (req, res) => {
    try {
      const reply = await Forum.getReplyById(db, req.params.id);

      if (!reply) {
        return res.status(404).json({ error: 'Respuesta no encontrada' });
      }

      await Forum.markAsBestAnswer(
        db,
        req.params.id,
        reply.thread_id,
        req.user.id
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error al marcar mejor respuesta:', error);
      res.status(500).json({ error: error.message || 'Error al marcar mejor respuesta' });
    }
  });

  // Buscar en foros
  router.get('/forum/course/:courseId/search', authenticateToken, async (req, res) => {
    try {
      const { q } = req.query;

      if (!q || q.trim().length < 3) {
        return res.status(400).json({ 
          error: 'La búsqueda debe tener al menos 3 caracteres' 
        });
      }

      const results = await Forum.search(db, req.params.courseId, q.trim());
      res.json(results);
    } catch (error) {
      console.error('Error al buscar:', error);
      res.status(500).json({ error: 'Error en la búsqueda' });
    }
  });

  return router;
};
