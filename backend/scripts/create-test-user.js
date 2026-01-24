const bcrypt = require('bcryptjs');
const db = require('../../database/database');

async function createTestUser() {
  try {
    console.log('🔧 Creando usuario de prueba...');

    // Verificar si el usuario ya existe
    const existing = await db.getUserByEmail('prueba@test.com');
    if (existing) {
      console.log('⚠️  El usuario ya existe');
      console.log('\n✅ CREDENCIALES DE PRUEBA:');
      console.log('📧 Email: prueba@test.com');
      console.log('🔑 Password: Prueba123!');
      console.log('👤 Rol: estudiante');
      process.exit(0);
    }

    // Crear usuario de prueba
    const hashedPassword = await bcrypt.hash('Prueba123!', 10);
    
    await new Promise((resolve, reject) => {
      db.db.run(
        'INSERT INTO usuarios (email, password, nombre, rol) VALUES (?, ?, ?, ?)',
        ['prueba@test.com', hashedPassword, 'Usuario de Prueba', 'estudiante'],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    console.log('\n✅ Usuario de prueba creado exitosamente!');
    console.log('\n📋 CREDENCIALES DE PRUEBA:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email: prueba@test.com');
    console.log('🔑 Password: Prueba123!');
    console.log('👤 Rol: estudiante');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando usuario de prueba:', error);
    process.exit(1);
  }
}

// Esperar a que la BD se inicialice
setTimeout(() => {
  createTestUser();
}, 1000);
