/**
 * Rutas para el Sistema de Certificados
 */

const express = require('express');
const router = express.Router();
const path = require('path');

module.exports = (db, authenticateToken) => {
    const Certificate = require('../models/Certificate');
    const CertificateService = require('../services/CertificateService');

    const certificateModel = new Certificate(db);
    const certificateService = new CertificateService();

    // Verificar elegibilidad para certificado
    router.get('/courses/:courseId/certificate/eligibility', authenticateToken, async (req, res) => {
        try {
            const { courseId } = req.params;
            const studentId = req.user.id;

            const eligibility = await certificateModel.canReceiveCertificate(studentId, courseId);

            res.json({
                success: true,
                ...eligibility
            });
        } catch (error) {
            console.error('Error verificando elegibilidad:', error);
            res.status(500).json({ error: 'Error al verificar elegibilidad' });
        }
    });

    // Generar certificado para un curso completado
    router.post('/courses/:courseId/certificate/generate', authenticateToken, async (req, res) => {
        try {
            const { courseId } = req.params;
            const studentId = req.user.id;

            // Verificar elegibilidad
            const eligibility = await certificateModel.canReceiveCertificate(studentId, courseId);

            if (!eligibility.eligible) {
                return res.status(400).json({
                    error: eligibility.reason,
                    certificate: eligibility.certificate || null
                });
            }

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

            // Obtener información del estudiante
            const userQuery = `SELECT * FROM users WHERE id = ?`;
            const user = await new Promise((resolve, reject) => {
                db.db.get(userQuery, [studentId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            // Crear registro del certificado en la base de datos
            const certificateData = {
                student_id: studentId,
                course_id: courseId,
                student_name: user.name,
                course_title: course.title,
                completion_date: new Date().toISOString(),
                final_score: eligibility.finalScore,
                hours_completed: course.duration || 0
            };

            const certificate = await certificateModel.create(certificateData);

            // Generar PDF del certificado
            const pdfResult = await certificateService.generateCertificate({
                ...certificate,
                verification_url: certificate.verification_url
            });

            // Actualizar URL del PDF en la base de datos
            await certificateModel.updatePdfUrl(certificate.id, pdfResult.url);

            res.json({
                success: true,
                message: 'Certificado generado exitosamente',
                certificate: {
                    ...certificate,
                    pdf_url: pdfResult.url
                }
            });
        } catch (error) {
            console.error('Error generando certificado:', error);
            res.status(500).json({ error: 'Error al generar certificado' });
        }
    });

    // Obtener certificados del usuario autenticado
    router.get('/my-certificates', authenticateToken, async (req, res) => {
        try {
            const studentId = req.user.id;
            const certificates = await certificateModel.getStudentCertificates(studentId);

            res.json({
                success: true,
                certificates
            });
        } catch (error) {
            console.error('Error obteniendo certificados:', error);
            res.status(500).json({ error: 'Error al obtener certificados' });
        }
    });

    // Verificar certificado por código (público)
    router.get('/certificates/verify/:code', async (req, res) => {
        try {
            const { code } = req.params;
            const certificate = await certificateModel.getByCode(code);

            if (!certificate) {
                return res.status(404).json({
                    success: false,
                    valid: false,
                    message: 'Certificado no encontrado'
                });
            }

            if (!certificate.valid) {
                return res.status(200).json({
                    success: true,
                    valid: false,
                    message: 'Este certificado ha sido invalidado',
                    certificate: {
                        certificate_code: certificate.certificate_code,
                        student_name: certificate.student_name,
                        course_title: certificate.course_title
                    }
                });
            }

            res.json({
                success: true,
                valid: true,
                certificate: {
                    certificate_code: certificate.certificate_code,
                    student_name: certificate.student_name,
                    course_title: certificate.course_title,
                    completion_date: certificate.completion_date,
                    issue_date: certificate.issue_date,
                    final_score: certificate.final_score,
                    hours_completed: certificate.hours_completed
                }
            });
        } catch (error) {
            console.error('Error verificando certificado:', error);
            res.status(500).json({ error: 'Error al verificar certificado' });
        }
    });

    // Descargar PDF del certificado
    router.get('/certificates/:code/download', async (req, res) => {
        try {
            const { code } = req.params;
            const certificate = await certificateModel.getByCode(code);

            if (!certificate) {
                return res.status(404).json({ error: 'Certificado no encontrado' });
            }

            const filename = `${certificate.certificate_code}.pdf`;
            const filepath = certificateService.getCertificatePath(filename);

            // Verificar si el archivo existe
            const fs = require('fs');
            if (!fs.existsSync(filepath)) {
                return res.status(404).json({ error: 'Archivo PDF no encontrado' });
            }

            // Enviar archivo
            res.download(filepath, `Certificado-${certificate.student_name.replace(/\s/g, '-')}.pdf`, (err) => {
                if (err) {
                    console.error('Error descargando certificado:', err);
                    res.status(500).json({ error: 'Error al descargar certificado' });
                }
            });
        } catch (error) {
            console.error('Error en descarga de certificado:', error);
            res.status(500).json({ error: 'Error al descargar certificado' });
        }
    });

    // Obtener estadísticas de certificados (solo admin/profesor)
    router.get('/certificates/stats', authenticateToken, async (req, res) => {
        try {
            // Verificar que sea profesor o admin
            if (req.user.tipo !== 'profesor' && req.user.tipo !== 'admin') {
                return res.status(403).json({ error: 'No tienes permiso para ver estas estadísticas' });
            }

            const stats = await certificateModel.getStats();

            res.json({
                success: true,
                stats
            });
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            res.status(500).json({ error: 'Error al obtener estadísticas' });
        }
    });

    return router;
};
