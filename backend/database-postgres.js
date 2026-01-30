const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

class Database {
  constructor() {
    this.pool = null;
    this.init();
  }

  init() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } // Supabase siempre requiere SSL
    });

    this.pool.on('error', (err) => {
      console.error('Error inesperado en cliente PostgreSQL:', err);
    });

    console.log('✅ Conectado a PostgreSQL (Supabase)');
    this.testConnection();
  }

  async testConnection() {
    try {
      const result = await this.pool.query('SELECT NOW()');
      console.log('✅ Conexión a Supabase exitosa:', result.rows[0].now);
    } catch (error) {
      console.warn('⚠️  Advertencia: No se pudo conectar a Supabase:', error.message);
      console.warn('⚠️  El servidor continuará ejecutándose. Verifica tu conexión a internet y las credenciales de Supabase.');
    }
  }

  // ==========================================
  // MÉTODOS PARA USUARIOS (profiles)
  // ==========================================
  
  async getUserByEmail(email) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM profiles WHERE email = $1',
        [email]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error en getUserByEmail:', error);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM profiles WHERE id = $1',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error en getUserById:', error);
      throw error;
    }
  }

  async createUser(email, password, nombre, role = 'student') {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await this.pool.query(
        'INSERT INTO profiles (email, password, nombre, role, activo) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [email, hashedPassword, nombre, role, true]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error en createUser:', error);
      throw error;
    }
  }

  async getAllUsers() {
    try {
      const result = await this.pool.query(
        'SELECT id, email, nombre, role, activo, created_at, avatar_url, biografia, telefono FROM profiles ORDER BY created_at DESC'
      );
      return result.rows;
    } catch (error) {
      console.error('Error en getAllUsers:', error);
      throw error;
    }
  }

  async updateUser(id, updates) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(updates[key]);
          paramCount++;
        }
      });

      if (fields.length === 0) return null;

      const query = `UPDATE profiles SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;
      values.push(id);

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error en updateUser:', error);
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      await this.pool.query('DELETE FROM profiles WHERE id = $1', [id]);
      return { success: true };
    } catch (error) {
      console.error('Error en deleteUser:', error);
      throw error;
    }
  }

  // ==========================================
  // MÉTODOS PARA CURSOS
  // ==========================================

  async getAllCourses(filters = {}) {
    try {
      let query = 'SELECT * FROM courses WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (filters.published !== undefined) {
        query += ` AND published = $${paramCount}`;
        params.push(filters.published);
        paramCount++;
      }

      if (filters.categoria) {
        query += ` AND categoria = $${paramCount}`;
        params.push(filters.categoria);
        paramCount++;
      }

      query += ' ORDER BY created_at DESC';

      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error en getAllCourses:', error);
      throw error;
    }
  }

  async getCourseById(id) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM courses WHERE id = $1',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error en getCourseById:', error);
      throw error;
    }
  }

  async createCourse(courseData) {
    try {
      const {
        title, description, profesor, instructor_id, categoria,
        precio = 0, duracion, level = 'beginner', published = false, image_url
      } = courseData;

      const result = await this.pool.query(
        `INSERT INTO courses (title, description, profesor, instructor_id, categoria, precio, duracion, level, published, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [title, description, profesor, instructor_id, categoria, precio, duracion, level, published, image_url]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error en createCourse:', error);
      throw error;
    }
  }

  async updateCourse(id, updates) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(updates[key]);
          paramCount++;
        }
      });

      if (fields.length === 0) return null;

      const query = `UPDATE courses SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;
      values.push(id);

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error en updateCourse:', error);
      throw error;
    }
  }

  async deleteCourse(id) {
    try {
      await this.pool.query('DELETE FROM courses WHERE id = $1', [id]);
      return { success: true };
    } catch (error) {
      console.error('Error en deleteCourse:', error);
      throw error;
    }
  }

  // ==========================================
  // MÉTODOS PARA LECCIONES
  // ==========================================

  async getLessonsByCourseId(courseId) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM lessons WHERE course_id = $1 ORDER BY order_index ASC',
        [courseId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error en getLessonsByCourseId:', error);
      throw error;
    }
  }

  async createLesson(lessonData) {
    try {
      const {
        title, content, content_type = 'texto', order_index = 1,
        course_id, video_url, pdf_url, published = false
      } = lessonData;

      const result = await this.pool.query(
        `INSERT INTO lessons (title, content, content_type, order_index, course_id, video_url, pdf_url, published)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [title, content, content_type, order_index, course_id, video_url, pdf_url, published]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error en createLesson:', error);
      throw error;
    }
  }

  async updateLesson(id, updates) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(updates[key]);
          paramCount++;
        }
      });

      if (fields.length === 0) return null;

      const query = `UPDATE lessons SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      values.push(id);

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error en updateLesson:', error);
      throw error;
    }
  }

  async deleteLesson(id) {
    try {
      await this.pool.query('DELETE FROM lessons WHERE id = $1', [id]);
      return { success: true };
    } catch (error) {
      console.error('Error en deleteLesson:', error);
      throw error;
    }
  }

  // ==========================================
  // MÉTODOS PARA INSCRIPCIONES
  // ==========================================

  async enrollUser(userId, courseId) {
    try {
      const result = await this.pool.query(
        'INSERT INTO enrollments (user_id, course_id, progress, completed) VALUES ($1, $2, 0, false) RETURNING *',
        [userId, courseId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error en enrollUser:', error);
      throw error;
    }
  }

  async getUserEnrollments(userId) {
    try {
      const result = await this.pool.query(
        `SELECT e.*, c.title, c.description, c.profesor, c.image_url, c.categoria
         FROM enrollments e
         JOIN courses c ON e.course_id = c.id
         WHERE e.user_id = $1
         ORDER BY e.created_at DESC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error en getUserEnrollments:', error);
      throw error;
    }
  }

  async isUserEnrolled(userId, courseId) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
        [userId, courseId]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error en isUserEnrolled:', error);
      throw error;
    }
  }

  async getCourseEnrollments(courseId) {
    try {
      const result = await this.pool.query(
        `SELECT e.*, p.nombre, p.email, p.avatar_url
         FROM enrollments e
         JOIN profiles p ON e.user_id = p.id
         WHERE e.course_id = $1
         ORDER BY e.created_at DESC`,
        [courseId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error en getCourseEnrollments:', error);
      throw error;
    }
  }

  // ==========================================
  // MÉTODOS PARA MENSAJES/CHAT
  // ==========================================

  async getMessages(conversationId, limit = 50) {
    try {
      const result = await this.pool.query(
        `SELECT m.*, p.nombre, p.avatar_url
         FROM messages m
         JOIN profiles p ON m.user_id = p.id
         WHERE m.conversation_id = $1
         ORDER BY m.created_at DESC
         LIMIT $2`,
        [conversationId, limit]
      );
      return result.rows.reverse();
    } catch (error) {
      console.error('Error en getMessages:', error);
      throw error;
    }
  }

  async createMessage(messageData) {
    try {
      const { conversation_id, user_id, message } = messageData;
      const result = await this.pool.query(
        'INSERT INTO messages (conversation_id, user_id, message) VALUES ($1, $2, $3) RETURNING *',
        [conversation_id, user_id, message]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error en createMessage:', error);
      throw error;
    }
  }

  // ==========================================
  // MÉTODOS PARA NOTIFICACIONES
  // ==========================================

  async createNotification(notificationData) {
    try {
      const { user_id, title, message, type = 'info', action_url } = notificationData;
      const result = await this.pool.query(
        'INSERT INTO notifications (user_id, title, message, type, action_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [user_id, title, message, type, action_url]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error en createNotification:', error);
      throw error;
    }
  }

  async getUserNotifications(userId, limit = 50) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
        [userId, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error en getUserNotifications:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId) {
    try {
      await this.pool.query(
        'UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = $1',
        [notificationId]
      );
      return { success: true };
    } catch (error) {
      console.error('Error en markNotificationAsRead:', error);
      throw error;
    }
  }

  // ==========================================
  // MÉTODOS PARA ACTIVITY LOGS
  // ==========================================

  async createActivityLog(logData) {
    try {
      const {
        user_id, user_name, user_role, action_type, action_description,
        entity_type, entity_id, entity_name, ip_address, user_agent
      } = logData;

      await this.pool.query(
        `INSERT INTO activity_logs (user_id, user_name, user_role, action_type, action_description, 
         entity_type, entity_id, entity_name, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [user_id, user_name, user_role, action_type, action_description,
         entity_type, entity_id, entity_name, ip_address, user_agent]
      );

      return { success: true };
    } catch (error) {
      console.error('Error en createActivityLog:', error);
      throw error;
    }
  }

  async getActivityLogs(filters = {}, limit = 100) {
    try {
      let query = 'SELECT * FROM activity_logs WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (filters.user_id) {
        query += ` AND user_id = $${paramCount}`;
        params.push(filters.user_id);
        paramCount++;
      }

      if (filters.action_type) {
        query += ` AND action_type = $${paramCount}`;
        params.push(filters.action_type);
        paramCount++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
      params.push(limit);

      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error en getActivityLogs:', error);
      throw error;
    }
  }

  // ==========================================
  // CLOSE CONNECTION
  // ==========================================

  async close() {
    await this.pool.end();
  }
}

// Exportar una instancia única
const database = new Database();
module.exports = database;
