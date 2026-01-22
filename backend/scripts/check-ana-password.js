const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, '../../database/campus_norma.db');
const db = new sqlite3.Database(dbPath);

// Buscar usuarios y verificar password
db.all("SELECT id, nombre, email, password FROM users WHERE email LIKE '%ana%'", [], async (err, users) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log('👥 Usuarios encontrados:', users.length);
  
  for (const user of users) {
    console.log(`\n📧 Email: ${user.email}`);
    console.log(`👤 Nombre: ${user.nombre}`);
    console.log(`🔒 Hash password: ${user.password.substring(0, 20)}...`);
    
    // Probar passwords comunes
    const passwordsToTry = ['123456', 'password', 'ana123', 'estudiante'];
    for (const pwd of passwordsToTry) {
      const match = await bcrypt.compare(pwd, user.password);
      if (match) {
        console.log(`✅ Password encontrado: "${pwd}"`);
        break;
      }
    }
  }
  
  db.close();
});
