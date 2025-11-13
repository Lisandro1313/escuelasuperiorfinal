/**
 * Modelo de Pagos
 * Gestiona el historial de pagos y transacciones
 */

class Payment {
    constructor(db) {
        this.db = db;
        this.initTable();
    }

    async initTable() {
        const createPaymentsTable = `
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        payment_id VARCHAR(255) UNIQUE,
        external_reference VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        status_detail VARCHAR(255),
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        payment_method VARCHAR(100),
        payment_type VARCHAR(100),
        installments INTEGER DEFAULT 1,
        transaction_amount DECIMAL(10, 2),
        date_created DATETIME DEFAULT CURRENT_TIMESTAMP,
        date_approved DATETIME,
        date_last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        merchant_order_id VARCHAR(255),
        preference_id VARCHAR(255),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (course_id) REFERENCES courses(id)
      )
    `;

        const createDiscountsTable = `
      CREATE TABLE IF NOT EXISTS discount_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        discount_type VARCHAR(20) DEFAULT 'percentage',
        discount_value DECIMAL(10, 2) NOT NULL,
        max_uses INTEGER DEFAULT 100,
        current_uses INTEGER DEFAULT 0,
        valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
        valid_until DATETIME,
        active BOOLEAN DEFAULT 1,
        course_id INTEGER,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `;

        const createDiscountUsageTable = `
      CREATE TABLE IF NOT EXISTS discount_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discount_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        payment_id INTEGER,
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (discount_id) REFERENCES discount_codes(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (payment_id) REFERENCES payments(id)
      )
    `;

        try {
            await new Promise((resolve, reject) => {
                this.db.db.run(createPaymentsTable, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            await new Promise((resolve, reject) => {
                this.db.db.run(createDiscountsTable, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            await new Promise((resolve, reject) => {
                this.db.db.run(createDiscountUsageTable, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            console.log('✅ Tablas de Payment creadas/verificadas');
        } catch (error) {
            console.error('Error creando tablas de payment:', error);
        }
    }

    // Crear registro de pago
    async create(paymentData) {
        const {
            user_id,
            course_id,
            payment_id,
            external_reference,
            status,
            status_detail,
            amount,
            currency,
            payment_method,
            payment_type,
            installments,
            transaction_amount,
            date_approved,
            merchant_order_id,
            preference_id
        } = paymentData;

        const query = `
      INSERT INTO payments (
        user_id, course_id, payment_id, external_reference, status, status_detail,
        amount, currency, payment_method, payment_type, installments,
        transaction_amount, date_approved, merchant_order_id, preference_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        try {
            const result = await new Promise((resolve, reject) => {
                this.db.db.run(
                    query,
                    [
                        user_id,
                        course_id,
                        payment_id,
                        external_reference,
                        status,
                        status_detail,
                        amount,
                        currency || 'USD',
                        payment_method,
                        payment_type,
                        installments || 1,
                        transaction_amount,
                        date_approved,
                        merchant_order_id,
                        preference_id
                    ],
                    function (err) {
                        if (err) reject(err);
                        else resolve({ lastID: this.lastID });
                    }
                );
            });

            return { id: result.lastID, ...paymentData };
        } catch (error) {
            console.error('Error creando payment:', error);
            throw error;
        }
    }

    // Actualizar estado de pago
    async updateStatus(paymentId, statusData) {
        const { status, status_detail, date_approved } = statusData;

        const query = `
      UPDATE payments
      SET status = ?, status_detail = ?, date_approved = ?, date_last_updated = CURRENT_TIMESTAMP
      WHERE payment_id = ?
    `;

        try {
            await new Promise((resolve, reject) => {
                this.db.db.run(query, [status, status_detail, date_approved, paymentId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            return await this.getByPaymentId(paymentId);
        } catch (error) {
            console.error('Error actualizando payment:', error);
            throw error;
        }
    }

    // Obtener pago por payment_id de MercadoPago
    async getByPaymentId(paymentId) {
        const query = `
      SELECT p.*, u.name as user_name, u.email as user_email, c.title as course_title
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN courses c ON p.course_id = c.id
      WHERE p.payment_id = ?
    `;

        try {
            return await new Promise((resolve, reject) => {
                this.db.db.get(query, [paymentId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row || null);
                });
            });
        } catch (error) {
            console.error('Error obteniendo payment:', error);
            return null;
        }
    }

    // Obtener historial de pagos de un usuario
    async getUserPayments(userId) {
        const query = `
      SELECT p.*, c.title as course_title, c.description as course_description
      FROM payments p
      LEFT JOIN courses c ON p.course_id = c.id
      WHERE p.user_id = ?
      ORDER BY p.date_created DESC
    `;

        try {
            return await new Promise((resolve, reject) => {
                this.db.db.all(query, [userId], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        } catch (error) {
            console.error('Error obteniendo payments del usuario:', error);
            return [];
        }
    }

    // Obtener pagos de un curso
    async getCoursePayments(courseId) {
        const query = `
      SELECT p.*, u.name as user_name, u.email as user_email
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.course_id = ? AND p.status = 'approved'
      ORDER BY p.date_approved DESC
    `;

        try {
            return await new Promise((resolve, reject) => {
                this.db.db.all(query, [courseId], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        } catch (error) {
            console.error('Error obteniendo payments del curso:', error);
            return [];
        }
    }

    // ===== CÓDIGOS DE DESCUENTO =====

    // Crear código de descuento
    async createDiscount(discountData) {
        const {
            code,
            description,
            discount_type,
            discount_value,
            max_uses,
            valid_from,
            valid_until,
            course_id,
            created_by
        } = discountData;

        const query = `
      INSERT INTO discount_codes (
        code, description, discount_type, discount_value, max_uses,
        valid_from, valid_until, course_id, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        try {
            const result = await new Promise((resolve, reject) => {
                this.db.db.run(
                    query,
                    [
                        code.toUpperCase(),
                        description,
                        discount_type,
                        discount_value,
                        max_uses || 100,
                        valid_from,
                        valid_until,
                        course_id,
                        created_by
                    ],
                    function (err) {
                        if (err) reject(err);
                        else resolve({ lastID: this.lastID });
                    }
                );
            });

            return { id: result.lastID, ...discountData };
        } catch (error) {
            console.error('Error creando discount:', error);
            throw error;
        }
    }

    // Validar código de descuento
    async validateDiscount(code, userId, courseId) {
        const query = `
      SELECT * FROM discount_codes
      WHERE UPPER(code) = UPPER(?)
        AND active = 1
        AND current_uses < max_uses
        AND datetime('now') >= datetime(valid_from)
        AND (valid_until IS NULL OR datetime('now') <= datetime(valid_until))
        AND (course_id IS NULL OR course_id = ?)
    `;

        try {
            const discount = await new Promise((resolve, reject) => {
                this.db.db.get(query, [code, courseId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row || null);
                });
            });

            if (!discount) {
                return { valid: false, message: 'Código de descuento inválido o expirado' };
            }

            // Verificar si el usuario ya lo usó
            const usageQuery = `
        SELECT COUNT(*) as count FROM discount_usage
        WHERE discount_id = ? AND user_id = ?
      `;

            const usage = await new Promise((resolve, reject) => {
                this.db.db.get(usageQuery, [discount.id, userId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (usage.count > 0) {
                return { valid: false, message: 'Ya has usado este código de descuento' };
            }

            return {
                valid: true,
                discount: discount,
                message: 'Código válido'
            };
        } catch (error) {
            console.error('Error validando discount:', error);
            return { valid: false, message: 'Error al validar el código' };
        }
    }

    // Aplicar descuento
    async applyDiscount(discountId, userId, paymentId) {
        try {
            // Registrar uso
            const usageQuery = `
        INSERT INTO discount_usage (discount_id, user_id, payment_id)
        VALUES (?, ?, ?)
      `;

            await new Promise((resolve, reject) => {
                this.db.db.run(usageQuery, [discountId, userId, paymentId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Incrementar contador
            const updateQuery = `
        UPDATE discount_codes
        SET current_uses = current_uses + 1
        WHERE id = ?
      `;

            await new Promise((resolve, reject) => {
                this.db.db.run(updateQuery, [discountId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            return { success: true };
        } catch (error) {
            console.error('Error aplicando discount:', error);
            throw error;
        }
    }

    // Calcular precio con descuento
    calculateDiscountedPrice(originalPrice, discount) {
        if (discount.discount_type === 'percentage') {
            const discountAmount = (originalPrice * discount.discount_value) / 100;
            return originalPrice - discountAmount;
        } else if (discount.discount_type === 'fixed') {
            return Math.max(0, originalPrice - discount.discount_value);
        }
        return originalPrice;
    }

    // Obtener estadísticas de pagos
    async getPaymentStats(startDate, endDate) {
        const query = `
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as successful_payments,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as failed_payments,
        SUM(CASE WHEN status = 'approved' THEN transaction_amount ELSE 0 END) as total_revenue,
        AVG(CASE WHEN status = 'approved' THEN transaction_amount ELSE NULL END) as avg_transaction,
        currency
      FROM payments
      WHERE date_created BETWEEN ? AND ?
      GROUP BY currency
    `;

        try {
            return await new Promise((resolve, reject) => {
                this.db.db.all(query, [startDate, endDate], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        } catch (error) {
            console.error('Error obteniendo stats de payments:', error);
            return [];
        }
    }
}

module.exports = Payment;
