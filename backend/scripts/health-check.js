const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const health = JSON.parse(data);
      console.log('Health Check:', health);
      
      if (health.status === 'healthy') {
        console.log('✅ Sistema funcionando correctamente');
        process.exit(0);
      } else {
        console.log('⚠️ Sistema con problemas');
        process.exit(1);
      }
    } catch (e) {
      console.error('❌ Error al parsear respuesta');
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error de conexión:', error.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('❌ Timeout - El servidor no responde');
  req.destroy();
  process.exit(1);
});

req.end();
