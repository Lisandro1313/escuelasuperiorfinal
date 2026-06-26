// Cargar variables de entorno
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Base de datos: Turso (libSQL) en produccion / SQLite local en dev.
// Switch via env vars: si TURSO_DATABASE_URL esta seteado, usa Turso.
const db = process.env.TURSO_DATABASE_URL
  ? require('./database/database-turso')
  : require('./database/database');
const mercadoPagoService = require('./services/mercadopago');
const emailService = require('./services/email');
const logger = require('./utils/logger');
const NotificationHelper = require('./utils/notificationHelper');

const app = express();
// Detrás del proxy de Render: necesario para que express-rate-limit lea
// la IP real del X-Forwarded-For sin tirar ValidationError.
app.set('trust proxy', 1);
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || process.env.CORS_ORIGIN ||
      (process.env.NODE_ENV === 'production'
        ? ['https://escuela-superior.onrender.com', 'https://escuela-norma-frontend.onrender.com', 'https://campusnorma.com', 'https://www.campusnorma.com']
        : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001']),
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET no esta definido. Configurar en .env o variables de entorno.');
  process.exit(1);
}

// Middleware de compresión
app.use(compression());

// Rate limiting - protección contra ataques
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 requests en desarrollo
  message: 'Demasiadas solicitudes desde esta IP, por favor intente más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar rate limiting a todas las rutas API
app.use('/api/', limiter);

// Rate limiting más estricto para login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // 50 intentos en desarrollo
  message: 'Demasiados intentos de acceso, por favor intente más tarde.',
});

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://sdk.mercadopago.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.mercadopago.com"],
      frameSrc: ["https://www.mercadopago.com"]
    }
  }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || process.env.CORS_ORIGIN ||
    (process.env.NODE_ENV === 'production'
      ? ['https://escuela-superior.onrender.com', 'https://escuela-norma-frontend.onrender.com', 'https://campusnorma.com', 'https://www.campusnorma.com']
      : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001']),
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Storage. UPLOADS_DIR es solo para fallback en dev (disk local).
// En produccion, si SUPABASE_URL+SUPABASE_SERVICE_ROLE_KEY estan setados,
// los archivos van a Supabase Storage y la URL devuelta es absoluta.
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const storageHelper = require('./services/storage');

// Servir archivos locales si los hay (no se usa en modo Supabase pero no molesta).
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});
app.use('/uploads', express.static(UPLOADS_DIR));

// memoryStorage permite que el handler decida adónde mandar el buffer
// (Supabase o disk). Limite 500MB para videos de clases.
const ALLOWED_EXT = /\.(jpe?g|png|gif|webp|pdf|docx?|pptx?|xlsx?|mp4|webm|mov|avi|mkv|mp3|wav|m4a|zip)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_EXT.test(file.originalname)) return cb(null, true);
    cb(new Error('Tipo de archivo no permitido. Extensiones validas: imagenes, PDF, Office, video, audio, ZIP.'));
  },
});

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Middleware para verificar rol de profesor
const requireProfessor = (req, res, next) => {
  if (req.user.tipo !== 'profesor' && req.user.tipo !== 'admin') {
    return res.status(403).json({ error: 'Se requiere ser profesor para esta acción' });
  }
  next();
};

// Paywall: verifica que el usuario pueda acceder al contenido del curso.
// Reglas:
//   - admin y el profesor del curso siempre pueden acceder
//   - curso gratuito (precio = 0) requiere solo estar autenticado
//   - curso de pago requiere estar inscrito (enrollment existente)
// Resuelve el courseId desde req.params usando los keys configurados.
function requireCourseAccess({ courseParam, moduleParam, lessonParam } = { courseParam: 'id' }) {
  return async (req, res, next) => {
    try {
      let courseId = null;
      if (courseParam && req.params[courseParam]) courseId = Number(req.params[courseParam]);
      else if (moduleParam && req.params[moduleParam]) courseId = await db.getModuleCourseId(req.params[moduleParam]);
      else if (lessonParam && req.params[lessonParam]) courseId = await db.getLessonCourseId(req.params[lessonParam]);

      if (!courseId) return res.status(404).json({ error: 'Recurso no encontrado' });

      const course = await db.getCourseById(courseId);
      if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

      const u = req.user;
      if (u.tipo === 'admin' || course.profesor_id === u.userId) {
        req.course = course;
        return next();
      }

      const isFree = Number(course.precio || 0) === 0;
      const hasEnrollment = await db.isUserEnrolled(u.userId, courseId);
      const hasCourseGrant = await db.hasAccessGrant({ userId: u.userId, courseId });
      if (!isFree && !hasEnrollment && !hasCourseGrant) {
        return res.status(402).json({ error: 'Debes comprar este contenido para acceder', courseId });
      }

      req.course = course;
      next();
    } catch (err) {
      console.error('Error en requireCourseAccess:', err);
      res.status(500).json({ error: 'Error verificando acceso al curso' });
    }
  };
}

function computeUnlockDate(entity, enrollmentDate, fallbackDays = null) {
  if (entity?.unlock_at) return new Date(entity.unlock_at);
  const offset = entity?.unlock_days_offset ?? fallbackDays;
  if (offset === null || offset === undefined) return null;
  const base = enrollmentDate ? new Date(enrollmentDate) : new Date();
  const d = new Date(base);
  d.setDate(d.getDate() + Number(offset || 0));
  return d;
}

function isUnlocked(entity, enrollmentDate, fallbackDays = null) {
  const unlockAt = computeUnlockDate(entity, enrollmentDate, fallbackDays);
  if (!unlockAt) return true;
  return new Date() >= unlockAt;
}

// Estado de desbloqueo de una clase segun el modo elegido por el profe.
// Devuelve { unlocked, reason, unlockAt }. reason: 'fecha' | 'goteo' | 'secuencial' | null
function lessonScheduleStatus(course, lesson, index, orderedLessons, enrollmentDate, completedSet) {
  const mode = (course.unlock_mode || 'abierto').toLowerCase();
  if (mode === 'abierto') return { unlocked: true, reason: null, unlockAt: null };

  if (mode === 'fecha') {
    const unlockAt = computeUnlockDate(lesson, enrollmentDate, null);
    if (!unlockAt) return { unlocked: true, reason: null, unlockAt: null };
    return { unlocked: new Date() >= unlockAt, reason: 'fecha', unlockAt };
  }

  if (mode === 'goteo') {
    const dias = Number(course.drip_intervalo_dias || 7);
    const unlockAt = computeUnlockDate(lesson, enrollmentDate, index * dias);
    if (!unlockAt) return { unlocked: true, reason: null, unlockAt: null };
    return { unlocked: new Date() >= unlockAt, reason: 'goteo', unlockAt };
  }

  if (mode === 'secuencial') {
    if (index === 0) return { unlocked: true, reason: null, unlockAt: null };
    const prev = orderedLessons[index - 1];
    const prevDone = prev ? completedSet.has(prev.id) : true;
    return { unlocked: prevDone, reason: prevDone ? null : 'secuencial', unlockAt: null };
  }

  return { unlocked: true, reason: null, unlockAt: null };
}

function sqlGet(query, params = []) {
  return new Promise((resolve, reject) => {
    db.db.get(query, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function sqlAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.db.all(query, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

async function hasModuleAccess(userId, course, moduleId) {
  const modality = (course.modalidad_precio || 'curso').toLowerCase();
  const enrollment = await db.getUserEnrollmentForCourse(userId, course.id);
  if (modality === 'curso') return !!enrollment || await db.hasAccessGrant({ userId, courseId: course.id });
  if (modality === 'modulo') {
    const hasCourseGrant = await db.hasAccessGrant({ userId, courseId: course.id });
    const hasModuleGrant = await db.hasAccessGrant({ userId, courseId: course.id, moduleId });
    return !!enrollment || hasCourseGrant || hasModuleGrant;
  }
  const hasCourseGrant = await db.hasAccessGrant({ userId, courseId: course.id });
  const hasModuleGrant = await db.hasAccessGrant({ userId, courseId: course.id, moduleId });
  return !!enrollment || hasCourseGrant || hasModuleGrant;
}

async function hasLessonAccess(userId, course, moduleId, lessonId) {
  const modality = (course.modalidad_precio || 'curso').toLowerCase();
  const enrollment = await db.getUserEnrollmentForCourse(userId, course.id);
  if (modality === 'curso') return !!enrollment || await db.hasAccessGrant({ userId, courseId: course.id });
  const hasCourseGrant = await db.hasAccessGrant({ userId, courseId: course.id });
  const hasModuleGrant = await db.hasAccessGrant({ userId, courseId: course.id, moduleId });
  const hasLessonGrant = await db.hasAccessGrant({ userId, courseId: course.id, lessonId });
  if (modality === 'modulo') return !!enrollment || hasCourseGrant || hasModuleGrant;
  return !!enrollment || hasCourseGrant || hasModuleGrant || hasLessonGrant;
}

const VideoConference = require('./src/models/VideoConference');

// ================================
// RUTAS DE AUTENTICACIÓN
// ================================

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, tipo: user.tipo },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await db.logActivity({
      userId: user.id,
      userName: user.nombre,
      userRole: user.tipo,
      actionType: 'auth',
      actionDescription: 'Inició sesión',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Obtener cursos inscritos y progreso
    const enrollments = await db.getUserEnrollments(user.id);
    const cursosInscritos = enrollments.map(e => e.id);
    const progreso = {};
    enrollments.forEach(e => {
      progreso[e.id] = e.progress || 0;
    });

    const { password: _, ...userWithoutPassword } = user;
    res.json({
      user: {
        ...userWithoutPassword,
        cursosInscritos,
        progreso
      },
      token
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Solicitar reset de contraseña: genera un token con TTL 1h.
// Si SMTP esta configurado, manda mail. En dev (sin SMTP) devuelve el link
// directamente en la respuesta para poder probar el flow.
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });
    const user = await db.getUserByEmail(email);
    // Por seguridad, siempre respondemos 200 (no revelamos si el email existe).
    if (!user) return res.json({ message: 'Si el email existe, te enviamos las instrucciones.' });

    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h

    await new Promise((resolve, reject) => {
      db.db.run(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, token, expiresAt],
        (err) => (err ? reject(err) : resolve())
      );
    });

    const frontUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontUrl}/reset-password?token=${token}`;

    // Mandar email (Resend/SMTP/console fallback)
    const result = await emailService.sendPasswordResetEmail({
      to: user.email,
      name: user.nombre,
      resetLink,
    });
    if (!result.success) console.error('Error enviando email de reset:', result.error);

    const response = { message: 'Si el email existe, te enviamos las instrucciones.' };
    // En dev (modo console, no se manda mail real) devolvemos el link en la
    // respuesta para poder probar el flow sin mail server configurado.
    if (emailService.mode() === 'console') {
      response.dev_reset_link = resetLink;
    }
    res.json(response);
  } catch (err) {
    console.error('forgot-password error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Resetear contraseña con token
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token y password requeridos' });
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

    const row = await new Promise((resolve, reject) => {
      db.db.get(
        'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0',
        [token],
        (err, r) => (err ? reject(err) : resolve(r))
      );
    });

    if (!row) return res.status(400).json({ error: 'Token inválido o ya usado' });
    if (new Date(row.expires_at) < new Date()) return res.status(400).json({ error: 'El link expiró. Pedí uno nuevo.' });

    const hashed = await bcrypt.hash(password, 10);
    await new Promise((resolve, reject) => {
      db.db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, row.user_id], (err) => (err ? reject(err) : resolve()));
    });
    await new Promise((resolve, reject) => {
      db.db.run('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [row.id], (err) => (err ? reject(err) : resolve()));
    });

    res.json({ message: 'Contraseña actualizada. Ya podés iniciar sesión.' });
  } catch (err) {
    console.error('reset-password error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, nombre, tipo: tipoSolicitado, teacherCode } = req.body;

    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Ese email ya está registrado' });
    }

    const requestedType = (tipoSolicitado || 'alumno').toLowerCase();
    let tipo = 'alumno';
    if (requestedType === 'profesor') {
      const validCodes = (process.env.TEACHER_REGISTER_CODES || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (!teacherCode || !validCodes.includes(String(teacherCode).trim())) {
        return res.status(403).json({ error: 'Código de docente inválido' });
      }
      tipo = 'profesor';
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const newUser = await db.createUser({
      email,
      password: hashedPassword,
      nombre,
      tipo
    });

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, tipo: newUser.tipo },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Registrar actividad de registro
    await db.logActivity({
      userId: newUser.id,
      userName: newUser.nombre,
      userRole: newUser.tipo,
      actionType: 'auth',
      actionDescription: 'Se registró en la plataforma',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      user: {
        ...newUser,
        cursosInscritos: [],
        progreso: {}
      },
      token
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
// ================================
// RUTAS DE CURSOS
// ================================

// Obtener todos los cursos
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await db.getAllCourses();
    res.json(courses);
  } catch (error) {
    console.error('Error al obtener cursos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener cursos del profesor logueado - DEBE IR ANTES DE /api/courses/:id
app.get('/api/courses/my-courses', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const courses = await db.getCoursesByProfessor(req.user.userId);

    // Contar estudiantes por curso
    const coursesWithStats = await Promise.all(courses.map(async (course) => {
      const enrollments = await db.getCourseEnrollments(course.id);
      return {
        ...course,
        estudiantes: enrollments.length
      };
    }));

    res.json({
      success: true,
      courses: coursesWithStats
    });
  } catch (error) {
    console.error('Error al obtener cursos del profesor:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener curso por ID
app.get('/api/courses/:id', async (req, res) => {
  try {
    const course = await db.getCourseById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }
    res.json(course);
  } catch (error) {
    console.error('Error al obtener curso:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo curso (solo profesores)
app.post('/api/courses', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const { nombre, descripcion, categoria, precio, duracion, imagen, modalidad_precio, drip_habilitado, drip_intervalo_dias, unlock_mode } = req.body;

    if (!nombre || !descripcion) {
      return res.status(400).json({ error: 'Nombre y descripción son requeridos' });
    }

    // Obtener datos del profesor
    const profesor = await db.getUserById(req.user.userId);

    const courseData = {
      nombre,
      descripcion,
      profesor: profesor.nombre,
      profesor_id: req.user.userId,
      categoria: categoria || 'general',
      precio: parseFloat(precio) || 0,
      duracion: duracion || '4 semanas',
      imagen: imagen || '📚',
      modalidad_precio: ['curso', 'modulo', 'clase'].includes(modalidad_precio) ? modalidad_precio : 'curso',
      drip_habilitado: !!drip_habilitado,
      drip_intervalo_dias: drip_intervalo_dias ? Number(drip_intervalo_dias) : null,
      unlock_mode: ['abierto', 'fecha', 'secuencial', 'goteo'].includes(unlock_mode) ? unlock_mode : 'abierto'
    };

    const newCourse = await db.createCourse(courseData);

    res.status(201).json({
      message: 'Curso creado exitosamente',
      course: newCourse
    });
  } catch (error) {
    console.error('Error al crear curso:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar curso
app.put('/api/courses/:id', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const courseId = req.params.id;
    const { nombre, descripcion, categoria, precio, duracion, modalidad_precio, drip_habilitado, drip_intervalo_dias, unlock_mode } = req.body;

    // Verificar que el curso pertenece al profesor
    const course = await db.getCourseById(courseId);
    if (!course || course.profesor_id !== req.user.userId) {
      return res.status(403).json({ error: 'No tienes permisos para editar este curso' });
    }

    const updatedCourse = await db.updateCourse(courseId, {
      nombre,
      descripcion,
      categoria,
      precio: parseFloat(precio),
      duracion,
      modalidad_precio: ['curso', 'modulo', 'clase'].includes(modalidad_precio) ? modalidad_precio : 'curso',
      drip_habilitado: !!drip_habilitado,
      drip_intervalo_dias: drip_intervalo_dias ? Number(drip_intervalo_dias) : null,
      unlock_mode: ['abierto', 'fecha', 'secuencial', 'goteo'].includes(unlock_mode) ? unlock_mode : 'abierto'
    });

    res.json({
      message: 'Curso actualizado exitosamente',
      course: updatedCourse
    });
  } catch (error) {
    console.error('Error al actualizar curso:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar curso
app.delete('/api/courses/:id', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const courseId = req.params.id;

    // Verificar que el curso pertenece al profesor
    const course = await db.getCourseById(courseId);
    if (!course || course.profesor_id !== req.user.userId) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar este curso' });
    }

    await db.deleteCourse(courseId);

    res.json({ message: 'Curso eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar curso:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ================================
// RUTAS DE INSCRIPCIONES
// ================================

// Obtener cursos del usuario con el progreso REAL recalculado desde lesson_progress.
app.get('/api/my-courses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const enrollments = await db.getUserEnrollments(userId);
    // Para cada curso, calcular % real desde lessons completadas.
    const enriched = await Promise.all(
      enrollments.map(async (e) => {
        try {
          const courseId = e.course_id || e.id;
          const p = await db.getStudentCourseProgress(userId, courseId);
          const total = Number(p?.total_lessons || 0);
          const done = Number(p?.completed_lessons || 0);
          const realProgress = total > 0 ? Math.round((done / total) * 100) : 0;
          return {
            ...e,
            progress: realProgress,
            total_lessons: total,
            completed_lessons: done,
            last_activity: p?.last_activity || null,
          };
        } catch {
          return e;
        }
      })
    );
    res.json(enriched);
  } catch (error) {
    console.error('Error al obtener inscripciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener alumnos inscriptos en los cursos del profesor
app.get('/api/professor/enrolled-students', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const professorCourses = await db.getCoursesByProfessor(req.user.userId);
    const enrolledStudents = [];

    for (const course of professorCourses) {
      const students = await db.getCourseEnrollments(course.id);
      enrolledStudents.push({
        courseId: course.id,
        courseName: course.nombre,
        students: students
      });
    }

    res.json(enrolledStudents);
  } catch (error) {
    console.error('Error al obtener alumnos inscriptos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Dashboard del profesor: metricas agregadas reales (cursos, alumnos, ingresos del mes,
// proxima clase en vivo) + tabla de cursos con su estado.
app.get('/api/professor/dashboard', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const userId = req.user.userId;
    const courses = await db.getCoursesByProfessor(userId);

    let totalStudents = 0;
    let monthRevenue = 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const coursesWithStats = [];
    for (const course of courses) {
      const students = await db.getCourseEnrollments(course.id);
      totalStudents += students.length;
      // Sumar ingresos aprobados del mes (solo cursos con precio > 0)
      let courseRevenue = 0;
      let totalSold = 0;
      if (Number(course.precio) > 0) {
        for (const s of students) {
          if (s.enrolled_at && s.enrolled_at >= monthStart) {
            courseRevenue += Number(course.precio);
            monthRevenue += Number(course.precio);
          }
          totalSold++;
        }
      }
      coursesWithStats.push({
        id: course.id,
        nombre: course.nombre,
        precio: course.precio,
        publicado: course.publicado,
        imagen: course.imagen,
        categoria: course.categoria,
        students: students.length,
        revenue_month: courseRevenue,
        total_sold: totalSold,
      });
    }

    // Proxima clase en vivo programada
    let nextLiveClass = null;
    try {
      const events = await db.getEventsForProfessor(userId);
      const upcoming = (events || [])
        .filter((e) => e.status !== 'cancelled' && new Date(e.start_date) > now)
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
      if (upcoming.length) {
        const e = upcoming[0];
        nextLiveClass = {
          id: e.id,
          title: e.title,
          start_date: e.start_date,
          course_name: e.course_name,
          meeting_url: e.description && e.description.startsWith('http') ? e.description : null,
        };
      }
    } catch {
      // events table puede estar vacia, no es bloqueante
    }

    res.json({
      stats: {
        courses: courses.length,
        published: courses.filter((c) => c.publicado).length,
        students: totalStudents,
        revenue_month: monthRevenue,
      },
      courses: coursesWithStats,
      next_live_class: nextLiveClass,
    });
  } catch (error) {
    console.error('Error en /api/professor/dashboard:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Lista plana de TODOS los alumnos del profesor con info de pago y curso
app.get('/api/professor/my-students', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const userId = req.user.userId;
    const courses = await db.getCoursesByProfessor(userId);
    const flat = [];
    for (const course of courses) {
      const students = await db.getCourseEnrollments(course.id);
      for (const s of students) {
        flat.push({
          enrollment_id: s.enrollment_id || s.id,
          student_id: s.id,
          student_name: s.nombre,
          student_email: s.email,
          course_id: course.id,
          course_name: course.nombre,
          course_price: course.precio,
          enrolled_at: s.enrolled_at,
          progress: s.progress,
          completed: s.completed,
        });
      }
    }
    flat.sort((a, b) => new Date(b.enrolled_at) - new Date(a.enrolled_at));
    res.json(flat);
  } catch (error) {
    console.error('Error en /api/professor/my-students:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Programar clase en vivo (genera link de Jitsi gratis y lo guarda como evento).
app.post('/api/courses/:id/live-class', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const courseId = req.params.id;
    const { title, scheduled_at, duration_minutes = 60, meeting_url, precio = 0, cover_url } = req.body;
    if (!title || !scheduled_at) {
      return res.status(400).json({ error: 'title y scheduled_at son requeridos' });
    }
    const course = await db.getCourseById(courseId);
    if (!course || course.profesor_id !== req.user.userId) {
      return res.status(403).json({ error: 'No tenes permisos para este curso' });
    }
    // URL de la transmision: la que pone el profe (YouTube en vivo oculto,
    // asi el alumno solo mira y no puede compartir pantalla). Si no pone, Jitsi.
    const slug = `ESF-${courseId}-${Date.now().toString(36)}`;
    const meetingUrl = (meeting_url && /^https?:\/\//.test(meeting_url)) ? meeting_url.trim() : `https://meet.jit.si/${slug}`;
    const startDate = new Date(scheduled_at).toISOString();
    const endDate = new Date(new Date(scheduled_at).getTime() + duration_minutes * 60 * 1000).toISOString();

    const eventId = await db.createEvent({
      title,
      description: meetingUrl, // backward-compat: la URL tambien va en description
      startDate,
      endDate,
      type: 'live_class',
      courseId,
      instructorId: req.user.userId,
      precio: Number(precio || 0),
      meetingUrl,
      coverUrl: cover_url || null,
    });

    // Notificar a inscriptos: notificacion in-app + email
    try {
      const Notification = require('./src/models/Notification');
      const notifModel = new Notification(db);
      const students = await db.getCourseEnrollments(courseId);
      for (const s of students) {
        // Notificacion in-app
        try {
          await notifModel.create({
            user_id: s.id,
            tipo: 'clase_vivo',
            type: 'clase_vivo',
            titulo: '🔴 Nueva clase en vivo',
            title: '🔴 Nueva clase en vivo',
            mensaje: `"${title}" en "${course.nombre}" - ${new Date(startDate).toLocaleString('es-AR')}`,
            message: `"${title}" en "${course.nombre}"`,
            related_type: 'course',
            related_id: courseId,
            action_url: `/course/${courseId}`,
          });
        } catch (e) { /* notif individual no bloquea */ }

        // Email (no bloquea si falla)
        if (s.email) {
          emailService.sendLiveClassEmail({
            to: s.email,
            name: s.nombre,
            courseName: course.nombre,
            classTitle: title,
            scheduledAt: startDate,
            meetingUrl,
          }).catch((e) => console.warn('Email clase en vivo fallo:', e.message));
        }
      }
    } catch (e) {
      console.warn('No se pudieron enviar notificaciones de clase en vivo:', e.message);
    }

    res.status(201).json({
      id: eventId,
      title,
      meeting_url: meetingUrl,
      start_date: startDate,
      end_date: endDate,
      course_id: Number(courseId),
    });
  } catch (error) {
    console.error('Error programando clase en vivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Listar clases en vivo de un curso (para profe Y alumno inscripto)
app.get('/api/courses/:id/live-classes', authenticateToken, requireCourseAccess({ courseParam: 'id' }), async (req, res) => {
  try {
    const courseId = Number(req.params.id);
    const events = await db.getEventsForProfessor(req.course.profesor_id);
    const filtered = (events || [])
      .filter((e) => e.course_id === courseId && e.type === 'live_class')
      .map((e) => ({
        id: e.id,
        title: e.title,
        meeting_url: e.description,
        start_date: e.start_date,
        end_date: e.end_date,
        status: e.status,
      }))
      .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    res.json(filtered);
  } catch (error) {
    console.error('Error listando clases en vivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ================================
// CLASES EN VIVO (publicas / pagas)
// ================================

// Helper: la URL de la transmision (meeting_url nuevo o description viejo).
const liveUrl = (e) => e?.meeting_url || e?.description || null;

// Acceso a una clase en vivo: dueño/admin, o quien tenga grant (pago), o
// gratis+inscripto al curso.
async function hasLiveAccess(userId, userTipo, event) {
  if (!event) return false;
  if (userTipo === 'admin' || event.instructor_id === userId) return true;
  const granted = await db.hasAccessGrant({ userId, courseId: event.course_id, eventId: event.id });
  if (granted) return true;
  if (Number(event.precio || 0) === 0) {
    const enrollment = await db.getUserEnrollmentForCourse(userId, event.course_id);
    return !!enrollment;
  }
  return false;
}

// Proximas clases en vivo (PUBLICO, para el inicio). Nunca devuelve la URL.
app.get('/api/live/upcoming', async (req, res) => {
  try {
    const rows = await db.getUpcomingLiveClasses(8);
    res.json((rows || []).map((e) => ({
      id: e.id,
      title: e.title,
      start_date: e.start_date,
      end_date: e.end_date,
      precio: Number(e.precio || 0),
      cover_url: e.cover_url || null,
      course_id: e.course_id,
      course_nombre: e.course_nombre || null,
      instructor_nombre: e.instructor_nombre || null,
    })));
  } catch (error) {
    console.error('Error en /api/live/upcoming:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Detalle de una clase en vivo + si el usuario (si esta logueado) ya tiene acceso.
app.get('/api/live/:eventId', async (req, res) => {
  try {
    const event = await db.getEventById(Number(req.params.eventId));
    if (!event || event.type !== 'live_class') return res.status(404).json({ error: 'Clase no encontrada' });

    let access = false;
    const auth = req.headers['authorization'];
    if (auth && auth.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
        access = await hasLiveAccess(decoded.userId, decoded.tipo, event);
      } catch { /* token invalido => sin acceso */ }
    }
    const course = await db.getCourseById(event.course_id);
    res.json({
      id: event.id,
      title: event.title,
      start_date: event.start_date,
      end_date: event.end_date,
      precio: Number(event.precio || 0),
      cover_url: event.cover_url || null,
      course_id: event.course_id,
      course_nombre: course?.nombre || null,
      access,
      meeting_url: access ? liveUrl(event) : null,
    });
  } catch (error) {
    console.error('Error en /api/live/:id:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Reservar lugar en una clase en vivo GRATIS (precio 0). Si es paga, avisa que hay que pagar.
app.post('/api/live/:eventId/register', authenticateToken, async (req, res) => {
  try {
    const event = await db.getEventById(Number(req.params.eventId));
    if (!event || event.type !== 'live_class') return res.status(404).json({ error: 'Clase no encontrada' });
    if (Number(event.precio || 0) > 0) {
      return res.status(402).json({ error: 'Esta clase en vivo es paga', requiresPayment: true, precio: Number(event.precio) });
    }
    await db.createAccessGrant({ user_id: req.user.userId, course_id: event.course_id, event_id: event.id });
    res.json({ message: 'Lugar reservado', access: true });
  } catch (error) {
    console.error('Error registrando en clase en vivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Entrar a la clase en vivo: devuelve la URL solo si tiene acceso.
app.get('/api/live/:eventId/join', authenticateToken, async (req, res) => {
  try {
    const event = await db.getEventById(Number(req.params.eventId));
    if (!event || event.type !== 'live_class') return res.status(404).json({ error: 'Clase no encontrada' });
    const allowed = await hasLiveAccess(req.user.userId, req.user.tipo, event);
    if (!allowed) return res.status(402).json({ error: 'Necesitás reservar/pagar esta clase para entrar' });
    res.json({ meeting_url: liveUrl(event), title: event.title });
  } catch (error) {
    console.error('Error al entrar a la clase en vivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Verificar si el usuario está inscrito en un curso
app.get('/api/courses/:id/enrollment', authenticateToken, async (req, res) => {
  try {
    const isEnrolled = await db.isUserEnrolled(req.user.userId, req.params.id);
    res.json({ enrolled: isEnrolled });
  } catch (error) {
    console.error('Error al verificar inscripción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Inscripción directa (para cursos gratuitos)
app.post('/api/courses/:id/enroll', authenticateToken, async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.userId;

    // Verificar que el curso existe
    const course = await db.getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    // Verificar que el curso es gratuito
    if (course.precio > 0) {
      return res.status(400).json({ error: 'Este curso requiere pago' });
    }

    // Verificar que no esté ya inscrito
    const isEnrolled = await db.isUserEnrolled(userId, courseId);
    if (isEnrolled) {
      return res.status(400).json({ error: 'Ya estás inscrito en este curso' });
    }

    // Inscribir al usuario
    await db.enrollUser(userId, courseId);

    // Crear notificación para el profesor
    if (course.profesor_id) {
      try {
        const Notification = require('./src/models/Notification');
        const notificationModel = new Notification(db);
        await notificationModel.create({
          user_id: course.profesor_id,
          title: '🎓 Nuevo estudiante inscrito',
          message: `${req.user.nombre} se ha inscrito en tu curso "${course.nombre}"`,
          type: 'inscripcion',
          tipo: 'inscripcion', // Agregar para compatibilidad
          related_type: 'course',
          related_id: courseId,
          action_url: `/course/${courseId}`
        });

        // Emitir notificación en tiempo real
        io.emit('newNotification', {
          userId: course.profesor_id,
          notification: {
            id: Date.now(),
            tipo: 'inscripcion',
            titulo: '🎓 Nuevo estudiante inscrito',
            mensaje: `${req.user.nombre} se ha inscrito en tu curso "${course.nombre}"`,
            timestamp: new Date()
          }
        });
      } catch (notifError) {
        console.error('Error creando notificación:', notifError.message);
        // No fallar la inscripción si falla la notificación
      }
    }

    // Email de bienvenida al alumno (no bloquea si falla)
    try {
      const student = await db.getUserById(userId);
      if (student && student.email) {
        const frontUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        emailService.sendEnrollmentEmail({
          to: student.email,
          name: student.nombre,
          courseName: course.nombre,
          courseUrl: `${frontUrl}/course/${courseId}/view`,
        }).catch((e) => console.warn('Email de bienvenida fallo:', e.message));
      }
    } catch {}

    res.json({
      message: 'Inscripción exitosa',
      enrolled: true
    });
  } catch (error) {
    console.error('Error al inscribir usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ================================
// RUTAS DE PROGRESO DEL ESTUDIANTE
// ================================

// Obtener progreso detallado del estudiante
app.get('/api/student/detailed-progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('📊 Solicitando progreso para userId:', userId);
    console.log('📊 Token user object:', req.user);
    
    // Obtener todos los enrollments del usuario
    const enrollments = await db.getUserEnrollments(userId);
    console.log('📚 Enrollments encontrados:', enrollments.length);
    
    // Para cada curso inscrito, obtener el progreso detallado
    const detailedProgress = await Promise.all(enrollments.map(async (enrollment) => {
      try {
        const course = await db.getCourseById(enrollment.course_id);
        
        // Si el curso no existe, saltar
        if (!course) {
          console.warn(`Curso no encontrado: ${enrollment.course_id}`);
          return null;
        }
        
        // Obtener módulos del curso
        const modules = await db.getCourseModules(enrollment.course_id);
        
        // Contar lecciones totales de todos los módulos
        let totalLessons = 0;
        for (const module of modules) {
          const lessons = await db.getModuleLessons(module.id);
          totalLessons += lessons.length;
        }
        
        // Obtener progreso real del estudiante usando la tabla student_progress
        const progressData = await db.getStudentCourseProgress(userId, enrollment.course_id);
        const completedLessons = progressData ? progressData.completed_lessons : 0;
        const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
        const lastActivity = progressData?.last_activity || enrollment.fecha_inscripcion;
        
        return {
          cursoId: course.id,
          nombreCurso: course.nombre,
          courseImage: course.imagen,
          progreso: progress,
          leccionesTotales: totalLessons,
          leccionesCompletadas: completedLessons,
          ultimaActividad: lastActivity,
          proximaClase: totalLessons > 0 ? 'Próxima lección disponible' : 'No hay lecciones disponibles',
          tiempoEstudio: course.duracion,
          profesor: course.profesor || 'No asignado'
        };
      } catch (err) {
        console.error(`Error procesando curso ${enrollment.course_id}:`, err);
        return null;
      }
    }));
    
    // Filtrar cursos nulos
    const validProgress = detailedProgress.filter(p => p !== null);
    
    res.json({
      success: true,
      progress: validProgress
    });
  } catch (error) {
    console.error('Error al obtener progreso detallado:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

// Obtener progreso detallado por módulos de un curso específico
app.get('/api/student/course/:courseId/modules-progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const courseId = parseInt(req.params.courseId);
    
    // Verificar que el usuario está inscrito en este curso
    const enrollments = await db.getUserEnrollments(userId);
    const isEnrolled = enrollments.some(e => e.course_id === courseId);
    
    if (!isEnrolled) {
      return res.status(403).json({ 
        success: false,
        error: 'No estás inscrito en este curso' 
      });
    }
    
    // Obtener módulos del curso
    const modules = await db.getCourseModules(courseId);
    
    // Para cada módulo, obtener lecciones y progreso
    const modulesWithProgress = await Promise.all(modules.map(async (module) => {
      const lessons = await db.getModuleLessons(module.id);
      
      // Verificar cuántas lecciones de este módulo están completadas
      let completedCount = 0;
      for (const lesson of lessons) {
        const stmt = db.db.prepare(`
          SELECT COUNT(*) as count 
          FROM student_progress 
          WHERE user_id = ? AND lesson_id = ? AND completed = 1
        `);
        const result = stmt.get(userId, lesson.id);
        if (result.count > 0) {
          completedCount++;
        }
      }
      
      const totalLessons = lessons.length;
      const percentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      
      return {
        moduleId: module.id,
        moduleName: module.titulo,
        totalLessons,
        completedLessons: completedCount,
        percentage,
        status: percentage === 100 ? 'completed' : percentage > 0 ? 'in-progress' : 'pending'
      };
    }));
    
    res.json({
      success: true,
      modules: modulesWithProgress
    });
  } catch (error) {
    console.error('Error al obtener progreso de módulos:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

// ================================
// RUTAS DE CHAT DE CURSO
// ================================

// Obtener mensajes de un curso (paywall)
app.get('/api/courses/:id/messages', authenticateToken, requireCourseAccess({ courseParam: 'id' }), async (req, res) => {
  try {
    const courseId = req.params.id;
    const messages = await db.getCourseMessages(courseId);
    res.json(messages);
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Enviar mensaje a un curso (paywall)
app.post('/api/courses/:id/messages', authenticateToken, requireCourseAccess({ courseParam: 'id' }), async (req, res) => {
  try {
    const courseId = req.params.id;
    const { message } = req.body;
    const userId = req.user.userId;

    const newMessage = await db.createCourseMessage({
      course_id: courseId,
      user_id: userId,
      message,
      timestamp: new Date().toISOString()
    });

    // Emitir mensaje por Socket.IO
    io.to(`course-${courseId}`).emit('new-message', {
      id: newMessage.id,
      message: newMessage.message,
      userId: newMessage.user_id,
      userName: req.user.nombre,
      timestamp: newMessage.timestamp
    });

    // Obtener el curso y crear notificaciones para otros participantes
    const course = await db.getCourseById(courseId);
    if (course && course.profesor_id && course.profesor_id !== userId) {
      const Notification = require('./src/models/Notification');
      const notificationModel = new Notification(db);
      
      await notificationModel.create({
        user_id: course.profesor_id,
        title: '💬 Nuevo mensaje en el chat',
        message: `${req.user.nombre} escribió en "${course.nombre}"`,
        type: 'mensaje',
        related_type: 'course',
        related_id: courseId,
        action_url: `/course/${courseId}`
      });

      // Emitir notificación en tiempo real
      io.emit('newNotification', {
        userId: course.profesor_id,
        notification: {
          id: Date.now(),
          tipo: 'mensaje',
          titulo: '💬 Nuevo mensaje en el chat',
          mensaje: `${req.user.nombre} escribió en "${course.nombre}"`,
          icon: '💬',
          type: 'info',
          timestamp: new Date()
        }
      });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ================================
// RUTAS DE RECURSOS DEL CURSO
// ================================

// Obtener recursos de un curso (paywall)
app.get('/api/courses/:id/resources', authenticateToken, requireCourseAccess({ courseParam: 'id' }), async (req, res) => {
  try {
    const courseId = req.params.id;
    const resources = await db.getCourseResources(courseId);
    res.json(resources);
  } catch (error) {
    console.error('Error al obtener recursos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Agregar recurso a un curso (solo profesores)
app.post('/api/courses/:id/resources', authenticateToken, requireProfessor, upload.single('file'), async (req, res) => {
  try {
    const courseId = req.params.id;
    const { title, description, type, url } = req.body;
    const userId = req.user.userId;

    // Verificar que el profesor sea dueño del curso
    const course = await db.getCourseById(courseId);
    if (!course || course.profesor_id !== userId) {
      return res.status(403).json({ error: 'No tienes permisos para editar este curso' });
    }

    let fileUrl = url;
    if (req.file) {
      const r = await storageHelper.uploadBuffer(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        UPLOADS_DIR
      );
      fileUrl = r.url;
    }

    const resource = await db.createCourseResource({
      course_id: courseId,
      title,
      description,
      type,
      url: fileUrl,
      uploaded_by: userId
    });

    res.status(201).json(resource);
  } catch (error) {
    console.error('Error al agregar recurso:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ================================
// RUTAS DE CALIFICACIONES
// ================================

// Obtener calificaciones de un estudiante en un curso
app.get('/api/courses/:id/grades', authenticateToken, async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.userId;
    const userType = req.user.tipo;

    let grades;
    if (userType === 'profesor' || userType === 'admin') {
      // Profesores ven todas las calificaciones del curso
      grades = await db.getCourseGrades(courseId);
    } else {
      // Estudiantes solo ven sus calificaciones
      grades = await db.getUserCourseGrades(courseId, userId);
    }

    res.json(grades);
  } catch (error) {
    console.error('Error al obtener calificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Agregar o actualizar calificación (solo profesores)
app.post('/api/courses/:courseId/grades/:userId', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const { courseId, userId } = req.params;
    const { grade, feedback, assignmentType } = req.body;
    const professorId = req.user.userId;

    // Verificar que el profesor sea dueño del curso
    const course = await db.getCourseById(courseId);
    if (!course || course.profesor_id !== professorId) {
      return res.status(403).json({ error: 'No tienes permisos para calificar en este curso' });
    }

    const gradeRecord = await db.createOrUpdateGrade({
      course_id: courseId,
      user_id: userId,
      professor_id: professorId,
      grade,
      feedback,
      assignment_type: assignmentType
    });

    // Crear notificación para el estudiante
    const Notification = require('./src/models/Notification');
    const notificationModel = new Notification(db);
    
    await notificationModel.create({
      user_id: userId,
      title: '📊 Nueva Calificación',
      message: `Has recibido una calificación de ${grade} en ${course.nombre}`,
      type: 'calificacion',
      related_type: 'grade',
      related_id: courseId,
      action_url: `/course/${courseId}`
    });

    // Emitir notificación en tiempo real
    io.emit('newNotification', {
      userId: userId,
      notification: {
        id: Date.now(),
        tipo: 'calificacion',
        titulo: '📊 Nueva Calificación',
        mensaje: `Has recibido una calificación de ${grade} en ${course.nombre}`,
        icon: '📊',
        type: 'success',
        timestamp: new Date()
      }
    });

    res.status(201).json(gradeRecord);
  } catch (error) {
    console.error('Error al guardar calificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ================================
// RUTAS DE MÓDULOS Y LECCIONES
// ================================

// Obtener módulos de un curso
app.get('/api/courses/:id/modules', authenticateToken, requireCourseAccess({ courseParam: 'id' }), async (req, res) => {
  try {
    const courseId = Number(req.params.id);
    const modules = await db.getCourseModules(courseId);
    const user = req.user;
    const isOwner = user.tipo === 'admin' || req.course.profesor_id === user.userId;
    if (isOwner) return res.json(modules);

    const enrollment = await db.getUserEnrollmentForCourse(user.userId, courseId);
    const dripDays = req.course.drip_habilitado ? Number(req.course.drip_intervalo_dias || 7) : null;
    const filtered = [];
    for (const m of modules) {
      const paid = await hasModuleAccess(user.userId, req.course, m.id);
      const unlocked = isUnlocked(m, enrollment?.enrolled_at, dripDays !== null ? (Number(m.orden || 1) - 1) * dripDays : null);
      if (m.publicado && paid && unlocked) filtered.push(m);
    }
    res.json(filtered);
  } catch (error) {
    console.error('Error al obtener módulos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo módulo (solo profesores)
app.post('/api/courses/:id/modules', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const courseId = req.params.id;
    const { titulo, descripcion, orden, precio, unlock_at, unlock_days_offset } = req.body;

    // Verificar que el profesor sea dueño del curso
    const course = await db.getCourseById(courseId);
    if (!course || course.profesor_id !== req.user.userId) {
      return res.status(403).json({ error: 'No tienes permisos para editar este curso' });
    }

    const module = await db.createModule({
      course_id: courseId,
      titulo,
      descripcion,
      orden: orden || 1,
      precio: Number(precio || 0),
      unlock_at: unlock_at || null,
      unlock_days_offset: unlock_days_offset !== undefined && unlock_days_offset !== null ? Number(unlock_days_offset) : null,
      publicado: true
    });

    res.status(201).json(module);
  } catch (error) {
    console.error('Error al crear módulo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar módulo
app.put('/api/modules/:id', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const moduleId = req.params.id;
    const { titulo, descripcion, orden, precio, unlock_at, unlock_days_offset, publicado } = req.body;

    const updatedModule = await db.updateModule(moduleId, {
      titulo,
      descripcion,
      orden,
      precio: Number(precio || 0),
      unlock_at: unlock_at || null,
      unlock_days_offset: unlock_days_offset !== undefined && unlock_days_offset !== null ? Number(unlock_days_offset) : null,
      publicado
    });

    res.json(updatedModule);
  } catch (error) {
    console.error('Error al actualizar módulo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar módulo
app.delete('/api/modules/:id', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const moduleId = req.params.id;
    await db.deleteModule(moduleId);
    res.json({ message: 'Módulo eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar módulo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener lecciones de un módulo (paywall por curso)
app.get('/api/modules/:id/lessons', authenticateToken, requireCourseAccess({ moduleParam: 'id' }), async (req, res) => {
  try {
    const moduleId = Number(req.params.id);
    const lessons = await db.getModuleLessons(moduleId);
    const user = req.user;
    const moduleData = await db.getModuleById(moduleId);
    const isOwner = user.tipo === 'admin' || req.course.profesor_id === user.userId;
    if (isOwner) return res.json(lessons);

    const enrollment = await db.getUserEnrollmentForCourse(user.userId, req.course.id);
    const dripDays = req.course.drip_habilitado ? Number(req.course.drip_intervalo_dias || 7) : null;
    const filtered = [];
    for (const l of lessons) {
      const paid = await hasLessonAccess(user.userId, req.course, moduleId, l.id);
      const fallbackOffset = dripDays !== null ? (Number(moduleData?.orden || 1) - 1) * dripDays + (Number(l.orden || 1) - 1) * dripDays : null;
      const unlocked = isUnlocked(l, enrollment?.enrolled_at, fallbackOffset);
      if (l.publicado && paid && unlocked) filtered.push(l);
    }
    res.json(filtered);
  } catch (error) {
    console.error('Error al obtener lecciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nueva lección
app.post('/api/modules/:id/lessons', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const moduleId = req.params.id;
    const { titulo, contenido, tipo, orden, precio, unlock_at, unlock_days_offset, duracion, recursos, objetivos } = req.body;

    const lesson = await db.createLesson({
      module_id: moduleId,
      titulo,
      contenido,
      tipo: tipo || 'texto',
      orden: orden || 1,
      precio: Number(precio || 0),
      unlock_at: unlock_at || null,
      unlock_days_offset: unlock_days_offset !== undefined && unlock_days_offset !== null ? Number(unlock_days_offset) : null,
      duracion: duracion || 0,
      recursos: recursos ? JSON.stringify(recursos) : null,
      objetivos: objetivos || null,
      publicado: true
    });

    res.status(201).json(lesson);
  } catch (error) {
    console.error('Error al crear lección:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar lección
app.put('/api/lessons/:id', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const lessonId = req.params.id;
    const { titulo, contenido, tipo, orden, precio, unlock_at, unlock_days_offset, duracion, recursos, objetivos, publicado } = req.body;

    const updatedLesson = await db.updateLesson(lessonId, {
      titulo,
      contenido,
      tipo,
      orden,
      precio: Number(precio || 0),
      unlock_at: unlock_at || null,
      unlock_days_offset: unlock_days_offset !== undefined && unlock_days_offset !== null ? Number(unlock_days_offset) : null,
      duracion,
      recursos: recursos ? JSON.stringify(recursos) : null,
      objetivos: objetivos || null,
      publicado
    });

    res.json(updatedLesson);
  } catch (error) {
    console.error('Error al actualizar lección:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar lección
app.delete('/api/lessons/:id', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const lessonId = req.params.id;
    await db.deleteLesson(lessonId);
    res.json({ message: 'Lección eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar lección:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Marcar lección como completada (paywall)
app.post('/api/lessons/:id/complete', authenticateToken, requireCourseAccess({ lessonParam: 'id' }), async (req, res) => {
  try {
    const lessonId = Number(req.params.id);
    const userId = req.user.userId;
    const lesson = await db.getLessonById(lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lección no encontrada' });
    const allowed = await hasLessonAccess(userId, req.course, lesson.module_id, lessonId);
    if (!allowed) return res.status(402).json({ error: 'Necesitás comprar esta lección para marcarla' });

    await db.markLessonComplete(userId, lessonId);
    res.json({ message: 'Lección marcada como completada' });
  } catch (error) {
    console.error('Error al completar lección:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener progreso del estudiante en un curso (paywall)
app.get('/api/courses/:id/progress', authenticateToken, requireCourseAccess({ courseParam: 'id' }), async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.userId;

    const progress = await db.getCourseProgress(userId, courseId);
    res.json(progress);
  } catch (error) {
    console.error('Error al obtener progreso:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ================================
// RUTAS DE MERCADOPAGO
// ================================

// Crear preferencia de pago
app.post('/api/payments/create-preference', authenticateToken, async (req, res) => {
  try {
    const { courseId, targetType = 'course', moduleId, lessonId, eventId } = req.body;

    const normalizedType = ['course', 'module', 'lesson', 'live'].includes(targetType) ? targetType : 'course';
    let refModuleId = null;
    let refLessonId = null;
    let refEventId = null;
    let amount = 0;
    let course;
    let prefTitle;

    if (normalizedType === 'live') {
      const event = await db.getEventById(Number(eventId));
      if (!event || event.type !== 'live_class') return res.status(404).json({ error: 'Clase en vivo no encontrada' });
      if (Number(event.precio || 0) <= 0) return res.status(400).json({ error: 'Esta clase es gratuita, usá reservar' });
      course = await db.getCourseById(event.course_id);
      if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
      refEventId = event.id;
      amount = Number(event.precio || 0);
      prefTitle = `Clase en vivo: ${event.title}`;
    } else {
      if (!courseId) return res.status(400).json({ error: 'ID del curso es requerido' });
      course = await db.getCourseById(courseId);
      if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
      if (Number(course.precio) === 0 && normalizedType === 'course') {
        return res.status(400).json({ error: 'El curso es gratuito, usa /api/courses/:id/enroll' });
      }
      amount = Number(course.precio || 0);
    }

    if (normalizedType === 'module') {
      const moduleData = await db.getModuleById(Number(moduleId));
      if (!moduleData || Number(moduleData.course_id) !== Number(courseId)) return res.status(400).json({ error: 'M?dulo inv?lido' });
      refModuleId = moduleData.id;
      amount = Number(moduleData.precio || 0);
    }

    if (normalizedType === 'lesson') {
      const lessonData = await db.getLessonById(Number(lessonId));
      if (!lessonData) return res.status(400).json({ error: 'Lecci?n inv?lida' });
      const moduleData = await db.getModuleById(Number(lessonData.module_id));
      if (!moduleData || Number(moduleData.course_id) !== Number(courseId)) {
        return res.status(400).json({ error: 'Lecci?n inv?lida para este curso' });
      }
      refModuleId = moduleData.id;
      refLessonId = lessonData.id;
      amount = Number(lessonData.precio || 0);
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Este contenido no tiene precio para compra individual' });
    }

    const user = await db.getUserById(req.user.userId);

    const result = await mercadoPagoService.createPreference(
      {
        id: course.id,
        nombre: course.nombre,
        descripcion: course.descripcion,
        precio: amount,
        categoria: course.categoria,
        imagen: course.imagen,
        targetType: normalizedType,
        moduleId: refModuleId,
        lessonId: refLessonId,
        eventId: refEventId,
      },
      { id: user.id, nombre: user.nombre, email: user.email }
    );

    if (!result.success) {
      console.error('createPreference fallo:', result.error);
      return res.status(502).json({ error: 'No se pudo crear la preferencia de pago', detail: result.error });
    }

    await db.createPayment({
      user_id: user.id,
      course_id: course.id,
      module_id: refModuleId,
      lesson_id: refLessonId,
      event_id: refEventId,
      target_type: normalizedType,
      amount,
      preference_id: result.preferenceId,
      status: 'pending',
    });

    res.json({
      preferenceId: result.preferenceId,
      initPoint: result.initPoint,
      sandboxInitPoint: result.sandboxInitPoint,
    });
  } catch (error) {
    console.error('Error al crear preferencia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Syllabus público (para mostrar opciones de compra por módulo/clase sin acceso completo)
app.get('/api/courses/:id/syllabus', async (req, res) => {
  try {
    const courseId = Number(req.params.id);
    const course = await db.getCourseById(courseId);
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
    const modules = (await db.getCourseModules(courseId)).filter((m) => !!m.publicado);
    const data = [];
    for (const m of modules) {
      const lessons = (await db.getModuleLessons(m.id)).filter((l) => !!l.publicado);
      data.push({ ...m, lessons });
    }
    res.json({ courseId, modules: data });
  } catch (error) {
    console.error('Error al obtener syllabus:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Vista "aula": grilla de clases con estado por alumno (bloqueada/pagada/completada).
app.get('/api/courses/:id/player', authenticateToken, async (req, res) => {
  try {
    const courseId = Number(req.params.id);
    const course = await db.getCourseById(courseId);
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

    const user = req.user;
    const isOwner = user.tipo === 'admin' || course.profesor_id === user.userId;
    const modality = (course.modalidad_precio || 'curso').toLowerCase();
    const enrollment = await db.getUserEnrollmentForCourse(user.userId, courseId);
    const completedSet = new Set(isOwner ? [] : await db.getCompletedLessonIds(user.userId, courseId));

    // Modulos -> clases publicadas, en orden, aplanadas para el modo secuencial.
    const modulesRaw = (await db.getCourseModules(courseId)).filter((m) => isOwner || !!m.publicado);
    const grouped = [];
    const orderedLessons = [];
    for (const m of modulesRaw) {
      const lessons = (await db.getModuleLessons(m.id)).filter((l) => isOwner || !!l.publicado);
      grouped.push({ module: m, lessons });
      for (const l of lessons) orderedLessons.push(l);
    }

    const outModules = [];
    let total = 0;
    let done = 0;
    let globalIndex = 0;
    for (const g of grouped) {
      const outLessons = [];
      for (const l of g.lessons) {
        const idx = globalIndex++;
        total++;
        const completed = completedSet.has(l.id);
        if (completed) done++;

        let locked = false;
        let lockReason = null;
        let unlockAt = null;
        let canBuy = false;

        if (!isOwner) {
          const paid = await hasLessonAccess(user.userId, course, l.module_id, l.id);
          if (!paid) {
            locked = true;
            lockReason = 'pago';
            canBuy = modality === 'clase' || modality === 'modulo';
          } else {
            const sched = lessonScheduleStatus(course, l, idx, orderedLessons, enrollment?.enrolled_at, completedSet);
            if (!sched.unlocked) {
              locked = true;
              lockReason = sched.reason;
              unlockAt = sched.unlockAt;
            }
          }
        }

        outLessons.push({
          id: l.id,
          module_id: l.module_id,
          titulo: l.titulo,
          tipo: l.tipo,
          orden: l.orden,
          duracion: l.duracion,
          precio: Number(l.precio || 0),
          completed,
          locked,
          lock_reason: lockReason,
          unlock_at: unlockAt ? unlockAt.toISOString() : null,
          can_buy: canBuy,
          // El contenido solo viaja si la clase esta desbloqueada (no filtrar pago).
          contenido: (!locked || isOwner) ? l.contenido : null,
          recursos: (!locked || isOwner) ? l.recursos : null,
          objetivos: (!locked || isOwner) ? (l.objetivos || null) : null,
        });
      }
      outModules.push({ id: g.module.id, titulo: g.module.titulo, orden: g.module.orden, lessons: outLessons });
    }

    res.json({
      course: {
        id: course.id,
        nombre: course.nombre,
        descripcion: course.descripcion,
        imagen: course.imagen,
        profesor: course.profesor,
        profesor_id: course.profesor_id,
        precio: Number(course.precio || 0),
        modalidad_precio: modality,
        unlock_mode: (course.unlock_mode || 'abierto').toLowerCase(),
      },
      isOwner,
      enrolled: !!enrollment,
      progress: { total, completed: done, percent: total ? Math.round((done / total) * 100) : 0 },
      modules: outModules,
    });
  } catch (error) {
    console.error('Error al obtener player del curso:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Webhook de MercadoPago.
// MP envia POST /api/payments/webhook?type=payment&data.id=XXX (tambien en body).
// Verifica signature opcional con MERCADOPAGO_WEBHOOK_SECRET (HMAC-SHA256).
app.post('/api/payments/webhook', async (req, res) => {
  try {
    if (process.env.MERCADOPAGO_WEBHOOK_SECRET) {
      const crypto = require('crypto');
      const signatureHeader = req.headers['x-signature'] || '';
      const requestId = req.headers['x-request-id'] || '';
      const dataId = (req.query['data.id'] || (req.body && req.body.data && req.body.data.id) || '').toString();

      const parts = Object.fromEntries(signatureHeader.split(',').map((p) => p.trim().split('=')));
      const ts = parts.ts;
      const v1 = parts.v1;
      if (ts && v1 && dataId) {
        const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
        const expected = crypto
          .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET)
          .update(manifest)
          .digest('hex');
        if (expected !== v1) {
          console.warn('Webhook MP: firma invalida, descartando.');
          return res.status(401).send('invalid signature');
        }
      }
    }

    const type = req.query.type || (req.body && req.body.type);
    const dataId = (req.query['data.id'] || (req.body && req.body.data && req.body.data.id) || '').toString();
    if (type !== 'payment' || !dataId) return res.status(200).send('OK');

    const info = await mercadoPagoService.getPayment(dataId);
    if (!info.success) return res.status(200).send('OK');

    const p = info.payment;
    const externalRef = p.external_reference || '';
    const m = externalRef.match(/^course_(\d+)_user_(\d+)_type_(course|module|lesson|live)(?:_module_(\d+))?(?:_lesson_(\d+))?(?:_event_(\d+))?_/);
    if (!m) return res.status(200).send('OK');

    const courseId = Number(m[1]);
    const userId = Number(m[2]);
    const targetType = m[3];
    const moduleId = m[4] ? Number(m[4]) : null;
    const lessonId = m[5] ? Number(m[5]) : null;
    const eventId = m[6] ? Number(m[6]) : null;

    const preferenceId = (p.order && p.order.id) || p.preference_id || '';
    if (preferenceId) await db.updatePaymentByPreferenceId(preferenceId, { payment_id: dataId, status: p.status });

    if (p.status === 'approved') {
      if (targetType === 'live') {
        // Clase en vivo: solo acceso al evento, no inscribe al curso entero.
        await db.createAccessGrant({ user_id: userId, course_id: courseId, event_id: eventId });
      } else {
        const already = await db.isUserEnrolled(userId, courseId);
        if (!already) await db.enrollUser(userId, courseId);
        await db.createAccessGrant({
          user_id: userId,
          course_id: courseId,
          module_id: targetType === 'module' || targetType === 'lesson' ? moduleId : null,
          lesson_id: targetType === 'lesson' ? lessonId : null,
        });
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error en webhook MP:', error);
    res.status(200).send('OK');
  }
});

// Estado de un pago. Usado por el frontend al volver de MercadoPago para
// confirmar que el alumno quedo inscrito (en caso de que el webhook tarde).
app.get('/api/payments/status', authenticateToken, async (req, res) => {
  try {
    const { preference_id, payment_id, course_id } = req.query;
    const userId = req.user.userId;

    let payment = null;
    if (preference_id) payment = await db.getPaymentByPreferenceId(preference_id);
    else if (payment_id) payment = await db.getPaymentByPaymentId(payment_id);

    // Si MP nos paso el payment_id por query, hacemos un lookup directo a MP
    // para resolver carreras donde el webhook todavia no llego.
    if (payment_id && (!payment || payment.status !== 'approved')) {
      const info = await mercadoPagoService.getPayment(payment_id);
      if (info.success && info.payment) {
        const p = info.payment;
        const m = (p.external_reference || '').match(/^course_(\d+)_user_(\d+)_type_(course|module|lesson|live)(?:_module_(\d+))?(?:_lesson_(\d+))?(?:_event_(\d+))?_/);
        if (m) {
          const cid = Number(m[1]);
          const uid = Number(m[2]);
          const tType = m[3];
          const mId = m[4] ? Number(m[4]) : null;
          const lId = m[5] ? Number(m[5]) : null;
          const eId = m[6] ? Number(m[6]) : null;
          if (uid === userId && p.status === 'approved') {
            if (tType === 'live') {
              await db.createAccessGrant({ user_id: uid, course_id: cid, event_id: eId });
              return res.json({ status: 'approved', enrolled: false, courseId: cid, targetType: tType, eventId: eId });
            }
            const already = await db.isUserEnrolled(uid, cid);
            if (!already) await db.enrollUser(uid, cid);
            await db.createAccessGrant({
              user_id: uid,
              course_id: cid,
              module_id: tType === 'module' || tType === 'lesson' ? mId : null,
              lesson_id: tType === 'lesson' ? lId : null,
            });
            return res.json({ status: 'approved', enrolled: true, courseId: cid, targetType: tType, moduleId: mId, lessonId: lId });
          }
          return res.json({ status: p.status, enrolled: false, courseId: cid, targetType: tType, moduleId: mId, lessonId: lId });
        }
      }
    }

    if (!payment) return res.json({ status: 'unknown', enrolled: false });
    if (payment.user_id !== userId) return res.status(403).json({ error: 'No autorizado' });

    const enrolled = await db.isUserEnrolled(payment.user_id, payment.course_id);
    res.json({ status: payment.status, enrolled, courseId: payment.course_id, targetType: payment.target_type, moduleId: payment.module_id, lessonId: payment.lesson_id });
  } catch (err) {
    console.error('payments/status error:', err);
    res.status(500).json({ error: 'Error obteniendo estado del pago' });
  }
});

// ================================
// RUTAS DE ARCHIVOS
// ================================

// Subir archivo (Supabase Storage si está configurado, sino disk local)
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
    const { url, filename } = await storageHelper.uploadBuffer(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      UPLOADS_DIR
    );
    res.json({ message: 'Archivo subido exitosamente', filename, url });
  } catch (error) {
    console.error('Error al subir archivo:', error);
    res.status(500).json({ error: 'Error interno del servidor', detail: error.message });
  }
});


// ================================
// RUTAS DE TAREAS/ASIGNACIONES
// ================================

const assignmentRoutes = require('./src/routes/assignments')(db, authenticateToken, requireProfessor, upload);
app.use('/api', assignmentRoutes);


// ================================
// RUTAS DE PROGRESO
// ================================

const progressRoutes = require('./src/routes/progress')(db, authenticateToken);
app.use('/api', progressRoutes);


// ================================
// RUTAS DE PAGOS MEJORADAS
// ================================

const paymentRoutes = require('./src/routes/payments')(db, authenticateToken, requireProfessor);
app.use('/api', paymentRoutes);


// ================================
// RUTAS DE NOTIFICACIONES
// ================================

const notificationRoutes = require('./src/routes/notifications')(db, authenticateToken, io);
app.use('/api', notificationRoutes);


// ================================
// RUTAS DE CERTIFICADOS
// ================================

const certificateRoutes = require('./src/routes/certificates')(db, authenticateToken);
app.use('/api', certificateRoutes);

// Servir archivos de certificados
app.use('/certificates', express.static(path.join(__dirname, '../certificates')));

// ================================
// RUTAS DE VIDEOCONFERENCIAS
// ================================

const videoConferenceRoutes = require('./src/routes/videoConferences')(db, authenticateToken, requireProfessor);
app.use('/api', videoConferenceRoutes);

// ================================
// RUTAS DE CHAT EN VIVO
// ================================

const Chat = require('./src/models/Chat');
const chatRoutes = require('./src/routes/chat')(db, authenticateToken, io);
app.use('/api', chatRoutes);

// ================================
// RUTAS DE FOROS
// ================================

const Forum = require('./src/models/Forum');
const forumRoutes = require('./src/routes/forum')(db, authenticateToken, requireProfessor);
app.use('/api', forumRoutes);

// ================================
// RUTAS DE GAMIFICACIÓN
// ================================

const Gamification = require('./src/models/Gamification');
const gamificationRoutes = require('./src/routes/gamification')(db, authenticateToken);
app.use('/api', gamificationRoutes);

// ================================
// RUTAS DE INSCRIPCIONES (Cursos Gratuitos)
// ================================

const enrollmentRoutes = require('./src/routes/enrollments')(db, authenticateToken);
app.use('/api', enrollmentRoutes);

// Inicializar NotificationHelper inmediatamente (db ya está inicializado)
const notificationHelper = new NotificationHelper(db, io);
app.set('notificationHelper', notificationHelper);
logger.success('NotificationHelper inicializado correctamente');

// ================================
// RUTAS DE ADMINISTRADOR
// ================================

const adminRoutes = require('./src/routes/admin')(db, authenticateToken, requireProfessor);
app.use('/api', adminRoutes);

// ================================
// RUTAS DE SALUD
// ================================

app.get('/api/health', async (req, res) => {
  try {
    const courses = await db.getAllCourses();
    const dbStatus = courses ? 'connected' : 'disconnected';

    // Chequeo de configuracion. Reporta que falta para que el deploy
    // sea visible desde el browser (sin necesidad de leer logs).
    const missing = [];
    if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
    if (!process.env.ADMIN_PASSWORD) missing.push('ADMIN_PASSWORD (sin esto no se crea el admin)');
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) missing.push('MERCADOPAGO_ACCESS_TOKEN (los pagos no funcionaran)');
    if (!process.env.FRONTEND_URL && process.env.NODE_ENV === 'production') {
      missing.push('FRONTEND_URL (CORS y back_urls de pago)');
    }
    if (!process.env.BACKEND_URL && process.env.NODE_ENV === 'production') {
      missing.push('BACKEND_URL (notification_url de webhook MP)');
    }

    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    res.json({
      status: missing.length === 0 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(uptime),
      database: {
        status: dbStatus,
        type: 'SQLite',
        path: process.env.DB_FILE || 'backend/database/campus_norma.db',
      },
      uploads: {
        path: process.env.UPLOADS_DIR || 'backend/uploads',
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      },
      services: {
        socketIO: io ? 'active' : 'inactive',
        mercadoPago: process.env.MERCADOPAGO_ACCESS_TOKEN ? 'configured' : 'missing',
      },
      configMissing: missing,
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// ================================
// MANEJO DE ERRORES
// ================================

app.use((err, req, res, next) => {
  logger.error('Unhandled error', err, {
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message
  });
});

// Ruta para el frontend en producción (DESHABILITADA - frontend separado en Vercel)
// if (process.env.NODE_ENV === 'production') {
//   app.use(express.static(path.join(__dirname, '../frontend/dist')));
//   app.get(/.*/, (req, res) => {
//     res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
//   });
// }

// ================================
// RUTAS DE NOTIFICACIONES
// ================================

// Obtener notificaciones del usuario
// ================================
// NOTIFICACIONES - Rutas movidas a /src/routes/notifications.js
// ================================

// ================================
// RUTAS DE EVENTOS/CALENDARIO
// ================================

// Obtener eventos del usuario
app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.tipo;

    let events;
    if (userType === 'profesor' || userType === 'admin') {
      // Los profesores ven todos los eventos de sus cursos
      events = await db.getEventsForProfessor(userId);
    } else {
      // Los estudiantes ven eventos de cursos en los que están inscritos
      events = await db.getEventsForStudent(userId);
    }

    res.json(events);
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo evento (solo profesores)
app.post('/api/events', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const { title, description, startDate, endDate, type, courseId } = req.body;
    const instructorId = req.user.userId;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const eventId = await db.createEvent({
      title,
      description,
      startDate,
      endDate,
      type: type || 'class',
      courseId,
      instructorId
    });

    const newEvent = await db.getEventById(eventId);
    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Error al crear evento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar evento
app.put('/api/events/:id', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const eventId = req.params.id;
    const { title, description, startDate, endDate, type, status } = req.body;
    const instructorId = req.user.userId;

    const updated = await db.updateEvent(eventId, {
      title,
      description,
      startDate,
      endDate,
      type,
      status
    }, instructorId);

    if (!updated) {
      return res.status(404).json({ error: 'Evento no encontrado o sin permisos' });
    }

    const event = await db.getEventById(eventId);
    res.json(event);
  } catch (error) {
    console.error('Error al actualizar evento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar evento
app.delete('/api/events/:id', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const eventId = req.params.id;
    const instructorId = req.user.userId;

    const deleted = await db.deleteEvent(eventId, instructorId);

    if (!deleted) {
      return res.status(404).json({ error: 'Evento no encontrado o sin permisos' });
    }

    res.json({ message: 'Evento eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar evento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ================================
// RUTAS DE EVALUACIONES/QUIZZES
// ================================

// Obtener quizzes
app.get('/api/quizzes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.tipo;
    const courseId = req.query.courseId;

    let quizzes;
    if (userType === 'profesor' || userType === 'admin') {
      quizzes = await db.getQuizzesForProfessor(userId, courseId);
    } else {
      quizzes = await db.getQuizzesForStudent(userId, courseId);
    }

    res.json(quizzes);
  } catch (error) {
    console.error('Error al obtener quizzes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear quiz
app.post('/api/quizzes', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const { title, description, courseId, timeLimit, attemptsAllowed, passingScore, questions } = req.body;
    const instructorId = req.user.userId;

    if (!title || !courseId || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const quizId = await db.createQuiz({
      title,
      description,
      courseId,
      instructorId,
      timeLimit: timeLimit || 60,
      attemptsAllowed: attemptsAllowed || 1,
      passingScore: passingScore || 70,
      questions
    });

    const newQuiz = await db.getQuizById(quizId);
    res.status(201).json(newQuiz);
  } catch (error) {
    console.error('Error al crear quiz:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener quiz específico con preguntas
app.get('/api/quizzes/:id', authenticateToken, async (req, res) => {
  try {
    const quizId = req.params.id;
    const userId = req.user.userId;

    const quiz = await db.getQuizWithQuestions(quizId, userId);

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz no encontrado' });
    }

    res.json(quiz);
  } catch (error) {
    console.error('Error al obtener quiz:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Enviar respuestas de quiz
app.post('/api/quizzes/:id/submit', authenticateToken, async (req, res) => {
  try {
    const quizId = req.params.id;
    const userId = req.user.userId;
    const { answers, timeSpent } = req.body;

    if (!answers) {
      return res.status(400).json({ error: 'Las respuestas son obligatorias' });
    }

    const result = await db.submitQuizAttempt(quizId, userId, answers, timeSpent);

    res.json(result);
  } catch (error) {
    console.error('Error al enviar quiz:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener intentos de quiz
app.get('/api/quizzes/:id/attempts', authenticateToken, async (req, res) => {
  try {
    const quizId = req.params.id;
    const userId = req.user.userId;
    const userType = req.user.tipo;

    let attempts;
    if (userType === 'profesor' || userType === 'admin') {
      // Los profesores ven todos los intentos
      attempts = await db.getQuizAttempts(quizId);
    } else {
      // Los estudiantes solo ven sus intentos
      attempts = await db.getUserQuizAttempts(quizId, userId);
    }

    res.json(attempts);
  } catch (error) {
    console.error('Error al obtener intentos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ================================
// RUTAS DE FORO
// ================================

// Obtener posts del foro
app.get('/api/forum/posts', authenticateToken, async (req, res) => {
  try {
    // Por ahora retornamos array vacío, más tarde implementar en DB
    res.json([]);

    // TODO: Implementar tabla de posts en la DB
    // const posts = await db.getForumPosts();
    // res.json(posts);
  } catch (error) {
    console.error('Error al obtener posts del foro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo post en el foro
app.post('/api/forum/posts', authenticateToken, async (req, res) => {
  try {
    const { title, content, category, tags, courseId } = req.body;
    const userId = req.user.userId;

    // TODO: Implementar creación de posts en DB
    const newPost = {
      id: Date.now(),
      title,
      content,
      authorId: userId,
      category,
      tags: tags || [],
      courseId,
      replies: [],
      views: 0,
      upvotes: 0,
      downvotes: 0,
      isPinned: false,
      isLocked: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    res.status(201).json(newPost);
  } catch (error) {
    console.error('Error al crear post:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ================================
// RUTAS DE GAMIFICACIÓN
// ================================

// Obtener estadísticas de gamificación del usuario
app.get('/api/gamification/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Por ahora retornamos datos básicos, más tarde implementar en DB
    const stats = {
      totalPoints: 0,
      level: 1,
      pointsToNextLevel: 100,
      totalPointsForNextLevel: 100,
      coursesCompleted: 0,
      quizzesTaken: 0,
      forumPosts: 0,
      videoHoursWatched: 0,
      loginStreak: 0,
      certificatesEarned: 0,
      badges: [],
      achievements: []
    };

    res.json(stats);

    // TODO: Implementar tablas de gamificación en la DB
    // const stats = await db.getUserGamificationStats(userId);
    // res.json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas de gamificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ================================
// RUTAS DE ANALYTICS (solo profesores y admin)
// ================================

// Obtener datos de analytics
app.get('/api/analytics', authenticateToken, async (req, res) => {
  try {
    const userType = req.user.tipo;

    if (userType !== 'profesor' && userType !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const isAdmin = userType === 'admin';
    const scopeCourseWhere = isAdmin ? '' : 'WHERE c.profesor_id = ?';
    const scopeParams = isAdmin ? [] : [req.user.userId];

    const totals = await sqlGet(
      `SELECT
        COUNT(DISTINCT c.id) as totalCourses,
        COUNT(DISTINCT e.user_id) as totalStudents,
        COUNT(DISTINCT q.id) as totalQuizzes
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id
       LEFT JOIN quizzes q ON q.course_id = c.id
       ${scopeCourseWhere}`,
      scopeParams
    );

    const activeUsersRow = await sqlGet(
      isAdmin
        ? `SELECT COUNT(*) as activeUsers FROM users WHERE activo = 1`
        : `SELECT COUNT(DISTINCT e.user_id) as activeUsers
           FROM enrollments e
           JOIN courses c ON c.id = e.course_id
           WHERE c.profesor_id = ?`,
      scopeParams
    );

    const completionRow = await sqlGet(
      `SELECT
         COUNT(*) as totalEnrollments,
         SUM(CASE WHEN e.completed = 1 THEN 1 ELSE 0 END) as completedEnrollments
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       ${isAdmin ? '' : 'WHERE c.profesor_id = ?'}`,
      scopeParams
    );

    const avgScoreRow = await sqlGet(
      `SELECT AVG(qa.score * 100.0 / NULLIF(qa.max_score,0)) as averageScore
       FROM quiz_attempts qa
       JOIN quizzes q ON q.id = qa.quiz_id
       JOIN courses c ON c.id = q.course_id
       ${isAdmin ? '' : 'WHERE c.profesor_id = ?'}`,
      scopeParams
    );

    const coursePerformance = await sqlAll(
      `SELECT c.id, c.nombre,
              COUNT(DISTINCT e.user_id) as students,
              COUNT(DISTINCT lp.user_id) as usersWithProgress
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id
       LEFT JOIN modules m ON m.course_id = c.id
       LEFT JOIN lessons l ON l.module_id = m.id
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.completed = 1
       ${scopeCourseWhere}
       GROUP BY c.id, c.nombre
       ORDER BY students DESC
       LIMIT 20`,
      scopeParams
    );

    const revenueData = await sqlAll(
      `SELECT substr(p.created_at,1,7) as month, SUM(p.amount) as revenue
       FROM payments p
       JOIN courses c ON c.id = p.course_id
       WHERE p.status = 'approved' ${isAdmin ? '' : 'AND c.profesor_id = ?'}
       GROUP BY substr(p.created_at,1,7)
       ORDER BY month DESC
       LIMIT 12`,
      scopeParams
    );

    const userActivity = await sqlAll(
      `SELECT action_type, COUNT(*) as count
       FROM activity_logs
       GROUP BY action_type
       ORDER BY count DESC
       LIMIT 20`
    );

    const quizAnalytics = await sqlAll(
      `SELECT q.id, q.title,
              COUNT(qa.id) as attempts,
              AVG(qa.score * 100.0 / NULLIF(qa.max_score,0)) as avg_percentage
       FROM quizzes q
       JOIN courses c ON c.id = q.course_id
       LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id
       ${scopeCourseWhere}
       GROUP BY q.id, q.title
       ORDER BY attempts DESC
       LIMIT 20`,
      scopeParams
    );

    const totalEnrollments = Number(completionRow?.totalEnrollments || 0);
    const completedEnrollments = Number(completionRow?.completedEnrollments || 0);
    const completionRate = totalEnrollments > 0 ? (completedEnrollments * 100) / totalEnrollments : 0;

    res.json({
      overview: {
        totalStudents: Number(totals?.totalStudents || 0),
        totalCourses: Number(totals?.totalCourses || 0),
        totalQuizzes: Number(totals?.totalQuizzes || 0),
        averageScore: Number(avgScoreRow?.averageScore || 0),
        completionRate: Number(completionRate.toFixed(2)),
        activeUsers: Number(activeUsersRow?.activeUsers || 0),
      },
      studentEngagement: [],
      coursePerformance,
      userActivity,
      quizAnalytics,
      revenueData,
    });
  } catch (error) {
    console.error('Error al obtener analytics:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ================================
// RUTAS DE ADMINISTRACIÓN
// ================================

// Listar todos los usuarios (solo admin)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const users = await db.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar usuario (solo admin)
app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const userId = parseInt(req.params.id);

    // No permitir que el admin se elimine a sí mismo
    if (userId === req.user.userId) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }

    await db.deleteUser(userId);
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cambiar estado de usuario (solo admin)
app.patch('/api/admin/users/:id/toggle-status', authenticateToken, async (req, res) => {
  try {
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const userId = parseInt(req.params.id);
    await db.toggleUserStatus(userId);
    res.json({ message: 'Estado del usuario actualizado' });
  } catch (error) {
    console.error('Error al cambiar estado del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Admin: crear usuario nuevo (puede ser alumno, profesor o admin)
app.post('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.tipo !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    const { email, password, nombre, tipo = 'alumno' } = req.body;
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'email, password y nombre son obligatorios' });
    }
    if (!['alumno', 'profesor', 'admin'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo invalido' });
    }
    const existing = await db.getUserByEmail(email);
    if (existing) return res.status(400).json({ error: 'Ese email ya está registrado' });
    const hashed = await bcrypt.hash(password, 10);
    const newUser = await db.createUser({ email, password: hashed, nombre, tipo });
    res.status(201).json({ id: newUser.id, email: newUser.email, nombre: newUser.nombre, tipo: newUser.tipo });
  } catch (err) {
    console.error('Error creando usuario admin:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Admin: cambiar rol de usuario (alumno <-> profesor <-> admin)
app.patch('/api/admin/users/:id/role', authenticateToken, async (req, res) => {
  try {
    if (req.user.tipo !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    const { tipo } = req.body;
    if (!['alumno', 'profesor', 'admin'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo invalido' });
    }
    const userId = parseInt(req.params.id);
    if (userId === req.user.userId && tipo !== 'admin') {
      return res.status(400).json({ error: 'No puedes quitarte tu propio rol de admin' });
    }
    await new Promise((resolve, reject) => {
      db.db.run('UPDATE users SET tipo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [tipo, userId], (err) => err ? reject(err) : resolve());
    });
    res.json({ message: 'Rol actualizado' });
  } catch (err) {
    console.error('Error cambiando rol:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Estadísticas del sistema (solo admin)
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const [
      usersTotal,
      usersActive,
      studentsTotal,
      teachersTotal,
      coursesTotal,
      enrollmentsTotal,
      paymentsApproved,
      revenueTotal,
      revenueMonth,
      certificatesTotal,
      forumThreadsTotal,
      recentUsers,
      topCourses,
    ] = await Promise.all([
      sqlGet(`SELECT COUNT(*) as n FROM users`),
      sqlGet(`SELECT COUNT(*) as n FROM users WHERE activo = 1`),
      sqlGet(`SELECT COUNT(*) as n FROM users WHERE tipo = 'alumno'`),
      sqlGet(`SELECT COUNT(*) as n FROM users WHERE tipo = 'profesor'`),
      sqlGet(`SELECT COUNT(*) as n FROM courses`),
      sqlGet(`SELECT COUNT(*) as n FROM enrollments`),
      sqlGet(`SELECT COUNT(*) as n FROM payments WHERE status = 'approved'`),
      sqlGet(`SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status = 'approved'`),
      sqlGet(`SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status = 'approved' AND created_at >= date('now','start of month')`),
      sqlGet(`SELECT COUNT(*) as n FROM certificates`),
      sqlGet(`SELECT COUNT(*) as n FROM forum_threads`),
      sqlAll(`SELECT id, nombre, email, tipo, created_at FROM users ORDER BY created_at DESC LIMIT 10`),
      sqlAll(`SELECT c.id, c.nombre, COUNT(e.id) as students
              FROM courses c
              LEFT JOIN enrollments e ON e.course_id = c.id
              GROUP BY c.id, c.nombre
              ORDER BY students DESC
              LIMIT 10`),
    ]);

    res.json({
      totalUsers: Number(usersTotal?.n || 0),
      activeUsers: Number(usersActive?.n || 0),
      totalStudents: Number(studentsTotal?.n || 0),
      totalTeachers: Number(teachersTotal?.n || 0),
      totalCourses: Number(coursesTotal?.n || 0),
      totalEnrollments: Number(enrollmentsTotal?.n || 0),
      approvedPayments: Number(paymentsApproved?.n || 0),
      totalRevenue: Number(revenueTotal?.total || 0),
      monthRevenue: Number(revenueMonth?.total || 0),
      totalForumPosts: Number(forumThreadsTotal?.n || 0),
      totalCertificates: Number(certificatesTotal?.n || 0),
      systemUptime: process.uptime(),
      recentUsers,
      topCourses,
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ================================
// RUTAS DE PERFIL DE USUARIO
// ================================

// Obtener información del usuario actual (usado para verificar token)
app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Obtener los IDs de cursos inscritos
    const enrollments = await db.getUserEnrollments(req.user.userId);
    const cursosInscritos = enrollments.map(e => e.id); // El ID del curso viene directamente

    // Construir objeto de progreso
    const progreso = {};
    enrollments.forEach(e => {
      progreso[e.id] = e.progress || 0;
    });

    const { password, ...userWithoutPassword } = user;
    
    res.json({
      ...userWithoutPassword,
      cursosInscritos,
      progreso
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener perfil del usuario actual
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar perfil del usuario
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { nombre, email, telefono, biografia } = req.body;
    const userId = req.user.userId;

    // Verificar si el email ya está en uso por otro usuario
    if (email && email !== req.user.email) {
      const existingUser = await db.getUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'El email ya está en uso' });
      }
    }

    await db.updateUser(userId, { nombre, email, telefono, biografia });

    const updatedUser = await db.getUserById(userId);
    const { password, ...userWithoutPassword } = updatedUser;

    res.json({
      message: 'Perfil actualizado correctamente',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Subir foto de perfil
app.post('/api/profile/photo', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    const photoUrl = `/uploads/${req.file.filename}`;
    await db.updateUser(req.user.userId, { foto: photoUrl });

    // Registrar actividad
    await db.logActivity({
      userId: req.user.userId,
      userName: req.user.nombre,
      userRole: req.user.tipo,
      actionType: 'profile_update',
      actionDescription: 'Actualizó su foto de perfil',
      entityType: 'user',
      entityId: req.user.userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      message: 'Foto de perfil actualizada',
      photoUrl
    });
  } catch (error) {
    console.error('Error al subir foto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cambiar contraseña
app.put('/api/profile/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseñas requeridas' });
    }

    const user = await db.getUserById(req.user.userId);
    const validPassword = await bcrypt.compare(currentPassword, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.updateUser(req.user.userId, { password: hashedPassword });

    // Registrar actividad
    await db.logActivity({
      userId: req.user.userId,
      userName: req.user.nombre,
      userRole: req.user.tipo,
      actionType: 'security',
      actionDescription: 'Cambió su contraseña',
      entityType: 'user',
      entityId: req.user.userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ================================
// RUTAS DE REGISTRO DE ACTIVIDAD (Admin)
// ================================

// Obtener logs de actividad
app.get('/api/admin/activity-logs', authenticateToken, async (req, res) => {
  try {
    // Verificar que sea admin
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const {
      userId,
      actionType,
      entityType,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const filters = {
      userId: userId ? parseInt(userId) : undefined,
      actionType,
      entityType,
      startDate,
      endDate,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const [logs, total] = await Promise.all([
      db.getActivityLogs(filters),
      db.countActivityLogs(filters)
    ]);

    res.json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener logs de actividad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener estadísticas de actividad
app.get('/api/admin/activity-stats', authenticateToken, async (req, res) => {
  try {
    // Verificar que sea admin
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { startDate, endDate } = req.query;
    const filters = { startDate, endDate };

    // Obtener todos los logs del período
    const logs = await db.getActivityLogs(filters);

    // Calcular estadísticas
    const stats = {
      total: logs.length,
      byActionType: {},
      byUserRole: {},
      byEntityType: {},
      topUsers: {},
      recentActivity: logs.slice(0, 10)
    };

    logs.forEach(log => {
      // Por tipo de acción
      stats.byActionType[log.action_type] = (stats.byActionType[log.action_type] || 0) + 1;

      // Por rol de usuario
      stats.byUserRole[log.user_role] = (stats.byUserRole[log.user_role] || 0) + 1;

      // Por tipo de entidad
      if (log.entity_type) {
        stats.byEntityType[log.entity_type] = (stats.byEntityType[log.entity_type] || 0) + 1;
      }

      // Usuarios más activos
      stats.topUsers[log.user_name] = (stats.topUsers[log.user_name] || 0) + 1;
    });

    // Convertir topUsers a array y ordenar
    stats.topUsers = Object.entries(stats.topUsers)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas de actividad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ================================
// SOCKET.IO PARA CHAT EN TIEMPO REAL
// ================================

io.on('connection', (socket) => {
  console.log('👤 Usuario conectado:', socket.id);

  // Unir al usuario a su room personal para notificaciones en tiempo real.
  // El cliente envía el token; si es válido lo metemos en user_<id>.
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.userId || decoded.id;
      if (userId) {
        socket.join(`user_${userId}`);
      }
    } catch (_) {
      // token inválido — sin room personal, las notificaciones en tiempo real no llegan
    }
  }

  // Unirse a la sala de un curso específico
  socket.on('join-course', (courseId) => {
    socket.join(`course-${courseId}`);
    console.log(`Usuario ${socket.id} se unió al curso ${courseId}`);
  });

  // Enviar mensaje al curso
  socket.on('send-message', (data) => {
    const { courseId, message, userId, userName, timestamp } = data;

    // Emitir el mensaje a todos los usuarios en la sala del curso
    io.to(`course-${courseId}`).emit('new-message', {
      id: Date.now(),
      message,
      userId,
      userName,
      timestamp: timestamp || new Date().toISOString()
    });
  });

  // Desconexión
  socket.on('disconnect', () => {
    console.log('❌ Usuario desconectado:', socket.id);
  });
});

// ================================
// INICIAR SERVIDOR
// ================================

server.listen(PORT, () => {
  console.log('\n========================================');
  console.log('  Campus Norma - Backend');
  console.log('========================================');
  console.log(`  Puerto:   ${PORT}`);
  console.log(`  Entorno:  ${process.env.NODE_ENV || 'development'}`);
  console.log(`  DB file:  ${process.env.DB_FILE || 'backend/database/campus_norma.db'}`);
  console.log(`  Uploads:  ${process.env.UPLOADS_DIR || 'backend/uploads'}`);
  console.log(`  Health:   /api/health`);
  console.log('========================================');

  // Reportar configuracion faltante para que sea OBVIO al ver los logs.
  const warnings = [];
  if (!process.env.ADMIN_PASSWORD) warnings.push('ADMIN_PASSWORD no definido → no se crea admin automaticamente.');
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) warnings.push('MERCADOPAGO_ACCESS_TOKEN no definido → los pagos no van a funcionar.');
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.FRONTEND_URL) warnings.push('FRONTEND_URL no definido → CORS y back_urls de MP van a fallar.');
    if (!process.env.BACKEND_URL) warnings.push('BACKEND_URL no definido → MP no va a poder mandar webhooks.');
  }
  if (warnings.length) {
    console.log('\n⚠️  Configuracion incompleta:');
    warnings.forEach((w) => console.log('   - ' + w));
    console.log('   Editar las env vars del servicio (Render → Settings → Environment)\n');
  } else {
    console.log('✅ Configuracion completa.\n');
  }
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('💥 ERROR NO CAPTURADO:', error);
  logger.error('Uncaught Exception', error);
  // No cerramos el servidor en desarrollo para debugging
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 PROMESA RECHAZADA NO MANEJADA:', reason);
  logger.error('Unhandled Rejection', { reason, promise });
  // No cerramos el servidor en desarrollo para debugging
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

module.exports = { app, server, io };









