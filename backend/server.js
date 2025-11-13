// Cargar variables de entorno
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Importar base de datos y servicios
const db = require('../database/database');
const mercadoPagoService = require('./services/mercadoPago');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://campusnorma.com', 'https://www.campusnorma.com']
      : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'campus_norma_secret_key_2024';

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
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://campusnorma.com', 'https://www.campusnorma.com']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
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

app.post('/api/auth/login', async (req, res) => {
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

    const { password: _, ...userWithoutPassword } = user;
    res.json({
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/auth/register', async (req, res) => {
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

    res.status(201).json({
      user: newUser,
      token
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ================================
// RUTAS DE PERFIL
// ================================

// Actualizar perfil de usuario
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { nombre, email, telefono, biografia, currentPassword, newPassword } = req.body;

    if (!nombre || !email) {
      return res.status(400).json({ error: 'Nombre y email son obligatorios' });
    }

    // Verificar si el email ya existe para otro usuario
    const existingUser = await db.getUserByEmail(email);
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({ error: 'El email ya está en uso por otro usuario' });
    }

    // Si se quiere cambiar contraseña, verificar la actual
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Contraseña actual requerida' });
      }

      const user = await db.getUserById(userId);
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'Contraseña actual incorrecta' });
      }
    }

    // Preparar datos de actualización
    const updateData = {
      nombre,
      email,
      telefono: telefono || null,
      biografia: biografia || null
    };

    // Si hay nueva contraseña, encriptarla
    if (newPassword) {
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    // Actualizar usuario
    const updatedUser = await db.updateUser(userId, updateData);
    
    // Remover password del response
    const { password: _, ...userWithoutPassword } = updatedUser;
    
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
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

// Obtener cursos del profesor logueado
app.get('/api/courses/my-courses', authenticateToken, requireProfessor, async (req, res) => {
  try {
    const courses = await db.getCoursesByProfessor(req.user.userId);
    res.json(courses);
  } catch (error) {
    console.error('Error al obtener cursos del profesor:', error);
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
    const preference = await mercadoPagoService.createPreference({
      courseId: course.id,
      courseName: course.nombre,
      price: course.precio,
      userEmail: user.email,
      userId: user.id
    });

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

// ================================
// RUTAS DE ADMINISTRADOR
// ================================

const adminRoutes = require('./src/routes/admin')(db, authenticateToken, requireProfessor);
app.use('/api', adminRoutes);

// ================================
// RUTAS DE SALUD
// ================================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ================================
// MANEJO DE ERRORES
// ================================

app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Ruta para el frontend en producción
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// ================================
// RUTAS DE NOTIFICACIONES
// ================================

// Obtener notificaciones del usuario
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Por ahora retornamos array vacío, más tarde implementar en DB
    res.json([]);
    
    // TODO: Implementar tabla de notificaciones en la DB
    // const notifications = await db.getUserNotifications(userId);
    // res.json(notifications);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Marcar notificación como leída
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // TODO: Implementar lógica de marcado como leída
    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error al marcar notificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

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
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Base de datos: SQLite iniciada`);
  console.log(`💬 Socket.IO habilitado para chat en tiempo real`);
});

module.exports = { app, server, io };









