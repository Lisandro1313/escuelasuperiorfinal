const db = require('../database/database');

async function checkEnrollments() {
  try {
    console.log('🔍 Verificando enrollments...\n');
    
    // Ver todos los enrollments
    const enrollments = await new Promise((resolve, reject) => {
      db.db.all('SELECT * FROM enrollments', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`📚 Total enrollments: ${enrollments.length}`);
    console.log(JSON.stringify(enrollments, null, 2));
    
    // Ver usuarios
    const users = await new Promise((resolve, reject) => {
      db.db.all('SELECT id, email, nombre, tipo FROM users', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('\n👥 Usuarios:');
    console.log(JSON.stringify(users, null, 2));
    
    // Ver cursos
    const courses = await new Promise((resolve, reject) => {
      db.db.all('SELECT id, nombre FROM courses', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('\n📖 Cursos:');
    console.log(JSON.stringify(courses, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkEnrollments();
