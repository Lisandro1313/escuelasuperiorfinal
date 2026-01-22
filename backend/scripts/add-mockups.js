/**
 * Script para agregar datos de prueba (mockups) al sistema
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../../database/campus_norma.db');
const db = new sqlite3.Database(dbPath);

console.log('🚀 Agregando datos de prueba al sistema...\n');

const addMockData = async () => {
  try {
    const hashedPassword = await bcrypt.hash('Test123!', 10);

    // 1. CREAR PROFESORES
    console.log('👨‍🏫 Creando profesores...');
    
    db.run(`INSERT OR IGNORE INTO users (email, password, nombre, tipo, biografia, telefono) VALUES (?, ?, ?, ?, ?, ?)`, 
      ['maria.gonzalez@campus.com', hashedPassword, 'María González', 'profesor', 'Profesora de Programación con 10 años de experiencia', '+34 612 345 678']);
    
    db.run(`INSERT OR IGNORE INTO users (email, password, nombre, tipo, biografia, telefono) VALUES (?, ?, ?, ?, ?, ?)`, 
      ['juan.perez@campus.com', hashedPassword, 'Juan Pérez', 'profesor', 'Especialista en Data Science y Machine Learning', '+34 623 456 789']);
    
    db.run(`INSERT OR IGNORE INTO users (email, password, nombre, tipo, biografia, telefono) VALUES (?, ?, ?, ?, ?, ?)`, 
      ['sofia.martinez@campus.com', hashedPassword, 'Sofía Martínez', 'profesor', 'Diseñadora UX/UI con certificaciones internacionales', '+34 634 567 890']);

    // 2. CREAR ESTUDIANTES
    console.log('👨‍🎓 Creando estudiantes...');
    
    db.run(`INSERT OR IGNORE INTO users (email, password, nombre, tipo, biografia, telefono) VALUES (?, ?, ?, ?, ?, ?)`, 
      ['ana.lopez@estudiante.com', hashedPassword, 'Ana López', 'alumno', 'Estudiante de Ingeniería Informática', '+34 645 678 901']);
    
    db.run(`INSERT OR IGNORE INTO users (email, password, nombre, tipo, biografia, telefono) VALUES (?, ?, ?, ?, ?, ?)`, 
      ['carlos.rodriguez@estudiante.com', hashedPassword, 'Carlos Rodríguez', 'alumno', 'Diseñador gráfico en transición a UX/UI', '+34 656 789 012']);
    
    db.run(`INSERT OR IGNORE INTO users (email, password, nombre, tipo, biografia, telefono) VALUES (?, ?, ?, ?, ?, ?)`, 
      ['laura.garcia@estudiante.com', hashedPassword, 'Laura García', 'alumno', 'Data Analyst', '+34 667 890 123']);

    // Esperar a que se completen las inserciones
    setTimeout(() => {
      // 3. OBTENER IDs Y CREAR CURSOS
      db.all(`SELECT id, nombre FROM users WHERE tipo = 'profesor' ORDER BY id`, (err, profesores) => {
        if (err || !profesores || profesores.length === 0) {
          console.error('Error obteniendo profesores:', err);
          return;
        }

        console.log('📚 Creando cursos...');

        const prof1 = profesores[0];
        const prof2 = profesores[1] || profesores[0];
        const prof3 = profesores[2] || profesores[0];

        // Crear cursos
        db.run(`INSERT OR IGNORE INTO courses (nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen, publicado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['JavaScript Moderno - De Cero a Experto', 'Aprende JavaScript desde los fundamentos hasta conceptos avanzados', prof1.nombre, prof1.id, 'Programación', 0, '8 semanas', '💻', 1]);

        db.run(`INSERT OR IGNORE INTO courses (nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen, publicado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['Full Stack con React y Node.js', 'Desarrollo full stack profesional', prof1.nombre, prof1.id, 'Programación', 4999, '12 semanas', '⚛️', 1]);

        db.run(`INSERT OR IGNORE INTO courses (nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen, publicado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['Python para Data Science', 'Análisis de datos con Python', prof2.nombre, prof2.id, 'Data Science', 0, '10 semanas', '🐍', 1]);

        db.run(`INSERT OR IGNORE INTO courses (nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen, publicado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['Diseño UX/UI Profesional', 'Diseño de interfaces increíbles', prof3.nombre, prof3.id, 'Diseño', 3499, '6 semanas', '🎨', 1]);

        db.run(`INSERT OR IGNORE INTO courses (nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen, publicado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['SQL y Bases de Datos', 'Domina SQL y diseño de bases de datos', prof1.nombre, prof1.id, 'Programación', 2999, '5 semanas', '🗄️', 1]);

        db.run(`INSERT OR IGNORE INTO courses (nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen, publicado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['Marketing Digital', 'Estrategias de marketing digital efectivas', prof3.nombre, prof3.id, 'Marketing', 0, '6 semanas', '📱', 1]);

        setTimeout(() => {
          // 4. CREAR MÓDULOS Y LECCIONES
          db.all(`SELECT id FROM courses ORDER BY id LIMIT 6`, (err, cursos) => {
            if (err || !cursos || cursos.length === 0) {
              console.error('Error obteniendo cursos:', err);
              return;
            }

            console.log('📖 Creando módulos y lecciones...');

            cursos.forEach((curso, idx) => {
              // Crear 2-3 módulos por curso
              for (let m = 1; m <= 3; m++) {
                db.run(`INSERT INTO modules (course_id, titulo, descripcion, orden, publicado) VALUES (?, ?, ?, ?, ?)`,
                  [curso.id, `Módulo ${m}: Fundamentos`, `Descripción del módulo ${m}`, m, 1],
                  function(err) {
                    if (!err) {
                      const moduleId = this.lastID;
                      // Crear 3-4 lecciones por módulo
                      for (let l = 1; l <= 4; l++) {
                        db.run(`INSERT INTO lessons (module_id, titulo, contenido, tipo, orden, duracion, publicado) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                          [moduleId, `Lección ${l}`, `Contenido de la lección ${l} del módulo ${m}`, 'video', l, 15, 1]);
                      }
                    }
                  }
                );
              }
            });

            setTimeout(() => {
              // 5. CREAR INSCRIPCIONES
              db.all(`SELECT id FROM users WHERE tipo = 'alumno' ORDER BY id`, (err, estudiantes) => {
                if (err || !estudiantes || estudiantes.length === 0) {
                  console.log('⚠️  No hay estudiantes para inscribir');
                  return;
                }

                console.log('🎓 Creando inscripciones...');

                estudiantes.forEach((estudiante, idx) => {
                  // Inscribir en 2-3 cursos
                  const numCursos = Math.min(3, cursos.length);
                  for (let i = 0; i < numCursos; i++) {
                    const progreso = Math.floor(Math.random() * 60) + 10;
                    db.run(`INSERT OR IGNORE INTO enrollments (user_id, course_id, progress) VALUES (?, ?, ?)`,
                      [estudiante.id, cursos[i].id, progreso]);
                  }
                });

                setTimeout(() => {
                  console.log('\n' + '='.repeat(70));
                  console.log('✨ ¡DATOS DE PRUEBA AGREGADOS EXITOSAMENTE! ✨');
                  console.log('='.repeat(70) + '\n');
                  
                  console.log('📊 RESUMEN:\n');
                  console.log('   👥 3 Profesores + 3 Estudiantes');
                  console.log('   📚 6 Cursos (varios gratuitos y de pago)');
                  console.log('   📖 18+ Módulos');
                  console.log('   📝 70+ Lecciones');
                  console.log('   🎓 Múltiples inscripciones\n');
                  
                  console.log('🔐 CREDENCIALES:\n');
                  console.log('   👑 ADMIN:');
                  console.log('      Email: norma.admin@escuelanorma.com');
                  console.log('      Pass:  Norma2025!Secure\n');
                  
                  console.log('   👨‍🏫 PROFESORES:');
                  console.log('      maria.gonzalez@campus.com');
                  console.log('      juan.perez@campus.com');
                  console.log('      sofia.martinez@campus.com');
                  console.log('      Pass: Test123!\n');
                  
                  console.log('   👨‍🎓 ESTUDIANTES:');
                  console.log('      ana.lopez@estudiante.com');
                  console.log('      carlos.rodriguez@estudiante.com');
                  console.log('      laura.garcia@estudiante.com');
                  console.log('      Pass: Test123!\n');
                  
                  console.log('🌐 Accede a: http://localhost:3000\n');
                  
                  db.close();
                  process.exit(0);
                }, 1000);
              });
            }, 1000);
          });
        }, 1000);
      });
    }, 500);

  } catch (error) {
    console.error('❌ Error:', error);
    db.close();
    process.exit(1);
  }
};

// Ejecutar
setTimeout(addMockData, 500);
