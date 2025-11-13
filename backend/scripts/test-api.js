const http = require('http');

// Colores para consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Configuración
const BASE_URL = 'localhost';
const PORT = 5000;

// Resultados
let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper para hacer requests
function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Tests
async function test(name, fn) {
  try {
    await fn();
    testResults.passed++;
    testResults.tests.push({ name, status: 'PASS' });
    console.log(`${colors.green}✓${colors.reset} ${name}`);
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'FAIL', error: error.message });
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
  }
}

// Suite de tests
async function runTests() {
  console.log(`\n${colors.blue}=================================`);
  console.log(`  Tests API - Campus Norma`);
  console.log(`=================================${colors.reset}\n`);

  // Test 1: Health Check
  await test('Health Check - Servidor activo', async () => {
    const res = await makeRequest('/api/health');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (res.data.status !== 'healthy') throw new Error('Estado no saludable');
  });

  // Test 2: Listar cursos
  await test('GET /api/courses - Listar cursos', async () => {
    const res = await makeRequest('/api/courses');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('No es un array');
  });

  // Test 3: Registro de usuario
  await test('POST /api/auth/register - Registrar usuario', async () => {
    const email = `test${Date.now()}@test.com`;
    const res = await makeRequest('/api/auth/register', 'POST', {
      email,
      password: 'Test123!',
      nombre: 'Test User',
      tipo: 'alumno'
    });
    if (res.status !== 201) throw new Error(`Status ${res.status}`);
    if (!res.data.token) throw new Error('No se recibió token');
  });

  // Test 4: Login
  let authToken = '';
  await test('POST /api/auth/login - Login de usuario', async () => {
    const res = await makeRequest('/api/auth/login', 'POST', {
      email: 'alumno@test.com',
      password: 'password123'
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.token) throw new Error('No se recibió token');
    authToken = res.data.token;
  });

  // Test 5: Obtener curso específico
  await test('GET /api/courses/:id - Obtener curso', async () => {
    const res = await makeRequest('/api/courses/1');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.id) throw new Error('Datos de curso inválidos');
  });

  // Test 6: Verificar inscripción (requiere auth)
  await test('GET /api/courses/:id/enrollment - Verificar inscripción', async () => {
    const res = await makeRequest('/api/courses/1/enrollment', 'GET', null, {
      'Authorization': `Bearer ${authToken}`
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (typeof res.data.enrolled !== 'boolean') throw new Error('Respuesta inválida');
  });

  // Test 7: Curso gratis - Inscripción directa
  await test('POST /api/courses/3/enroll - Inscripción gratuita', async () => {
    const res = await makeRequest('/api/courses/3/enroll', 'POST', null, {
      'Authorization': `Bearer ${authToken}`
    });
    // Puede ser 200 (éxito) o 400 (ya inscrito)
    if (res.status !== 200 && res.status !== 400) {
      throw new Error(`Status inesperado: ${res.status}`);
    }
  });

  // Test 8: Endpoint inválido
  await test('GET /api/invalid - Manejo de rutas inválidas', async () => {
    const res = await makeRequest('/api/invalid-endpoint-test');
    if (res.status === 200) throw new Error('Debería retornar error');
  });

  // Resultados
  console.log(`\n${colors.blue}=================================`);
  console.log(`  Resultados`);
  console.log(`=================================${colors.reset}\n`);
  
  console.log(`${colors.green}Exitosos: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}Fallidos: ${testResults.failed}${colors.reset}`);
  console.log(`Total: ${testResults.passed + testResults.failed}\n`);

  // Exit code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Ejecutar
console.log(`${colors.yellow}Esperando que el servidor esté listo...${colors.reset}`);
setTimeout(() => {
  runTests().catch(error => {
    console.error(`${colors.red}Error crítico: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}, 2000);
