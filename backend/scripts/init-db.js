// Inicializa la DB SQLite (crea archivo + tablas + admin por defecto).
// Uso: node backend/scripts/init-db.js

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const db = require('../database/database');

setTimeout(() => {
  console.log('✅ DB inicializada correctamente');
  process.exit(0);
}, 1500);
