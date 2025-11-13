
class VideoConference {
  /**
   * Crear una sala de videoconferencia
   */
  static async create(data) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO video_conferences (
          course_id, professor_id, room_name, title, description,
          scheduled_at, duration_minutes, password, max_participants,
          is_recording_enabled, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;

      db.db.run(
        sql,
        [
          data.course_id,
          data.professor_id,
          data.room_name,
          data.title,
          data.description || null,
          data.scheduled_at,
          data.duration_minutes || 60,
          data.password || null,
          data.max_participants || 50,
          data.is_recording_enabled ? 1 : 0
        ],
        function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, ...data });
        }
      );
    });
  }

  /**
   * Obtener sala por ID
   */
  static async getById(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          vc.*,
          c.title as course_title,
          u.name as professor_name
        FROM video_conferences vc
        LEFT JOIN courses c ON vc.course_id = c.id
        LEFT JOIN users u ON vc.professor_id = u.id
        WHERE vc.id = ?
      `;

      db.db.get(sql, [id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  /**
   * Obtener todas las salas de un curso
   */
  static async getByCourse(courseId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          vc.*,
          u.name as professor_name,
          COUNT(DISTINCT vcp.user_id) as participants_count
        FROM video_conferences vc
        LEFT JOIN users u ON vc.professor_id = u.id
        LEFT JOIN video_conference_participants vcp ON vc.id = vcp.conference_id
        WHERE vc.course_id = ?
        GROUP BY vc.id
        ORDER BY vc.scheduled_at DESC
      `;

      db.db.all(sql, [courseId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  /**
   * Obtener salas programadas (próximas)
   */
  static async getUpcoming(courseId = null) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT 
          vc.*,
          c.title as course_title,
          u.name as professor_name,
          COUNT(DISTINCT vcp.user_id) as participants_count
        FROM video_conferences vc
        LEFT JOIN courses c ON vc.course_id = c.id
        LEFT JOIN users u ON vc.professor_id = u.id
        LEFT JOIN video_conference_participants vcp ON vc.id = vcp.conference_id
        WHERE vc.scheduled_at > datetime('now')
      `;

      const params = [];
      if (courseId) {
        sql += ` AND vc.course_id = ?`;
        params.push(courseId);
      }

      sql += ` GROUP BY vc.id ORDER BY vc.scheduled_at ASC`;

      db.db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  /**
   * Registrar participante en sala
   */
  static async addParticipant(conferenceId, userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO video_conference_participants (
          conference_id, user_id, joined_at
        ) VALUES (?, ?, datetime('now'))
        ON CONFLICT(conference_id, user_id) DO UPDATE SET
          joined_at = datetime('now')
      `;

      db.db.run(sql, [conferenceId, userId], function (err) {
        if (err) return reject(err);
        resolve({ conference_id: conferenceId, user_id: userId });
      });
    });
  }

  /**
   * Obtener participantes de una sala
   */
  static async getParticipants(conferenceId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          vcp.*,
          u.name,
          u.email,
          u.role
        FROM video_conference_participants vcp
        JOIN users u ON vcp.user_id = u.id
        WHERE vcp.conference_id = ?
        ORDER BY vcp.joined_at DESC
      `;

      db.db.all(sql, [conferenceId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  /**
   * Actualizar sala
   */
  static async update(id, data) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE video_conferences SET
          title = ?,
          description = ?,
          scheduled_at = ?,
          duration_minutes = ?,
          password = ?,
          max_participants = ?,
          is_recording_enabled = ?
        WHERE id = ?
      `;

      db.db.run(
        sql,
        [
          data.title,
          data.description || null,
          data.scheduled_at,
          data.duration_minutes || 60,
          data.password || null,
          data.max_participants || 50,
          data.is_recording_enabled ? 1 : 0,
          id
        ],
        function (err) {
          if (err) return reject(err);
          resolve({ id, ...data });
        }
      );
    });
  }

  /**
   * Eliminar sala
   */
  static async delete(id) {
    return new Promise((resolve, reject) => {
      db.db.run('DELETE FROM video_conferences WHERE id = ?', [id], function (err) {
        if (err) return reject(err);
        resolve({ deleted: this.changes });
      });
    });
  }

  /**
   * Crear tablas necesarias
   */
  static async createTables() {
    return new Promise((resolve, reject) => {
      const sql1 = `
        CREATE TABLE IF NOT EXISTS video_conferences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          course_id INTEGER NOT NULL,
          professor_id INTEGER NOT NULL,
          room_name TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          description TEXT,
          scheduled_at DATETIME NOT NULL,
          duration_minutes INTEGER DEFAULT 60,
          password TEXT,
          max_participants INTEGER DEFAULT 50,
          is_recording_enabled INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
          FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `;

      const sql2 = `
        CREATE TABLE IF NOT EXISTS video_conference_participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conference_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          left_at DATETIME,
          FOREIGN KEY (conference_id) REFERENCES video_conferences(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(conference_id, user_id)
        )
      `;

      db.db.run(sql1, (err) => {
        if (err) return reject(err);
        db.db.run(sql2, (err) => {
          if (err) return reject(err);
          console.log('✅ Tablas de VideoConference creadas/verificadas');
          resolve();
        });
      });
    });
  }
}

module.exports = VideoConference;
