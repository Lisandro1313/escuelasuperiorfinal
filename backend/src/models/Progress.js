/**
 * Modelo de Progreso
 * Rastrea el progreso de los estudiantes en cursos y lecciones
 */

class Progress {
    constructor(db) {
        this.db = db;
        this.initTable();
    }

    async initTable() {
        const createProgressTable = `
      CREATE TABLE IF NOT EXISTS student_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        lesson_id INTEGER,
        completed BOOLEAN DEFAULT 0,
        progress_percentage INTEGER DEFAULT 0,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (student_id) REFERENCES users(id),
        FOREIGN KEY (course_id) REFERENCES courses(id),
        FOREIGN KEY (lesson_id) REFERENCES lessons(id),
        UNIQUE(student_id, course_id, lesson_id)
      )
    `;

        const createCourseStatsTable = `
      CREATE TABLE IF NOT EXISTS course_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        total_lessons INTEGER DEFAULT 0,
        completed_lessons INTEGER DEFAULT 0,
        total_assignments INTEGER DEFAULT 0,
        completed_assignments INTEGER DEFAULT 0,
        average_score REAL DEFAULT 0,
        time_spent_minutes INTEGER DEFAULT 0,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id),
        FOREIGN KEY (course_id) REFERENCES courses(id),
        UNIQUE(student_id, course_id)
      )
    `;

        try {
            await new Promise((resolve, reject) => {
                this.db.db.run(createProgressTable, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            await new Promise((resolve, reject) => {
                this.db.db.run(createCourseStatsTable, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            console.log('✅ Tablas de Progress creadas/verificadas');
        } catch (error) {
            console.error('Error creando tablas de progress:', error);
        }
    }

    // Marcar una lección como completada
    async markLessonComplete(studentId, courseId, lessonId) {
        const query = `
      INSERT OR REPLACE INTO student_progress (student_id, course_id, lesson_id, completed, completed_at, last_accessed)
      VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

        try {
            await new Promise((resolve, reject) => {
                this.db.db.run(query, [studentId, courseId, lessonId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Actualizar estadísticas del curso
            await this.updateCourseStats(studentId, courseId);

            return { success: true };
        } catch (error) {
            console.error('Error marcando lección como completada:', error);
            throw error;
        }
    }

    // Actualizar último acceso a una lección
    async updateLastAccessed(studentId, courseId, lessonId) {
        const query = `
      INSERT OR REPLACE INTO student_progress (student_id, course_id, lesson_id, last_accessed)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `;

        try {
            await new Promise((resolve, reject) => {
                this.db.db.run(query, [studentId, courseId, lessonId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } catch (error) {
            console.error('Error actualizando último acceso:', error);
        }
    }

    // Obtener progreso de un estudiante en un curso
    async getCourseProgress(studentId, courseId) {
        const query = `
      SELECT 
        c.id as course_id,
        c.title as course_title,
        c.description as course_description,
        c.image_url,
        COUNT(DISTINCT l.id) as total_lessons,
        COUNT(DISTINCT CASE WHEN sp.completed = 1 THEN l.id END) as completed_lessons,
        CASE 
          WHEN COUNT(DISTINCT l.id) > 0 
          THEN CAST((COUNT(DISTINCT CASE WHEN sp.completed = 1 THEN l.id END) * 100.0 / COUNT(DISTINCT l.id)) AS INTEGER)
          ELSE 0 
        END as progress_percentage
      FROM courses c
      LEFT JOIN modules m ON c.id = m.course_id
      LEFT JOIN lessons l ON m.id = l.module_id
      LEFT JOIN student_progress sp ON l.id = sp.lesson_id AND sp.student_id = ? AND sp.course_id = c.id
      WHERE c.id = ?
      GROUP BY c.id
    `;

        try {
            return await new Promise((resolve, reject) => {
                this.db.db.get(query, [studentId, courseId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row || null);
                });
            });
        } catch (error) {
            console.error('Error obteniendo progreso del curso:', error);
            return null;
        }
    }

    // Obtener progreso detallado por módulos
    async getModulesProgress(studentId, courseId) {
        const query = `
      SELECT 
        m.id as module_id,
        m.title as module_title,
        m.order_index,
        COUNT(DISTINCT l.id) as total_lessons,
        COUNT(DISTINCT CASE WHEN sp.completed = 1 THEN l.id END) as completed_lessons,
        CASE 
          WHEN COUNT(DISTINCT l.id) > 0 
          THEN CAST((COUNT(DISTINCT CASE WHEN sp.completed = 1 THEN l.id END) * 100.0 / COUNT(DISTINCT l.id)) AS INTEGER)
          ELSE 0 
        END as progress_percentage
      FROM modules m
      LEFT JOIN lessons l ON m.id = l.module_id
      LEFT JOIN student_progress sp ON l.id = sp.lesson_id AND sp.student_id = ? AND sp.course_id = ?
      WHERE m.course_id = ?
      GROUP BY m.id
      ORDER BY m.order_index
    `;

        try {
            return await new Promise((resolve, reject) => {
                this.db.db.all(query, [studentId, courseId, courseId], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        } catch (error) {
            console.error('Error obteniendo progreso por módulos:', error);
            return [];
        }
    }

    // Obtener todas las lecciones con su estado de progreso
    async getLessonsProgress(studentId, courseId) {
        const query = `
      SELECT 
        l.id as lesson_id,
        l.title as lesson_title,
        l.module_id,
        m.title as module_title,
        l.order_index,
        l.duration,
        COALESCE(sp.completed, 0) as completed,
        sp.completed_at,
        sp.last_accessed
      FROM lessons l
      INNER JOIN modules m ON l.module_id = m.id
      LEFT JOIN student_progress sp ON l.id = sp.lesson_id AND sp.student_id = ? AND sp.course_id = ?
      WHERE m.course_id = ?
      ORDER BY m.order_index, l.order_index
    `;

        try {
            return await new Promise((resolve, reject) => {
                this.db.db.all(query, [studentId, courseId, courseId], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        } catch (error) {
            console.error('Error obteniendo progreso de lecciones:', error);
            return [];
        }
    }

    // Obtener todos los cursos con progreso del estudiante
    async getAllCoursesProgress(studentId) {
        const query = `
      SELECT 
        c.id as course_id,
        c.title as course_title,
        c.description,
        c.image_url,
        c.price,
        COUNT(DISTINCT l.id) as total_lessons,
        COUNT(DISTINCT CASE WHEN sp.completed = 1 THEN l.id END) as completed_lessons,
        CASE 
          WHEN COUNT(DISTINCT l.id) > 0 
          THEN CAST((COUNT(DISTINCT CASE WHEN sp.completed = 1 THEN l.id END) * 100.0 / COUNT(DISTINCT l.id)) AS INTEGER)
          ELSE 0 
        END as progress_percentage,
        MAX(sp.last_accessed) as last_accessed
      FROM courses c
      INNER JOIN enrollments e ON c.id = e.course_id AND e.student_id = ?
      LEFT JOIN modules m ON c.id = m.course_id
      LEFT JOIN lessons l ON m.id = l.module_id
      LEFT JOIN student_progress sp ON l.id = sp.lesson_id AND sp.student_id = ? AND sp.course_id = c.id
      GROUP BY c.id
      ORDER BY last_accessed DESC, c.title
    `;

        try {
            return await new Promise((resolve, reject) => {
                this.db.db.all(query, [studentId, studentId], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        } catch (error) {
            console.error('Error obteniendo progreso de todos los cursos:', error);
            return [];
        }
    }

    // Actualizar estadísticas del curso
    async updateCourseStats(studentId, courseId) {
        // Obtener progreso actual
        const progress = await this.getCourseProgress(studentId, courseId);

        if (!progress) return;

        // Obtener calificaciones promedio de assignments
        const assignmentsQuery = `
      SELECT AVG(s.score) as avg_score, COUNT(DISTINCT s.assignment_id) as completed_assignments
      FROM assignment_submissions s
      INNER JOIN assignments a ON s.assignment_id = a.id
      WHERE s.student_id = ? AND a.course_id = ? AND s.score IS NOT NULL
    `;

        try {
            const assignmentStats = await new Promise((resolve, reject) => {
                this.db.db.get(assignmentsQuery, [studentId, courseId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row || { avg_score: 0, completed_assignments: 0 });
                });
            });

            const upsertQuery = `
        INSERT OR REPLACE INTO course_stats 
        (student_id, course_id, total_lessons, completed_lessons, completed_assignments, average_score, last_activity)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

            await new Promise((resolve, reject) => {
                this.db.db.run(upsertQuery, [
                    studentId,
                    courseId,
                    progress.total_lessons,
                    progress.completed_lessons,
                    assignmentStats.completed_assignments || 0,
                    assignmentStats.avg_score || 0
                ], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } catch (error) {
            console.error('Error actualizando estadísticas del curso:', error);
        }
    }

    // Obtener estadísticas generales del estudiante
    async getStudentStats(studentId) {
        const query = `
      SELECT 
        COUNT(DISTINCT e.course_id) as total_courses_enrolled,
        COUNT(DISTINCT CASE WHEN cs.completed_lessons = cs.total_lessons AND cs.total_lessons > 0 THEN cs.course_id END) as courses_completed,
        COALESCE(SUM(cs.completed_lessons), 0) as total_lessons_completed,
        COALESCE(AVG(cs.average_score), 0) as overall_average_score,
        COALESCE(SUM(cs.time_spent_minutes), 0) as total_time_spent_minutes
      FROM enrollments e
      LEFT JOIN course_stats cs ON e.course_id = cs.course_id AND e.student_id = cs.student_id
      WHERE e.student_id = ?
    `;

        try {
            return await new Promise((resolve, reject) => {
                this.db.db.get(query, [studentId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row || {});
                });
            });
        } catch (error) {
            console.error('Error obteniendo estadísticas del estudiante:', error);
            return {};
        }
    }
}

module.exports = Progress;
