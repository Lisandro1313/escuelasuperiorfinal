/**
 * Modelo de Notificaciones
 * Gestiona notificaciones en tiempo real para los usuarios
 */

class Notification {
    constructor(db) {
        this.db = db;
        this.initTable();
    }

    async initTable() {
        const createNotificationsTable = `
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        related_type VARCHAR(50),
        related_id INTEGER,
        read BOOLEAN DEFAULT 0,
        action_url VARCHAR(500),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        read_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;

        const createNotificationPreferencesTable = `
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        email_enabled BOOLEAN DEFAULT 1,
        push_enabled BOOLEAN DEFAULT 1,
        assignment_notifications BOOLEAN DEFAULT 1,
        message_notifications BOOLEAN DEFAULT 1,
        course_notifications BOOLEAN DEFAULT 1,
        payment_notifications BOOLEAN DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id)
      )
    `;

        try {
            await new Promise((resolve, reject) => {
                this.db.db.run(createNotificationsTable, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            await new Promise((resolve, reject) => {
                this.db.db.run(createNotificationPreferencesTable, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            console.log('✅ Tablas de Notification creadas/verificadas');
        } catch (error) {
            console.error('Error creando tablas de notification:', error);
        }
    }

    // Crear una notificación
    async create(notificationData) {
        const { user_id, title, message, type, related_type, related_id, action_url } = notificationData;

        const query = `
      INSERT INTO notifications (user_id, title, message, type, related_type, related_id, action_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

        try {
            const result = await new Promise((resolve, reject) => {
                this.db.db.run(
                    query,
                    [user_id, title, message, type || 'info', related_type, related_id, action_url],
                    function (err) {
                        if (err) reject(err);
                        else resolve({ lastID: this.lastID });
                    }
                );
            });

            return { id: result.lastID, ...notificationData };
        } catch (error) {
            console.error('Error creando notification:', error);
            throw error;
        }
    }

    // Crear notificaciones en lote
    async createBulk(notifications) {
        const query = `
      INSERT INTO notifications (user_id, title, message, type, related_type, related_id, action_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

        try {
            const results = [];

            for (const notif of notifications) {
                const result = await new Promise((resolve, reject) => {
                    this.db.db.run(
                        query,
                        [
                            notif.user_id,
                            notif.title,
                            notif.message,
                            notif.type || 'info',
                            notif.related_type,
                            notif.related_id,
                            notif.action_url
                        ],
                        function (err) {
                            if (err) reject(err);
                            else resolve({ lastID: this.lastID });
                        }
                    );
                });

                results.push({ id: result.lastID, ...notif });
            }

            return results;
        } catch (error) {
            console.error('Error creando notifications en lote:', error);
            throw error;
        }
    }

    // Obtener notificaciones de un usuario
    async getUserNotifications(userId, limit = 50, unreadOnly = false) {
        let query = `
      SELECT * FROM notifications
      WHERE user_id = ?
    `;

        if (unreadOnly) {
            query += ` AND read = 0`;
        }

        query += ` ORDER BY created_at DESC LIMIT ?`;

        try {
            return await new Promise((resolve, reject) => {
                this.db.db.all(query, [userId, limit], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        } catch (error) {
            console.error('Error obteniendo notifications:', error);
            return [];
        }
    }

    // Marcar notificación como leída
    async markAsRead(notificationId) {
        const query = `
      UPDATE notifications
      SET read = 1, read_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

        try {
            await new Promise((resolve, reject) => {
                this.db.db.run(query, [notificationId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            return { success: true };
        } catch (error) {
            console.error('Error marcando notification como leída:', error);
            throw error;
        }
    }

    // Marcar todas las notificaciones como leídas
    async markAllAsRead(userId) {
        const query = `
      UPDATE notifications
      SET read = 1, read_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND read = 0
    `;

        try {
            await new Promise((resolve, reject) => {
                this.db.db.run(query, [userId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            return { success: true };
        } catch (error) {
            console.error('Error marcando todas las notifications como leídas:', error);
            throw error;
        }
    }

    // Eliminar notificación
    async delete(notificationId) {
        const query = `DELETE FROM notifications WHERE id = ?`;

        try {
            await new Promise((resolve, reject) => {
                this.db.db.run(query, [notificationId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            return { success: true };
        } catch (error) {
            console.error('Error eliminando notification:', error);
            throw error;
        }
    }

    // Obtener contador de notificaciones no leídas
    async getUnreadCount(userId) {
        const query = `
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ? AND read = 0
    `;

        try {
            const result = await new Promise((resolve, reject) => {
                this.db.db.get(query, [userId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            return result.count || 0;
        } catch (error) {
            console.error('Error obteniendo contador de notifications:', error);
            return 0;
        }
    }

    // Obtener preferencias de notificaciones del usuario
    async getPreferences(userId) {
        const query = `SELECT * FROM notification_preferences WHERE user_id = ?`;

        try {
            const prefs = await new Promise((resolve, reject) => {
                this.db.db.get(query, [userId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            // Si no existen preferencias, crear unas por defecto
            if (!prefs) {
                await this.createDefaultPreferences(userId);
                return await this.getPreferences(userId);
            }

            return prefs;
        } catch (error) {
            console.error('Error obteniendo preferencias:', error);
            return null;
        }
    }

    // Crear preferencias por defecto
    async createDefaultPreferences(userId) {
        const query = `
      INSERT INTO notification_preferences (user_id)
      VALUES (?)
    `;

        try {
            await new Promise((resolve, reject) => {
                this.db.db.run(query, [userId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } catch (error) {
            console.error('Error creando preferencias por defecto:', error);
        }
    }

    // Actualizar preferencias de notificaciones
    async updatePreferences(userId, preferences) {
        const {
            email_enabled,
            push_enabled,
            assignment_notifications,
            message_notifications,
            course_notifications,
            payment_notifications
        } = preferences;

        const query = `
      INSERT OR REPLACE INTO notification_preferences (
        user_id, email_enabled, push_enabled, assignment_notifications,
        message_notifications, course_notifications, payment_notifications, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

        try {
            await new Promise((resolve, reject) => {
                this.db.db.run(
                    query,
                    [
                        userId,
                        email_enabled !== undefined ? email_enabled : 1,
                        push_enabled !== undefined ? push_enabled : 1,
                        assignment_notifications !== undefined ? assignment_notifications : 1,
                        message_notifications !== undefined ? message_notifications : 1,
                        course_notifications !== undefined ? course_notifications : 1,
                        payment_notifications !== undefined ? payment_notifications : 1
                    ],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });

            return await this.getPreferences(userId);
        } catch (error) {
            console.error('Error actualizando preferencias:', error);
            throw error;
        }
    }

    // Métodos auxiliares para crear notificaciones específicas

    async notifyNewAssignment(courseId, assignmentTitle) {
        // Obtener todos los estudiantes inscritos en el curso
        const query = `
      SELECT DISTINCT e.student_id as user_id
      FROM enrollments e
      WHERE e.course_id = ? AND e.status = 'active'
    `;

        try {
            const students = await new Promise((resolve, reject) => {
                this.db.db.all(query, [courseId], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });

            const notifications = students.map(student => ({
                user_id: student.user_id,
                title: '📝 Nueva tarea disponible',
                message: `Se ha publicado una nueva tarea: ${assignmentTitle}`,
                type: 'assignment',
                related_type: 'assignment',
                related_id: courseId,
                action_url: `/courses/${courseId}/assignments`
            }));

            return await this.createBulk(notifications);
        } catch (error) {
            console.error('Error notificando nueva tarea:', error);
            return [];
        }
    }

    async notifyAssignmentGraded(studentId, assignmentTitle, score) {
        return await this.create({
            user_id: studentId,
            title: '✅ Tarea calificada',
            message: `Tu tarea "${assignmentTitle}" ha sido calificada. Puntuación: ${score}`,
            type: 'grade',
            related_type: 'assignment',
            action_url: `/my-submissions`
        });
    }

    async notifyPaymentApproved(userId, courseTitle) {
        return await this.create({
            user_id: userId,
            title: '💳 Pago aprobado',
            message: `Tu pago para el curso "${courseTitle}" ha sido aprobado. ¡Ya puedes comenzar a aprender!`,
            type: 'payment',
            related_type: 'payment',
            action_url: `/my-courses`
        });
    }

    async notifyNewMessage(userId, senderName, courseName) {
        return await this.create({
            user_id: userId,
            title: '💬 Nuevo mensaje',
            message: `${senderName} te ha enviado un mensaje en ${courseName}`,
            type: 'message',
            related_type: 'message',
            action_url: `/chat`
        });
    }

    async notifyAssignmentDueSoon(studentId, assignmentTitle, hoursLeft) {
        return await this.create({
            user_id: studentId,
            title: '⏰ Tarea próxima a vencer',
            message: `La tarea "${assignmentTitle}" vence en ${hoursLeft} horas`,
            type: 'reminder',
            related_type: 'assignment',
            action_url: `/assignments`
        });
    }
}

module.exports = Notification;
