/**
 * Modelo Forum
 * Sistema de foros de discusión
 */

class Forum {
  /**
   * Crear las tablas necesarias para foros
   */
  static async createTables(db) {
    // Tabla de temas/hilos de foro
    await db.run(`
      CREATE TABLE IF NOT EXISTS forum_threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        is_pinned BOOLEAN DEFAULT 0,
        is_locked BOOLEAN DEFAULT 0,
        views INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Tabla de respuestas
    await db.run(`
      CREATE TABLE IF NOT EXISTS forum_replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        parent_reply_id INTEGER,
        is_best_answer BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_reply_id) REFERENCES forum_replies(id) ON DELETE CASCADE
      )
    `);

    // Tabla de votos
    await db.run(`
      CREATE TABLE IF NOT EXISTS forum_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        votable_type VARCHAR(50) NOT NULL, -- 'thread' o 'reply'
        votable_id INTEGER NOT NULL,
        vote_type INTEGER NOT NULL, -- 1 para upvote, -1 para downvote
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, votable_type, votable_id)
      )
    `);

    // Índices
    await db.run(`CREATE INDEX IF NOT EXISTS idx_forum_threads_course ON forum_threads(course_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_forum_replies_thread ON forum_replies(thread_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_forum_votes ON forum_votes(votable_type, votable_id)`);
  }

  /**
   * Crear un nuevo hilo de foro
   */
  static async createThread(db, data) {
    const { course_id, user_id, title, content } = data;

    const result = await db.run(`
      INSERT INTO forum_threads (course_id, user_id, title, content)
      VALUES (?, ?, ?, ?)
    `, [course_id, user_id, title, content]);

    return this.getThreadById(db, result.lastID);
  }

  /**
   * Obtener hilo por ID
   */
  static async getThreadById(db, id) {
    const thread = await db.get(`
      SELECT 
        ft.*,
        u.name as author_name,
        u.email as author_email,
        u.role as author_role,
        (SELECT COUNT(*) FROM forum_replies WHERE thread_id = ft.id) as reply_count,
        (SELECT SUM(vote_type) FROM forum_votes WHERE votable_type = 'thread' AND votable_id = ft.id) as vote_score
      FROM forum_threads ft
      LEFT JOIN users u ON ft.user_id = u.id
      WHERE ft.id = ?
    `, [id]);

    // Incrementar vistas
    if (thread) {
      await db.run(`UPDATE forum_threads SET views = views + 1 WHERE id = ?`, [id]);
      thread.views += 1;
    }

    return thread;
  }

  /**
   * Obtener hilos de un curso
   */
  static async getThreadsByCourse(db, courseId, options = {}) {
    const { limit = 20, offset = 0, sortBy = 'updated_at' } = options;

    const validSorts = {
      'updated_at': 'ft.updated_at DESC',
      'created_at': 'ft.created_at DESC',
      'views': 'ft.views DESC',
      'replies': 'reply_count DESC',
      'votes': 'vote_score DESC'
    };

    const orderBy = validSorts[sortBy] || validSorts['updated_at'];

    return await db.all(`
      SELECT 
        ft.*,
        u.name as author_name,
        u.role as author_role,
        (SELECT COUNT(*) FROM forum_replies WHERE thread_id = ft.id) as reply_count,
        (SELECT SUM(vote_type) FROM forum_votes WHERE votable_type = 'thread' AND votable_id = ft.id) as vote_score,
        (SELECT created_at FROM forum_replies WHERE thread_id = ft.id ORDER BY created_at DESC LIMIT 1) as last_reply_at
      FROM forum_threads ft
      LEFT JOIN users u ON ft.user_id = u.id
      WHERE ft.course_id = ?
      ORDER BY ft.is_pinned DESC, ${orderBy}
      LIMIT ? OFFSET ?
    `, [courseId, limit, offset]);
  }

  /**
   * Crear respuesta
   */
  static async createReply(db, data) {
    const { thread_id, user_id, content, parent_reply_id = null } = data;

    const result = await db.run(`
      INSERT INTO forum_replies (thread_id, user_id, content, parent_reply_id)
      VALUES (?, ?, ?, ?)
    `, [thread_id, user_id, content, parent_reply_id]);

    // Actualizar timestamp del hilo
    await db.run(`
      UPDATE forum_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [thread_id]);

    return this.getReplyById(db, result.lastID);
  }

  /**
   * Obtener respuesta por ID
   */
  static async getReplyById(db, id) {
    return await db.get(`
      SELECT 
        fr.*,
        u.name as author_name,
        u.email as author_email,
        u.role as author_role,
        (SELECT SUM(vote_type) FROM forum_votes WHERE votable_type = 'reply' AND votable_id = fr.id) as vote_score
      FROM forum_replies fr
      LEFT JOIN users u ON fr.user_id = u.id
      WHERE fr.id = ?
    `, [id]);
  }

  /**
   * Obtener respuestas de un hilo
   */
  static async getRepliesByThread(db, threadId) {
    return await db.all(`
      SELECT 
        fr.*,
        u.name as author_name,
        u.email as author_email,
        u.role as author_role,
        (SELECT SUM(vote_type) FROM forum_votes WHERE votable_type = 'reply' AND votable_id = fr.id) as vote_score
      FROM forum_replies fr
      LEFT JOIN users u ON fr.user_id = u.id
      WHERE fr.thread_id = ?
      ORDER BY fr.is_best_answer DESC, fr.created_at ASC
    `, [threadId]);
  }

  /**
   * Votar (upvote/downvote)
   */
  static async vote(db, userId, votableType, votableId, voteType) {
    try {
      await db.run(`
        INSERT INTO forum_votes (user_id, votable_type, votable_id, vote_type)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, votable_type, votable_id) 
        DO UPDATE SET vote_type = ?
      `, [userId, votableType, votableId, voteType, voteType]);

      return true;
    } catch (error) {
      console.error('Error al votar:', error);
      throw error;
    }
  }

  /**
   * Quitar voto
   */
  static async removeVote(db, userId, votableType, votableId) {
    await db.run(`
      DELETE FROM forum_votes
      WHERE user_id = ? AND votable_type = ? AND votable_id = ?
    `, [userId, votableType, votableId]);

    return true;
  }

  /**
   * Obtener voto del usuario
   */
  static async getUserVote(db, userId, votableType, votableId) {
    return await db.get(`
      SELECT vote_type FROM forum_votes
      WHERE user_id = ? AND votable_type = ? AND votable_id = ?
    `, [userId, votableType, votableId]);
  }

  /**
   * Marcar respuesta como mejor respuesta
   */
  static async markAsBestAnswer(db, replyId, threadId, userId) {
    // Verificar que el usuario sea el creador del hilo
    const thread = await db.get(`
      SELECT user_id FROM forum_threads WHERE id = ?
    `, [threadId]);

    if (!thread || thread.user_id !== userId) {
      throw new Error('Solo el creador del hilo puede marcar la mejor respuesta');
    }

    // Quitar marca de mejor respuesta de otras respuestas
    await db.run(`
      UPDATE forum_replies SET is_best_answer = 0
      WHERE thread_id = ?
    `, [threadId]);

    // Marcar la nueva mejor respuesta
    await db.run(`
      UPDATE forum_replies SET is_best_answer = 1
      WHERE id = ? AND thread_id = ?
    `, [replyId, threadId]);

    return true;
  }

  /**
   * Actualizar hilo
   */
  static async updateThread(db, id, userId, data) {
    const { title, content, is_pinned, is_locked } = data;
    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      values.push(content);
    }
    if (is_pinned !== undefined) {
      updates.push('is_pinned = ?');
      values.push(is_pinned ? 1 : 0);
    }
    if (is_locked !== undefined) {
      updates.push('is_locked = ?');
      values.push(is_locked ? 1 : 0);
    }

    if (updates.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id, userId);

    await db.run(`
      UPDATE forum_threads
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `, values);

    return this.getThreadById(db, id);
  }

  /**
   * Eliminar hilo
   */
  static async deleteThread(db, id, userId) {
    await db.run(`
      DELETE FROM forum_threads
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    return true;
  }

  /**
   * Eliminar respuesta
   */
  static async deleteReply(db, id, userId) {
    await db.run(`
      DELETE FROM forum_replies
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    return true;
  }

  /**
   * Buscar en foros
   */
  static async search(db, courseId, query) {
    return await db.all(`
      SELECT 
        ft.*,
        u.name as author_name,
        (SELECT COUNT(*) FROM forum_replies WHERE thread_id = ft.id) as reply_count
      FROM forum_threads ft
      LEFT JOIN users u ON ft.user_id = u.id
      WHERE ft.course_id = ? 
        AND (ft.title LIKE ? OR ft.content LIKE ?)
      ORDER BY ft.updated_at DESC
      LIMIT 20
    `, [courseId, `%${query}%`, `%${query}%`]);
  }
}

module.exports = Forum;
