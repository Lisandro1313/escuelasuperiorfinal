const express = require('express');
const VideoConference = require('../models/VideoConference');

module.exports = (db, authenticateToken, requireProfessor) => {
  const router = express.Router();

  /**
   * POST /api/video-conferences
   * Crear una nueva sala de videoconferencia (solo profesores)
   */
  router.post('/video-conferences', authenticateToken, requireProfessor, async (req, res) => {
    try {
      const { 
        course_id, 
        title, 
        description, 
        scheduled_at, 
        duration_minutes,
        password,
        max_participants,
        is_recording_enabled
      } = req.body;

      if (!course_id || !title || !scheduled_at) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
      }

      // Generar nombre único para la sala
      const room_name = `room_${course_id}_${Date.now()}`;

      const conference = await VideoConference.create({
        course_id,
        professor_id: req.user.id,
        room_name,
        title,
        description,
        scheduled_at,
        duration_minutes: duration_minutes || 60,
        password,
        max_participants: max_participants || 50,
        is_recording_enabled: is_recording_enabled || false
      });

      res.status(201).json({
        message: 'Sala de videoconferencia creada',
        conference
      });
    } catch (error) {
      console.error('Error al crear videoconferencia:', error);
      res.status(500).json({ error: 'Error al crear sala de videoconferencia' });
    }
  });

  /**
   * GET /api/video-conferences/course/:courseId
   * Obtener todas las salas de un curso
   */
  router.get('/video-conferences/course/:courseId', authenticateToken, async (req, res) => {
    try {
      const conferences = await VideoConference.getByCourse(req.params.courseId);
      res.json(conferences);
    } catch (error) {
      console.error('Error al obtener videoconferencias:', error);
      res.status(500).json({ error: 'Error al obtener videoconferencias' });
    }
  });

  /**
   * GET /api/video-conferences/upcoming
   * Obtener salas programadas próximas
   */
  router.get('/video-conferences/upcoming', authenticateToken, async (req, res) => {
    try {
      const courseId = req.query.course_id || null;
      const conferences = await VideoConference.getUpcoming(courseId);
      res.json(conferences);
    } catch (error) {
      console.error('Error al obtener próximas videoconferencias:', error);
      res.status(500).json({ error: 'Error al obtener videoconferencias' });
    }
  });

  /**
   * GET /api/video-conferences/:id
   * Obtener detalles de una sala
   */
  router.get('/video-conferences/:id', authenticateToken, async (req, res) => {
    try {
      const conference = await VideoConference.getById(req.params.id);
      
      if (!conference) {
        return res.status(404).json({ error: 'Videoconferencia no encontrada' });
      }

      res.json(conference);
    } catch (error) {
      console.error('Error al obtener videoconferencia:', error);
      res.status(500).json({ error: 'Error al obtener videoconferencia' });
    }
  });

  /**
   * POST /api/video-conferences/:id/join
   * Unirse a una sala (registrar participación)
   */
  router.post('/video-conferences/:id/join', authenticateToken, async (req, res) => {
    try {
      const conference = await VideoConference.getById(req.params.id);
      
      if (!conference) {
        return res.status(404).json({ error: 'Videoconferencia no encontrada' });
      }

      // Verificar si requiere contraseña
      if (conference.password && req.body.password !== conference.password) {
        return res.status(403).json({ error: 'Contraseña incorrecta' });
      }

      // Registrar participante
      await VideoConference.addParticipant(req.params.id, req.user.id);

      res.json({
        message: 'Acceso permitido a la sala',
        conference: {
          id: conference.id,
          room_name: conference.room_name,
          title: conference.title,
          scheduled_at: conference.scheduled_at,
          duration_minutes: conference.duration_minutes
        }
      });
    } catch (error) {
      console.error('Error al unirse a videoconferencia:', error);
      res.status(500).json({ error: 'Error al unirse a la videoconferencia' });
    }
  });

  /**
   * GET /api/video-conferences/:id/participants
   * Obtener participantes de una sala
   */
  router.get('/video-conferences/:id/participants', authenticateToken, async (req, res) => {
    try {
      const participants = await VideoConference.getParticipants(req.params.id);
      res.json(participants);
    } catch (error) {
      console.error('Error al obtener participantes:', error);
      res.status(500).json({ error: 'Error al obtener participantes' });
    }
  });

  /**
   * PUT /api/video-conferences/:id
   * Actualizar una sala (solo profesor que la creó)
   */
  router.put('/video-conferences/:id', authenticateToken, requireProfessor, async (req, res) => {
    try {
      const conference = await VideoConference.getById(req.params.id);
      
      if (!conference) {
        return res.status(404).json({ error: 'Videoconferencia no encontrada' });
      }

      // Verificar que sea el profesor que la creó
      if (conference.professor_id !== req.user.id) {
        return res.status(403).json({ error: 'No tienes permiso para editar esta videoconferencia' });
      }

      const updated = await VideoConference.update(req.params.id, req.body);
      res.json({ message: 'Videoconferencia actualizada', conference: updated });
    } catch (error) {
      console.error('Error al actualizar videoconferencia:', error);
      res.status(500).json({ error: 'Error al actualizar videoconferencia' });
    }
  });

  /**
   * DELETE /api/video-conferences/:id
   * Eliminar una sala (solo profesor que la creó)
   */
  router.delete('/video-conferences/:id', authenticateToken, requireProfessor, async (req, res) => {
    try {
      const conference = await VideoConference.getById(req.params.id);
      
      if (!conference) {
        return res.status(404).json({ error: 'Videoconferencia no encontrada' });
      }

      // Verificar que sea el profesor que la creó
      if (conference.professor_id !== req.user.id) {
        return res.status(403).json({ error: 'No tienes permiso para eliminar esta videoconferencia' });
      }

      await VideoConference.delete(req.params.id);
      res.json({ message: 'Videoconferencia eliminada' });
    } catch (error) {
      console.error('Error al eliminar videoconferencia:', error);
      res.status(500).json({ error: 'Error al eliminar videoconferencia' });
    }
  });

  return router;
};
