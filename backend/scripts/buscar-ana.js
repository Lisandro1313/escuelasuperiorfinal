const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database/campus_norma.db');
const db = new sqlite3.Database(dbPath);

// Buscar a Ana López
db.all("SELECT id, nombre, email, tipo FROM users WHERE nombre LIKE '%Ana%' OR email LIKE '%ana%'", [], (err, users) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('👤 Usuarios con "Ana":', users);
  }
  db.close();
});
