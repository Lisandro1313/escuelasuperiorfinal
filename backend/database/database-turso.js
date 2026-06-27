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

    // libSQL no acepta `undefined` en args (sqlite3 sí, lo trata como NULL).
    // Convertimos undefined → null para mantener compatibilidad.
    const sanitize = (a) => (Array.isArray(a) ? a.map((v) => (v === undefined ? null : v)) : []);

    // db: API compatible con sqlite3.Database (callback style).
    // Adapta libsql Promise API → callback (err, ...) que usa el resto del código.
    const client = this.client;
    this.db = {
      run(sql, params, cb) {
        if (typeof params === 'function') { cb = params; params = []; }
        client
          .execute({ sql, args: sanitize(params) })
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
          .execute({ sql, args: sanitize(params) })
          .then((r) => cb && cb(null, r.rows[0]))
          .catch((err) => cb && cb(err));
      },
      all(sql, params, cb) {
        if (typeof params === 'function') { cb = params; params = []; }
        client
          .execute({ sql, args: sanitize(params) })
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
      const initSQL = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
      // executeMultiple: API nativa de libSQL que ejecuta varios statements
      // separados por ; en una sola llamada (preserva CREATE TABLE + INDEX).
      try {
        await this.client.executeMultiple(initSQL);
      } catch (e) {
        // Algunos statements pueden fallar por "already exists" — los ignoramos.
        // Si falla todo, intentamos statement por statement como fallback.
        const stmts = initSQL
          .split(/;\s*(?:\r?\n|$)/)
          .map((s) =>
            s
              .split(/\r?\n/)
              .filter((line) => !line.trim().startsWith('--'))
              .join('\n')
              .trim()
          )
          .filter(Boolean);
        for (const stmt of stmts) {
          try {
            await this.client.execute(stmt);
          } catch (err) {
            if (!/already exists|duplicate column|no such column/i.test(err.message)) {
              console.error('Error en init Turso:', err.message, '\nSQL:', stmt.slice(0, 120));
            }
          }
        }
      }
      await this.runMigrations();
      console.log('✅ Conectado a Turso (libSQL) y tablas verificadas');
      await this.createDefaultAdmin();
    } catch (err) {
      console.error('Error inicializando Turso:', err);
    }
  }

  // Migraciones idempotentes para bases que ya existian (CREATE TABLE IF NOT
  // EXISTS no agrega columnas). Paridad con database.js. Ignora "duplicate column".
  async runMigrations() {
    const alters = [
      `ALTER TABLE users ADD COLUMN telefono VARCHAR(20)`,
      `ALTER TABLE users ADD COLUMN biografia TEXT`,
      `ALTER TABLE users ADD COLUMN avatar VARCHAR(500)`,
      `ALTER TABLE lessons ADD COLUMN recursos TEXT`,
      `ALTER TABLE courses ADD COLUMN modalidad_precio VARCHAR(20) DEFAULT 'curso'`,
      `ALTER TABLE courses ADD COLUMN drip_habilitado BOOLEAN DEFAULT 0`,
      `ALTER TABLE courses ADD COLUMN drip_intervalo_dias INTEGER`,
      `ALTER TABLE courses ADD COLUMN unlock_mode VARCHAR(20) DEFAULT 'abierto'`,
      `ALTER TABLE courses ADD COLUMN certificado_habilitado BOOLEAN DEFAULT 0`,
      `ALTER TABLE courses ADD COLUMN firma_url TEXT`,
      `ALTER TABLE courses ADD COLUMN firmante TEXT`,
      `ALTER TABLE courses ADD COLUMN firma2_url TEXT`,
      `ALTER TABLE courses ADD COLUMN firmante2 TEXT`,
      `ALTER TABLE modules ADD COLUMN precio DECIMAL(10,2) DEFAULT 0`,
      `ALTER TABLE modules ADD COLUMN unlock_at DATETIME`,
      `ALTER TABLE modules ADD COLUMN unlock_days_offset INTEGER`,
      `ALTER TABLE lessons ADD COLUMN precio DECIMAL(10,2) DEFAULT 0`,
      `ALTER TABLE lessons ADD COLUMN unlock_at DATETIME`,
      `ALTER TABLE lessons ADD COLUMN unlock_days_offset INTEGER`,
      `ALTER TABLE lessons ADD COLUMN objetivos TEXT`,
      `ALTER TABLE lessons ADD COLUMN portada TEXT`,
      `ALTER TABLE payments ADD COLUMN module_id INTEGER`,
      `ALTER TABLE payments ADD COLUMN lesson_id INTEGER`,
      `ALTER TABLE payments ADD COLUMN target_type VARCHAR(20) DEFAULT 'course'`,
      `ALTER TABLE payments ADD COLUMN event_id INTEGER`,
      `ALTER TABLE events ADD COLUMN precio DECIMAL(10,2) DEFAULT 0`,
      `ALTER TABLE events ADD COLUMN meeting_url TEXT`,
      `ALTER TABLE events ADD COLUMN cover_url TEXT`,
      `ALTER TABLE access_grants ADD COLUMN event_id INTEGER`,
    ];
    for (const sql of alters) {
      try {
        await this.client.execute(sql);
      } catch (err) {
        if (!/duplicate column|already exists/i.test(err.message)) {
          console.error('Migracion Turso fallo:', err.message, '\nSQL:', sql);
        }
      }
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

  // Helper para queries Promise-based (más limpio dentro de esta clase).
  // Sanitiza undefined → null porque libSQL los rechaza (sqlite3 los acepta).
  async _query(sql, args = []) {
    const safeArgs = (args || []).map((v) => (v === undefined ? null : v));
    return this.client.execute({ sql, args: safeArgs });
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
  async createCourse({ nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen, modalidad_precio = 'curso', drip_habilitado = false, drip_intervalo_dias = null, unlock_mode = 'abierto' }) {
    const r = await this._query(
      'INSERT INTO courses (nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen, modalidad_precio, drip_habilitado, drip_intervalo_dias, unlock_mode, publicado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen, modalidad_precio, drip_habilitado ? 1 : 0, drip_intervalo_dias, unlock_mode, 1]
    );
    return { id: Number(r.lastInsertRowid), nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen, modalidad_precio, drip_habilitado, drip_intervalo_dias, unlock_mode, publicado: true };
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

  async updateCourse(id, { nombre, descripcion, categoria, precio, duracion, imagen = null, modalidad_precio = 'curso', drip_habilitado = false, drip_intervalo_dias = null, unlock_mode = 'abierto', certificado_habilitado, firma_url = null, firmante = null, firma2_url = null, firmante2 = null }) {
    await this._query(
      'UPDATE courses SET nombre = ?, descripcion = ?, categoria = ?, precio = ?, duracion = ?, imagen = COALESCE(?, imagen), modalidad_precio = ?, drip_habilitado = ?, drip_intervalo_dias = ?, unlock_mode = ?, certificado_habilitado = ?, firma_url = COALESCE(?, firma_url), firmante = COALESCE(?, firmante), firma2_url = COALESCE(?, firma2_url), firmante2 = COALESCE(?, firmante2), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [nombre, descripcion, categoria, precio, duracion, imagen, modalidad_precio, drip_habilitado ? 1 : 0, drip_intervalo_dias, unlock_mode, certificado_habilitado ? 1 : 0, firma_url, firmante, firma2_url, firmante2, id]
    );
    return { id, nombre, descripcion, categoria, precio, duracion, imagen, modalidad_precio, drip_habilitado, drip_intervalo_dias, unlock_mode };
  }

  async deleteCourse(id) {
    // Borramos dependientes primero (Turso enforced FK). Tolera errores por tabla.
    const tryRun = async (sql) => { try { await this._query(sql, [id]); } catch (_) { /* tabla ausente o sin filas */ } };
    await tryRun('DELETE FROM lesson_progress WHERE lesson_id IN (SELECT l.id FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = ?)');
    await tryRun('DELETE FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id = ?)');
    await tryRun('DELETE FROM modules WHERE course_id = ?');
    await tryRun('DELETE FROM enrollments WHERE course_id = ?');
    await tryRun('DELETE FROM access_grants WHERE course_id = ?');
    await tryRun('DELETE FROM payments WHERE course_id = ?');
    await tryRun('DELETE FROM course_messages WHERE course_id = ?');
    await tryRun('DELETE FROM events WHERE course_id = ?');
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

  async createModule({ course_id, titulo, descripcion, orden, precio = 0, unlock_at = null, unlock_days_offset = null, publicado }) {
    const r = await this._query(
      'INSERT INTO modules (course_id, titulo, descripcion, orden, precio, unlock_at, unlock_days_offset, publicado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [course_id, titulo, descripcion, orden, precio, unlock_at, unlock_days_offset, publicado ? 1 : 0]
    );
    return { id: Number(r.lastInsertRowid), course_id, titulo, descripcion, orden, precio, unlock_at, unlock_days_offset, publicado };
  }

  async updateModule(moduleId, { titulo, descripcion, orden, precio = 0, unlock_at = null, unlock_days_offset = null, publicado }) {
    await this._query(
      'UPDATE modules SET titulo = ?, descripcion = ?, orden = ?, precio = ?, unlock_at = ?, unlock_days_offset = ?, publicado = ? WHERE id = ?',
      [titulo, descripcion, orden, precio, unlock_at, unlock_days_offset, publicado ? 1 : 0, moduleId]
    );
    return { id: moduleId, titulo, descripcion, orden, precio, unlock_at, unlock_days_offset, publicado };
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

  async createLesson({ module_id, titulo, contenido, tipo, orden, precio = 0, unlock_at = null, unlock_days_offset = null, duracion, recursos, objetivos = null, publicado }) {
    const recursosStr = typeof recursos === 'string' ? recursos : (recursos ? JSON.stringify(recursos) : null);
    const r = await this._query(
      'INSERT INTO lessons (module_id, titulo, contenido, tipo, orden, precio, unlock_at, unlock_days_offset, duracion, recursos, objetivos, publicado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [module_id, titulo, contenido, tipo, orden, precio, unlock_at, unlock_days_offset, duracion, recursosStr, objetivos, publicado ? 1 : 0]
    );
    const out = { id: Number(r.lastInsertRowid), module_id, titulo, contenido, tipo, orden, precio, unlock_at, unlock_days_offset, duracion, objetivos, publicado };
    out.recursos = recursosStr ? JSON.parse(recursosStr) : [];
    return out;
  }

  async updateLesson(lessonId, { titulo, contenido, tipo, orden, precio = 0, unlock_at = null, unlock_days_offset = null, duracion, recursos, objetivos = null, publicado }) {
    const recursosStr = typeof recursos === 'string' ? recursos : (recursos ? JSON.stringify(recursos) : null);
    await this._query(
      'UPDATE lessons SET titulo = ?, contenido = ?, tipo = ?, orden = ?, precio = ?, unlock_at = ?, unlock_days_offset = ?, duracion = ?, recursos = ?, objetivos = ?, publicado = ? WHERE id = ?',
      [titulo, contenido, tipo, orden, precio, unlock_at, unlock_days_offset, duracion, recursosStr, objetivos, publicado ? 1 : 0, lessonId]
    );
    return { id: lessonId, titulo, contenido, tipo, orden, precio, unlock_at, unlock_days_offset, duracion, objetivos, publicado, recursos: recursosStr ? JSON.parse(recursosStr) : [] };
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
      'INSERT INTO events (title, description, start_date, end_date, type, course_id, instructor_id, precio, meeting_url, cover_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [eventData.title, eventData.description, eventData.startDate, eventData.endDate, eventData.type, eventData.courseId, eventData.instructorId, Number(eventData.precio || 0), eventData.meetingUrl || null, eventData.coverUrl || null]
    );
    return Number(r.lastInsertRowid);
  }

  // Proximas clases en vivo publicadas (para el inicio). Sin la URL.
  async getUpcomingLiveClasses(limit = 6) {
    const r = await this._query(
      `SELECT e.id, e.title, e.start_date, e.end_date, e.precio, e.cover_url,
              e.course_id, c.nombre as course_nombre, u.nombre as instructor_nombre
       FROM events e
       LEFT JOIN courses c ON c.id = e.course_id
       LEFT JOIN users u ON u.id = e.instructor_id
       WHERE e.type = 'live_class' AND e.start_date >= datetime('now', '-3 hours')
       ORDER BY e.start_date ASC LIMIT ?`,
      [limit]
    );
    return r.rows || [];
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

  async getQuizById(quizId) {
    const r = await this._query('SELECT * FROM quizzes WHERE id = ?', [quizId]);
    return r.rows[0] || null;
  }

  async deleteQuiz(quizId) {
    const tryRun = async (sql) => { try { await this._query(sql, [quizId]); } catch (_) { /* ignore */ } };
    await tryRun('DELETE FROM quiz_attempts WHERE quiz_id = ?');
    await tryRun('DELETE FROM quiz_questions WHERE quiz_id = ?');
    await this._query('DELETE FROM quizzes WHERE id = ?', [quizId]);
    return { deleted: true };
  }

  // Preguntas con la respuesta correcta (para que el profe vea resultados).
  async getQuizQuestionsWithAnswers(quizId) {
    const r = await this._query(
      'SELECT id, question_text, options, correct_answer, points FROM quiz_questions WHERE quiz_id = ? ORDER BY order_num ASC',
      [quizId]
    );
    return r.rows.map((qq) => ({ ...qq, options: JSON.parse(qq.options || '[]') }));
  }

  // ===== Foro por curso =====
  async getForumThreads(courseId) {
    const r = await this._query(
      `SELECT t.*, u.nombre AS author_name,
        (SELECT COUNT(*) FROM forum_replies r WHERE r.thread_id = t.id) AS reply_count
       FROM forum_threads t LEFT JOIN users u ON u.id = t.user_id
       WHERE t.course_id = ? ORDER BY t.is_pinned DESC, t.created_at DESC`,
      [courseId]
    );
    return r.rows;
  }
  async getForumThreadById(id) {
    const r = await this._query('SELECT * FROM forum_threads WHERE id = ?', [id]);
    return r.rows[0] || null;
  }
  async createForumThread({ course_id, user_id, title, content }) {
    const r = await this._query('INSERT INTO forum_threads (course_id, user_id, title, content) VALUES (?,?,?,?)', [course_id, user_id, title, content]);
    return { id: Number(r.lastInsertRowid) };
  }
  async setForumThreadPinned(id, pinned) {
    await this._query('UPDATE forum_threads SET is_pinned = ? WHERE id = ?', [pinned ? 1 : 0, id]);
    return { ok: true };
  }
  async deleteForumThread(id) {
    try { await this._query('DELETE FROM forum_replies WHERE thread_id = ?', [id]); } catch (_) { /* ignore */ }
    await this._query('DELETE FROM forum_threads WHERE id = ?', [id]);
    return { deleted: true };
  }
  async getForumReplies(threadId) {
    const r = await this._query(
      `SELECT r.*, u.nombre AS author_name, u.tipo AS author_tipo
       FROM forum_replies r LEFT JOIN users u ON u.id = r.user_id
       WHERE r.thread_id = ? ORDER BY r.created_at ASC`,
      [threadId]
    );
    return r.rows;
  }
  async getForumReplyById(id) {
    const r = await this._query('SELECT * FROM forum_replies WHERE id = ?', [id]);
    return r.rows[0] || null;
  }
  async createForumReply({ thread_id, user_id, content }) {
    const r = await this._query('INSERT INTO forum_replies (thread_id, user_id, content) VALUES (?,?,?)', [thread_id, user_id, content]);
    return { id: Number(r.lastInsertRowid) };
  }
  async deleteForumReply(id) {
    await this._query('DELETE FROM forum_replies WHERE id = ?', [id]);
    return { deleted: true };
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

  // ---- Acceso por modulo/clase, drip y desbloqueo (paridad con database.js) ----
  async getModuleById(moduleId) {
    const r = await this._query('SELECT * FROM modules WHERE id = ?', [moduleId]);
    return r.rows[0] || null;
  }

  async getLessonById(lessonId) {
    const r = await this._query('SELECT * FROM lessons WHERE id = ?', [lessonId]);
    return r.rows[0] || null;
  }

  async getUserEnrollmentForCourse(userId, courseId) {
    const r = await this._query(
      'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ? ORDER BY enrolled_at DESC LIMIT 1',
      [userId, courseId]
    );
    return r.rows[0] || null;
  }

  async hasAccessGrant({ userId, courseId, moduleId = null, lessonId = null, eventId = null }) {
    let sql = 'SELECT id FROM access_grants WHERE user_id = ?';
    const params = [userId];
    if (courseId) { sql += ' AND course_id = ?'; params.push(courseId); }
    if (moduleId) { sql += ' AND module_id = ?'; params.push(moduleId); }
    if (lessonId) { sql += ' AND lesson_id = ?'; params.push(lessonId); }
    if (eventId) { sql += ' AND event_id = ?'; params.push(eventId); }
    sql += ' LIMIT 1';
    const r = await this._query(sql, params);
    return !!r.rows[0];
  }

  // Grant a NIVEL CURSO (compró el curso entero): module/lesson/event en NULL.
  async hasCourseLevelGrant(userId, courseId) {
    const r = await this._query(
      'SELECT id FROM access_grants WHERE user_id = ? AND course_id = ? AND module_id IS NULL AND lesson_id IS NULL AND event_id IS NULL LIMIT 1',
      [userId, courseId]
    );
    return !!r.rows[0];
  }

  // Registra que un usuario entró a una clase en vivo (para contar asistentes).
  async recordLiveAttendance(eventId, userId) {
    try { await this._query('INSERT OR IGNORE INTO live_attendance (event_id, user_id) VALUES (?, ?)', [eventId, userId]); } catch (_) { /* ignore */ }
  }

  async createAccessGrant({ user_id, course_id, module_id = null, lesson_id = null, event_id = null, source_payment_id = null }) {
    const exists = await this.hasAccessGrant({ userId: user_id, courseId: course_id, moduleId: module_id, lessonId: lesson_id, eventId: event_id });
    if (exists) return { reused: true };
    const r = await this._query(
      'INSERT INTO access_grants (user_id, course_id, module_id, lesson_id, event_id, source_payment_id) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, course_id, module_id, lesson_id, event_id, source_payment_id]
    );
    return { id: Number(r.lastInsertRowid) };
  }

  async getCompletedLessonIds(userId, courseId) {
    const r = await this._query(
      `SELECT l.id as lesson_id
       FROM lessons l
       JOIN modules m ON l.module_id = m.id
       JOIN lesson_progress lp ON lp.lesson_id = l.id
       WHERE m.course_id = ? AND lp.user_id = ? AND lp.completed = 1`,
      [courseId, userId]
    );
    return (r.rows || []).map((x) => x.lesson_id);
  }

  close() {
    return new Promise((resolve) => {
      this.client.close();
      resolve();
    });
  }
}

module.exports = new TursoDatabase();
