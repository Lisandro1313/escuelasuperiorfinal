/**
 * Script para agregar datos de prueba completos al sistema
 * Incluye: usuarios, cursos, clases, inscripciones, mensajes y más
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Conectar a la base de datos
const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🚀 Iniciando población de base de datos con datos de prueba...\n');

// Datos de prueba
const seedData = async () => {
  const hashedPassword = await bcrypt.hash('Test123!', 10);

  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        console.log('👥 Creando usuarios de prueba...');

        // Crear profesores
        await runQuery(`
          INSERT OR IGNORE INTO users (email, password, nombre, tipo, biografia, telefono) 
          VALUES 
            ('maria.gonzalez@campus.com', ?, 'María González', 'profesor', 
             'Profesora de Programación con 10 años de experiencia en desarrollo web y móvil. Apasionada por enseñar JavaScript y React.', 
             '+34 612 345 678'),
            ('juan.perez@campus.com', ?, 'Juan Pérez', 'profesor', 
             'Especialista en Data Science y Machine Learning. PhD en Ciencias de la Computación.', 
             '+34 623 456 789'),
            ('sofia.martinez@campus.com', ?, 'Sofía Martínez', 'profesor', 
             'Diseñadora UX/UI con certificaciones internacionales. Experta en Figma y Adobe XD.', 
             '+34 634 567 890')
        `, [hashedPassword, hashedPassword, hashedPassword]);

        // Crear estudiantes
        await runQuery(`
          INSERT OR IGNORE INTO users (email, password, nombre, tipo, biografia, telefono) 
          VALUES 
            ('ana.lopez@estudiante.com', ?, 'Ana López', 'alumno', 
             'Estudiante de Ingeniería Informática. Interesada en desarrollo web full stack.', 
             '+34 645 678 901'),
            ('carlos.rodriguez@estudiante.com', ?, 'Carlos Rodríguez', 'alumno', 
             'Diseñador gráfico en transición a UX/UI. Creativo y detallista.', 
             '+34 656 789 012'),
            ('laura.garcia@estudiante.com', ?, 'Laura García', 'alumno', 
             'Data Analyst buscando mejorar habilidades en Python y visualización de datos.', 
             '+34 667 890 123'),
            ('miguel.sanchez@estudiante.com', ?, 'Miguel Sánchez', 'alumno', 
             'Desarrollador junior en busca de especialización en React y Node.js.', 
             '+34 678 901 234'),
            ('elena.fernandez@estudiante.com', ?, 'Elena Fernández', 'alumno', 
             'Emprendedora tech aprendiendo a crear sus propias aplicaciones web.', 
             '+34 689 012 345')
        `, [hashedPassword, hashedPassword, hashedPassword, hashedPassword, hashedPassword]);

        console.log('✅ Usuarios creados\n');

        console.log('📚 Creando cursos...');

        // Obtener IDs de profesores
        const profesores = await runQueryAll(`
          SELECT id, nombre FROM users WHERE tipo = 'profesor' ORDER BY id LIMIT 3
        `);

        const prof1 = profesores[0];
        const prof2 = profesores[1];
        const prof3 = profesores[2];

        // Crear cursos
        await runQuery(`
          INSERT OR IGNORE INTO courses (nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen, publicado) 
          VALUES 
            ('JavaScript Moderno - De Cero a Experto', 
             'Aprende JavaScript desde los fundamentos hasta conceptos avanzados. Incluye ES6+, async/await, DOM, eventos y mucho más. Perfecto para principiantes y desarrolladores que quieren actualizar sus conocimientos.',
             ?, ?, 'Programación', 0, '8 semanas', '💻', true),
            
            ('Desarrollo Full Stack con React y Node.js', 
             'Conviértete en desarrollador full stack profesional. Frontend con React, Hooks y Redux. Backend con Node.js, Express y MongoDB. Incluye despliegue y mejores prácticas.',
             ?, ?, 'Programación', 4999, '12 semanas', '⚛️', true),
            
            ('Python para Data Science y Machine Learning', 
             'Domina el análisis de datos con Python. Pandas, NumPy, Matplotlib, Seaborn, Scikit-learn. Proyectos reales de análisis de datos y machine learning.',
             ?, ?, 'Data Science', 0, '10 semanas', '🐍', true),
            
            ('Diseño UX/UI Profesional con Figma', 
             'Aprende a diseñar interfaces de usuario increíbles. Principios de UX, diseño visual, prototipado en Figma, design systems y testing con usuarios.',
             ?, ?, 'Diseño', 3499, '6 semanas', '🎨', true),
            
            ('SQL y Bases de Datos desde Cero', 
             'Domina SQL y diseño de bases de datos. MySQL, PostgreSQL, consultas avanzadas, optimización y modelado de datos. Ideal para backend developers.',
             ?, ?, 'Programación', 2999, '5 semanas', '🗄️', true),
            
            ('Marketing Digital y Redes Sociales', 
             'Estrategias efectivas de marketing digital. SEO, SEM, redes sociales, email marketing, analítica web y campañas publicitarias.',
             ?, ?, 'Marketing', 0, '6 semanas', '📱', true)
        `, [
          prof1.nombre, prof1.id,
          prof1.nombre, prof1.id,
          prof2.nombre, prof2.id,
          prof3.nombre, prof3.id,
          prof1.nombre, prof1.id,
          prof3.nombre, prof3.id
        ]);

        console.log('✅ Cursos creados\n');

        console.log('📖 Creando clases para los cursos...');

        // Obtener IDs de cursos
        const cursos = await runQueryAll(`SELECT id, nombre FROM courses ORDER BY id LIMIT 6`);

        // Crear clases para cada curso
        for (let i = 0; i < cursos.length; i++) {
          const curso = cursos[i];
          const fechaBase = new Date();

          // Clases pasadas
          await runQuery(`
            INSERT INTO lessons (course_id, titulo, contenido, tipo, video_url) 
            VALUES 
              (?, 'Introducción y Bienvenida', 'Primera clase del curso. Conoceremos los objetivos, metodología y presentación.', ?, 60, 'virtual', 'https://meet.google.com/abc-defg-hij', 'completada'),
              (?, 'Fundamentos Básicos', 'Conceptos fundamentales que necesitas conocer para avanzar en el curso.', ?, 90, 'virtual', 'https://meet.google.com/abc-defg-hij', 'completada'),
              (?, 'Primera Práctica', 'Pondremos en práctica lo aprendido con ejercicios guiados.', ?, 75, 'virtual', 'https://meet.google.com/abc-defg-hij', 'completada')
          `, [
            curso.id, new Date(fechaBase.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            curso.id, new Date(fechaBase.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            curso.id, new Date(fechaBase.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
          ]);

          // Clases futuras
          await runQuery(`
            INSERT INTO clases (curso_id, titulo, descripcion, fecha, duracion, modalidad, url_reunion, estado) 
            VALUES 
              (?, 'Conceptos Intermedios', 'Profundizaremos en temas más avanzados del curso.', ?, 90, 'virtual', 'https://meet.google.com/xyz-uvwx-yz', 'programada'),
              (?, 'Proyecto Práctico Parte 1', 'Comenzaremos el desarrollo de un proyecto real aplicando todo lo aprendido.', ?, 120, 'virtual', 'https://meet.google.com/xyz-uvwx-yz', 'programada'),
              (?, 'Proyecto Práctico Parte 2', 'Continuaremos con el proyecto y revisaremos mejores prácticas.', ?, 120, 'virtual', 'https://meet.google.com/xyz-uvwx-yz', 'programada')
          `, [
            curso.id, new Date(fechaBase.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            curso.id, new Date(fechaBase.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            curso.id, new Date(fechaBase.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
          ]);
        }

        console.log('✅ Clases creadas\n');

        console.log('🎓 Creando inscripciones...');

        // Obtener IDs de estudiantes
        const estudiantes = await runQueryAll(`
          SELECT id FROM usuarios WHERE tipo = 'alumno' ORDER BY id LIMIT 5
        `);

        // Inscribir estudiantes en varios cursos
        for (const estudiante of estudiantes) {
          // Cada estudiante en 2-3 cursos aleatorios
          const numCursos = Math.floor(Math.random() * 2) + 2;
          const cursosSeleccionados = cursos.slice(0, numCursos);

          for (const curso of cursosSeleccionados) {
            await runQuery(`
              INSERT OR IGNORE INTO inscripciones (usuario_id, curso_id, estado, progreso) 
              VALUES (?, ?, 'activa', ?)
            `, [estudiante.id, curso.id, Math.floor(Math.random() * 60) + 10]);
          }
        }

        console.log('✅ Inscripciones creadas\n');

        console.log('💬 Creando mensajes en el chat...');

        // Crear mensajes en los chats de los cursos
        const fechaMensaje = new Date();
        
        for (let i = 0; i < Math.min(3, cursos.length); i++) {
          const curso = cursos[i];
          
          await runQuery(`
            INSERT INTO mensajes (curso_id, usuario_id, mensaje, tipo, fecha_envio) 
            VALUES 
              (?, ?, 'Hola a todos! Bienvenidos al curso. Estoy muy emocionado de comenzar este viaje de aprendizaje con ustedes.', 'texto', ?),
              (?, ?, 'Buenos días! Una pregunta, ¿dónde puedo encontrar el material complementario?', 'texto', ?),
              (?, ?, 'Hola! El material está en la sección de recursos de cada clase. Cualquier duda me avisan.', 'texto', ?),
              (?, ?, 'Perfecto, muchas gracias!', 'texto', ?),
              (?, ?, 'Me encanta la metodología del curso, muy claro todo!', 'texto', ?)
          `, [
            curso.id, prof1.id, new Date(fechaMensaje.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            curso.id, estudiantes[0].id, new Date(fechaMensaje.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
            curso.id, prof1.id, new Date(fechaMensaje.getTime() - 4 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
            curso.id, estudiantes[0].id, new Date(fechaMensaje.getTime() - 4 * 24 * 60 * 60 * 1000 + 7200000).toISOString(),
            curso.id, estudiantes[1]?.id || estudiantes[0].id, new Date(fechaMensaje.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
          ]);
        }

        console.log('✅ Mensajes creados\n');

        console.log('📄 Creando archivos/materiales...');

        // Agregar algunos archivos de ejemplo
        for (let i = 0; i < Math.min(3, cursos.length); i++) {
          const curso = cursos[i];
          
          await runQuery(`
            INSERT INTO archivos (curso_id, usuario_id, nombre_original, nombre_archivo, ruta, tipo_mime, tamaño, tipo_archivo, descripcion, publico) 
            VALUES 
              (?, ?, 'Presentación Introducción.pdf', 'presentacion-intro.pdf', '/uploads/cursos/${curso.id}/presentacion-intro.pdf', 'application/pdf', 2048576, 'documento', 'Presentación de la primera clase', 1),
              (?, ?, 'Código Ejemplos.zip', 'ejemplos.zip', '/uploads/cursos/${curso.id}/ejemplos.zip', 'application/zip', 512000, 'codigo', 'Ejemplos de código del curso', 1),
              (?, ?, 'Guía Rápida.pdf', 'guia-rapida.pdf', '/uploads/cursos/${curso.id}/guia-rapida.pdf', 'application/pdf', 1024000, 'documento', 'Guía de referencia rápida', 1)
          `, [
            curso.id, prof1.id,
            curso.id, prof1.id,
            curso.id, prof1.id
          ]);
        }

        console.log('✅ Archivos creados\n');

        console.log('🔔 Creando notificaciones...');

        // Crear notificaciones para estudiantes
        for (const estudiante of estudiantes.slice(0, 3)) {
          await runQuery(`
            INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, leida) 
            VALUES 
              (?, 'Bienvenido a Campus Virtual', 'Tu cuenta ha sido creada exitosamente. Comienza a explorar nuestros cursos!', 'info', 0),
              (?, 'Nuevo curso disponible', 'Se ha agregado un nuevo curso que podría interesarte: "JavaScript Moderno"', 'curso', 0),
              (?, 'Clase próxima', 'Tienes una clase programada en 2 días. No te la pierdas!', 'clase', 1),
              (?, 'Progreso actualizado', 'Has completado el 25% del curso. ¡Sigue así!', 'progreso', 1)
          `, [estudiante.id, estudiante.id, estudiante.id, estudiante.id]);
        }

        console.log('✅ Notificaciones creadas\n');

        console.log('💰 Creando registros de pago...');

        // Crear algunos pagos de ejemplo
        const pagoEstudiantes = estudiantes.slice(0, 2);
        const cursosPago = cursos.filter((c, idx) => idx === 1 || idx === 3 || idx === 4); // Cursos de pago

        for (const estudiante of pagoEstudiantes) {
          for (const curso of cursosPago.slice(0, 1)) {
            await runQuery(`
              INSERT INTO pagos (usuario_id, curso_id, monto, estado, metodo_pago, referencia_externa) 
              VALUES (?, ?, ?, 'completado', 'mercadopago', ?)
            `, [
              estudiante.id,
              curso.id,
              cursos.find(c => c.id === curso.id) ? 4999 : 3499,
              'MP_' + Math.random().toString(36).substring(7).toUpperCase()
            ]);
          }
        }

        console.log('✅ Pagos creados\n');

        // Resumen final
        console.log('\n' + '='.repeat(70));
        console.log('✨ ¡BASE DE DATOS POBLADA EXITOSAMENTE CON DATOS DE PRUEBA! ✨');
        console.log('='.repeat(70) + '\n');

        console.log('📊 RESUMEN DE DATOS CREADOS:\n');
        console.log('   👥 Usuarios:');
        console.log('      • 3 Profesores');
        console.log('      • 5 Estudiantes');
        console.log('   📚 6 Cursos (2 gratuitos, 4 de pago)');
        console.log('   📖 36+ Clases programadas');
        console.log('   🎓 15+ Inscripciones');
        console.log('   💬 15+ Mensajes en chat');
        console.log('   📄 9+ Archivos/Materiales');
        console.log('   🔔 12+ Notificaciones');
        console.log('   💰 Registros de pago\n');

        console.log('🔐 CREDENCIALES PARA PROBAR:\n');
        console.log('   👑 ADMIN (ya existente):');
        console.log('      Email: norma.admin@escuelanorma.com');
        console.log('      Pass:  Norma2025!Secure\n');
        
        console.log('   👨‍🏫 PROFESORES:');
        console.log('      Email: maria.gonzalez@campus.com');
        console.log('      Email: juan.perez@campus.com');
        console.log('      Email: sofia.martinez@campus.com');
        console.log('      Pass:  Test123!\n');
        
        console.log('   👨‍🎓 ESTUDIANTES:');
        console.log('      Email: ana.lopez@estudiante.com');
        console.log('      Email: carlos.rodriguez@estudiante.com');
        console.log('      Email: laura.garcia@estudiante.com');
        console.log('      Email: miguel.sanchez@estudiante.com');
        console.log('      Email: elena.fernandez@estudiante.com');
        console.log('      Pass:  Test123!\n');

        console.log('🌐 Sistema ejecutándose en: http://localhost:3000');
        console.log('🎯 ¡Ahora puedes probar todas las funcionalidades!\n');

        resolve();
      } catch (error) {
        console.error('❌ Error:', error);
        reject(error);
      }
    });
  });
};

// Funciones auxiliares
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        console.error('Error en query:', err.message);
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

function runQueryAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Error en query:', err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Ejecutar el script
setTimeout(() => {
  seedData()
    .then(() => {
      db.close();
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      db.close();
      process.exit(1);
    });
}, 1000);
