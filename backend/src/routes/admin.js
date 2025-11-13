/**
 * Rutas de Administrador
 * Panel de control y gestión completa del sistema
 */

module.exports = (db, authenticateToken, requireProfessor) => {
  const express = require('express');
  const router = express.Router();

  // Middleware para verificar que es administrador
  const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Se requieren permisos de administrador' });
    }
    next();
  };

  // ============================================
  // DASHBOARD - ESTADÍSTICAS GENERALES
  // ============================================

  router.get('/admin/dashboard', authenticateToken, requireAdmin, async (req, res) => {
    try {
      // Total de usuarios
      const totalUsers = await new Promise((resolve, reject) => {
        db.db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      });

      // Total por rol
      const usersByRole = await new Promise((resolve, reject) => {
        db.db.all(
          'SELECT role, COUNT(*) as count FROM users GROUP BY role',
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      // Total de cursos
      const totalCourses = await new Promise((resolve, reject) => {
        db.db.get('SELECT COUNT(*) as count FROM courses', (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      });

      // Total de inscripciones
      const totalEnrollments = await new Promise((resolve, reject) => {
        db.db.get('SELECT COUNT(*) as count FROM enrollments', (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      });

      // Ingresos totales
      const totalRevenue = await new Promise((resolve, reject) => {
        db.db.get(
          "SELECT SUM(amount) as total FROM payments WHERE status = 'approved'",
          (err, row) => {
            if (err) reject(err);
            else resolve(row.total || 0);
          }
        );
      });

      // Ingresos este mes
      const monthlyRevenue = await new Promise((resolve, reject) => {
        db.db.get(
          `SELECT SUM(amount) as total FROM payments 
           WHERE status = 'approved' 
           AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`,
          (err, row) => {
            if (err) reject(err);
            else resolve(row.total || 0);
          }
        );
      });

      // Cursos más populares
      const popularCourses = await new Promise((resolve, reject) => {
        db.db.all(
          `SELECT c.id, c.name, COUNT(e.id) as enrollments
           FROM courses c
           LEFT JOIN enrollments e ON c.id = e.course_id
           GROUP BY c.id
           ORDER BY enrollments DESC
           LIMIT 5`,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      // Actividad reciente
      const recentActivity = await new Promise((resolve, reject) => {
        db.db.all(
          `SELECT 
            'enrollment' as type,
            e.enrollment_date as date,
            u.name as user_name,
            c.name as course_name
           FROM enrollments e
           JOIN users u ON e.student_id = u.id
           JOIN courses c ON e.course_id = c.id
           ORDER BY e.enrollment_date DESC
           LIMIT 10`,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      res.json({
        overview: {
          total_users: totalUsers,
          users_by_role: usersByRole,
          total_courses: totalCourses,
          total_enrollments: totalEnrollments,
          total_revenue: totalRevenue,
          monthly_revenue: monthlyRevenue
        },
        popular_courses: popularCourses,
        recent_activity: recentActivity
      });
    } catch (error) {
      console.error('Error en dashboard:', error);
      res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
  });

  // ============================================
  // GESTIÓN DE USUARIOS
  // ============================================

  // Listar todos los usuarios
  router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { role, search, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let query = 'SELECT id, name, email, role, created_at FROM users WHERE 1=1';
      const params = [];

      if (role) {
        query += ' AND role = ?';
        params.push(role);
      }

      if (search) {
        query += ' AND (name LIKE ? OR email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const users = await new Promise((resolve, reject) => {
        db.db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Total count
      let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
      const countParams = [];

      if (role) {
        countQuery += ' AND role = ?';
        countParams.push(role);
      }

      if (search) {
        countQuery += ' AND (name LIKE ? OR email LIKE ?)';
        countParams.push(`%${search}%`, `%${search}%`);
      }

      const total = await new Promise((resolve, reject) => {
        db.db.get(countQuery, countParams, (err, row) => {
          if (err) reject(err);
          else resolve(row.total);
        });
      });

      res.json({
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          total_pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error al listar usuarios:', error);
      res.status(500).json({ error: 'Error al listar usuarios' });
    }
  });

  // Cambiar rol de usuario
  router.put('/admin/users/:userId/role', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!['student', 'professor', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Rol inválido' });
      }

      // No permitir cambiar el rol del propio admin
      if (parseInt(userId) === req.user.id) {
        return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
      }

      await new Promise((resolve, reject) => {
        db.db.run(
          'UPDATE users SET role = ? WHERE id = ?',
          [role, userId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      res.json({ message: 'Rol actualizado exitosamente', user_id: userId, new_role: role });
    } catch (error) {
      console.error('Error al cambiar rol:', error);
      res.status(500).json({ error: 'Error al cambiar rol' });
    }
  });

  // Eliminar usuario
  router.delete('/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;

      // No permitir eliminar al propio admin
      if (parseInt(userId) === req.user.id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
      }

      await new Promise((resolve, reject) => {
        db.db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({ message: 'Usuario eliminado exitosamente' });
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      res.status(500).json({ error: 'Error al eliminar usuario' });
    }
  });

  // ============================================
  // GESTIÓN DE CURSOS
  // ============================================

  // Listar todos los cursos (con filtros)
  router.get('/admin/courses', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { status, professor_id, search } = req.query;

      let query = `
        SELECT 
          c.*,
          u.name as professor_name,
          COUNT(DISTINCT e.id) as total_enrollments,
          SUM(CASE WHEN p.status = 'approved' THEN p.amount ELSE 0 END) as total_revenue
        FROM courses c
        LEFT JOIN users u ON c.professor_id = u.id
        LEFT JOIN enrollments e ON c.id = e.course_id
        LEFT JOIN payments p ON c.id = p.course_id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        query += ' AND c.status = ?';
        params.push(status);
      }

      if (professor_id) {
        query += ' AND c.professor_id = ?';
        params.push(professor_id);
      }

      if (search) {
        query += ' AND (c.name LIKE ? OR c.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ' GROUP BY c.id ORDER BY c.created_at DESC';

      const courses = await new Promise((resolve, reject) => {
        db.db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      res.json(courses);
    } catch (error) {
      console.error('Error al listar cursos:', error);
      res.status(500).json({ error: 'Error al listar cursos' });
    }
  });

  // Aprobar/Rechazar curso
  router.put('/admin/courses/:courseId/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { courseId } = req.params;
      const { status } = req.body;

      if (!['active', 'inactive', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }

      await new Promise((resolve, reject) => {
        db.db.run(
          'UPDATE courses SET status = ? WHERE id = ?',
          [status, courseId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      res.json({ message: 'Estado del curso actualizado', course_id: courseId, new_status: status });
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      res.status(500).json({ error: 'Error al cambiar estado del curso' });
    }
  });

  // Eliminar curso
  router.delete('/admin/courses/:courseId', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { courseId } = req.params;

      await new Promise((resolve, reject) => {
        db.db.run('DELETE FROM courses WHERE id = ?', [courseId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({ message: 'Curso eliminado exitosamente' });
    } catch (error) {
      console.error('Error al eliminar curso:', error);
      res.status(500).json({ error: 'Error al eliminar curso' });
    }
  });

  // ============================================
  // GESTIÓN DE PAGOS
  // ============================================

  // Ver todos los pagos
  router.get('/admin/payments', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { status, from_date, to_date } = req.query;

      let query = `
        SELECT 
          p.*,
          u.name as user_name,
          u.email as user_email,
          c.name as course_name
        FROM payments p
        JOIN users u ON p.user_id = u.id
        JOIN courses c ON p.course_id = c.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        query += ' AND p.status = ?';
        params.push(status);
      }

      if (from_date) {
        query += ' AND DATE(p.created_at) >= DATE(?)';
        params.push(from_date);
      }

      if (to_date) {
        query += ' AND DATE(p.created_at) <= DATE(?)';
        params.push(to_date);
      }

      query += ' ORDER BY p.created_at DESC LIMIT 100';

      const payments = await new Promise((resolve, reject) => {
        db.db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      res.json(payments);
    } catch (error) {
      console.error('Error al listar pagos:', error);
      res.status(500).json({ error: 'Error al listar pagos' });
    }
  });

  // ============================================
  // GESTIÓN DE CÓDIGOS DE DESCUENTO
  // ============================================

  // Ver todos los códigos
  router.get('/admin/discount-codes', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const codes = await new Promise((resolve, reject) => {
        db.db.all(
          `SELECT 
            dc.*,
            COUNT(p.id) as times_used,
            u.name as creator_name
           FROM discount_codes dc
           LEFT JOIN payments p ON dc.id = p.discount_code_id
           LEFT JOIN users u ON dc.created_by = u.id
           GROUP BY dc.id
           ORDER BY dc.created_at DESC`,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      res.json(codes);
    } catch (error) {
      console.error('Error al listar códigos:', error);
      res.status(500).json({ error: 'Error al listar códigos de descuento' });
    }
  });

  // Desactivar código de descuento
  router.put('/admin/discount-codes/:codeId/deactivate', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { codeId } = req.params;

      await new Promise((resolve, reject) => {
        db.db.run(
          'UPDATE discount_codes SET is_active = 0 WHERE id = ?',
          [codeId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      res.json({ message: 'Código desactivado exitosamente' });
    } catch (error) {
      console.error('Error al desactivar código:', error);
      res.status(500).json({ error: 'Error al desactivar código' });
    }
  });

  // ============================================
  // REPORTES Y ANALÍTICAS
  // ============================================

  // Reporte de ingresos
  router.get('/admin/reports/revenue', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { period = 'month' } = req.query;

      let dateFormat = '%Y-%m';
      if (period === 'year') dateFormat = '%Y';
      if (period === 'day') dateFormat = '%Y-%m-%d';

      const revenue = await new Promise((resolve, reject) => {
        db.db.all(
          `SELECT 
            strftime(?, created_at) as period,
            COUNT(*) as total_transactions,
            SUM(amount) as total_amount
           FROM payments
           WHERE status = 'approved'
           GROUP BY period
           ORDER BY period DESC
           LIMIT 12`,
          [dateFormat],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      res.json(revenue);
    } catch (error) {
      console.error('Error en reporte:', error);
      res.status(500).json({ error: 'Error al generar reporte' });
    }
  });

  // Reporte de actividad de usuarios
  router.get('/admin/reports/user-activity', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const activity = await new Promise((resolve, reject) => {
        db.db.all(
          `SELECT 
            DATE(created_at) as date,
            COUNT(*) as new_users
           FROM users
           WHERE created_at >= DATE('now', '-30 days')
           GROUP BY date
           ORDER BY date DESC`,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      res.json(activity);
    } catch (error) {
      console.error('Error en reporte:', error);
      res.status(500).json({ error: 'Error al generar reporte' });
    }
  });

  return router;
};
