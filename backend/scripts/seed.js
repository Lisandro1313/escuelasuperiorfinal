// Seed de datos de prueba para Campus Norma (SQLite).
// Crea profesores, alumnos, cursos, modulos y lecciones de ejemplo.
// Uso: node backend/scripts/seed.js

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
require('dotenv').config(); // tambien intentar leer .env del cwd

const bcrypt = require('bcryptjs');
const db = require('../database/database');

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

async function ensureUser({ email, password, nombre, tipo, biografia = null, telefono = null }) {
  const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return existing.id;
  const hash = await bcrypt.hash(password, 10);
  const r = await run(
    'INSERT INTO users (email, password, nombre, tipo, biografia, telefono) VALUES (?, ?, ?, ?, ?, ?)',
    [email, hash, nombre, tipo, biografia, telefono]
  );
  return r.id;
}

async function ensureCourse({ nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen }) {
  const existing = await get('SELECT id FROM courses WHERE nombre = ? AND profesor_id = ?', [nombre, profesor_id]);
  if (existing) return existing.id;
  const r = await run(
    `INSERT INTO courses (nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen, publicado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen]
  );
  return r.id;
}

async function ensureModule(course_id, titulo, orden) {
  const existing = await get('SELECT id FROM modules WHERE course_id = ? AND titulo = ?', [course_id, titulo]);
  if (existing) return existing.id;
  const r = await run(
    'INSERT INTO modules (course_id, titulo, orden, publicado) VALUES (?, ?, ?, 1)',
    [course_id, titulo, orden]
  );
  return r.id;
}

async function ensureLesson(module_id, titulo, contenido, orden, duracion = 30) {
  const existing = await get('SELECT id FROM lessons WHERE module_id = ? AND titulo = ?', [module_id, titulo]);
  if (existing) return existing.id;
  const r = await run(
    `INSERT INTO lessons (module_id, titulo, contenido, tipo, orden, duracion, publicado)
     VALUES (?, ?, ?, 'texto', ?, ?, 1)`,
    [module_id, titulo, contenido, orden, duracion]
  );
  return r.id;
}

async function seed() {
  // Esperar a que la DB termine de inicializar tablas
  await new Promise((r) => setTimeout(r, 500));

  console.log('🌱 Seed iniciando...');

  const adminId = await ensureUser({
    email: process.env.ADMIN_EMAIL || 'admin@campusnorma.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    nombre: 'Administrador',
    tipo: 'admin',
  });
  console.log('   admin ok (id=' + adminId + ')');

  const prof1 = await ensureUser({
    email: 'maria@campusnorma.com',
    password: 'profesor123',
    nombre: 'Maria Gonzalez',
    tipo: 'profesor',
    biografia: 'Profesora de Programacion con 10 anios de experiencia.',
  });

  const prof2 = await ensureUser({
    email: 'juan@campusnorma.com',
    password: 'profesor123',
    nombre: 'Juan Perez',
    tipo: 'profesor',
    biografia: 'Especialista en Data Science.',
  });
  console.log('   profesores ok');

  const alumno1 = await ensureUser({
    email: 'ana@campusnorma.com',
    password: 'alumno123',
    nombre: 'Ana Lopez',
    tipo: 'alumno',
  });
  const alumno2 = await ensureUser({
    email: 'carlos@campusnorma.com',
    password: 'alumno123',
    nombre: 'Carlos Rodriguez',
    tipo: 'alumno',
  });
  console.log('   alumnos ok');

  const cursoJS = await ensureCourse({
    nombre: 'JavaScript desde cero',
    descripcion: 'Aprende JavaScript moderno: ES6+, async/await, DOM y mas.',
    profesor: 'Maria Gonzalez',
    profesor_id: prof1,
    categoria: 'Programacion',
    precio: 0,
    duracion: '8 semanas',
    imagen: '💻',
  });

  const cursoReact = await ensureCourse({
    nombre: 'React + Node.js Full Stack',
    descripcion: 'Frontend con React y backend con Node.js/Express.',
    profesor: 'Maria Gonzalez',
    profesor_id: prof1,
    categoria: 'Programacion',
    precio: 4999,
    duracion: '12 semanas',
    imagen: '⚛️',
  });

  const cursoPython = await ensureCourse({
    nombre: 'Python para Data Science',
    descripcion: 'Pandas, NumPy, Matplotlib y Scikit-learn.',
    profesor: 'Juan Perez',
    profesor_id: prof2,
    categoria: 'Data Science',
    precio: 0,
    duracion: '10 semanas',
    imagen: '🐍',
  });
  console.log('   cursos ok');

  const modJS1 = await ensureModule(cursoJS, 'Fundamentos', 1);
  await ensureLesson(modJS1, 'Variables y tipos', 'Aprende sobre let, const, tipos primitivos.', 1);
  await ensureLesson(modJS1, 'Funciones', 'Funciones, arrow functions y scope.', 2);

  const modJS2 = await ensureModule(cursoJS, 'Asincronia', 2);
  await ensureLesson(modJS2, 'Promesas', 'Trabajando con Promises.', 1);
  await ensureLesson(modJS2, 'Async/Await', 'Sintaxis moderna de asincronia.', 2);
  console.log('   modulos y lecciones ok');

  // Inscribir alumnos en cursos gratuitos
  const enrollIfNeeded = async (user_id, course_id) => {
    const r = await get('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?', [user_id, course_id]);
    if (!r) {
      await run('INSERT INTO enrollments (user_id, course_id, progress) VALUES (?, ?, 0)', [user_id, course_id]);
    }
  };
  await enrollIfNeeded(alumno1, cursoJS);
  await enrollIfNeeded(alumno1, cursoPython);
  await enrollIfNeeded(alumno2, cursoJS);
  console.log('   inscripciones ok');

  console.log('\n✅ Seed completo.\n');
  console.log('Credenciales de prueba:');
  console.log('  admin    : admin@campusnorma.com / ' + (process.env.ADMIN_PASSWORD || 'admin123'));
  console.log('  profesor : maria@campusnorma.com / profesor123');
  console.log('  profesor : juan@campusnorma.com  / profesor123');
  console.log('  alumno   : ana@campusnorma.com   / alumno123');
  console.log('  alumno   : carlos@campusnorma.com / alumno123');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed fallo:', err);
    process.exit(1);
  });
