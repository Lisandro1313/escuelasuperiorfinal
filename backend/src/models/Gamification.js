/**
 * Modelo Gamification
 * Sistema de puntos, badges y logros
 */

class Gamification {
  /**
   * Crear las tablas necesarias para gamificación
   */
  static async createTables(db) {
    // Tabla de puntos del usuario
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        points INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        experience INTEGER DEFAULT 0,
        streak_days INTEGER DEFAULT 0,
        last_activity_date DATE,
        total_earned INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id)
      )
    `);

    // Tabla de transacciones de puntos
    await db.run(`
      CREATE TABLE IF NOT EXISTS point_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        points INTEGER NOT NULL,
        action_type VARCHAR(100) NOT NULL,
        description TEXT,
        reference_type VARCHAR(50),
        reference_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Tabla de definición de badges
    await db.run(`
      CREATE TABLE IF NOT EXISTS badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(255),
        criteria TEXT NOT NULL,
        points_reward INTEGER DEFAULT 0,
        rarity VARCHAR(50) DEFAULT 'common', -- common, rare, epic, legendary
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de badges del usuario
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        badge_id INTEGER NOT NULL,
        earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
        UNIQUE(user_id, badge_id)
      )
    `);

    // Tabla de logros
    await db.run(`
      CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(255),
        target_value INTEGER NOT NULL,
        current_progress INTEGER DEFAULT 0,
        achievement_type VARCHAR(50) NOT NULL, -- lessons_completed, assignments_submitted, etc.
        points_reward INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de progreso de logros del usuario
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        achievement_id INTEGER NOT NULL,
        current_progress INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT 0,
        completed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
        UNIQUE(user_id, achievement_id)
      )
    `);

    // Índices
    await db.run(`CREATE INDEX IF NOT EXISTS idx_user_points_user ON user_points(user_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id)`);
  }

  /**
   * Inicializar badges del sistema
   */
  static async initializeBadges(db) {
    const badges = [
      {
        name: 'Primer Paso',
        description: 'Completa tu primera lección',
        icon: '🎯',
        criteria: 'complete_first_lesson',
        points_reward: 10,
        rarity: 'common'
      },
      {
        name: 'Estudiante Dedicado',
        description: 'Completa 10 lecciones',
        icon: '📚',
        criteria: 'complete_10_lessons',
        points_reward: 50,
        rarity: 'common'
      },
      {
        name: 'Racha de 7 Días',
        description: 'Mantén una racha de 7 días consecutivos',
        icon: '🔥',
        criteria: 'streak_7_days',
        points_reward: 100,
        rarity: 'rare'
      },
      {
        name: 'Maestro del Curso',
        description: 'Completa un curso al 100%',
        icon: '🏆',
        criteria: 'complete_course',
        points_reward: 200,
        rarity: 'epic'
      },
      {
        name: 'Respuesta Perfecta',
        description: 'Obtén 100% en 5 tareas',
        icon: '⭐',
        criteria: 'perfect_assignments_5',
        points_reward: 150,
        rarity: 'rare'
      },
      {
        name: 'Colaborador Activo',
        description: 'Publica 20 mensajes en foros',
        icon: '💬',
        criteria: 'forum_posts_20',
        points_reward: 75,
        rarity: 'common'
      },
      {
        name: 'Coleccionista',
        description: 'Consigue 5 badges diferentes',
        icon: '🎖️',
        criteria: 'earn_5_badges',
        points_reward: 100,
        rarity: 'rare'
      },
      {
        name: 'Leyenda',
        description: 'Alcanza el nivel 10',
        icon: '👑',
        criteria: 'reach_level_10',
        points_reward: 500,
        rarity: 'legendary'
      }
    ];

    for (const badge of badges) {
      try {
        await db.run(`
          INSERT OR IGNORE INTO badges (name, description, icon, criteria, points_reward, rarity)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [badge.name, badge.description, badge.icon, badge.criteria, badge.points_reward, badge.rarity]);
      } catch (error) {
        console.error(`Error al crear badge ${badge.name}:`, error);
      }
    }
  }

  /**
   * Obtener o crear perfil de puntos del usuario
   */
  static async getUserPoints(db, userId) {
    let profile = await db.get(`
      SELECT * FROM user_points WHERE user_id = ?
    `, [userId]);

    if (!profile) {
      await db.run(`
        INSERT INTO user_points (user_id) VALUES (?)
      `, [userId]);

      profile = await db.get(`
        SELECT * FROM user_points WHERE user_id = ?
      `, [userId]);
    }

    return profile;
  }

  /**
   * Añadir puntos al usuario
   */
  static async addPoints(db, userId, points, actionType, description, referenceType = null, referenceId = null) {
    // Registrar transacción
    await db.run(`
      INSERT INTO point_transactions (user_id, points, action_type, description, reference_type, reference_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, points, actionType, description, referenceType, referenceId]);

    // Actualizar puntos del usuario
    await db.run(`
      UPDATE user_points
      SET points = points + ?,
          total_earned = total_earned + ?,
          experience = experience + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [points, points, points, userId]);

    // Calcular nuevo nivel
    await this.updateLevel(db, userId);

    // Verificar badges
    await this.checkBadges(db, userId);

    return this.getUserPoints(db, userId);
  }

  /**
   * Actualizar nivel basado en experiencia
   */
  static async updateLevel(db, userId) {
    const profile = await this.getUserPoints(db, userId);
    const newLevel = Math.floor(profile.experience / 100) + 1;

    if (newLevel > profile.level) {
      await db.run(`
        UPDATE user_points SET level = ? WHERE user_id = ?
      `, [newLevel, userId]);

      // Dar puntos bonus por subir de nivel
      await this.addPoints(
        db,
        userId,
        newLevel * 10,
        'level_up',
        `Subiste al nivel ${newLevel}`,
        'level',
        newLevel
      );
    }
  }

  /**
   * Actualizar racha de días
   */
  static async updateStreak(db, userId) {
    const profile = await this.getUserPoints(db, userId);
    const today = new Date().toISOString().split('T')[0];
    const lastActivity = profile.last_activity_date;

    if (!lastActivity || lastActivity !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreak = 1;
      if (lastActivity === yesterdayStr) {
        newStreak = profile.streak_days + 1;
      }

      await db.run(`
        UPDATE user_points
        SET streak_days = ?,
            last_activity_date = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [newStreak, today, userId]);

      // Dar puntos por racha
      if (newStreak % 7 === 0) {
        await this.addPoints(
          db,
          userId,
          newStreak * 5,
          'streak_bonus',
          `Racha de ${newStreak} días consecutivos`,
          'streak',
          newStreak
        );
      }
    }
  }

  /**
   * Verificar y otorgar badges
   */
  static async checkBadges(db, userId) {
    // Implementación de verificación de criterios
    // Por ahora, solo estructura básica
    return true;
  }

  /**
   * Otorgar badge al usuario
   */
  static async awardBadge(db, userId, badgeId) {
    try {
      await db.run(`
        INSERT OR IGNORE INTO user_badges (user_id, badge_id)
        VALUES (?, ?)
      `, [userId, badgeId]);

      // Dar puntos del badge
      const badge = await db.get(`SELECT * FROM badges WHERE id = ?`, [badgeId]);
      if (badge && badge.points_reward > 0) {
        await this.addPoints(
          db,
          userId,
          badge.points_reward,
          'badge_earned',
          `Badge obtenido: ${badge.name}`,
          'badge',
          badgeId
        );
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtener badges del usuario
   */
  static async getUserBadges(db, userId) {
    return await db.all(`
      SELECT b.*, ub.earned_at
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
      ORDER BY ub.earned_at DESC
    `, [userId]);
  }

  /**
   * Obtener leaderboard
   */
  static async getLeaderboard(db, limit = 10) {
    return await db.all(`
      SELECT 
        up.*,
        u.name,
        u.email,
        (SELECT COUNT(*) FROM user_badges WHERE user_id = up.user_id) as badge_count
      FROM user_points up
      JOIN users u ON up.user_id = u.id
      ORDER BY up.points DESC
      LIMIT ?
    `, [limit]);
  }

  /**
   * Obtener historial de puntos
   */
  static async getPointHistory(db, userId, limit = 20) {
    return await db.all(`
      SELECT * FROM point_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [userId, limit]);
  }

  /**
   * Obtener todos los badges disponibles
   */
  static async getAllBadges(db) {
    return await db.all(`SELECT * FROM badges ORDER BY rarity, name`);
  }
}

module.exports = Gamification;
