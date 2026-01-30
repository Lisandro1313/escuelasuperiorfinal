// Script para poblar Supabase con datos iniciales
require('dotenv').config({ path: './.env' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function populateDatabase() {
  try {
    console.log('🔗 Conectando a Supabase...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '../database/supabase-initial-data.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Ejecutando script SQL...');
    await pool.query(sql);
    
    console.log('✅ ¡Datos iniciales insertados correctamente!');
    console.log('');
    console.log('📋 RESUMEN:');
    console.log('   ✅ 1 Administrador creado');
    console.log('   ✅ 2 Profesores creados');
    console.log('   ✅ 3 Estudiantes creados');
    console.log('   ✅ 2 Cursos creados con lecciones');
    console.log('   ✅ 2 Inscripciones creadas');
    console.log('');
    console.log('🔐 CREDENCIALES:');
    console.log('   Admin:      norma.admin@escuelanorma.com / Norma2025!Secure');
    console.log('   Profesor:   profesor1@test.com / Test123!');
    console.log('   Estudiante: estudiante1@test.com / Test123!');
    
  } catch (error) {
    console.error('❌ Error al poblar la base de datos:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

populateDatabase();
