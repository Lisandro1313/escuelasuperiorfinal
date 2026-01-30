// API Health Check - Vercel Serverless
export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    message: 'Campus Norma API is running on Vercel',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
}
