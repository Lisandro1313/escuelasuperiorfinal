// Courses list endpoint - Vercel Serverless
import { query } from '../_db.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { categoria, level, search } = req.query;
    
    let queryText = `
      SELECT 
        c.*,
        p.nombre as instructor_nombre,
        COUNT(DISTINCT e.id) as enrolled_count
      FROM courses c
      LEFT JOIN profiles p ON c.instructor_id = p.id
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE c.published = true
    `;
    
    const queryParams = [];
    let paramIndex = 1;

    if (categoria) {
      queryText += ` AND c.categoria = $${paramIndex}`;
      queryParams.push(categoria);
      paramIndex++;
    }

    if (level) {
      queryText += ` AND c.level = $${paramIndex}`;
      queryParams.push(level);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    queryText += ' GROUP BY c.id, p.nombre ORDER BY c.created_at DESC';

    const result = await query(queryText, queryParams);

    res.status(200).json({
      courses: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Courses error:', error);
    res.status(500).json({ 
      error: 'Error al obtener cursos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
