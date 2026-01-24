/**
 * Script para probar el login directamente con la API
 */

const API_URL = 'http://localhost:5000';

const testCredentials = [
  {
    email: 'norma.admin@escuelanorma.com',
    password: 'Norma2025!Secure',
    desc: 'Admin'
  },
  {
    email: 'maria.gonzalez@campus.com',
    password: 'Test123!',
    desc: 'Profesor'
  },
  {
    email: 'ana.lopez@estudiante.com',
    password: 'Test123!',
    desc: 'Estudiante'
  }
];

console.log('🧪 Probando login con la API...\n');
console.log(`API URL: ${API_URL}/api/auth/login\n`);
console.log('═'.repeat(80));

async function testLogin(credentials) {
  try {
    console.log(`\n🔐 Probando: ${credentials.desc} (${credentials.email})`);
    console.log(`   Contraseña: ${credentials.password}`);
    
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password
      })
    });

    const data = await response.json();

    if (response.ok && data.token) {
      console.log('   ✅ LOGIN EXITOSO');
      console.log(`   👤 Usuario: ${data.user.nombre}`);
      console.log(`   📧 Email: ${data.user.email}`);
      console.log(`   🎭 Tipo: ${data.user.tipo}`);
      console.log(`   🎫 Token generado: ${data.token.substring(0, 30)}...`);
      return true;
    } else {
      console.log('   ❌ LOGIN FALLÓ');
      console.log(`   Error: ${response.status} - ${data.error || response.statusText}`);
      return false;
    }
  } catch (error) {
    console.log('   ❌ LOGIN FALLÓ');
    console.log(`   Error: ${error.message}`);
    console.log(`   ¿El servidor está corriendo en ${API_URL}?`);
    return false;
  }
}

async function runTests() {
  let successCount = 0;
  
  for (const cred of testCredentials) {
    const success = await testLogin(cred);
    if (success) successCount++;
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '═'.repeat(80));
  console.log(`\n📊 RESUMEN: ${successCount}/${testCredentials.length} logins exitosos\n`);
  
  if (successCount === testCredentials.length) {
    console.log('✅ ¡Todas las credenciales funcionan correctamente!');
    console.log('\n💡 Si no puedes iniciar sesión en el navegador:');
    console.log('   1. Verifica que el frontend esté corriendo en http://localhost:3000');
    console.log('   2. Abre la consola del navegador (F12) para ver errores');
    console.log('   3. Verifica que no haya errores de CORS');
    console.log('   4. Intenta borrar el caché y cookies del navegador');
  } else {
    console.log('⚠️  Algunas credenciales fallaron. Verifica la configuración.');
  }
  
  console.log('\n🌐 URLs del sistema:');
  console.log(`   Frontend: http://localhost:3000`);
  console.log(`   Backend:  http://localhost:5000`);
  console.log(`   Health:   http://localhost:5000/api/health\n`);
}

// Esperar un momento para asegurar que el servidor esté listo
setTimeout(runTests, 2000);
