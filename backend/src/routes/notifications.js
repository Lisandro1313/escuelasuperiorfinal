/**
 * Rutas para el Sistema de Notificaciones
 */

const express = require('express');
const router = express.Router();

module.exports = (db, authenticateToken, io) => {
    const Notification = require('../models/Notification');
    const notificationModel = new Notification(db);

    // Obtener todas las notificaciones del usuario
    router.get('/notifications', authenticateToken, async (req, res) => {
        try {
            const userId = req.user.userId;
            const { limit, unreadOnly } = req.query;

            const notifications = await notificationModel.getUserNotifications(
                userId,
                parseInt(limit) || 50,
                unreadOnly === 'true'
            );

            const unreadCount = await notificationModel.getUnreadCount(userId);

            res.json({
                success: true,
                notifications,
                unreadCount
            });
        } catch (error) {
            console.error('Error obteniendo notificaciones:', error);
            res.status(500).json({ error: 'Error al obtener notificaciones' });
        }
    });

    // Obtener contador de notificaciones no leídas
    router.get('/notifications/unread-count', authenticateToken, async (req, res) => {
        try {
            const userId = req.user.userId;
            const count = await notificationModel.getUnreadCount(userId);

            res.json({
                success: true,
                count
            });
        } catch (error) {
            console.error('Error obteniendo contador:', error);
            res.status(500).json({ error: 'Error al obtener contador' });
        }
    });

    // Marcar notificación como leída
    router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
        try {
            const { id } = req.params;
            await notificationModel.markAsRead(id);

            res.json({
                success: true,
                message: 'Notificación marcada como leída'
            });
        } catch (error) {
            console.error('Error marcando notificación como leída:', error);
            res.status(500).json({ error: 'Error al marcar notificación' });
        }
    });

    // Marcar todas las notificaciones como leídas
    router.put('/notifications/mark-all-read', authenticateToken, async (req, res) => {
        try {
            const userId = req.user.userId;
            await notificationModel.markAllAsRead(userId);

            res.json({
                success: true,
                message: 'Todas las notificaciones marcadas como leídas'
            });
        } catch (error) {
            console.error('Error marcando todas las notificaciones:', error);
            res.status(500).json({ error: 'Error al marcar notificaciones' });
        }
    });

    // Eliminar notificación
    router.delete('/notifications/:id', authenticateToken, async (req, res) => {
        try {
            const { id } = req.params;
            await notificationModel.delete(id);

            res.json({
                success: true,
                message: 'Notificación eliminada'
            });
        } catch (error) {
            console.error('Error eliminando notificación:', error);
            res.status(500).json({ error: 'Error al eliminar notificación' });
        }
    });

    // Obtener preferencias de notificaciones
    router.get('/notifications/preferences', authenticateToken, async (req, res) => {
        try {
            const userId = req.user.userId;
            const preferences = await notificationModel.getPreferences(userId);

            res.json({
                success: true,
                preferences
            });
        } catch (error) {
            console.error('Error obteniendo preferencias:', error);
            res.status(500).json({ error: 'Error al obtener preferencias' });
        }
    });

    // Actualizar preferencias de notificaciones
    router.put('/notifications/preferences', authenticateToken, async (req, res) => {
        try {
            const userId = req.user.userId;
            const preferences = req.body;

            const updated = await notificationModel.updatePreferences(userId, preferences);

            res.json({
                success: true,
                message: 'Preferencias actualizadas',
                preferences: updated
            });
        } catch (error) {
            console.error('Error actualizando preferencias:', error);
            res.status(500).json({ error: 'Error al actualizar preferencias' });
        }
    });

    // Enviar notificación de prueba (solo para desarrollo)
    router.post('/notifications/test', authenticateToken, async (req, res) => {
        try {
            const userId = req.user.userId;
            const { title, message, type } = req.body;

            const notification = await notificationModel.create({
                user_id: userId,
                title: title || '🔔 Notificación de prueba',
                message: message || 'Esta es una notificación de prueba del sistema',
                type: type || 'info'
            });

            // Emitir notificación en tiempo real via Socket.io
            if (io) {
                io.to(`user_${userId}`).emit('newNotification', notification);
            }

            res.json({
                success: true,
                message: 'Notificación de prueba enviada',
                notification
            });
        } catch (error) {
            console.error('Error enviando notificación de prueba:', error);
            res.status(500).json({ error: 'Error al enviar notificación' });
        }
    });

    return router;
};
