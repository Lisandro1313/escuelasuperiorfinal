const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'campus_norma_secret_key_2024';

// Obtener token del localStorage (pega aquí tu token)
const token = process.argv[2];

if (!token) {
  console.log('❌ No se proporcionó token');
  console.log('Uso: node decode-token.js <tu-token-aqui>');
  process.exit(1);
}

try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('✅ Token decodificado:');
  console.log(JSON.stringify(decoded, null, 2));
} catch (error) {
  console.log('❌ Error decodificando token:', error.message);
}
