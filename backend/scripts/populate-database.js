/**
 * Script para popular la base de datos con datos de prueba completos
 */

const bcrypt = require('bcryptjs');
const db = require('../../database/database');

async function populateDatabase() {
  console.log('🚀 Iniciando población de base de datos...\n');

  try {
    // ============================================
    // 1. CREAR USUARIOS
    // ============================================
    console.log('📝 Creando usuarios...');
    
    const hashedPassword = await bcrypt.hash('Test123!', 10);
    
    // Crear profesores
    const profesor1Id = await createUser({
      email: 'profesor1@test.com',
      password: hashedPassword,
      nombre: 'María González',
      rol: 'profesor'
    });

    const profesor2Id = await createUser({
      email: 'profesor2@test.com',
      password: hashedPassword,
      nombre: 'Juan Pérez',
      rol: 'profesor'
    });

    // Crear estudiantes
    const estudiante1Id = await createUser({
      email: 'estudiante1@test.com',
      password: hashedPassword,
      nombre: 'Ana Martínez',
      rol: 'estudiante'
    });

    const estudiante2Id = await createUser({
      email: 'estudiante2@test.com',
      password: hashedPassword,
      nombre: 'Carlos López',
      rol: 'estudiante'
    });

    const estudiante3Id = await createUser({
      email: 'estudiante3@test.com',
      password: hashedPassword,
      nombre: 'Laura Fernández',
      rol: 'estudiante'
    });

    console.log('✅ Usuarios creados:\n');
    console.log('   👨‍🏫 Profesores:');
    console.log('      - profesor1@test.com / Test123! (María González)');
    console.log('      - profesor2@test.com / Test123! (Juan Pérez)');
    console.log('   👨‍🎓 Estudiantes:');
    console.log('      - estudiante1@test.com / Test123! (Ana Martínez)');
    console.log('      - estudiante2@test.com / Test123! (Carlos López)');
    console.log('      - estudiante3@test.com / Test123! (Laura Fernández)\n');

    // ============================================
    // 2. CREAR CURSOS
    // ============================================
    console.log('📚 Creando cursos...');

    // Curso 1: JavaScript Moderno (GRATUITO)
    const curso1Id = await createCourse({
      nombre: 'JavaScript Moderno - De Cero a Experto',
      descripcion: 'Aprende JavaScript desde los fundamentos hasta conceptos avanzados. Incluye ES6+, async/await, y más.',
      profesor: 'María González',
      profesor_id: profesor1Id,
      categoria: 'programacion',
      precio: 0,
      duracion: '8 semanas',
      imagen: '💻'
    });

    // Curso 2: React y Node.js (PAGO)
    const curso2Id = await createCourse({
      nombre: 'Desarrollo Full Stack con React y Node.js',
      descripcion: 'Conviértete en desarrollador full stack. Aprende React, Node.js, Express y MongoDB.',
      profesor: 'María González',
      profesor_id: profesor1Id,
      categoria: 'programacion',
      precio: 4999,
      duracion: '12 semanas',
      imagen: '⚛️'
    });

    // Curso 3: Python para Data Science (GRATUITO)
    const curso3Id = await createCourse({
      nombre: 'Python para Data Science',
      descripcion: 'Análisis de datos con Python, Pandas, NumPy y visualización con Matplotlib.',
      profesor: 'Juan Pérez',
      profesor_id: profesor2Id,
      categoria: 'data-science',
      precio: 0,
      duracion: '10 semanas',
      imagen: '🐍'
    });

    // Curso 4: Diseño UX/UI (PAGO)
    const curso4Id = await createCourse({
      nombre: 'Diseño UX/UI Profesional',
      descripcion: 'Aprende a diseñar interfaces de usuario increíbles. Figma, Adobe XD, y principios de UX.',
      profesor: 'Juan Pérez',
      profesor_id: profesor2Id,
      categoria: 'diseno',
      precio: 3499,
      duracion: '6 semanas',
      imagen: '🎨'
    });

    console.log('✅ Cursos creados:');
    console.log('   📗 JavaScript Moderno (GRATUITO)');
    console.log('   📘 Full Stack React/Node (PAGO - $4999)');
    console.log('   📙 Python Data Science (GRATUITO)');
    console.log('   📕 Diseño UX/UI (PAGO - $3499)\n');

    // ============================================
    // 3. CREAR MÓDULOS Y LECCIONES
    // ============================================
    console.log('📖 Creando módulos y lecciones...');

    // Módulos para Curso 1: JavaScript Moderno
    const modulo1_1 = await createModule({
      course_id: curso1Id,
      titulo: 'Introducción a JavaScript',
      descripcion: 'Fundamentos del lenguaje',
      orden: 1,
      publicado: true
    });

    await createLesson({
      module_id: modulo1_1,
      titulo: 'Qué es JavaScript y su Historia',
      contenido: 'JavaScript es un lenguaje de programación que se ejecuta en el navegador...',
      tipo: 'video',
      orden: 1,
      duracion: 15,
      publicado: true
    });

    await createLesson({
      module_id: modulo1_1,
      titulo: 'Variables y Tipos de Datos',
      contenido: 'En JavaScript tenemos var, let y const para declarar variables...',
      tipo: 'video',
      orden: 2,
      duracion: 20,
      publicado: true
    });

    await createLesson({
      module_id: modulo1_1,
      titulo: 'Operadores y Expresiones',
      contenido: 'Los operadores nos permiten realizar operaciones con nuestros datos...',
      tipo: 'texto',
      orden: 3,
      duracion: 10,
      publicado: true
    });

    const modulo1_2 = await createModule({
      course_id: curso1Id,
      titulo: 'Estructuras de Control',
      descripcion: 'If, loops y más',
      orden: 2,
      publicado: true
    });

    await createLesson({
      module_id: modulo1_2,
      titulo: 'Condicionales: if, else, switch',
      contenido: 'Las estructuras condicionales nos permiten tomar decisiones...',
      tipo: 'video',
      orden: 1,
      duracion: 18,
      publicado: true
    });

    await createLesson({
      module_id: modulo1_2,
      titulo: 'Bucles: for, while, do-while',
      contenido: 'Los bucles nos permiten repetir código de manera eficiente...',
      tipo: 'video',
      orden: 2,
      duracion: 22,
      publicado: true
    });

    // Módulos para Curso 2: Full Stack
    const modulo2_1 = await createModule({
      course_id: curso2Id,
      titulo: 'Fundamentos de React',
      descripcion: 'Componentes, JSX y Props',
      orden: 1,
      publicado: true
    });

    await createLesson({
      module_id: modulo2_1,
      titulo: 'Introducción a React',
      contenido: 'React es una biblioteca de JavaScript para construir interfaces de usuario...',
      tipo: 'video',
      orden: 1,
      duracion: 25,
      publicado: true
    });

    await createLesson({
      module_id: modulo2_1,
      titulo: 'Componentes y Props',
      contenido: 'Los componentes son la base de React. Aprende a crearlos y usarlos...',
      tipo: 'video',
      orden: 2,
      duracion: 30,
      publicado: true
    });

    // Módulos para Curso 3: Python
    const modulo3_1 = await createModule({
      course_id: curso3Id,
      titulo: 'Introducción a Python',
      descripcion: 'Sintaxis básica de Python',
      orden: 1,
      publicado: true
    });

    await createLesson({
      module_id: modulo3_1,
      titulo: 'Python y su Ecosistema',
      contenido: 'Python es un lenguaje versátil usado en múltiples campos...',
      tipo: 'video',
      orden: 1,
      duracion: 20,
      publicado: true
    });

    await createLesson({
      module_id: modulo3_1,
      titulo: 'Instalación y Configuración',
      contenido: 'Aprende a instalar Python y configurar tu entorno de desarrollo...',
      tipo: 'texto',
      orden: 2,
      duracion: 15,
      publicado: true
    });

    // Módulos para Curso 4: UX/UI
    const modulo4_1 = await createModule({
      course_id: curso4Id,
      titulo: 'Principios de UX',
      descripcion: 'Experiencia de usuario',
      orden: 1,
      publicado: true
    });

    await createLesson({
      module_id: modulo4_1,
      titulo: 'Qué es UX y por qué importa',
      contenido: 'UX (User Experience) se refiere a la experiencia global del usuario...',
      tipo: 'video',
      orden: 1,
      duracion: 18,
      publicado: true
    });

    console.log('✅ Módulos y lecciones creados\n');

    // ============================================
    // 4. CREAR INSCRIPCIONES
    // ============================================
    console.log('🎓 Creando inscripciones...');

    // Estudiante 1 inscrito en cursos gratuitos
    await enrollStudent(estudiante1Id, curso1Id);
    await enrollStudent(estudiante1Id, curso3Id);

    // Estudiante 2 inscrito en JavaScript y Full Stack (simulamos que pagó)
    await enrollStudent(estudiante2Id, curso1Id);
    await enrollStudent(estudiante2Id, curso2Id, 'PAYMENT_123');

    // Estudiante 3 inscrito en todos menos Full Stack
    await enrollStudent(estudiante3Id, curso1Id);
    await enrollStudent(estudiante3Id, curso3Id);
    await enrollStudent(estudiante3Id, curso4Id, 'PAYMENT_456');

    console.log('✅ Inscripciones creadas\n');

    // ============================================
    // 5. CREAR PROGRESO
    // ============================================
    console.log('📊 Creando progreso de estudiantes...');

    // Estudiante 1 ha completado algunas lecciones del módulo 1
    const lecciones1 = await getLessonsByModule(modulo1_1);
    if (lecciones1.length > 0) {
      await markLessonCompleted(estudiante1Id, lecciones1[0].id);
      if (lecciones1[1]) await markLessonCompleted(estudiante1Id, lecciones1[1].id);
    }

    // Estudiante 2 más avanzado
    if (lecciones1.length > 0) {
      await markLessonCompleted(estudiante2Id, lecciones1[0].id);
      if (lecciones1[1]) await markLessonCompleted(estudiante2Id, lecciones1[1].id);
      if (lecciones1[2]) await markLessonCompleted(estudiante2Id, lecciones1[2].id);
    }

    const lecciones2 = await getLessonsByModule(modulo1_2);
    if (lecciones2.length > 0) {
      await markLessonCompleted(estudiante2Id, lecciones2[0].id);
    }

    console.log('✅ Progreso creado\n');

    // ============================================
    // RESUMEN FINAL
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('✨ BASE DE DATOS POBLADA EXITOSAMENTE ✨');
    console.log('='.repeat(60) + '\n');

    console.log('📋 CREDENCIALES PARA PROBAR:\n');
    
    console.log('👑 ADMINISTRADOR:');
    console.log('   Email: norma.admin@escuelanorma.com');
    console.log('   Password: Norma2025!Secure\n');

    console.log('👨‍🏫 PROFESORES:');
    console.log('   Email: profesor1@test.com | Password: Test123!');
    console.log('   Email: profesor2@test.com | Password: Test123!\n');

    console.log('👨‍🎓 ESTUDIANTES:');
    console.log('   Email: estudiante1@test.com | Password: Test123!');
    console.log('   Email: estudiante2@test.com | Password: Test123!');
    console.log('   Email: estudiante3@test.com | Password: Test123!\n');

    console.log('📚 CURSOS CREADOS: 4');
    console.log('📖 MÓDULOS CREADOS: 5');
    console.log('📝 LECCIONES CREADAS: 10+');
    console.log('🎓 INSCRIPCIONES: 7\n');

    console.log('🌐 Accede a: http://localhost:3000');
    console.log('🚀 ¡Listo para probar todas las funcionalidades!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error poblando base de datos:', error);
    process.exit(1);
  }
}

// Funciones auxiliares
async function createUser(userData) {
  return new Promise((resolve, reject) => {
    const { email, password, nombre, rol } = userData;
    
    // Verificar si ya existe
    db.getUserByEmail(email).then(existing => {
      if (existing) {
        console.log(`   ⚠️  Usuario ${email} ya existe, omitiendo...`);
        resolve(existing.id);
        return;
      }

      db.db.run(
        'INSERT INTO users (email, password, nombre, tipo, activo) VALUES (?, ?, ?, ?, 1)',
        [email, password, nombre, rol],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  });
}

async function createCourse(courseData) {
  return new Promise((resolve, reject) => {
    const { nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen } = courseData;
    
    db.db.run(
      `INSERT INTO courses (nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen, publicado, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
      [nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

async function createModule(moduleData) {
  return new Promise((resolve, reject) => {
    const { course_id, titulo, descripcion, orden, publicado } = moduleData;
    
    db.db.run(
      `INSERT INTO modules (course_id, titulo, descripcion, orden, publicado) 
       VALUES (?, ?, ?, ?, ?)`,
      [course_id, titulo, descripcion, orden, publicado ? 1 : 0],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

async function createLesson(lessonData) {
  return new Promise((resolve, reject) => {
    const { module_id, titulo, contenido, tipo, orden, duracion, publicado } = lessonData;
    
    db.db.run(
      `INSERT INTO lessons (module_id, titulo, contenido, tipo, orden, duracion, publicado) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [module_id, titulo, contenido, tipo, orden, duracion, publicado ? 1 : 0],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

async function enrollStudent(userId, courseId, paymentId = null) {
  return new Promise((resolve, reject) => {
    db.db.run(
      `INSERT INTO enrollments (user_id, course_id, enrolled_at) 
       VALUES (?, ?, datetime('now'))`,
      [userId, courseId],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

async function markLessonCompleted(userId, lessonId) {
  return new Promise((resolve, reject) => {
    db.db.run(
      `INSERT INTO lesson_progress (user_id, lesson_id, completed, completed_at) 
       VALUES (?, ?, 1, datetime('now'))`,
      [userId, lessonId],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

async function getLessonsByModule(moduleId) {
  return new Promise((resolve, reject) => {
    db.db.all(
      'SELECT * FROM lessons WHERE module_id = ? ORDER BY orden',
      [moduleId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

// Esperar a que la BD se inicialice
setTimeout(() => {
  populateDatabase();
}, 1500);
