// Wrapper de Turso (libSQL) que imita la API de sqlite3 callback-style.
// Drop-in replacement de database.js para correr en producción sin disk
// persistente (Render free, Vercel, etc.).
//
// Activación: definir TURSO_DATABASE_URL (libsql://...) y TURSO_AUTH_TOKEN.
// Sin esas env vars, server.js usa el SQLite local de database.js.

const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

class TursoDatabase {
  constructor() {
    this.client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // db: API compatible con sqlite3.Database (callback style).
    // Adapta libsql Promise API → callback (err, ...) que usa el resto del código.
    const client = this.client;
    this.db = {
      run(sql, params, cb) {
        if (typeof params === 'function') { cb = params; params = []; }
        client
          .execute({ sql, args: params || [] })
          .then((r) => {
            const ctx = {
              lastID: r.lastInsertRowid != null ? Number(r.lastInsertRowid) : undefined,
              changes: r.rowsAffected || 0,
            };
            if (cb) cb.call(ctx, null);
          })
          .catch((err) => cb && cb(err));
      },
      get(sql, params, cb) {
        if (typeof params === 'function') { cb = params; params = []; }
        client
          .execute({ sql, args: params || [] })
          .then((r) => cb && cb(null, r.rows[0]))
          .catch((err) => cb && cb(err));
      },
      all(sql, params, cb) {
        if (typeof params === 'function') { cb = params; params = []; }
        client
          .execute({ sql, args: params || [] })
          .then((r) => cb && cb(null, r.rows))
          .catch((err) => cb && cb(err));
      },
      exec(sql, cb) {
        // exec recibe varios statements separados por ;
        const statements = sql
          .split(/;\s*\n/)
          .map((s) => s.trim())
          .filter(Boolean);
        (async () => {
          for (const stmt of statements) {
            await client.execute(stmt);
          }
        })()
          .then(() => cb && cb(null))
          .catch((err) => cb && cb(err));
      },
      serialize(fn) {
        // No-op: Turso atiende por orden de promise.
        if (fn) fn();
      },
      close(cb) {
        client.close();
        if (cb) cb();
      },
    };

    this.init();
  }

  async init() {
    try {
      // Crear schema (idempotente, IF NOT EXISTS)
      const initSQL = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
      const statements = initSQL
        .split(/;\s*\n/)
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith('--'));
      for (const stmt of statements) {
        try {
          await this.client.execute(stmt);
        } catch (e) {
          if (!/already exists|duplicate column/i.test(e.message)) {
            console.error('Error en init Turso:', e.message, '\nSQL:', stmt.slice(0, 100));
          }
        }
      }
      console.log('✅ Conectado a Turso (libSQL) y tablas verificadas');
      await this.createDefaultAdmin();
    } catch (err) {
      console.error('Error inicializando Turso:', err);
    }
  }

  async createDefaultAdmin() {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@campusnorma.com';
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        console.warn('⚠️  ADMIN_PASSWORD no definido — no se crea admin por defecto.');
        return;
      }
      const existing = await this.getUserByEmail(adminEmail);
      if (existing) {
        console.log('✅ Admin ya existe:', adminEmail);
        return;
      }
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash(adminPassword, 10);
      await this.client.execute({
        sql: 'INSERT INTO users (email, password, nombre, tipo) VALUES (?, ?, ?, ?)',
        args: [adminEmail, hash, 'Administrador', 'admin'],
      });
      console.log('✅ Admin creado:', adminEmail);
    } catch (err) {
      console.error('Error en createDefaultAdmin (Turso):', err);
    }
  }

  // Helper para queries Promise-based (más limpio dentro de esta clase)
  async _query(sql, args = []) {
    return this.client.execute({ sql, args });
  }

  // ===========================================================================
  // Métodos heredados de database.js — misma firma, pero implementados con
  // Turso. Mantienen el shape de retorno (Promise<row | rows | { id, changes }>)
  // para que routes/* y server.js no necesiten cambios.
  // ===========================================================================

  async getUserByEmail(email) {
    const r = await this._query('SELECT * FROM users WHERE email = ?', [email]);
    return r.rows[0];
  }

  async getUserById(id) {
    const r = await this._query('SELECT * FROM users WHERE id = ?', [id]);
    return r.rows[0];
  }

  async createUser({ email, password, nombre, tipo = 'alumno' }) {
    const r = await this._query(
      'INSERT INTO users (email, password, nombre, tipo) VALUES (?, ?, ?, ?)',
      [email, password, nombre, tipo]
    );
    return { id: Number(r.lastInsertRowid), email, nombre, tipo };
  }

  async updateUser(id, data) {
    const fields = [];
    const values = [];
    if (data.nombre !== undefined) { fields.push('nombre = ?'); values.push(data.nombre); }
    if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
    if (data.telefono !== undefined) { fields.push('telefono = ?'); values.push(data.telefono); }
    if (data.biografia !== undefined) { fields.push('biografia = ?'); values.push(data.biografia); }
    if (data.password !== undefined) { fields.push('password = ?'); values.push(data.password); }
    if (!fields.length) return { id };
    values.push(id);
    await this._query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return { id, ...data };
  }

  async getAllUsers() {
    const r = await this._query(
      'SELECT id, nombre, email, telefono, biografia, tipo, activo, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return r.rows;
  }

  async deleteUser(userId) {
    const r = await this._query('DELETE FROM users WHERE id = ?', [userId]);
    return { changes: r.rowsAffected };
  }

  async toggleUserStatus(userId) {
    const r = await this._query(
      'UPDATE users SET activo = NOT activo, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );
    return { changes: r.rowsAffected };
  }

  // Cursos
  async createCourse({ nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen }) {
    const r = await this._query(
      'INSERT INTO courses (nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen, publicado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen, 1]
    );
    return { id: Number(r.lastInsertRowid), nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen, publicado: true };
  }

  async getAllCourses() {
    const r = await this._query('SELECT * FROM courses WHERE publicado = 1 ORDER BY created_at DESC');
    return r.rows;
  }

  async getCourseById(id) {
    const r = await this._query('SELECT * FROM courses WHERE id = ?', [id]);
    return r.rows[0];
  }

  async getCoursesByProfessor(professorId) {
    const r = await this._query('SELECT * FROM courses WHERE profesor_id = ? ORDER BY created_at DESC', [professorId]);
    return r.rows;
  }

  async updateCourse(id, { nombre, descripcion, categoria, precio, duracion }) {
    await this._query(
      'UPDATE courses SET nombre = ?, descripcion = ?, categoria = ?, precio = ?, duracion = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [nombre, descripcion, categoria, precio, duracion, id]
    );
    return { id, nombre, descripcion, categoria, precio, duracion };
  }

  async deleteCourse(id) {
    await this._query('DELETE FROM courses WHERE id = ?', [id]);
    return { deleted: true };
  }

  // Inscripciones
  async enrollUser(userId, courseId) {
    const r = await this._query(
      'INSERT INTO enrollments (user_id, course_id) VALUES (?, ?) ON CONFLICT(user_id, course_id) DO NOTHING',
      [userId, courseId]
    );
    return { id: Number(r.lastInsertRowid), user_id: userId, course_id: courseId };
  }

  async getUserEnrollments(userId) {
    const r = await this._query(
      `SELECT e.id as enrollment_id, e.course_id, e.enrolled_at, e.enrolled_at as fecha_inscripcion,
              e.progress, e.completed, c.id, c.nombre, c.descripcion, c.profesor, c.profesor_id,
              c.imagen, c.categoria, c.precio, c.duracion, c.estudiantes, c.rating
       FROM enrollments e INNER JOIN courses c ON c.id = e.course_id
       WHERE e.user_id = ? ORDER BY e.enrolled_at DESC`,
      [userId]
    );
    return r.rows;
  }

  async getCourseEnrollments(courseId) {
    const r = await this._query(
      `SELECT u.id, u.nombre, u.email, e.enrolled_at, e.progress, e.completed
       FROM users u INNER JOIN enrollments e ON u.id = e.user_id
       WHERE e.course_id = ? ORDER BY e.enrolled_at DESC`,
      [courseId]
    );
    return r.rows;
  }

  async isUserEnrolled(userId, courseId) {
    const r = await this._query(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? LIMIT 1',
      [userId, courseId]
    );
    return !!r.rows[0];
  }

  async getModuleCourseId(moduleId) {
    const r = await this._query('SELECT course_id FROM modules WHERE id = ?', [moduleId]);
    return r.rows[0] ? r.rows[0].course_id : null;
  }

  async getLessonCourseId(lessonId) {
    const r = await this._query(
      'SELECT m.course_id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE l.id = ?',
      [lessonId]
    );
    return r.rows[0] ? r.rows[0].course_id : null;
  }

  // Pagos
  async createPayment({ user_id, course_id, amount, payment_id = null, preference_id = null, status = 'pending' }) {
    const r = await this._query(
      'INSERT INTO payments (user_id, course_id, amount, payment_id, preference_id, status) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, course_id, amount, payment_id, preference_id, status]
    );
    return { id: Number(r.lastInsertRowid), user_id, course_id, amount, payment_id, preference_id, status };
  }

  async updatePaymentStatus(paymentId, status) {
    const r = await this._query(
      'UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE payment_id = ?',
      [status, paymentId]
    );
    return { updated: r.rowsAffected > 0 };
  }

  async updatePaymentByPreferenceId(preferenceId, { payment_id, status }) {
    const sets = [];
    const args = [];
    if (payment_id !== undefined) { sets.push('payment_id = ?'); args.push(payment_id); }
    if (status !== undefined) { sets.push('status = ?'); args.push(status); }
    sets.push('updated_at = CURRENT_TIMESTAMP');
    args.push(preferenceId);
    const r = await this._query(`UPDATE payments SET ${sets.join(', ')} WHERE preference_id = ?`, args);
    return { updated: r.rowsAffected > 0 };
  }

  async getPaymentByPreferenceId(preferenceId) {
    const r = await this._query(
      'SELECT * FROM payments WHERE preference_id = ? ORDER BY id DESC LIMIT 1',
      [preferenceId]
    );
    return r.rows[0];
  }

  async getPaymentByPaymentId(paymentId) {
    const r = await this._query('SELECT * FROM payments WHERE payment_id = ?', [paymentId]);
    return r.rows[0];
  }

  // Módulos
  async getCourseModules(courseId) {
    const r = await this._query('SELECT * FROM modules WHERE course_id = ? ORDER BY orden ASC', [courseId]);
    return r.rows;
  }

  async createModule({ course_id, titulo, descripcion, orden, publicado }) {
    const r = await this._query(
      'INSERT INTO modules (course_id, titulo, descripcion, orden, publicado) VALUES (?, ?, ?, ?, ?)',
      [course_id, titulo, descripcion, orden, publicado ? 1 : 0]
    );
    return { id: Number(r.lastInsertRowid), course_id, titulo, descripcion, orden, publicado };
  }

  async updateModule(moduleId, { titulo, descripcion, orden, publicado }) {
    await this._query(
      'UPDATE modules SET titulo = ?, descripcion = ?, orden = ?, publicado = ? WHERE id = ?',
      [titulo, descripcion, orden, publicado ? 1 : 0, moduleId]
    );
    return { id: moduleId, titulo, descripcion, orden, publicado };
  }

  async deleteModule(moduleId) {
    await this._query('DELETE FROM lessons WHERE module_id = ?', [moduleId]);
    const r = await this._query('DELETE FROM modules WHERE id = ?', [moduleId]);
    return { deleted: r.rowsAffected };
  }

  // Lecciones
  async getModuleLessons(moduleId) {
    const r = await this._query('SELECT * FROM lessons WHERE module_id = ? ORDER BY orden ASC', [moduleId]);
    return r.rows.map((l) => ({ ...l, recursos: l.recursos ? JSON.parse(l.recursos) : [] }));
  }

  async createLesson({ module_id, titulo, contenido, tipo, orden, duracion, recursos, publicado }) {
    const recursosStr = typeof recursos === 'string' ? recursos : (recursos ? JSON.stringify(recursos) : null);
    const r = await this._query(
      'INSERT INTO lessons (module_id, titulo, contenido, tipo, orden, duracion, recursos, publicado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [module_id, titulo, contenido, tipo, orden, duracion, recursosStr, publicado ? 1 : 0]
    );
    const out = { id: Number(r.lastInsertRowid), module_id, titulo, contenido, tipo, orden, duracion, publicado };
    out.recursos = recursosStr ? JSON.parse(recursosStr) : [];
    return out;
  }

  async updateLesson(lessonId, { titulo, contenido, tipo, orden, duracion, recursos, publicado }) {
    const recursosStr = typeof recursos === 'string' ? recursos : (recursos ? JSON.stringify(recursos) : null);
    await this._query(
      'UPDATE lessons SET titulo = ?, contenido = ?, tipo = ?, orden = ?, duracion = ?, recursos = ?, publicado = ? WHERE id = ?',
      [titulo, contenido, tipo, orden, duracion, recursosStr, publicado ? 1 : 0, lessonId]
    );
    return { id: lessonId, titulo, contenido, tipo, orden, duracion, publicado, recursos: recursosStr ? JSON.parse(recursosStr) : [] };
  }

  async deleteLesson(lessonId) {
    await this._query('DELETE FROM lesson_progress WHERE lesson_id = ?', [lessonId]);
    const r = await this._query('DELETE FROM lessons WHERE id = ?', [lessonId]);
    return { deleted: r.rowsAffected };
  }

  // Progreso
  async markLessonComplete(userId, lessonId) {
    await this._query(
      'INSERT INTO lesson_progress (user_id, lesson_id, completed, completed_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP) ' +
      'ON CONFLICT(user_id, lesson_id) DO UPDATE SET completed = 1, completed_at = CURRENT_TIMESTAMP',
      [userId, lessonId]
    );
    return { userId, lessonId, completed: true };
  }

  async getCourseProgress(userId, courseId) {
    const r = await this._query(
      `SELECT m.id as module_id, m.titulo as module_title, l.id as lesson_id,
              l.titulo as lesson_title,
              CASE WHEN lp.completed IS NOT NULL THEN lp.completed ELSE 0 END as completed
       FROM modules m
       LEFT JOIN lessons l ON m.id = l.module_id
       LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = ?
       WHERE m.course_id = ?
       ORDER BY m.orden, l.orden`,
      [userId, courseId]
    );
    const progress = {};
    r.rows.forEach((row) => {
      if (!progress[row.module_id]) {
        progress[row.module_id] = { moduleId: row.module_id, moduleTitle: row.module_title, lessons: [] };
      }
      if (row.lesson_id) {
        progress[row.module_id].lessons.push({
          lessonId: row.lesson_id,
          lessonTitle: row.lesson_title,
          completed: Boolean(row.completed),
        });
      }
    });
    return Object.values(progress);
  }

  async getStudentCourseProgress(userId, courseId) {
    const r = await this._query(
      `SELECT COUNT(DISTINCT l.id) as total_lessons,
              COUNT(DISTINCT CASE WHEN lp.completed = 1 THEN lp.lesson_id END) as completed_lessons,
              MAX(lp.completed_at) as last_activity
       FROM modules m
       LEFT JOIN lessons l ON m.id = l.module_id
       LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = ?
       WHERE m.course_id = ?`,
      [userId, courseId]
    );
    return r.rows[0] || { total_lessons: 0, completed_lessons: 0, last_activity: null };
  }

  // Eventos
  async getEventsForProfessor(professorId) {
    const r = await this._query(
      `SELECT e.*, c.nombre as course_name FROM events e
       LEFT JOIN courses c ON e.course_id = c.id
       WHERE e.instructor_id = ? OR c.profesor_id = ?
       ORDER BY e.start_date ASC`,
      [professorId, professorId]
    );
    return r.rows;
  }

  async getEventsForStudent(studentId) {
    const r = await this._query(
      `SELECT e.*, c.nombre as course_name FROM events e
       JOIN courses c ON e.course_id = c.id
       JOIN enrollments en ON en.course_id = c.id
       WHERE en.user_id = ? AND e.status != 'cancelled'
       ORDER BY e.start_date ASC`,
      [studentId]
    );
    return r.rows;
  }

  async createEvent(eventData) {
    const r = await this._query(
      'INSERT INTO events (title, description, start_date, end_date, type, course_id, instructor_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [eventData.title, eventData.description, eventData.startDate, eventData.endDate, eventData.type, eventData.courseId, eventData.instructorId]
    );
    return Number(r.lastInsertRowid);
  }

  async getEventById(eventId) {
    const r = await this._query(
      'SELECT e.*, c.nombre as course_name FROM events e LEFT JOIN courses c ON e.course_id = c.id WHERE e.id = ?',
      [eventId]
    );
    return r.rows[0];
  }

  async updateEvent(eventId, eventData, instructorId) {
    const r = await this._query(
      'UPDATE events SET title = ?, description = ?, start_date = ?, end_date = ?, type = ?, status = ? WHERE id = ? AND instructor_id = ?',
      [eventData.title, eventData.description, eventData.startDate, eventData.endDate, eventData.type, eventData.status, eventId, instructorId]
    );
    return r.rowsAffected > 0;
  }

  async deleteEvent(eventId, instructorId) {
    const r = await this._query('DELETE FROM events WHERE id = ? AND instructor_id = ?', [eventId, instructorId]);
    return r.rowsAffected > 0;
  }

  // Mensajes de curso
  async getCourseMessages(courseId) {
    const r = await this._query(
      `SELECT cm.*, u.nombre as user_name FROM course_messages cm
       LEFT JOIN users u ON cm.user_id = u.id
       WHERE cm.course_id = ? ORDER BY cm.timestamp ASC`,
      [courseId]
    );
    return r.rows || [];
  }

  async createCourseMessage({ course_id, user_id, message, timestamp }) {
    const r = await this._query(
      'INSERT INTO course_messages (course_id, user_id, message, timestamp) VALUES (?, ?, ?, ?)',
      [course_id, user_id, message, timestamp]
    );
    return { id: Number(r.lastInsertRowid), course_id, user_id, message, timestamp };
  }

  // Recursos del curso
  async getCourseResources(courseId) {
    const r = await this._query(
      `SELECT cr.*, u.nombre as uploaded_by_name FROM course_resources cr
       LEFT JOIN users u ON cr.uploaded_by = u.id
       WHERE cr.course_id = ? ORDER BY cr.created_at DESC`,
      [courseId]
    );
    return r.rows || [];
  }

  async createCourseResource({ course_id, title, description, type, url, uploaded_by }) {
    const r = await this._query(
      'INSERT INTO course_resources (course_id, title, description, type, url, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
      [course_id, title, description, type, url, uploaded_by]
    );
    return { id: Number(r.lastInsertRowid), course_id, title, description, type, url, uploaded_by };
  }

  // Calificaciones
  async getCourseGrades(courseId) {
    const r = await this._query(
      `SELECT g.*, u.nombre as student_name, p.nombre as professor_name, c.nombre as course_name
       FROM grades g
       LEFT JOIN users u ON g.user_id = u.id
       LEFT JOIN users p ON g.professor_id = p.id
       LEFT JOIN courses c ON g.course_id = c.id
       WHERE g.course_id = ? ORDER BY g.created_at DESC`,
      [courseId]
    );
    return r.rows || [];
  }

  async getUserCourseGrades(courseId, userId) {
    const r = await this._query(
      `SELECT g.*, p.nombre as professor_name, c.nombre as course_name
       FROM grades g
       LEFT JOIN users p ON g.professor_id = p.id
       LEFT JOIN courses c ON g.course_id = c.id
       WHERE g.course_id = ? AND g.user_id = ? ORDER BY g.created_at DESC`,
      [courseId, userId]
    );
    return r.rows || [];
  }

  async createOrUpdateGrade({ course_id, user_id, professor_id, grade, feedback, assignment_type = 'general' }) {
    const existing = await this._query(
      'SELECT id FROM grades WHERE course_id = ? AND user_id = ? AND assignment_type = ?',
      [course_id, user_id, assignment_type]
    );
    if (existing.rows[0]) {
      await this._query(
        'UPDATE grades SET grade = ?, feedback = ?, professor_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [grade, feedback, professor_id, existing.rows[0].id]
      );
      return { id: existing.rows[0].id, course_id, user_id, professor_id, grade, feedback, updated: true };
    }
    const r = await this._query(
      'INSERT INTO grades (course_id, user_id, professor_id, grade, feedback, assignment_type) VALUES (?, ?, ?, ?, ?, ?)',
      [course_id, user_id, professor_id, grade, feedback, assignment_type]
    );
    return { id: Number(r.lastInsertRowid), course_id, user_id, professor_id, grade, feedback, created: true };
  }

  // Activity log
  async logActivity({ userId, userName, userRole, actionType, actionDescription, entityType = null, entityId = null, entityName = null, ipAddress = null, userAgent = null }) {
    const r = await this._query(
      `INSERT INTO activity_logs (user_id, user_name, user_role, action_type, action_description, entity_type, entity_id, entity_name, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, userName, userRole, actionType, actionDescription, entityType, entityId, entityName, ipAddress, userAgent]
    );
    return { id: Number(r.lastInsertRowid) };
  }

  async getActivityLogs(filters = {}) {
    let query = 'SELECT * FROM activity_logs WHERE 1=1';
    const args = [];
    if (filters.userId) { query += ' AND user_id = ?'; args.push(filters.userId); }
    if (filters.actionType) { query += ' AND action_type = ?'; args.push(filters.actionType); }
    if (filters.entityType) { query += ' AND entity_type = ?'; args.push(filters.entityType); }
    if (filters.startDate) { query += ' AND created_at >= ?'; args.push(filters.startDate); }
    if (filters.endDate) { query += ' AND created_at <= ?'; args.push(filters.endDate); }
    query += ' ORDER BY created_at DESC';
    if (filters.limit) { query += ' LIMIT ?'; args.push(filters.limit); }
    if (filters.offset) { query += ' OFFSET ?'; args.push(filters.offset); }
    const r = await this._query(query, args);
    return r.rows;
  }

  async countActivityLogs(filters = {}) {
    let query = 'SELECT COUNT(*) as total FROM activity_logs WHERE 1=1';
    const args = [];
    if (filters.userId) { query += ' AND user_id = ?'; args.push(filters.userId); }
    if (filters.actionType) { query += ' AND action_type = ?'; args.push(filters.actionType); }
    if (filters.entityType) { query += ' AND entity_type = ?'; args.push(filters.entityType); }
    if (filters.startDate) { query += ' AND created_at >= ?'; args.push(filters.startDate); }
    if (filters.endDate) { query += ' AND created_at <= ?'; args.push(filters.endDate); }
    const r = await this._query(query, args);
    return r.rows[0].total;
  }

  // Quizzes
  async getQuizzesForProfessor(professorId, courseId = null) {
    let sql = `SELECT q.*, c.nombre as course_name FROM quizzes q JOIN courses c ON q.course_id = c.id WHERE q.instructor_id = ?`;
    const args = [professorId];
    if (courseId) { sql += ' AND q.course_id = ?'; args.push(courseId); }
    sql += ' ORDER BY q.created_at DESC';
    const r = await this._query(sql, args);
    return r.rows;
  }

  async getQuizzesForStudent(studentId, courseId = null) {
    let sql = `SELECT q.*, c.nombre as course_name FROM quizzes q
               JOIN courses c ON q.course_id = c.id
               JOIN enrollments e ON e.course_id = c.id
               WHERE e.user_id = ? AND q.is_active = 1`;
    const args = [studentId];
    if (courseId) { sql += ' AND q.course_id = ?'; args.push(courseId); }
    sql += ' ORDER BY q.created_at DESC';
    const r = await this._query(sql, args);
    return r.rows;
  }

  async createQuiz(quizData) {
    const r = await this._query(
      'INSERT INTO quizzes (title, description, course_id, instructor_id, time_limit, attempts_allowed, passing_score) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [quizData.title, quizData.description, quizData.courseId, quizData.instructorId, quizData.timeLimit, quizData.attemptsAllowed, quizData.passingScore]
    );
    const quizId = Number(r.lastInsertRowid);
    for (const [index, q] of (quizData.questions || []).entries()) {
      await this._query(
        'INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points, explanation, order_num) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [quizId, q.question, q.type, JSON.stringify(q.options || []), q.correctAnswer, q.points || 1, q.explanation || '', index + 1]
      );
    }
    return quizId;
  }

  async getQuizWithQuestions(quizId, _userId) {
    const q = await this._query(
      'SELECT q.*, c.nombre as course_name FROM quizzes q JOIN courses c ON q.course_id = c.id WHERE q.id = ?',
      [quizId]
    );
    const quiz = q.rows[0];
    if (!quiz) return null;
    const questions = await this._query(
      'SELECT id, question_text, question_type, options, points, explanation, order_num FROM quiz_questions WHERE quiz_id = ? ORDER BY order_num ASC',
      [quizId]
    );
    quiz.questions = questions.rows.map((qq) => ({ ...qq, options: JSON.parse(qq.options || '[]') }));
    return quiz;
  }

  async submitQuizAttempt(quizId, userId, answers, timeSpent) {
    const rows = await this._query(
      'SELECT q.*, qq.id as question_id, qq.correct_answer, qq.points FROM quizzes q JOIN quiz_questions qq ON qq.quiz_id = q.id WHERE q.id = ? ORDER BY qq.order_num ASC',
      [quizId]
    );
    if (!rows.rows.length) throw new Error('Quiz no encontrado');
    let score = 0;
    let maxScore = 0;
    rows.rows.forEach((row) => {
      maxScore += row.points;
      const userAnswer = answers[row.question_id];
      if (userAnswer && userAnswer.toString() === row.correct_answer.toString()) score += row.points;
    });
    const r = await this._query(
      `INSERT INTO quiz_attempts (quiz_id, user_id, answers, score, max_score, time_spent, completed, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
      [quizId, userId, JSON.stringify(answers), score, maxScore, timeSpent || 0]
    );
    return {
      id: Number(r.lastInsertRowid),
      score,
      maxScore,
      percentage: Math.round((score / maxScore) * 100),
      passed: score >= (rows.rows[0].passing_score * maxScore / 100),
    };
  }

  async getQuizAttempts(quizId) {
    const r = await this._query(
      `SELECT qa.*, u.nombre as user_name, u.email as user_email
       FROM quiz_attempts qa JOIN users u ON qa.user_id = u.id
       WHERE qa.quiz_id = ? ORDER BY qa.completed_at DESC`,
      [quizId]
    );
    return r.rows;
  }

  async getUserQuizAttempts(quizId, userId) {
    const r = await this._query(
      'SELECT * FROM quiz_attempts WHERE quiz_id = ? AND user_id = ? ORDER BY completed_at DESC',
      [quizId, userId]
    );
    return r.rows;
  }

  close() {
    return new Promise((resolve) => {
      this.client.close();
      resolve();
    });
  }
}

module.exports = new TursoDatabase();
