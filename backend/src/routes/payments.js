/**
 * Rutas mejoradas para el Sistema de Pagos
 */

const express = require('express');
const router = express.Router();

module.exports = (db, authenticateToken, requireProfessor) => {
    const Payment = require('../models/Payment');
    const MercadoPagoService = require('../services/MercadoPagoService');

    const paymentModel = new Payment(db);
    const mercadoPagoService = new MercadoPagoService();

    // Crear preferencia de pago con soporte para descuentos
    router.post('/payments/create-preference', authenticateToken, async (req, res) => {
        try {
            const { courseId, discountCode } = req.body;
            const userId = req.user.id;

            // Obtener información del curso
            const courseQuery = `SELECT * FROM courses WHERE id = ?`;
            const course = await new Promise((resolve, reject) => {
                db.db.get(courseQuery, [courseId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (!course) {
                return res.status(404).json({ error: 'Curso no encontrado' });
            }

            // Obtener información del usuario
            const userQuery = `SELECT * FROM users WHERE id = ?`;
            const user = await new Promise((resolve, reject) => {
                db.db.get(userQuery, [userId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            let finalPrice = parseFloat(course.price);
            let discountApplied = null;

            // Validar y aplicar código de descuento si existe
            if (discountCode) {
                const discountValidation = await paymentModel.validateDiscount(discountCode, userId, courseId);

                if (discountValidation.valid) {
                    finalPrice = paymentModel.calculateDiscountedPrice(finalPrice, discountValidation.discount);
                    discountApplied = discountValidation.discount;
                } else {
                    return res.status(400).json({ error: discountValidation.message });
                }
            }

            // Crear preferencia de pago con precio final
            const courseData = {
                id: course.id,
                nombre: course.title,
                descripcion: course.description,
                precio: finalPrice,
                imagen: course.image_url
            };

            const userData = {
                id: user.id,
                nombre: user.name,
                email: user.email,
                telefono: user.phone
            };

            const preference = await mercadoPagoService.createCoursePayment(courseData, userData);

            // Guardar registro de pago pendiente
            const paymentData = {
                user_id: userId,
                course_id: courseId,
                external_reference: preference.external_reference,
                status: 'pending',
                amount: finalPrice,
                preference_id: preference.id
            };

            const payment = await paymentModel.create(paymentData);

            // Si hay descuento, registrar su uso
            if (discountApplied) {
                await paymentModel.applyDiscount(discountApplied.id, userId, payment.id);
            }

            res.json({
                success: true,
                preference: preference,
                payment: payment,
                discount: discountApplied ? {
                    code: discountApplied.code,
                    originalPrice: parseFloat(course.price),
                    discountedPrice: finalPrice,
                    savings: parseFloat(course.price) - finalPrice
                } : null
            });
        } catch (error) {
            console.error('Error creando preferencia de pago:', error);
            res.status(500).json({ error: 'Error al crear la preferencia de pago' });
        }
    });

    // Webhook de MercadoPago para confirmación automática
    router.post('/payments/webhook', async (req, res) => {
        try {
            const notification = req.body;

            console.log('📩 Webhook recibido:', notification);

            if (notification.type === 'payment') {
                const paymentId = notification.data.id;

                // Obtener información del pago de MercadoPago
                const paymentInfo = await mercadoPagoService.getPaymentStatus(paymentId);

                // Buscar el pago en nuestra base de datos
                const existingPayment = await paymentModel.getByPaymentId(paymentId);

                if (!existingPayment) {
                    // Crear nuevo registro si no existe
                    const externalRef = paymentInfo.external_reference;
                    const refParts = externalRef.split('_');

                    if (refParts.length >= 4) {
                        const courseId = parseInt(refParts[1]);
                        const userId = parseInt(refParts[3]);

                        const paymentData = {
                            user_id: userId,
                            course_id: courseId,
                            payment_id: paymentId,
                            external_reference: paymentInfo.external_reference,
                            status: paymentInfo.status,
                            status_detail: paymentInfo.status_detail,
                            amount: paymentInfo.transaction_amount,
                            transaction_amount: paymentInfo.transaction_amount,
                            payment_method: paymentInfo.payment_method_id,
                            payment_type: paymentInfo.payment_type_id,
                            date_approved: paymentInfo.date_approved
                        };

                        await paymentModel.create(paymentData);

                        // Si el pago fue aprobado, inscribir al estudiante
                        if (paymentInfo.status === 'approved') {
                            const enrollmentQuery = `
                INSERT OR IGNORE INTO enrollments (student_id, course_id, enrollment_date, status)
                VALUES (?, ?, CURRENT_TIMESTAMP, 'active')
              `;

                            await new Promise((resolve, reject) => {
                                db.db.run(enrollmentQuery, [userId, courseId], (err) => {
                                    if (err) reject(err);
                                    else resolve();
                                });
                            });

                            console.log(`✅ Estudiante ${userId} inscrito en curso ${courseId}`);
                        }
                    }
                } else {
                    // Actualizar estado del pago existente
                    await paymentModel.updateStatus(paymentId, {
                        status: paymentInfo.status,
                        status_detail: paymentInfo.status_detail,
                        date_approved: paymentInfo.date_approved
                    });

                    // Si cambió a aprobado, inscribir
                    if (paymentInfo.status === 'approved' && existingPayment.status !== 'approved') {
                        const enrollmentQuery = `
              INSERT OR IGNORE INTO enrollments (student_id, course_id, enrollment_date, status)
              VALUES (?, ?, CURRENT_TIMESTAMP, 'active')
            `;

                        await new Promise((resolve, reject) => {
                            db.db.run(enrollmentQuery, [existingPayment.user_id, existingPayment.course_id], (err) => {
                                if (err) reject(err);
                                else resolve();
                            });
                        });

                        console.log(`✅ Pago confirmado - Estudiante ${existingPayment.user_id} inscrito en curso ${existingPayment.course_id}`);
                    }
                }
            }

            res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error procesando webhook:', error);
            res.status(500).json({ error: 'Error al procesar webhook' });
        }
    });

    // Obtener historial de pagos del usuario
    router.get('/payments/my-history', authenticateToken, async (req, res) => {
        try {
            const userId = req.user.id;
            const payments = await paymentModel.getUserPayments(userId);

            res.json({
                success: true,
                payments
            });
        } catch (error) {
            console.error('Error obteniendo historial de pagos:', error);
            res.status(500).json({ error: 'Error al obtener historial de pagos' });
        }
    });

    // Obtener estado de un pago específico
    router.get('/payments/:paymentId/status', authenticateToken, async (req, res) => {
        try {
            const { paymentId } = req.params;
            const payment = await paymentModel.getByPaymentId(paymentId);

            if (!payment) {
                return res.status(404).json({ error: 'Pago no encontrado' });
            }

            // Verificar que el pago pertenece al usuario (excepto si es profesor/admin)
            if (payment.user_id !== req.user.id && req.user.tipo !== 'profesor' && req.user.tipo !== 'admin') {
                return res.status(403).json({ error: 'No tienes permiso para ver este pago' });
            }

            res.json({
                success: true,
                payment
            });
        } catch (error) {
            console.error('Error obteniendo estado del pago:', error);
            res.status(500).json({ error: 'Error al obtener estado del pago' });
        }
    });

    // ===== CÓDIGOS DE DESCUENTO (Solo profesores/admin) =====

    // Crear código de descuento
    router.post('/discounts', authenticateToken, requireProfessor, async (req, res) => {
        try {
            const { code, description, discount_type, discount_value, max_uses, valid_from, valid_until, course_id } = req.body;
            const created_by = req.user.id;

            const discountData = {
                code,
                description,
                discount_type,
                discount_value,
                max_uses,
                valid_from,
                valid_until,
                course_id,
                created_by
            };

            const discount = await paymentModel.createDiscount(discountData);

            res.status(201).json({
                success: true,
                message: 'Código de descuento creado exitosamente',
                discount
            });
        } catch (error) {
            console.error('Error creando código de descuento:', error);
            res.status(500).json({ error: 'Error al crear código de descuento' });
        }
    });

    // Validar código de descuento (público para que los estudiantes puedan verificar)
    router.post('/discounts/validate', authenticateToken, async (req, res) => {
        try {
            const { code, courseId } = req.body;
            const userId = req.user.id;

            const validation = await paymentModel.validateDiscount(code, userId, courseId);

            if (validation.valid) {
                res.json({
                    success: true,
                    valid: true,
                    discount: {
                        code: validation.discount.code,
                        description: validation.discount.description,
                        discount_type: validation.discount.discount_type,
                        discount_value: validation.discount.discount_value
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    valid: false,
                    message: validation.message
                });
            }
        } catch (error) {
            console.error('Error validando código de descuento:', error);
            res.status(500).json({ error: 'Error al validar código de descuento' });
        }
    });

    // Obtener pagos de un curso (solo profesores)
    router.get('/courses/:courseId/payments', authenticateToken, requireProfessor, async (req, res) => {
        try {
            const { courseId } = req.params;
            const payments = await paymentModel.getCoursePayments(courseId);

            res.json({
                success: true,
                payments
            });
        } catch (error) {
            console.error('Error obteniendo pagos del curso:', error);
            res.status(500).json({ error: 'Error al obtener pagos del curso' });
        }
    });

    // Obtener estadísticas de pagos (solo profesores/admin)
    router.get('/payments/stats', authenticateToken, requireProfessor, async (req, res) => {
        try {
            const { startDate, endDate } = req.query;

            const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const end = endDate || new Date().toISOString();

            const stats = await paymentModel.getPaymentStats(start, end);

            res.json({
                success: true,
                stats,
                period: {
                    from: start,
                    to: end
                }
            });
        } catch (error) {
            console.error('Error obteniendo estadísticas de pagos:', error);
            res.status(500).json({ error: 'Error al obtener estadísticas' });
        }
    });

    return router;
};
