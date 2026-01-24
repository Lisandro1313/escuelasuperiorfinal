const https = require('https');
const http = require('http');

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const protocol = options.port === 443 ? https : http;
    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testUserEndpoint() {
  try {
    // Primero login
    console.log('1️⃣ Haciendo login con Ana López...');
    const loginData = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: 'ana.lopez@estudiante.com',
      password: '123456'
    });

    console.log('✅ Login exitoso');
    console.log('Respuesta completa:', JSON.stringify(loginData, null, 2));

    if (!loginData || !loginData.user) {
      console.error('❌ No se recibió el usuario en la respuesta');
      return;
    }

    const { token, user } = loginData;
    console.log('👤 Usuario:', user.nombre);
    console.log('📚 Cursos inscritos en login:', user.cursosInscritos);

    // Ahora llamar al endpoint /api/users/me
    console.log('\n2️⃣ Llamando a /api/users/me...');
    const currentUser = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/me',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Usuario actualizado obtenido');
    console.log('👤 Nombre:', currentUser.nombre);
    console.log('📧 Email:', currentUser.email);
    console.log('📚 Cursos inscritos:', currentUser.cursosInscritos);
    console.log('📈 Progreso:', currentUser.progreso);

  } catch (error) {
    console.error('❌ Error:', error.message || error);
    console.error('Stack:', error.stack);
  }
}

testUserEndpoint();
