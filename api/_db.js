// Database connection helper for Vercel Serverless
import { Pool } from 'pg';

let pool;

export function getPool() {
  if (!pool) {
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      console.error('❌ DATABASE_URL no está configurada');
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    console.log('✅ Conectando a Supabase...');
    
    pool = new Pool({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false
      },
      max: 1, // Importante para serverless
      connectionTimeoutMillis: 10000
    });
  }
  return pool;
}

export async function query(text, params) {
  const pool = getPool();
  try {
    return await pool.query(text, params);
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
