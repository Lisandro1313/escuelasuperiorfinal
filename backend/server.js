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

// Importar base de datos y servicios
// Detecta automáticamente si usar PostgreSQL o SQLite
const db = process.env.DATABASE_URL 
  ? require('./database-postgres')  // PostgreSQL (Supabase)
  : require('../database/database'); // SQLite como fallback
const mercadoPagoService = require('./services/mercadopago');
const logger = require('./utils/logger');
const NotificationHelper = require('./utils/notificationHelper');

const app = express();
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
const JWT_SECRET = process.env.JWT_SECRET || 'campus_norma_secret_key_2024';

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

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|mp4|avi|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
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

    // Registrar actividad de login
    await db.logActivity({
      userId: user.id,
      userName: user.nombre,
      userRole: user.tipo,
      actionType: 'auth',
      actionDescription: 'Inició sesión',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Registrar actividad de login
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

app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, nombre, tipo = 'alumno', teacherCode } = req.body;

    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Verificar si el email ya existe
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Validar código de profesor si se registra como profesor
    if (tipo === 'profesor') {
      const validTeacherCodes = ['PROF2024', 'DOCENTE123', 'MAESTRO456'];
      if (!teacherCode || !validTeacherCodes.includes(teacherCode)) {
        return res.status(400).json({ error: 'Código de profesor inválido' });
      }
    }

    // Encriptar contraseña
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
    const { nombre, descripcion, categoria, precio, duracion, imagen } = req.body;

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
      imagen: imagen || '📚'
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
    const { nombre, descripcion, categoria, precio, duracion } = req.body;

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
      duracion
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

// Obtener cursos del usuario
app.get('/api/my-courses', authenticateToken, async (req, res) => {
  try {
    const enrollments = await db.getUserEnrollments(req.user.userId);
    res.json(enrollments);
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

// Obtener mensajes de un curso
app.get('/api/courses/:id/messages', authenticateToken, async (req, res) => {
  try {
    const courseId = req.params.id;
    const messages = await db.getCourseMessages(courseId);
    res.json(messages);
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Enviar mensaje a un curso
app.post('/api/courses/:id/messages', authenticateToken, async (req, res) => {
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

// Obtener recursos de un curso
app.get('/api/courses/:id/resources', authenticateToken, async (req, res) => {
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
      fileUrl = `/uploads/${req.file.filename}`;
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
app.get('/api/courses/:id/modules', authenticateToken, async (req, res) => {
  try {
    const courseId = req.params.id;
    const modules = await db.getCourseModules(courseId);
    res.json(modules);
  } catch (error) {
    console.error('Error al obtener módulos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo módulo (solo profesores)
app.post('/api/courses/:id/modules', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const courseId = req.params.id;
    const { titulo, descripcion, orden } = req.body;

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
    const { titulo, descripcion, orden, publicado } = req.body;

    const updatedModule = await db.updateModule(moduleId, {
      titulo,
      descripcion,
      orden,
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

// Obtener lecciones de un módulo
app.get('/api/modules/:id/lessons', authenticateToken, async (req, res) => {
  try {
    const moduleId = req.params.id;
    const lessons = await db.getModuleLessons(moduleId);
    res.json(lessons);
  } catch (error) {
    console.error('Error al obtener lecciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nueva lección
app.post('/api/modules/:id/lessons', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const moduleId = req.params.id;
    const { titulo, contenido, tipo, orden, duracion, recursos } = req.body;

    const lesson = await db.createLesson({
      module_id: moduleId,
      titulo,
      contenido,
      tipo: tipo || 'texto',
      orden: orden || 1,
      duracion: duracion || 0,
      recursos: recursos ? JSON.stringify(recursos) : null,
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
    const { titulo, contenido, tipo, orden, duracion, recursos, publicado } = req.body;

    const updatedLesson = await db.updateLesson(lessonId, {
      titulo,
      contenido,
      tipo,
      orden,
      duracion,
      recursos: recursos ? JSON.stringify(recursos) : null,
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

// Marcar lección como completada (para estudiantes)
app.post('/api/lessons/:id/complete', authenticateToken, async (req, res) => {
  try {
    const lessonId = req.params.id;
    const userId = req.user.userId;

    await db.markLessonComplete(userId, lessonId);
    res.json({ message: 'Lección marcada como completada' });
  } catch (error) {
    console.error('Error al completar lección:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener progreso del estudiante en un curso
app.get('/api/courses/:id/progress', authenticateToken, async (req, res) => {
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
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'ID del curso es requerido' });
    }

    // Obtener información del curso
    const course = await db.getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    // Verificar si ya está inscrito
    const isEnrolled = await db.isUserEnrolled(req.user.userId, courseId);
    if (isEnrolled) {
      return res.status(400).json({ error: 'Ya estás inscrito en este curso' });
    }

    // Obtener información del usuario
    const user = await db.getUserById(req.user.userId);

    // Crear preferencia de pago
    const preference = await mercadoPagoService.createPreference(
      {
        id: course.id,
        nombre: course.nombre || course.title,
        descripcion: course.descripcion || course.description,
        precio: course.precio,
        categoria: course.categoria,
        imagen: course.image_url
      },
      {
        id: user.id,
        nombre: user.nombre,
        email: user.email
      }
    );

    // Guardar información del pago
    await db.createPayment({
      user_id: user.id,
      course_id: course.id,
      amount: course.precio,
      preference_id: preference.id,
      status: 'pending'
    });

    res.json({ preferenceId: preference.id });
  } catch (error) {
    console.error('Error al crear preferencia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Webhook de MercadoPago
app.post('/api/payments/webhook', async (req, res) => {
  try {
    const paymentData = req.body;

    if (paymentData.type === 'payment') {
      const paymentId = paymentData.data.id;
      const paymentInfo = await mercadoPagoService.getPaymentInfo(paymentId);

      if (paymentInfo.status === 'approved') {
        // Actualizar estado del pago
        await db.updatePaymentStatus(paymentId, 'approved');

        // Obtener información del pago para inscribir al usuario
        const payment = await db.getPaymentByPaymentId(paymentId);
        if (payment) {
          await db.enrollUser(payment.user_id, payment.course_id);
          console.log(`✅ Usuario ${payment.user_id} inscrito en curso ${payment.course_id}`);
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error en webhook:', error);
    res.status(500).send('Error');
  }
});

// ================================
// RUTAS DE ARCHIVOS
// ================================

// Subir archivo
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    res.json({
      message: 'Archivo subido exitosamente',
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`
    });
  } catch (error) {
    console.error('Error al subir archivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
    // Verificar conexión a la base de datos intentando obtener cursos
    const courses = await db.getAllCourses();
    const dbStatus = courses ? 'connected' : 'disconnected';

    // Información del sistema
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(uptime),
      database: {
        status: dbStatus,
        type: 'SQLite'
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
      },
      services: {
        socketIO: io ? 'active' : 'inactive',
        mercadoPago: !!process.env.MERCADOPAGO_ACCESS_TOKEN
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
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

    // Por ahora retornamos datos básicos, más tarde implementar en DB
    const analytics = {
      overview: {
        totalStudents: 0,
        totalCourses: 0,
        totalQuizzes: 0,
        averageScore: 0,
        completionRate: 0,
        activeUsers: 0
      },
      studentEngagement: [],
      coursePerformance: [],
      userActivity: [],
      quizAnalytics: [],
      revenueData: []
    };

    res.json(analytics);

    // TODO: Implementar cálculos reales de analytics
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

// Estadísticas del sistema (solo admin)
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const users = await db.getAllUsers();
    const courses = await db.getAllCourses();

    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.activo !== false).length,
      totalCourses: courses.length,
      totalForumPosts: 0,
      totalCertificates: 0,
      systemUptime: process.uptime()
    };

    res.json(stats);
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
  logger.success(`Servidor ejecutándose en puerto ${PORT}`);
  logger.info(`Entorno: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Base de datos: SQLite iniciada`);
  logger.info(`Socket.IO habilitado para chat en tiempo real`);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n🚀 Servidor ejecutándose en puerto ${PORT}`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Base de datos: SQLite iniciada`);
    console.log(`💬 Socket.IO habilitado para chat en tiempo real`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health\n`);
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









