const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    const dbPath = path.join(__dirname, 'campus_norma.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error al conectar con la base de datos:', err);
      } else {
        console.log('✅ Conectado a la base de datos SQLite');
        this.createTables();
      }
    });
  }

  createTables() {
    const fs = require('fs');
    const initSQL = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
    
    this.db.exec(initSQL, (err) => {
      if (err) {
        console.error('Error al crear tablas:', err);
      } else {
        console.log('✅ Tablas de base de datos creadas/verificadas');
        // Agregar columnas nuevas si no existen
        this.addMissingColumns();
        // Crear usuario administrador por defecto
        this.createDefaultAdmin();
      }
    });
  }

  addMissingColumns() {
    // Agregar columnas telefono y biografia a users si no existen
    this.db.run(`ALTER TABLE users ADD COLUMN telefono VARCHAR(20)`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error agregando columna telefono:', err);
      }
    });
    
    this.db.run(`ALTER TABLE users ADD COLUMN biografia TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error agregando columna biografia:', err);
      }
    });

    // Agregar columna recursos a lessons si no existe
    this.db.run(`ALTER TABLE lessons ADD COLUMN recursos TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error agregando columna recursos:', err);
      }
    });
  }

  async createDefaultAdmin() {
    try {
      // Verificar si ya existe un admin
      const existingAdmin = await this.getUserByEmail('norma.admin@escuelanorma.com');
      if (existingAdmin) {
        console.log('✅ Usuario administrador ya existe');
        return;
      }

      // Crear usuario administrador
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('Norma2025!Secure', 10);
      
      const sql = `INSERT INTO users (email, password, nombre, tipo) VALUES (?, ?, ?, ?)`;
      this.db.run(sql, ['norma.admin@escuelanorma.com', hashedPassword, 'Norma Silva', 'admin'], function(err) {
        if (err) {
          console.error('Error creando usuario administrador:', err);
        } else {
          console.log('✅ Usuario administrador creado: norma.admin@escuelanorma.com / Norma2025!Secure');
        }
      });
    } catch (error) {
      console.error('Error en createDefaultAdmin:', error);
    }
  }

  getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE email = ?';
      this.db.get(sql, [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Métodos para usuarios
  async createUser(userData) {
    return new Promise((resolve, reject) => {
      const { email, password, nombre, tipo = 'alumno' } = userData;
      const sql = `INSERT INTO users (email, password, nombre, tipo) VALUES (?, ?, ?, ?)`;
      
      this.db.run(sql, [email, password, nombre, tipo], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, email, nombre, tipo });
        }
      });
    });
  }

  async getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM users WHERE email = ?`;
      
      this.db.get(sql, [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async getUserById(id) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM users WHERE id = ?`;
      
      this.db.get(sql, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async updateUser(id, userData) {
    return new Promise((resolve, reject) => {
      const { nombre, email, telefono, biografia, password } = userData;
      
      let sql = `UPDATE users SET nombre = ?, email = ?, telefono = ?, biografia = ?`;
      let params = [nombre, email, telefono, biografia];
      
      if (password) {
        sql += `, password = ?`;
        params.push(password);
      }
      
      sql += ` WHERE id = ?`;
      params.push(id);
      
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          // Retornar el usuario actualizado
          resolve({ id, nombre, email, telefono, biografia });
        }
      });
    });
  }

  // Métodos para cursos
  async createCourse(courseData) {
    return new Promise((resolve, reject) => {
      const { nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen } = courseData;
      const sql = `INSERT INTO courses (nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen, publicado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      this.db.run(sql, [nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen, true], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...courseData, publicado: true });
        }
      });
    });
  }

  async getAllCourses() {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM courses WHERE publicado = true ORDER BY created_at DESC`;
      
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getCourseById(id) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM courses WHERE id = ?`;
      
      this.db.get(sql, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async getCoursesByProfessor(professorId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM courses WHERE profesor_id = ? ORDER BY created_at DESC`;
      
      this.db.all(sql, [professorId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async updateCourse(id, courseData) {
    return new Promise((resolve, reject) => {
      const { nombre, descripcion, categoria, precio, duracion } = courseData;
      const sql = `UPDATE courses SET nombre = ?, descripcion = ?, categoria = ?, precio = ?, duracion = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      this.db.run(sql, [nombre, descripcion, categoria, precio, duracion, id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, ...courseData });
        }
      });
    });
  }

  async deleteCourse(id) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM courses WHERE id = ?`;
      
      this.db.run(sql, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ deleted: true });
        }
      });
    });
  }

  // Métodos para inscripciones
  async enrollUser(userId, courseId) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)`;
      
      this.db.run(sql, [userId, courseId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, user_id: userId, course_id: courseId });
        }
      });
    });
  }

  async getUserEnrollments(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT c.*, e.enrolled_at, e.progress, e.completed 
        FROM courses c 
        INNER JOIN enrollments e ON c.id = e.course_id 
        WHERE e.user_id = ? 
        ORDER BY e.enrolled_at DESC
      `;
      
      this.db.all(sql, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getCourseEnrollments(courseId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT u.id, u.nombre, u.email, e.enrolled_at, e.progress, e.completed 
        FROM users u 
        INNER JOIN enrollments e ON u.id = e.user_id 
        WHERE e.course_id = ? 
        ORDER BY e.enrolled_at DESC
      `;
      
      this.db.all(sql, [courseId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async isUserEnrolled(userId, courseId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?`;
      
      this.db.get(sql, [userId, courseId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      });
    });
  }

  // Métodos para pagos
  async createPayment(paymentData) {
    return new Promise((resolve, reject) => {
      const { user_id, course_id, amount, payment_id, preference_id, status = 'pending' } = paymentData;
      const sql = `INSERT INTO payments (user_id, course_id, amount, payment_id, preference_id, status) VALUES (?, ?, ?, ?, ?, ?)`;
      
      this.db.run(sql, [user_id, course_id, amount, payment_id, preference_id, status], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...paymentData });
        }
      });
    });
  }

  async updatePaymentStatus(paymentId, status) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE payment_id = ?`;
      
      this.db.run(sql, [status, paymentId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ updated: true });
        }
      });
    });
  }

  getPaymentByPaymentId(paymentId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM payments WHERE payment_id = ?`;
      
      this.db.get(sql, [paymentId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // ================================
  // MÉTODOS PARA MÓDULOS
  // ================================

  async getCourseModules(courseId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM modules WHERE course_id = ? ORDER BY orden ASC`;
      
      this.db.all(sql, [courseId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async createModule(moduleData) {
    return new Promise((resolve, reject) => {
      const { course_id, titulo, descripcion, orden, publicado } = moduleData;
      const sql = `INSERT INTO modules (course_id, titulo, descripcion, orden, publicado) VALUES (?, ?, ?, ?, ?)`;
      
      this.db.run(sql, [course_id, titulo, descripcion, orden, publicado], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...moduleData });
        }
      });
    });
  }

  async updateModule(moduleId, moduleData) {
    return new Promise((resolve, reject) => {
      const { titulo, descripcion, orden, publicado } = moduleData;
      const sql = `UPDATE modules SET titulo = ?, descripcion = ?, orden = ?, publicado = ? WHERE id = ?`;
      
      this.db.run(sql, [titulo, descripcion, orden, publicado, moduleId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: moduleId, ...moduleData });
        }
      });
    });
  }

  async deleteModule(moduleId) {
    return new Promise((resolve, reject) => {
      // Primero eliminar todas las lecciones del módulo
      const deleteLessonsSQL = `DELETE FROM lessons WHERE module_id = ?`;
      this.db.run(deleteLessonsSQL, [moduleId], (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Luego eliminar el módulo
        const deleteModuleSQL = `DELETE FROM modules WHERE id = ?`;
        this.db.run(deleteModuleSQL, [moduleId], function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ deleted: this.changes });
          }
        });
      });
    });
  }

  // ================================
  // MÉTODOS PARA LECCIONES
  // ================================

  async getModuleLessons(moduleId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM lessons WHERE module_id = ? ORDER BY orden ASC`;
      
      this.db.all(sql, [moduleId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Parsear recursos JSON si existe
          const lessons = rows.map(lesson => ({
            ...lesson,
            recursos: lesson.recursos ? JSON.parse(lesson.recursos) : []
          }));
          resolve(lessons);
        }
      });
    });
  }

  async createLesson(lessonData) {
    return new Promise((resolve, reject) => {
      const { module_id, titulo, contenido, tipo, orden, duracion, recursos, publicado } = lessonData;
      const sql = `INSERT INTO lessons (module_id, titulo, contenido, tipo, orden, duracion, recursos, publicado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      
      this.db.run(sql, [module_id, titulo, contenido, tipo, orden, duracion, recursos, publicado], function(err) {
        if (err) {
          reject(err);
        } else {
          const newLesson = { id: this.lastID, ...lessonData };
          if (newLesson.recursos) {
            newLesson.recursos = JSON.parse(newLesson.recursos);
          }
          resolve(newLesson);
        }
      });
    });
  }

  async updateLesson(lessonId, lessonData) {
    return new Promise((resolve, reject) => {
      const { titulo, contenido, tipo, orden, duracion, recursos, publicado } = lessonData;
      const sql = `UPDATE lessons SET titulo = ?, contenido = ?, tipo = ?, orden = ?, duracion = ?, recursos = ?, publicado = ? WHERE id = ?`;
      
      this.db.run(sql, [titulo, contenido, tipo, orden, duracion, recursos, publicado, lessonId], function(err) {
        if (err) {
          reject(err);
        } else {
          const updatedLesson = { id: lessonId, ...lessonData };
          if (updatedLesson.recursos) {
            updatedLesson.recursos = JSON.parse(updatedLesson.recursos);
          }
          resolve(updatedLesson);
        }
      });
    });
  }

  async deleteLesson(lessonId) {
    return new Promise((resolve, reject) => {
      // Primero eliminar el progreso de la lección
      const deleteProgressSQL = `DELETE FROM lesson_progress WHERE lesson_id = ?`;
      this.db.run(deleteProgressSQL, [lessonId], (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Luego eliminar la lección
        const deleteLessonSQL = `DELETE FROM lessons WHERE id = ?`;
        this.db.run(deleteLessonSQL, [lessonId], function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ deleted: this.changes });
          }
        });
      });
    });
  }

  // ================================
  // MÉTODOS PARA PROGRESO
  // ================================

  async markLessonComplete(userId, lessonId) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT OR REPLACE INTO lesson_progress (user_id, lesson_id, completed, completed_at) VALUES (?, ?, ?, ?)`;
      
      this.db.run(sql, [userId, lessonId, true, new Date().toISOString()], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ userId, lessonId, completed: true });
        }
      });
    });
  }

  async getCourseProgress(userId, courseId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          m.id as module_id,
          m.titulo as module_title,
          l.id as lesson_id,
          l.titulo as lesson_title,
          CASE WHEN lp.completed IS NOT NULL THEN lp.completed ELSE 0 END as completed
        FROM modules m
        LEFT JOIN lessons l ON m.id = l.module_id
        LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = ?
        WHERE m.course_id = ?
        ORDER BY m.orden, l.orden
      `;
      
      this.db.all(sql, [userId, courseId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Agrupar por módulos
          const progress = {};
          rows.forEach(row => {
            if (!progress[row.module_id]) {
              progress[row.module_id] = {
                moduleId: row.module_id,
                moduleTitle: row.module_title,
                lessons: []
              };
            }
            
            if (row.lesson_id) {
              progress[row.module_id].lessons.push({
                lessonId: row.lesson_id,
                lessonTitle: row.lesson_title,
                completed: Boolean(row.completed)
              });
            }
          });
          
          resolve(Object.values(progress));
        }
      });
    });
  }

  // ================================
  // MÉTODOS PARA EVENTOS/CALENDARIO
  // ================================

  getEventsForProfessor(professorId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT e.*, c.nombre as course_name 
        FROM events e
        LEFT JOIN courses c ON e.course_id = c.id
        WHERE e.instructor_id = ? OR c.profesor_id = ?
        ORDER BY e.start_date ASC
      `;
      
      this.db.all(sql, [professorId, professorId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  getEventsForStudent(studentId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT e.*, c.nombre as course_name
        FROM events e
        JOIN courses c ON e.course_id = c.id
        JOIN enrollments en ON en.course_id = c.id
        WHERE en.user_id = ? AND e.status != 'cancelled'
        ORDER BY e.start_date ASC
      `;
      
      this.db.all(sql, [studentId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  createEvent(eventData) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO events (title, description, start_date, end_date, type, course_id, instructor_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        eventData.title,
        eventData.description,
        eventData.startDate,
        eventData.endDate,
        eventData.type,
        eventData.courseId,
        eventData.instructorId
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  getEventById(eventId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT e.*, c.nombre as course_name
        FROM events e
        LEFT JOIN courses c ON e.course_id = c.id
        WHERE e.id = ?
      `;
      
      this.db.get(sql, [eventId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  updateEvent(eventId, eventData, instructorId) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE events 
        SET title = ?, description = ?, start_date = ?, end_date = ?, type = ?, status = ?
        WHERE id = ? AND instructor_id = ?
      `;
      
      this.db.run(sql, [
        eventData.title,
        eventData.description,
        eventData.startDate,
        eventData.endDate,
        eventData.type,
        eventData.status,
        eventId,
        instructorId
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  deleteEvent(eventId, instructorId) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM events WHERE id = ? AND instructor_id = ?`;
      
      this.db.run(sql, [eventId, instructorId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  // ================================
  // MÉTODOS PARA QUIZZES/EVALUACIONES
  // ================================

  getQuizzesForProfessor(professorId, courseId = null) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT q.*, c.nombre as course_name
        FROM quizzes q
        JOIN courses c ON q.course_id = c.id
        WHERE q.instructor_id = ?
      `;
      let params = [professorId];
      
      if (courseId) {
        sql += ` AND q.course_id = ?`;
        params.push(courseId);
      }
      
      sql += ` ORDER BY q.created_at DESC`;
      
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  getQuizzesForStudent(studentId, courseId = null) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT q.*, c.nombre as course_name
        FROM quizzes q
        JOIN courses c ON q.course_id = c.id
        JOIN enrollments e ON e.course_id = c.id
        WHERE e.user_id = ? AND q.is_active = 1
      `;
      let params = [studentId];
      
      if (courseId) {
        sql += ` AND q.course_id = ?`;
        params.push(courseId);
      }
      
      sql += ` ORDER BY q.created_at DESC`;
      
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  createQuiz(quizData) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        // Crear el quiz
        const quizSql = `
          INSERT INTO quizzes (title, description, course_id, instructor_id, time_limit, attempts_allowed, passing_score)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        this.db.run(quizSql, [
          quizData.title,
          quizData.description,
          quizData.courseId,
          quizData.instructorId,
          quizData.timeLimit,
          quizData.attemptsAllowed,
          quizData.passingScore
        ], function(err) {
          if (err) {
            this.db.run('ROLLBACK');
            reject(err);
            return;
          }
          
          const quizId = this.lastID;
          
          // Agregar las preguntas
          const questionSql = `
            INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points, explanation, order_num)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `;
          
          let completed = 0;
          const totalQuestions = quizData.questions.length;
          
          if (totalQuestions === 0) {
            this.db.run('COMMIT');
            resolve(quizId);
            return;
          }
          
          quizData.questions.forEach((question, index) => {
            this.db.run(questionSql, [
              quizId,
              question.question,
              question.type,
              JSON.stringify(question.options || []),
              question.correctAnswer,
              question.points || 1,
              question.explanation || '',
              index + 1
            ], (err) => {
              if (err) {
                this.db.run('ROLLBACK');
                reject(err);
                return;
              }
              
              completed++;
              if (completed === totalQuestions) {
                this.db.run('COMMIT');
                resolve(quizId);
              }
            });
          });
        });
      });
    });
  }

  getQuizWithQuestions(quizId, userId) {
    return new Promise((resolve, reject) => {
      // Primero obtener el quiz
      const quizSql = `
        SELECT q.*, c.nombre as course_name
        FROM quizzes q
        JOIN courses c ON q.course_id = c.id
        WHERE q.id = ?
      `;
      
      this.db.get(quizSql, [quizId], (err, quiz) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!quiz) {
          resolve(null);
          return;
        }
        
        // Luego obtener las preguntas
        const questionsSql = `
          SELECT id, question_text, question_type, options, points, explanation, order_num
          FROM quiz_questions
          WHERE quiz_id = ?
          ORDER BY order_num ASC
        `;
        
        this.db.all(questionsSql, [quizId], (err, questions) => {
          if (err) {
            reject(err);
          } else {
            quiz.questions = questions.map(q => ({
              ...q,
              options: JSON.parse(q.options || '[]')
            }));
            resolve(quiz);
          }
        });
      });
    });
  }

  submitQuizAttempt(quizId, userId, answers, timeSpent) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Primero obtener el quiz y sus preguntas
        const quizSql = `
          SELECT q.*, qq.id as question_id, qq.correct_answer, qq.points
          FROM quizzes q
          JOIN quiz_questions qq ON qq.quiz_id = q.id
          WHERE q.id = ?
          ORDER BY qq.order_num ASC
        `;
        
        this.db.all(quizSql, [quizId], (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (rows.length === 0) {
            reject(new Error('Quiz no encontrado'));
            return;
          }
          
          // Calcular puntaje
          let score = 0;
          let maxScore = 0;
          
          rows.forEach(row => {
            maxScore += row.points;
            const userAnswer = answers[row.question_id];
            if (userAnswer && userAnswer.toString() === row.correct_answer.toString()) {
              score += row.points;
            }
          });
          
          // Guardar el intento
          const attemptSql = `
            INSERT INTO quiz_attempts (quiz_id, user_id, answers, score, max_score, time_spent, completed, completed_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
          `;
          
          this.db.run(attemptSql, [
            quizId,
            userId,
            JSON.stringify(answers),
            score,
            maxScore,
            timeSpent || 0
          ], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({
                id: this.lastID,
                score,
                maxScore,
                percentage: Math.round((score / maxScore) * 100),
                passed: score >= (rows[0].passing_score * maxScore / 100)
              });
            }
          });
        });
      });
    });
  }

  getQuizAttempts(quizId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT qa.*, u.nombre as user_name, u.email as user_email
        FROM quiz_attempts qa
        JOIN users u ON qa.user_id = u.id
        WHERE qa.quiz_id = ?
        ORDER BY qa.completed_at DESC
      `;
      
      this.db.all(sql, [quizId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  getUserQuizAttempts(quizId, userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM quiz_attempts
        WHERE quiz_id = ? AND user_id = ?
        ORDER BY completed_at DESC
      `;
      
      this.db.all(sql, [quizId, userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Admin - Obtener todos los usuarios
  getAllUsers() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT id, nombre, email, telefono, biografia, foto, rol, activo, 
                fecha_creacion, ultimo_acceso 
         FROM usuarios 
         ORDER BY fecha_creacion DESC`,
        [],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  // Admin - Eliminar usuario
  deleteUser(userId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM usuarios WHERE id = ?',
        [userId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ changes: this.changes });
          }
        }
      );
    });
  }

  // Admin - Activar/Desactivar usuario
  toggleUserStatus(userId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE usuarios SET activo = NOT activo WHERE id = ?',
        [userId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ changes: this.changes });
          }
        }
      );
    });
  }

  // Perfil - Actualizar datos del usuario
  updateUser(userId, data) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];

      if (data.nombre !== undefined) {
        fields.push('nombre = ?');
        values.push(data.nombre);
      }
      if (data.email !== undefined) {
        fields.push('email = ?');
        values.push(data.email);
      }
      if (data.telefono !== undefined) {
        fields.push('telefono = ?');
        values.push(data.telefono);
      }
      if (data.biografia !== undefined) {
        fields.push('biografia = ?');
        values.push(data.biografia);
      }
      if (data.foto !== undefined) {
        fields.push('foto = ?');
        values.push(data.foto);
      }
      if (data.password !== undefined) {
        fields.push('password = ?');
        values.push(data.password);
      }

      if (fields.length === 0) {
        return resolve({ changes: 0 });
      }

      values.push(userId);

      this.db.run(
        `UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ changes: this.changes });
          }
        }
      );
    });
  }

  // Registro de actividad
  logActivity(activityData) {
    return new Promise((resolve, reject) => {
      const {
        userId,
        userName,
        userRole,
        actionType,
        actionDescription,
        entityType = null,
        entityId = null,
        entityName = null,
        ipAddress = null,
        userAgent = null
      } = activityData;

      this.db.run(
        `INSERT INTO activity_logs 
         (user_id, user_name, user_role, action_type, action_description, 
          entity_type, entity_id, entity_name, ip_address, user_agent) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, userName, userRole, actionType, actionDescription, 
         entityType, entityId, entityName, ipAddress, userAgent],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID });
          }
        }
      );
    });
  }

  // Obtener logs de actividad con filtros
  getActivityLogs(filters = {}) {
    return new Promise((resolve, reject) => {
      let query = `SELECT * FROM activity_logs WHERE 1=1`;
      const params = [];

      if (filters.userId) {
        query += ` AND user_id = ?`;
        params.push(filters.userId);
      }

      if (filters.actionType) {
        query += ` AND action_type = ?`;
        params.push(filters.actionType);
      }

      if (filters.entityType) {
        query += ` AND entity_type = ?`;
        params.push(filters.entityType);
      }

      if (filters.startDate) {
        query += ` AND created_at >= ?`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND created_at <= ?`;
        params.push(filters.endDate);
      }

      query += ` ORDER BY created_at DESC`;

      if (filters.limit) {
        query += ` LIMIT ?`;
        params.push(filters.limit);
      }

      if (filters.offset) {
        query += ` OFFSET ?`;
        params.push(filters.offset);
      }

      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Contar logs de actividad
  countActivityLogs(filters = {}) {
    return new Promise((resolve, reject) => {
      let query = `SELECT COUNT(*) as total FROM activity_logs WHERE 1=1`;
      const params = [];

      if (filters.userId) {
        query += ` AND user_id = ?`;
        params.push(filters.userId);
      }

      if (filters.actionType) {
        query += ` AND action_type = ?`;
        params.push(filters.actionType);
      }

      if (filters.entityType) {
        query += ` AND entity_type = ?`;
        params.push(filters.entityType);
      }

      if (filters.startDate) {
        query += ` AND created_at >= ?`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND created_at <= ?`;
        params.push(filters.endDate);
      }

      this.db.get(query, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.total);
        }
      });
    });
  }

  // ================================
  // MÉTODOS PARA CHAT DE CURSO
  // ================================

  getCourseMessages(courseId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT cm.*, u.nombre as user_name 
        FROM course_messages cm
        LEFT JOIN users u ON cm.user_id = u.id
        WHERE cm.course_id = ?
        ORDER BY cm.timestamp ASC
      `;
      this.db.all(sql, [courseId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  createCourseMessage(messageData) {
    return new Promise((resolve, reject) => {
      const { course_id, user_id, message, timestamp } = messageData;
      const sql = `INSERT INTO course_messages (course_id, user_id, message, timestamp) VALUES (?, ?, ?, ?)`;
      
      this.db.run(sql, [course_id, user_id, message, timestamp], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...messageData });
        }
      });
    });
  }

  // ================================
  // MÉTODOS PARA RECURSOS DEL CURSO
  // ================================

  getCourseResources(courseId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT cr.*, u.nombre as uploaded_by_name 
        FROM course_resources cr
        LEFT JOIN users u ON cr.uploaded_by = u.id
        WHERE cr.course_id = ?
        ORDER BY cr.created_at DESC
      `;
      this.db.all(sql, [courseId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  createCourseResource(resourceData) {
    return new Promise((resolve, reject) => {
      const { course_id, title, description, type, url, uploaded_by } = resourceData;
      const sql = `
        INSERT INTO course_resources (course_id, title, description, type, url, uploaded_by, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `;
      
      this.db.run(sql, [course_id, title, description, type, url, uploaded_by], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...resourceData });
        }
      });
    });
  }

  // ================================
  // MÉTODOS PARA CALIFICACIONES
  // ================================

  getCourseGrades(courseId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT g.*, u.nombre as student_name, p.nombre as professor_name, c.nombre as course_name
        FROM grades g
        LEFT JOIN users u ON g.user_id = u.id
        LEFT JOIN users p ON g.professor_id = p.id
        LEFT JOIN courses c ON g.course_id = c.id
        WHERE g.course_id = ?
        ORDER BY g.created_at DESC
      `;
      this.db.all(sql, [courseId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  getUserCourseGrades(courseId, userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT g.*, p.nombre as professor_name, c.nombre as course_name
        FROM grades g
        LEFT JOIN users p ON g.professor_id = p.id
        LEFT JOIN courses c ON g.course_id = c.id
        WHERE g.course_id = ? AND g.user_id = ?
        ORDER BY g.created_at DESC
      `;
      this.db.all(sql, [courseId, userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  createOrUpdateGrade(gradeData) {
    return new Promise((resolve, reject) => {
      const { course_id, user_id, professor_id, grade, feedback, assignment_type } = gradeData;
      
      // Primero verificar si ya existe una calificación
      const checkSql = `SELECT id FROM grades WHERE course_id = ? AND user_id = ? AND assignment_type = ?`;
      
      this.db.get(checkSql, [course_id, user_id, assignment_type || 'general'], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row) {
          // Actualizar calificación existente
          const updateSql = `
            UPDATE grades 
            SET grade = ?, feedback = ?, professor_id = ?, updated_at = datetime('now')
            WHERE id = ?
          `;
          this.db.run(updateSql, [grade, feedback, professor_id, row.id], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({ id: row.id, ...gradeData, updated: true });
            }
          });
        } else {
          // Crear nueva calificación
          const insertSql = `
            INSERT INTO grades (course_id, user_id, professor_id, grade, feedback, assignment_type, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          `;
          this.db.run(insertSql, [course_id, user_id, professor_id, grade, feedback, assignment_type || 'general'], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({ id: this.lastID, ...gradeData, created: true });
            }
          });
        }
      });
    });
  }

  close() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error al cerrar la base de datos:', err);
        } else {
          console.log('Base de datos cerrada');
        }
        resolve();
      });
    });
  }
}

module.exports = new Database();