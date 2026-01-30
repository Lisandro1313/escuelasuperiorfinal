const express = require('express');
const app = express();
const PORT = 5000;

app.get('/test', (req, res) => {
  res.json({ message: 'Server is alive!' });
});

const server = app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});

// Mantener el proceso vivo
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

console.log('Test server initialized successfully');
