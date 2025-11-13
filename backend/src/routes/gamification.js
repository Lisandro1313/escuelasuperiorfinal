/**
 * Rutas de Gamificación
 */

const Gamification = require('../models/Gamification');

module.exports = (db, authenticateToken) => {
  const express = require('express');
  const router = express.Router();

  // Obtener perfil de puntos del usuario
  router.get('/gamification/profile', authenticateToken, async (req, res) => {
    try {
      const profile = await Gamification.getUserPoints(db, req.user.id);
      const badges = await Gamification.getUserBadges(db, req.user.id);

      res.json({
        ...profile,
        badges,
        badge_count: badges.length
      });
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      res.status(500).json({ error: 'Error al obtener perfil de gamificación' });
    }
  });

  // Obtener leaderboard
  router.get('/gamification/leaderboard', authenticateToken, async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const leaderboard = await Gamification.getLeaderboard(db, parseInt(limit));

      // Encontrar posición del usuario actual
      const userRank = leaderboard.findIndex(u => u.user_id === req.user.id) + 1;

      res.json({
        leaderboard,
        user_rank: userRank || null
      });
    } catch (error) {
      console.error('Error al obtener leaderboard:', error);
      res.status(500).json({ error: 'Error al obtener leaderboard' });
    }
  });

  // Obtener historial de puntos
  router.get('/gamification/history', authenticateToken, async (req, res) => {
    try {
      const { limit = 20 } = req.query;
      const history = await Gamification.getPointHistory(db, req.user.id, parseInt(limit));

      res.json(history);
    } catch (error) {
      console.error('Error al obtener historial:', error);
      res.status(500).json({ error: 'Error al obtener historial de puntos' });
    }
  });

  // Obtener badges del usuario
  router.get('/gamification/badges', authenticateToken, async (req, res) => {
    try {
      const userBadges = await Gamification.getUserBadges(db, req.user.id);
      const allBadges = await Gamification.getAllBadges(db);

      // Marcar cuáles badges tiene el usuario
      const badgesWithStatus = allBadges.map(badge => {
        const earned = userBadges.find(ub => ub.id === badge.id);
        return {
          ...badge,
          earned: !!earned,
          earned_at: earned ? earned.earned_at : null
        };
      });

      res.json(badgesWithStatus);
    } catch (error) {
      console.error('Error al obtener badges:', error);
      res.status(500).json({ error: 'Error al obtener badges' });
    }
  });

  // Actualizar racha de días (llamado automáticamente en cada login/actividad)
  router.post('/gamification/update-streak', authenticateToken, async (req, res) => {
    try {
      await Gamification.updateStreak(db, req.user.id);
      const profile = await Gamification.getUserPoints(db, req.user.id);

      res.json({ streak_days: profile.streak_days });
    } catch (error) {
      console.error('Error al actualizar racha:', error);
      res.status(500).json({ error: 'Error al actualizar racha' });
    }
  });

  // Endpoint interno para otorgar puntos (usado por otros servicios)
  router.post('/gamification/award-points', authenticateToken, async (req, res) => {
    try {
      const { points, action_type, description, reference_type, reference_id } = req.body;

      if (!points || !action_type) {
        return res.status(400).json({ 
          error: 'points y action_type son requeridos' 
        });
      }

      const profile = await Gamification.addPoints(
        db,
        req.user.id,
        parseInt(points),
        action_type,
        description || '',
        reference_type,
        reference_id
      );

      res.json(profile);
    } catch (error) {
      console.error('Error al otorgar puntos:', error);
      res.status(500).json({ error: 'Error al otorgar puntos' });
    }
  });

  // Obtener estadísticas generales
  router.get('/gamification/stats', authenticateToken, async (req, res) => {
    try {
      const profile = await Gamification.getUserPoints(db, req.user.id);
      const badges = await Gamification.getUserBadges(db, req.user.id);
      const history = await Gamification.getPointHistory(db, req.user.id, 5);

      // Calcular puntos ganados hoy
      const today = new Date().toISOString().split('T')[0];
      const todayPoints = history
        .filter(h => h.created_at.startsWith(today))
        .reduce((sum, h) => sum + h.points, 0);

      // Calcular puntos ganados esta semana
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekPoints = history
        .filter(h => new Date(h.created_at) >= weekAgo)
        .reduce((sum, h) => sum + h.points, 0);

      res.json({
        current_points: profile.points,
        total_earned: profile.total_earned,
        level: profile.level,
        experience: profile.experience,
        experience_to_next_level: (profile.level * 100) - profile.experience,
        streak_days: profile.streak_days,
        badge_count: badges.length,
        today_points: todayPoints,
        week_points: weekPoints,
        recent_activity: history.slice(0, 5)
      });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
  });

  return router;
};
