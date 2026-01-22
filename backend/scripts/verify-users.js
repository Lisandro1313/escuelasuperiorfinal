/**
 * Script para verificar usuarios en la base de datos
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../../database/campus_norma.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificando usuarios en la base de datos...\n');

db.all(`SELECT id, email, nombre, tipo, created_at FROM users ORDER BY id`, (err, users) => {
  if (err) {
    console.error('❌ Error:', err);
    db.close();
    return;
  }

  console.log(`📊 Total de usuarios: ${users.length}\n`);
  
  if (users.length === 0) {
    console.log('⚠️  No hay usuarios en la base de datos\n');
    db.close();
    return;
  }

  console.log('👥 USUARIOS REGISTRADOS:\n');
  console.log('═'.repeat(80));
  
  users.forEach((user, idx) => {
    console.log(`${idx + 1}. ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nombre: ${user.nombre}`);
    console.log(`   Tipo: ${user.tipo}`);
    console.log(`   Creado: ${user.created_at}`);
    console.log('─'.repeat(80));
  });

  // Verificar contraseñas
  console.log('\n🔐 VERIFICANDO CONTRASEÑAS:\n');
  
  const testPasswords = [
    { password: 'Norma2025!Secure', desc: 'Admin password' },
    { password: 'Test123!', desc: 'Test password' }
  ];

  db.get(`SELECT password FROM users WHERE email = 'norma.admin@escuelanorma.com'`, async (err, admin) => {
    if (admin) {
      console.log('✅ Admin encontrado');
      for (const test of testPasswords) {
        const match = await bcrypt.compare(test.password, admin.password);
        console.log(`   ${match ? '✅' : '❌'} ${test.desc} (${test.password}): ${match ? 'VÁLIDA' : 'NO válida'}`);
      }
    } else {
      console.log('❌ Admin NO encontrado');
    }

    db.get(`SELECT password FROM users WHERE email = 'maria.gonzalez@campus.com'`, async (err, prof) => {
      if (prof) {
        console.log('\n✅ Profesor encontrado (maria.gonzalez@campus.com)');
        for (const test of testPasswords) {
          const match = await bcrypt.compare(test.password, prof.password);
          console.log(`   ${match ? '✅' : '❌'} ${test.desc} (${test.password}): ${match ? 'VÁLIDA' : 'NO válida'}`);
        }
      } else {
        console.log('\n❌ Profesor NO encontrado');
      }

      db.get(`SELECT password FROM users WHERE email = 'ana.lopez@estudiante.com'`, async (err, est) => {
        if (est) {
          console.log('\n✅ Estudiante encontrado (ana.lopez@estudiante.com)');
          for (const test of testPasswords) {
            const match = await bcrypt.compare(test.password, est.password);
            console.log(`   ${match ? '✅' : '❌'} ${test.desc} (${test.password}): ${match ? 'VÁLIDA' : 'NO válida'}`);
          }
        } else {
          console.log('\n❌ Estudiante NO encontrado');
        }

        console.log('\n' + '═'.repeat(80));
        console.log('\n💡 CREDENCIALES VÁLIDAS:\n');
        console.log('Admin: norma.admin@escuelanorma.com / Norma2025!Secure');
        console.log('Profesor: maria.gonzalez@campus.com / Test123!');
        console.log('Estudiante: ana.lopez@estudiante.com / Test123!\n');
        
        db.close();
      });
    });
  });
});
