// Helper para registrar actividades en el sistema
// Este middleware puede ser usado en cualquier ruta para loggear acciones

const db = require('../database/database');

/**
 * Registra una actividad en el sistema
 * @param {Object} options - Opciones de logging
 * @param {Object} options.req - Request object de Express
 * @param {string} options.actionType - Tipo de acción (auth, course_create, enrollment, etc.)
 * @param {string} options.actionDescription - Descripción de la acción
 * @param {string} options.entityType - Tipo de entidad afectada (user, course, lesson, etc.)
 * @param {number} options.entityId - ID de la entidad
 * @param {string} options.entityName - Nombre de la entidad
 */
async function logActivity(options) {
  const { req, actionType, actionDescription, entityType, entityId, entityName } = options;

  try {
    await db.logActivity({
      userId: req.user.userId,
      userName: req.user.nombre || req.user.email,
      userRole: req.user.tipo,
      actionType,
      actionDescription,
      entityType: entityType || null,
      entityId: entityId || null,
      entityName: entityName || null,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent') || null
    });
  } catch (error) {
    // No fallar la request si el log falla, solo loggear el error
    console.error('Error al registrar actividad:', error);
  }
}

/**
 * Middleware que automáticamente loggea la acción después de que la ruta se ejecute
 * @param {Object} logConfig - Configuración del log
 * @returns {Function} Middleware function
 */
function activityLogger(logConfig) {
  return async (req, res, next) => {
    // Guardar el método send original
    const originalSend = res.send;

    // Override send para capturar cuando la respuesta es exitosa
    res.send = function(data) {
      // Solo loggear si el status es exitoso (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Loggear de forma asíncrona sin bloquear la respuesta
        logActivity({
          req,
          actionType: logConfig.actionType,
          actionDescription: typeof logConfig.actionDescription === 'function' 
            ? logConfig.actionDescription(req, data) 
            : logConfig.actionDescription,
          entityType: logConfig.entityType,
          entityId: logConfig.getEntityId ? logConfig.getEntityId(req, data) : null,
          entityName: logConfig.getEntityName ? logConfig.getEntityName(req, data) : null
        }).catch(err => console.error('Error en activityLogger:', err));
      }

      // Llamar al send original
      originalSend.call(this, data);
    };

    next();
  };
}

module.exports = {
  logActivity,
  activityLogger
};
