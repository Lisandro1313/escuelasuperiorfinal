const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database/campus_norma.db');
const db = new sqlite3.Database(dbPath);

// Verificar cursos gratuitos
db.all("SELECT id, nombre, precio FROM courses WHERE precio = 0", [], (err, courses) => {
  if (err) {
    console.error('Error:', err);
    return;
  }

  console.log('📚 Cursos gratuitos encontrados:', courses);

  if (courses.length > 0) {
    // Inscribir a Ana López (id=5) en los primeros 2 cursos gratuitos
    const courseIds = courses.slice(0, 2).map(c => c.id);
    
    courseIds.forEach((courseId, index) => {
      const progreso = index === 0 ? 25 : 60;
      db.run(
        "INSERT OR IGNORE INTO enrollments (user_id, course_id, progress) VALUES (?, ?, ?)",
        [5, courseId, progreso],
        function(err) {
          if (err) {
            console.error('Error inscribiendo:', err);
          } else {
            console.log(`✅ Ana López inscrita en curso ${courseId} con ${progreso}% de progreso`);
          }
        }
      );
    });

    // Verificar inscripciones
    setTimeout(() => {
      db.all(
        "SELECT u.nombre, c.nombre as curso, e.progress FROM enrollments e JOIN users u ON e.user_id = u.id JOIN courses c ON e.course_id = c.id WHERE u.id = 5",
        [],
        (err, enrollments) => {
          if (err) {
            console.error('Error:', err);
          } else {
            console.log('\n📋 Inscripciones de Ana López:', enrollments);
          }
          db.close();
        }
      );
    }, 1000);
  } else {
    console.log('No hay cursos gratuitos disponibles');
    db.close();
  }
});
