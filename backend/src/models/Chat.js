/**
 * Modelo Chat
 * Sistema de mensajería en tiempo real
 */

class Chat {
  /**
   * Crear las tablas necesarias para el chat
   */
  static async createTables(db) {
    // Tabla de conversaciones
    await db.run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type VARCHAR(50) NOT NULL, -- 'private' o 'course'
        course_id INTEGER,
        name VARCHAR(255),
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Tabla de participantes de conversaciones
    await db.run(`
      CREATE TABLE IF NOT EXISTS conversation_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(conversation_id, user_id)
      )
    `);

    // Tabla de mensajes
    await db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        attachment_url TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Índices para mejorar rendimiento
    await db.run(`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_conversation_participants ON conversation_participants(conversation_id, user_id)`);
  }

  /**
   * Crear o obtener conversación privada entre dos usuarios
   */
  static async getOrCreatePrivateConversation(db, userId1, userId2) {
    // Buscar conversación existente
    const existing = await db.get(`
      SELECT c.* FROM conversations c
      INNER JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
      INNER JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
      WHERE c.type = 'private'
        AND cp1.user_id = ?
        AND cp2.user_id = ?
    `, [userId1, userId2]);

    if (existing) {
      return existing;
    }

    // Crear nueva conversación
    const result = await db.run(`
      INSERT INTO conversations (type, created_by)
      VALUES ('private', ?)
    `, [userId1]);

    const conversationId = result.lastID;

    // Agregar participantes
    await db.run(`
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (?, ?), (?, ?)
    `, [conversationId, userId1, conversationId, userId2]);

    return this.getById(db, conversationId);
  }

  /**
   * Crear conversación de curso
   */
  static async createCourseConversation(db, courseId, userId, name) {
    const result = await db.run(`
      INSERT INTO conversations (type, course_id, name, created_by)
      VALUES ('course', ?, ?, ?)
    `, [courseId, name, userId]);

    return this.getById(db, result.lastID);
  }

  /**
   * Obtener conversación por ID
   */
  static async getById(db, id) {
    return await db.get(`
      SELECT c.*, u.name as creator_name
      FROM conversations c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
    `, [id]);
  }

  /**
   * Obtener conversaciones de un usuario
   */
  static async getUserConversations(db, userId) {
    return await db.all(`
      SELECT 
        c.*,
        u.name as creator_name,
        (SELECT COUNT(*) FROM messages m 
         WHERE m.conversation_id = c.id 
         AND m.created_at > cp.last_read_at 
         AND m.user_id != ?) as unread_count,
        (SELECT message FROM messages 
         WHERE conversation_id = c.id 
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages 
         WHERE conversation_id = c.id 
         ORDER BY created_at DESC LIMIT 1) as last_message_at
      FROM conversations c
      INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE cp.user_id = ?
      ORDER BY last_message_at DESC
    `, [userId, userId]);
  }

  /**
   * Enviar mensaje
   */
  static async sendMessage(db, conversationId, userId, message, attachmentUrl = null) {
    const result = await db.run(`
      INSERT INTO messages (conversation_id, user_id, message, attachment_url)
      VALUES (?, ?, ?, ?)
    `, [conversationId, userId, message, attachmentUrl]);

    // Actualizar timestamp de conversación
    await db.run(`
      UPDATE conversations SET updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [conversationId]);

    return this.getMessageById(db, result.lastID);
  }

  /**
   * Obtener mensaje por ID
   */
  static async getMessageById(db, id) {
    return await db.get(`
      SELECT m.*, u.name as user_name, u.email as user_email
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `, [id]);
  }

  /**
   * Obtener mensajes de una conversación
   */
  static async getMessages(db, conversationId, limit = 50, offset = 0) {
    return await db.all(`
      SELECT m.*, u.name as user_name, u.email as user_email
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [conversationId, limit, offset]);
  }

  /**
   * Marcar mensajes como leídos
   */
  static async markAsRead(db, conversationId, userId) {
    await db.run(`
      UPDATE conversation_participants
      SET last_read_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ? AND user_id = ?
    `, [conversationId, userId]);

    return true;
  }

  /**
   * Agregar participante a conversación
   */
  static async addParticipant(db, conversationId, userId) {
    await db.run(`
      INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id)
      VALUES (?, ?)
    `, [conversationId, userId]);

    return true;
  }

  /**
   * Obtener participantes de una conversación
   */
  static async getParticipants(db, conversationId) {
    return await db.all(`
      SELECT u.id, u.name, u.email, u.role, cp.joined_at, cp.last_read_at
      FROM conversation_participants cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.conversation_id = ?
    `, [conversationId]);
  }

  /**
   * Eliminar mensaje
   */
  static async deleteMessage(db, messageId, userId) {
    await db.run(`
      DELETE FROM messages
      WHERE id = ? AND user_id = ?
    `, [messageId, userId]);

    return true;
  }

  /**
   * Buscar mensajes
   */
  static async searchMessages(db, userId, query) {
    return await db.all(`
      SELECT m.*, u.name as user_name, c.name as conversation_name
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      JOIN users u ON m.user_id = u.id
      WHERE cp.user_id = ? AND m.message LIKE ?
      ORDER BY m.created_at DESC
      LIMIT 50
    `, [userId, `%${query}%`]);
  }
}

module.exports = Chat;
