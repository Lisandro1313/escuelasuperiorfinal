require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createServer } = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');

// Importar configuración de base de datos
const { testConnection } = require('./src/config/database');
const { createTables, insertSampleData } = require('./src/config/schema');

// Importar modelos
const User = require('./src/models/User');
const Course = require('./src/models/Course');
const Message = require('./src/models/Message');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'campus_virtual_secret_2024';

// Inicializar base de datos
const initializeDatabase = async () => {
  console.log('🔄 Inicializando base de datos...');
  
  const isConnected = await testConnection();
  if (!isConnected) {
    console.log('⚠️  No se pudo conectar a PostgreSQL. Usando modo de demostración.');
    return false;
  }

  try {
    await createTables();
    await insertSampleData();
    console.log('✅ Base de datos inicializada correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    return false;
  }
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Crear directorio de uploads si no existe
const uploadsDir = process.env.UPLOAD_DIR || 'uploads';
if (!require('fs').existsSync(uploadsDir)) {
  require('fs').mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 // 100MB por defecto
  },
  fileFilter: (req, file, cb) => {
    // Tipos de archivo permitidos
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|mp4|avi|mov|ppt|pptx/;
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
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Error de autenticación:', error);
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// Servir archivos estáticos
app.use('/uploads', express.static(uploadsDir));

// ====== RUTAS DE AUTENTICACIÓN ======

// Registro de usuario
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, nombre, tipo } = req.body;

    // Validaciones
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'Email, password y nombre son requeridos' });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    // Encriptar password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const newUser = await User.create({
      email,
      password: hashedPassword,
      nombre,
      tipo: tipo || 'alumno'
    });

    // Generar token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        nombre: newUser.nombre,
        tipo: newUser.tipo
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Login de usuario
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password son requeridos' });
    }

    // Buscar usuario
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Actualizar última conexión
    await User.updateLastConnection(user.id);

    // Generar token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        tipo: user.tipo,
        cursosInscritos: user.cursos_inscritos || [],
        cursosDictados: user.cursos_dictados || [],
        progreso: user.progreso || {}
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Verificar token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      nombre: req.user.nombre,
      tipo: req.user.tipo,
      cursosInscritos: req.user.cursos_inscritos || [],
      cursosDictados: req.user.cursos_dictados || [],
      progreso: req.user.progreso || {}
    }
  });
});

// ====== RUTAS DE CURSOS ======

// Obtener todos los cursos
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.getAll();
    res.json(courses);
  } catch (error) {
    console.error('Error obteniendo cursos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener curso por ID
app.get('/api/courses/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }
    res.json(course);
  } catch (error) {
    console.error('Error obteniendo curso:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Inscribirse a un curso
app.post('/api/courses/:id/enroll', authenticateToken, async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    const userId = req.user.id;

    // Verificar que el curso existe
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    // Inscribir usuario
    await User.enrollInCourse(userId, courseId);
    await Course.addStudentToCourse(courseId, userId);

    res.json({ message: 'Inscripción exitosa' });

  } catch (error) {
    console.error('Error en inscripción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Buscar cursos
app.get('/api/courses/search/:term', async (req, res) => {
  try {
    const courses = await Course.search(req.params.term);
    res.json(courses);
  } catch (error) {
    console.error('Error buscando cursos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ====== RUTAS DE CHAT ======

// Obtener mensajes de un curso
app.get('/api/courses/:id/messages', authenticateToken, async (req, res) => {
  try {
    const messages = await Message.getByCourse(req.params.id);
    res.json(messages);
  } catch (error) {
    console.error('Error obteniendo mensajes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Enviar mensaje
app.post('/api/courses/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { mensaje, tipo } = req.body;
    
    const newMessage = await Message.create({
      curso_id: parseInt(req.params.id),
      usuario_id: req.user.id,
      mensaje,
      tipo: tipo || 'texto'
    });

    // Obtener mensaje completo con datos del usuario
    const fullMessage = await Message.getById(newMessage.id);

    // Emitir a través de Socket.IO
    io.to(`course_${req.params.id}`).emit('newMessage', fullMessage);

    res.status(201).json(fullMessage);

  } catch (error) {
    console.error('Error enviando mensaje:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ====== RUTAS DE ARCHIVOS ======

// Subir archivo
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    res.json({
      message: 'Archivo subido exitosamente',
      file: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: `/uploads/${req.file.filename}`
      }
    });

  } catch (error) {
    console.error('Error subiendo archivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ====== CONFIGURACIÓN DE SOCKET.IO ======

io.on('connection', (socket) => {
  console.log('📱 Usuario conectado:', socket.id);

  // Autenticación por socket
  socket.on('authenticate', async (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user) {
        socket.userId = user.id;
        socket.userName = user.nombre;
        console.log(`✅ Usuario autenticado: ${user.nombre}`);
        socket.emit('authenticated', { success: true, user: user.nombre });
      } else {
        socket.emit('authenticated', { success: false, error: 'Usuario no encontrado' });
      }
    } catch (error) {
      socket.emit('authenticated', { success: false, error: 'Token inválido' });
    }
  });

  // Unirse a sala de curso
  socket.on('joinCourse', (courseId) => {
    socket.join(`course_${courseId}`);
    console.log(`👥 Usuario ${socket.userName} se unió al curso ${courseId}`);
    socket.to(`course_${courseId}`).emit('userJoined', { 
      user: socket.userName, 
      courseId 
    });
  });

  // Abandonar sala de curso
  socket.on('leaveCourse', (courseId) => {
    socket.leave(`course_${courseId}`);
    console.log(`👋 Usuario ${socket.userName} abandonó el curso ${courseId}`);
    socket.to(`course_${courseId}`).emit('userLeft', { 
      user: socket.userName, 
      courseId 
    });
  });

  // Manejar desconexión
  socket.on('disconnect', () => {
    console.log('📱 Usuario desconectado:', socket.id);
  });
});

// ====== RUTAS DE ESTADO ======

// Ruta de salud
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus ? 'connected' : 'disconnected',
    version: '2.0.0'
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: '🎓 Campus Virtual Norma API',
    version: '2.0.0',
    database: 'PostgreSQL',
    features: ['JWT Auth', 'Socket.IO', 'File Upload', 'Real-time Chat'],
    endpoints: {
      auth: '/api/auth/*',
      courses: '/api/courses/*',
      upload: '/api/upload',
      health: '/api/health'
    }
  });
});

// Manejo de errores 404 - debe estar al final de todas las rutas
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Manejo de errores globales
app.use((error, req, res, next) => {
  console.error('Error global:', error);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
const startServer = async () => {
  const dbInitialized = await initializeDatabase();
  
  server.listen(PORT, () => {
    console.log('=================================');
    console.log('🚀 Campus Virtual Norma Backend');
    console.log('=================================');
    console.log(`📡 Servidor corriendo en puerto ${PORT}`);
    console.log(`🌐 API disponible en: http://localhost:${PORT}`);
    console.log(`📊 Base de datos: ${dbInitialized ? 'PostgreSQL ✅' : 'Mock Data ⚠️'}`);
    console.log(`🔒 JWT activado`);
    console.log(`📁 Uploads en: ${uploadsDir}`);
    console.log(`🔄 Socket.IO activado`);
    console.log('=================================');
  });
};

// Iniciar la aplicación
startServer().catch(console.error);