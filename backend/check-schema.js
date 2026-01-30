const db = require('../database/database');

async function checkSchema() {
  try {
    const schema = await new Promise((resolve, reject) => {
      db.db.all("PRAGMA table_info(enrollments)", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('Estructura de enrollments:');
    console.log(JSON.stringify(schema, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchema();
