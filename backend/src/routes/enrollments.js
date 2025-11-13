/**
 * Rutas de Inscripciones (Enrollments)
 * Manejo de cursos gratuitos y pagos
 */

module.exports = (db, authenticateToken) => {
  const express = require('express');
  const router = express.Router();

  // Inscribirse a un curso gratuito
  router.post('/enrollments/free/:courseId', authenticateToken, async (req, res) => {
    try {
      const courseId = req.params.courseId;
      const userId = req.user.id;

      // Verificar que el curso existe y obtener su precio
      const course = await new Promise((resolve, reject) => {
        db.db.get('SELECT * FROM courses WHERE id = ?', [courseId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!course) {
        return res.status(404).json({ error: 'Curso no encontrado' });
      }

      // Verificar que el curso es gratuito
      if (parseFloat(course.price) > 0) {
        return res.status(400).json({ 
          error: 'Este curso no es gratuito. Debes realizar el pago.',
          price: course.price
        });
      }

      // Verificar si ya está inscrito
      const existingEnrollment = await new Promise((resolve, reject) => {
        db.db.get(
          'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
          [userId, courseId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (existingEnrollment) {
        return res.status(400).json({ 
          error: 'Ya estás inscrito en este curso',
          enrollment: existingEnrollment
        });
      }

      // Inscribir al estudiante
      await new Promise((resolve, reject) => {
        db.db.run(
          `INSERT INTO enrollments (student_id, course_id, enrollment_date, status, progress)
           VALUES (?, ?, datetime('now'), 'active', 0)`,
          [userId, courseId],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      // Obtener la inscripción creada
      const enrollment = await new Promise((resolve, reject) => {
        db.db.get(
          `SELECT e.*, c.name as course_name, c.description as course_description
           FROM enrollments e
           JOIN courses c ON e.course_id = c.id
           WHERE e.student_id = ? AND e.course_id = ?`,
          [userId, courseId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      // Crear notificación
      try {
        await new Promise((resolve, reject) => {
          db.db.run(
            `INSERT INTO notifications (user_id, title, message, type)
             VALUES (?, ?, ?, ?)`,
            [
              userId,
              '¡Inscripción exitosa!',
              `Te has inscrito exitosamente al curso gratuito: ${course.name}`,
              'info'
            ],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      } catch (error) {
        console.error('Error al crear notificación:', error);
      }

      res.status(201).json({
        message: 'Inscripción exitosa al curso gratuito',
        enrollment,
        course: {
          id: course.id,
          name: course.name,
          description: course.description,
          is_free: true
        }
      });
    } catch (error) {
      console.error('Error al inscribirse:', error);
      res.status(500).json({ error: 'Error al procesar la inscripción' });
    }
  });

  // Verificar si un curso es gratuito
  router.get('/courses/:courseId/pricing', authenticateToken, async (req, res) => {
    try {
      const courseId = req.params.courseId;

      const course = await new Promise((resolve, reject) => {
        db.db.get('SELECT * FROM courses WHERE id = ?', [courseId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!course) {
        return res.status(404).json({ error: 'Curso no encontrado' });
      }

      const price = parseFloat(course.price);
      const isFree = price === 0;

      // Verificar si tiene lecciones pagas
      const paidLessons = await new Promise((resolve, reject) => {
        db.db.all(
          `SELECT COUNT(*) as count FROM lessons 
           WHERE module_id IN (SELECT id FROM modules WHERE course_id = ?)
           AND price > 0`,
          [courseId],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows[0].count);
          }
        );
      });

      // Verificar si el usuario ya está inscrito
      const isEnrolled = await new Promise((resolve, reject) => {
        db.db.get(
          'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
          [req.user.id, courseId],
          (err, row) => {
            if (err) reject(err);
            else resolve(!!row);
          }
        );
      });

      res.json({
        course_id: course.id,
        course_name: course.name,
        price: price,
        is_free: isFree,
        has_paid_content: paidLessons > 0,
        paid_lessons_count: paidLessons,
        is_enrolled: isEnrolled,
        enrollment_action: isEnrolled 
          ? 'already_enrolled' 
          : (isFree ? 'free_enrollment' : 'payment_required')
      });
    } catch (error) {
      console.error('Error al obtener información de precio:', error);
      res.status(500).json({ error: 'Error al obtener información de precio' });
    }
  });

  // Obtener mis inscripciones
  router.get('/enrollments/my-courses', authenticateToken, async (req, res) => {
    try {
      const enrollments = await new Promise((resolve, reject) => {
        db.db.all(
          `SELECT 
            e.*,
            c.name as course_name,
            c.description as course_description,
            c.thumbnail as course_thumbnail,
            c.price as course_price,
            u.name as professor_name
           FROM enrollments e
           JOIN courses c ON e.course_id = c.id
           LEFT JOIN users u ON c.professor_id = u.id
           WHERE e.student_id = ?
           ORDER BY e.enrollment_date DESC`,
          [req.user.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      res.json(enrollments);
    } catch (error) {
      console.error('Error al obtener inscripciones:', error);
      res.status(500).json({ error: 'Error al obtener inscripciones' });
    }
  });

  return router;
};
