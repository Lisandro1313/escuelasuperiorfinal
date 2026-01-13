// Selector de base de datos: PostgreSQL o SQLite
// Usa PostgreSQL si DATABASE_URL está definida, sino SQLite

const usePostgres = !!process.env.DATABASE_URL;

if (usePostgres) {
  console.log('🐘 Usando PostgreSQL (Supabase)');
  module.exports = require('./src/config/database');
} else {
  console.log('💾 Usando SQLite (local)');
  module.exports = require('./database');
}
