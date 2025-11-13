/**
 * Modelo de Certificados
 * Gestiona la creación y verificación de certificados de cursos
 */

class Certificate {
    constructor(db) {
        this.db = db;
        this.initTable();
    }

    async initTable() {
        const createCertificatesTable = `
      CREATE TABLE IF NOT EXISTS certificates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        certificate_code VARCHAR(100) UNIQUE NOT NULL,
        student_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        course_title VARCHAR(255) NOT NULL,
        completion_date DATETIME NOT NULL,
        issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        final_score DECIMAL(5, 2),
        hours_completed INTEGER DEFAULT 0,
        valid BOOLEAN DEFAULT 1,
        verification_url VARCHAR(500),
        pdf_url VARCHAR(500),
        FOREIGN KEY (student_id) REFERENCES users(id),
        FOREIGN KEY (course_id) REFERENCES courses(id)
      )
    `;

        try {
            await new Promise((resolve, reject) => {
                this.db.db.run(createCertificatesTable, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            console.log('✅ Tablas de Certificate creadas/verificadas');
        } catch (error) {
            console.error('Error creando tablas de certificate:', error);
        }
    }

    // Generar código único para el certificado
    generateCertificateCode(studentId, courseId) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `CERT-${studentId}-${courseId}-${timestamp}-${random}`;
    }

    // Crear un certificado
    async create(certificateData) {
        const {
            student_id,
            course_id,
            student_name,
            course_title,
            completion_date,
            final_score,
            hours_completed
        } = certificateData;

        // Verificar si ya existe un certificado para este estudiante y curso
        const existingQuery = `
      SELECT * FROM certificates
      WHERE student_id = ? AND course_id = ?
    `;

        const existing = await new Promise((resolve, reject) => {
            this.db.db.get(existingQuery, [student_id, course_id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (existing) {
            return existing;
        }

        // Generar código único
        const certificate_code = this.generateCertificateCode(student_id, course_id);
        const verification_url = `${process.env.FRONTEND_URL}/verify-certificate/${certificate_code}`;

        const query = `
      INSERT INTO certificates (
        certificate_code, student_id, course_id, student_name, course_title,
        completion_date, final_score, hours_completed, verification_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        try {
            const result = await new Promise((resolve, reject) => {
                this.db.db.run(
                    query,
                    [
                        certificate_code,
                        student_id,
                        course_id,
                        student_name,
                        course_title,
                        completion_date,
                        final_score,
                        hours_completed,
                        verification_url
                    ],
                    function (err) {
                        if (err) reject(err);
                        else resolve({ lastID: this.lastID });
                    }
                );
            });

            return {
                id: result.lastID,
                certificate_code,
                verification_url,
                ...certificateData
            };
        } catch (error) {
            console.error('Error creando certificado:', error);
            throw error;
        }
    }

    // Obtener certificado por código
    async getByCode(certificateCode) {
        const query = `
      SELECT c.*, u.email as student_email
      FROM certificates c
      LEFT JOIN users u ON c.student_id = u.id
      WHERE c.certificate_code = ?
    `;

        try {
            return await new Promise((resolve, reject) => {
                this.db.db.get(query, [certificateCode], (err, row) => {
                    if (err) reject(err);
                    else resolve(row || null);
                });
            });
        } catch (error) {
            console.error('Error obteniendo certificado:', error);
            return null;
        }
    }

    // Obtener certificados de un estudiante
    async getStudentCertificates(studentId) {
        const query = `
      SELECT * FROM certificates
      WHERE student_id = ?
      ORDER BY issue_date DESC
    `;

        try {
            return await new Promise((resolve, reject) => {
                this.db.db.all(query, [studentId], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        } catch (error) {
            console.error('Error obteniendo certificados del estudiante:', error);
            return [];
        }
    }

    // Obtener certificado específico de un estudiante en un curso
    async getStudentCourseCertificate(studentId, courseId) {
        const query = `
      SELECT * FROM certificates
      WHERE student_id = ? AND course_id = ?
    `;

        try {
            return await new Promise((resolve, reject) => {
                this.db.db.get(query, [studentId, courseId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row || null);
                });
            });
        } catch (error) {
            console.error('Error obteniendo certificado:', error);
            return null;
        }
    }

    // Verificar si un estudiante puede obtener un certificado
    async canReceiveCertificate(studentId, courseId) {
        try {
            // Verificar progreso (debe haber completado el 100%)
            const progressQuery = `
        SELECT 
          COUNT(DISTINCT l.id) as total_lessons,
          COUNT(DISTINCT CASE WHEN sp.completed = 1 THEN l.id END) as completed_lessons
        FROM courses c
        LEFT JOIN modules m ON c.id = m.course_id
        LEFT JOIN lessons l ON m.id = l.module_id
        LEFT JOIN student_progress sp ON l.id = sp.lesson_id AND sp.student_id = ?
        WHERE c.id = ?
      `;

            const progress = await new Promise((resolve, reject) => {
                this.db.db.get(progressQuery, [studentId, courseId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (!progress || progress.total_lessons === 0) {
                return { eligible: false, reason: 'El curso no tiene lecciones' };
            }

            const completionPercentage = (progress.completed_lessons / progress.total_lessons) * 100;

            if (completionPercentage < 100) {
                return {
                    eligible: false,
                    reason: `Debes completar el 100% del curso (actualmente: ${completionPercentage.toFixed(1)}%)`
                };
            }

            // Verificar si ya tiene certificado
            const existingCertificate = await this.getStudentCourseCertificate(studentId, courseId);
            if (existingCertificate) {
                return {
                    eligible: false,
                    reason: 'Ya tienes un certificado para este curso',
                    certificate: existingCertificate
                };
            }

            // Calcular puntuación promedio de tareas (si las hay)
            const scoreQuery = `
        SELECT AVG(s.score) as avg_score
        FROM assignment_submissions s
        INNER JOIN assignments a ON s.assignment_id = a.id
        WHERE s.student_id = ? AND a.course_id = ? AND s.score IS NOT NULL
      `;

            const scoreResult = await new Promise((resolve, reject) => {
                this.db.db.get(scoreQuery, [studentId, courseId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            return {
                eligible: true,
                completionPercentage: 100,
                finalScore: scoreResult?.avg_score || null,
                completedLessons: progress.completed_lessons
            };
        } catch (error) {
            console.error('Error verificando elegibilidad:', error);
            return { eligible: false, reason: 'Error al verificar elegibilidad' };
        }
    }

    // Actualizar URL del PDF generado
    async updatePdfUrl(certificateId, pdfUrl) {
        const query = `
      UPDATE certificates
      SET pdf_url = ?
      WHERE id = ?
    `;

        try {
            await new Promise((resolve, reject) => {
                this.db.db.run(query, [pdfUrl, certificateId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            return { success: true };
        } catch (error) {
            console.error('Error actualizando URL del PDF:', error);
            throw error;
        }
    }

    // Invalidar certificado (en caso de fraude o error)
    async invalidate(certificateId) {
        const query = `
      UPDATE certificates
      SET valid = 0
      WHERE id = ?
    `;

        try {
            await new Promise((resolve, reject) => {
                this.db.db.run(query, [certificateId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            return { success: true };
        } catch (error) {
            console.error('Error invalidando certificado:', error);
            throw error;
        }
    }

    // Obtener estadísticas de certificados
    async getStats() {
        const query = `
      SELECT 
        COUNT(*) as total_certificates,
        COUNT(DISTINCT student_id) as unique_students,
        COUNT(DISTINCT course_id) as courses_with_certificates,
        AVG(final_score) as avg_score
      FROM certificates
      WHERE valid = 1
    `;

        try {
            return await new Promise((resolve, reject) => {
                this.db.db.get(query, [], (err, row) => {
                    if (err) reject(err);
                    else resolve(row || {});
                });
            });
        } catch (error) {
            console.error('Error obteniendo estadísticas de certificados:', error);
            return {};
        }
    }
}

module.exports = Certificate;
