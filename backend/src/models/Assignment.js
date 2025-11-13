/**
 * Modelo de Asignaciones/Tareas
 * Representa las tareas que los profesores crean para sus cursos
 */

class Assignment {
    constructor(db) {
        this.db = db;
        this.initTable();
    }

    async initTable() {
        const createAssignmentsTable = `
      CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        professor_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date DATETIME,
        max_score INTEGER DEFAULT 100,
        file_url VARCHAR(500),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id),
        FOREIGN KEY (professor_id) REFERENCES users(id)
      )
    `;

        const createSubmissionsTable = `
      CREATE TABLE IF NOT EXISTS assignment_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignment_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        submission_text TEXT,
        file_url VARCHAR(500),
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        score INTEGER,
        feedback TEXT,
        graded_at DATETIME,
        graded_by INTEGER,
        status VARCHAR(50) DEFAULT 'submitted',
        FOREIGN KEY (assignment_id) REFERENCES assignments(id),
        FOREIGN KEY (student_id) REFERENCES users(id),
        FOREIGN KEY (graded_by) REFERENCES users(id)
      )
    `;

        try {
            // Usar db.db para acceder al objeto sqlite3 directamente
            await new Promise((resolve, reject) => {
                this.db.db.run(createAssignmentsTable, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            await new Promise((resolve, reject) => {
                this.db.db.run(createSubmissionsTable, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            console.log('✅ Tablas de Assignments creadas/verificadas');
        } catch (error) {
            console.error('Error creando tablas de assignments:', error);
        }
    }

    // Crear una nueva tarea
    async create(assignmentData) {
        const { course_id, professor_id, title, description, due_date, max_score, file_url } = assignmentData;

        const query = `
      INSERT INTO assignments (course_id, professor_id, title, description, due_date, max_score, file_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

        try {
            const result = await new Promise((resolve, reject) => {
                this.db.db.run(query, [
                    course_id,
                    professor_id,
                    title,
                    description,
                    due_date,
                    max_score || 100,
                    file_url
                ], function (err) {
                    if (err) reject(err);
                    else resolve({ lastID: this.lastID });
                });
            });

            return { id: result.lastID, ...assignmentData };
        } catch (error) {
            console.error('Error creando assignment:', error);
            throw error;
        }
    }

    // Obtener todas las tareas de un curso
    async getByCourse(courseId) {
        const query = `
      SELECT a.*, u.name as professor_name, u.email as professor_email,
             COUNT(DISTINCT s.id) as total_submissions
      FROM assignments a
      LEFT JOIN users u ON a.professor_id = u.id
      LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
      WHERE a.course_id = ?
      GROUP BY a.id
      ORDER BY a.due_date DESC
    `;

        try {
            return await new Promise((resolve, reject) => {
                this.db.db.all(query, [courseId], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        } catch (error) {
            console.error('Error obteniendo assignments por curso:', error);
            return [];
        }
    }

    // Obtener una tarea por ID
    async getById(assignmentId) {
        const query = `
      SELECT a.*, u.name as professor_name, u.email as professor_email
      FROM assignments a
      LEFT JOIN users u ON a.professor_id = u.id
      WHERE a.id = ?
    `;

        try {
            return await new Promise((resolve, reject) => {
                this.db.db.get(query, [assignmentId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row || null);
                });
            });
        } catch (error) {
            console.error('Error obteniendo assignment:', error);
            return null;
        }
    }

    // Actualizar una tarea
    async update(assignmentId, assignmentData) {
        const { title, description, due_date, max_score, file_url } = assignmentData;

        const query = `
      UPDATE assignments
      SET title = ?, description = ?, due_date = ?, max_score = ?, file_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

        try {
            await new Promise((resolve, reject) => {
                this.db.db.run(query, [title, description, due_date, max_score, file_url, assignmentId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            return await this.getById(assignmentId);
        } catch (error) {
            console.error('Error actualizando assignment:', error);
            throw error;
        }
    }

    // Eliminar una tarea
    async delete(assignmentId) {
        const query = `DELETE FROM assignments WHERE id = ?`;

        try {
            await new Promise((resolve, reject) => {
                this.db.db.run(query, [assignmentId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            return { success: true };
        } catch (error) {
            console.error('Error eliminando assignment:', error);
            throw error;
        }
    }

    // ===== SUBMISSIONS (Entregas) =====

    // Crear una entrega
    async createSubmission(submissionData) {
        const { assignment_id, student_id, submission_text, file_url } = submissionData;

        const query = `
      INSERT INTO assignment_submissions (assignment_id, student_id, submission_text, file_url, status)
      VALUES (?, ?, ?, ?, 'submitted')
    `;

        try {
            const result = await new Promise((resolve, reject) => {
                this.db.db.run(query, [assignment_id, student_id, submission_text, file_url], function (err) {
                    if (err) reject(err);
                    else resolve({ lastID: this.lastID });
                });
            });
            return { id: result.lastID, ...submissionData };
        } catch (error) {
            console.error('Error creando submission:', error);
            throw error;
        }
    }

    // Obtener entregas de una tarea
    async getSubmissionsByAssignment(assignmentId) {
        const query = `
      SELECT s.*, u.name as student_name, u.email as student_email
      FROM assignment_submissions s
      LEFT JOIN users u ON s.student_id = u.id
      WHERE s.assignment_id = ?
      ORDER BY s.submitted_at DESC
    `;

        try {
            return await new Promise((resolve, reject) => {
                this.db.db.all(query, [assignmentId], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        } catch (error) {
            console.error('Error obteniendo submissions:', error);
            return [];
        }
    }

    // Obtener entrega de un estudiante específico
    async getSubmissionByStudent(assignmentId, studentId) {
        const query = `
      SELECT s.*, u.name as student_name, u.email as student_email
      FROM assignment_submissions s
      LEFT JOIN users u ON s.student_id = u.id
      WHERE s.assignment_id = ? AND s.student_id = ?
    `;

        try {
            return await new Promise((resolve, reject) => {
                this.db.db.get(query, [assignmentId, studentId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row || null);
                });
            });
        } catch (error) {
            console.error('Error obteniendo submission del estudiante:', error);
            return null;
        }
    }

    // Calificar una entrega
    async gradeSubmission(submissionId, gradeData) {
        const { score, feedback, graded_by } = gradeData;

        const query = `
      UPDATE assignment_submissions
      SET score = ?, feedback = ?, graded_at = CURRENT_TIMESTAMP, graded_by = ?, status = 'graded'
      WHERE id = ?
    `;

        try {
            await new Promise((resolve, reject) => {
                this.db.db.run(query, [score, feedback, graded_by, submissionId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            const submissionQuery = `SELECT * FROM assignment_submissions WHERE id = ?`;
            return await new Promise((resolve, reject) => {
                this.db.db.get(submissionQuery, [submissionId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        } catch (error) {
            console.error('Error calificando submission:', error);
            throw error;
        }
    }

    // Obtener todas las entregas de un estudiante
    async getSubmissionsByStudent(studentId) {
        const query = `
      SELECT s.*, a.title as assignment_title, a.max_score, c.title as course_title
      FROM assignment_submissions s
      LEFT JOIN assignments a ON s.assignment_id = a.id
      LEFT JOIN courses c ON a.course_id = c.id
      WHERE s.student_id = ?
      ORDER BY s.submitted_at DESC
    `;

        try {
            return await new Promise((resolve, reject) => {
                this.db.db.all(query, [studentId], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        } catch (error) {
            console.error('Error obteniendo submissions del estudiante:', error);
            return [];
        }
    }
}

module.exports = Assignment;
