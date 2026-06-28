// Seed de DEMO para probar todo en el navegador: curso (con certificado),
// clase en vivo, productos de la tienda (físico + digital), alumno de prueba.
// Todo queda marcado con "(DEMO)" para borrarlo fácil después.
//
// Uso:  node backend/scripts/seed-demo.js
//
// Borrar la demo:  node backend/scripts/seed-demo.js --limpiar

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
require('dotenv').config();

const bcrypt = require('bcryptjs');
const db = require('../database/database');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = (sql, p = []) => new Promise((res, rej) => db.db.run(sql, p, function (e) { e ? rej(e) : res({ id: this.lastID, changes: this.changes }); }));
const get = (sql, p = []) => new Promise((res, rej) => db.db.get(sql, p, (e, row) => (e ? rej(e) : res(row))));

const DEMO = '(DEMO)';

async function limpiar() {
  console.log('🧹 Borrando datos DEMO...');
  // Lecciones/módulos/progreso de cursos demo
  const cursos = await new Promise((res, rej) => db.db.all("SELECT id FROM courses WHERE nombre LIKE '%(DEMO)%'", [], (e, r) => (e ? rej(e) : res(r || []))));
  for (const c of cursos) {
    await run('DELETE FROM lesson_progress WHERE lesson_id IN (SELECT l.id FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = ?)', [c.id]);
    await run('DELETE FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id = ?)', [c.id]);
    await run('DELETE FROM modules WHERE course_id = ?', [c.id]);
    await run('DELETE FROM enrollments WHERE course_id = ?', [c.id]);
    await run('DELETE FROM access_grants WHERE course_id = ?', [c.id]);
    await run('DELETE FROM events WHERE course_id = ?', [c.id]);
    await run('DELETE FROM courses WHERE id = ?', [c.id]);
  }
  await run("DELETE FROM events WHERE title LIKE '%(DEMO)%'");
  await run("DELETE FROM product_orders WHERE product_id IN (SELECT id FROM products WHERE nombre LIKE '%(DEMO)%')");
  await run("DELETE FROM products WHERE nombre LIKE '%(DEMO)%'");
  await run("DELETE FROM users WHERE email = 'alumno.demo@campusnorma.com'");
  console.log('✅ Demo borrada.');
}

async function ensureUser({ email, password, nombre, tipo, telefono = null }) {
  const ex = await get('SELECT id FROM users WHERE email = ?', [email]);
  if (ex) return ex.id;
  const hash = await bcrypt.hash(password, 10);
  const r = await run('INSERT INTO users (email, password, nombre, tipo, telefono) VALUES (?, ?, ?, ?, ?)', [email, hash, nombre, tipo, telefono]);
  return r.id;
}

async function ensureCourse(data) {
  const ex = await get('SELECT id FROM courses WHERE nombre = ?', [data.nombre]);
  if (ex) return ex.id;
  const r = await run(
    `INSERT INTO courses (nombre, descripcion, profesor, profesor_id, categoria, precio, duracion, imagen, publicado, certificado_habilitado, firmante)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [data.nombre, data.descripcion, data.profesor, data.profesor_id, data.categoria, data.precio, data.duracion, data.imagen, data.certificado_habilitado ? 1 : 0, data.firmante || null]
  );
  return r.id;
}

async function ensureModule(course_id, titulo, orden) {
  const ex = await get('SELECT id FROM modules WHERE course_id = ? AND titulo = ?', [course_id, titulo]);
  if (ex) return ex.id;
  const r = await run('INSERT INTO modules (course_id, titulo, orden, publicado) VALUES (?, ?, ?, 1)', [course_id, titulo, orden]);
  return r.id;
}

async function ensureLesson(module_id, titulo, contenido, orden) {
  const ex = await get('SELECT id FROM lessons WHERE module_id = ? AND titulo = ?', [module_id, titulo]);
  if (ex) return ex.id;
  const r = await run('INSERT INTO lessons (module_id, titulo, contenido, tipo, orden, publicado) VALUES (?, ?, ?, ?, ?, 1)', [module_id, titulo, contenido, 'texto', orden]);
  return r.id;
}

async function enrollAndComplete(userId, courseId, lessonIds) {
  const ex = await get('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?', [userId, courseId]);
  if (!ex) await run('INSERT INTO enrollments (user_id, course_id, progress, completed) VALUES (?, ?, 100, 1)', [userId, courseId]);
  else await run('UPDATE enrollments SET progress = 100, completed = 1 WHERE id = ?', [ex.id]);
  for (const lid of lessonIds) {
    const lp = await get('SELECT id FROM lesson_progress WHERE user_id = ? AND lesson_id = ?', [userId, lid]);
    if (!lp) await run("INSERT INTO lesson_progress (user_id, lesson_id, completed, completed_at) VALUES (?, ?, 1, datetime('now'))", [userId, lid]);
    else await run("UPDATE lesson_progress SET completed = 1, completed_at = datetime('now') WHERE id = ?", [lp.id]);
  }
}

async function ensureProduct(data) {
  const ex = await get('SELECT id FROM products WHERE nombre = ?', [data.nombre]);
  if (ex) return ex.id;
  const r = await run(
    `INSERT INTO products (nombre, descripcion, precio, imagen, tipo, archivo_url, stock, whatsapp, permite_pago_online, permite_whatsapp, profesor_id, profesor, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [data.nombre, data.descripcion, data.precio, data.imagen, data.tipo, data.archivo_url, data.stock, data.whatsapp,
     data.permite_pago_online ? 1 : 0, data.permite_whatsapp ? 1 : 0, data.profesor_id, data.profesor]
  );
  return r.id;
}

async function ensureLiveClass(data) {
  const ex = await get('SELECT id FROM events WHERE title = ?', [data.title]);
  if (ex) return ex.id;
  const r = await run(
    `INSERT INTO events (title, description, start_date, end_date, type, course_id, instructor_id, status, precio, meeting_url, cover_url)
     VALUES (?, ?, ?, ?, 'live_class', ?, ?, 'scheduled', ?, ?, ?)`,
    [data.title, data.description, data.start_date, data.end_date, data.course_id, data.instructor_id, data.precio, data.meeting_url, data.cover_url || null]
  );
  return r.id;
}

async function main() {
  await sleep(1500); // dar tiempo a que la DB cree/migre tablas

  if (process.argv.includes('--limpiar')) {
    await limpiar();
    return;
  }

  // Profe a cargo de la demo: el admin (o el primer profesor/admin que exista).
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@campusnorma.com';
  let profe = await get('SELECT id, nombre FROM users WHERE email = ?', [adminEmail]);
  if (!profe) profe = await get("SELECT id, nombre FROM users WHERE tipo IN ('admin','profesor') ORDER BY id LIMIT 1");
  if (!profe) { console.error('No hay ningún admin/profesor. Arrancá el backend una vez para crear el admin.'); return; }
  const profeId = profe.id;
  const profeNombre = profe.nombre || 'Profesora';

  // Alumno de prueba
  const alumnoId = await ensureUser({ email: 'alumno.demo@campusnorma.com', password: 'demo1234', nombre: 'Alumno Demo', tipo: 'alumno', telefono: '5493510000001' });

  // 1) Curso GRATIS con certificado habilitado + módulo y 2 clases
  const cursoCertId = await ensureCourse({
    nombre: 'Bordado a Mano — Nivel 1 ' + DEMO,
    descripcion: 'Curso de prueba: aprendé puntadas básicas. Gratis y con certificado al completar.',
    profesor: profeNombre,
    profesor_id: profeId,
    categoria: 'Bordado',
    precio: 0,
    duracion: '3 semanas',
    imagen: 'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb?w=600&h=340&fit=crop',
    certificado_habilitado: true,
    firmante: profeNombre,
  });
  const mod1 = await ensureModule(cursoCertId, 'Primeras puntadas', 1);
  const l1 = await ensureLesson(mod1, 'Puntada recta', 'Cómo hacer la puntada recta paso a paso.', 1);
  const l2 = await ensureLesson(mod1, 'Punto atrás', 'La puntada más usada para contornos.', 2);

  // Inscribimos y completamos al admin (para que vea el CERTIFICADO ya) y al alumno demo
  await enrollAndComplete(profeId, cursoCertId, [l1, l2]);
  await enrollAndComplete(alumnoId, cursoCertId, [l1, l2]);

  // 2) Curso DE PAGO (para ver el botón de compra / MercadoPago)
  const cursoPagoId = await ensureCourse({
    nombre: 'Costura Avanzada con Moldes ' + DEMO,
    descripcion: 'Curso de prueba PAGO: confección con moldes y patrones.',
    profesor: profeNombre,
    profesor_id: profeId,
    categoria: 'Costura',
    precio: 5000,
    duracion: '6 semanas',
    imagen: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=600&h=340&fit=crop',
    certificado_habilitado: false,
  });
  const modP = await ensureModule(cursoPagoId, 'Introducción', 1);
  await ensureLesson(modP, 'Materiales y herramientas', 'Qué vas a necesitar.', 1);

  // 3) CLASE EN VIVO (próxima, dentro de 2 horas)
  const inicio = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
  await ensureLiveClass({
    title: 'Clase en vivo: dudas de bordado ' + DEMO,
    description: 'Sesión en vivo de prueba. Traé tus dudas.',
    start_date: inicio.toISOString().slice(0, 19).replace('T', ' '),
    end_date: fin.toISOString().slice(0, 19).replace('T', ' '),
    course_id: cursoCertId,
    instructor_id: profeId,
    precio: 0,
    meeting_url: 'https://meet.google.com/abc-demo-xyz',
    cover_url: 'https://images.unsplash.com/photo-1588072432836-e10032774350?w=600&h=340&fit=crop',
  });

  // 4) PRODUCTOS de la tienda: uno físico, uno digital
  await ensureProduct({
    nombre: 'Libro "Costura desde Cero" ' + DEMO,
    descripcion: 'Manual impreso con moldes y fotos paso a paso. (producto físico de prueba)',
    precio: 3500,
    imagen: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=360&fit=crop',
    tipo: 'fisico',
    archivo_url: null,
    stock: 10,
    whatsapp: '5493510000000',
    permite_pago_online: true,
    permite_whatsapp: true,
    profesor_id: profeId,
    profesor: profeNombre,
  });
  await ensureProduct({
    nombre: 'Apunte PDF "Puntadas básicas" ' + DEMO,
    descripcion: 'Guía digital descargable. (producto digital de prueba)',
    precio: 1500,
    imagen: 'https://images.unsplash.com/photo-1535905557558-afc4877a26fc?w=600&h=360&fit=crop',
    tipo: 'digital',
    archivo_url: 'https://www.africau.edu/images/default/sample.pdf',
    stock: null,
    whatsapp: '5493510000000',
    permite_pago_online: true,
    permite_whatsapp: true,
    profesor_id: profeId,
    profesor: profeNombre,
  });

  console.log('\n✅ Demo creada. Marcada con "(DEMO)".');
  console.log('   • Curso gratis CON certificado (admin ya lo completó → andá a Certificado).');
  console.log('   • Curso de pago $5000 (para probar el botón de compra).');
  console.log('   • Clase en vivo en ~2 hs.');
  console.log('   • Tienda: 1 producto físico + 1 digital.');
  console.log('   • Alumno de prueba: alumno.demo@campusnorma.com / demo1234');
  console.log('\nPara borrar todo:  node backend/scripts/seed-demo.js --limpiar\n');
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error('seed-demo falló:', err); process.exit(1); });
