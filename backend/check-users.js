const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/campus_norma.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Consultando usuarios en la base de datos...\n');

db.all('SELECT id, email, nombre, tipo FROM users', [], (err, rows) => {
  if (err) {
    console.error('❌ Error:', err.message);
    db.close();
    return;
  }

  if (rows.length === 0) {
    console.log('⚠️  No hay usuarios en la base de datos');
  } else {
    console.log(`✅ Encontrados ${rows.length} usuarios:\n`);
    rows.forEach(row => {
      console.log(`📧 Email: ${row.email}`);
      console.log(`👤 Nombre: ${row.nombre}`);
      console.log(`🎭 Tipo: ${row.tipo}`);
      console.log(`🆔 ID: ${row.id}`);
      console.log('─'.repeat(50));
    });
  }

  db.close();
});
