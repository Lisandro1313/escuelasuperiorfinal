/**
 * Servicio para generar certificados en PDF
 */

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

class CertificateService {
    constructor() {
        this.certificatesDir = path.join(__dirname, '../../certificates');
        this.ensureDirectoryExists();
    }

    ensureDirectoryExists() {
        if (!fs.existsSync(this.certificatesDir)) {
            fs.mkdirSync(this.certificatesDir, { recursive: true });
        }
    }

    async generateCertificate(certificateData) {
        const {
            certificate_code,
            student_name,
            course_title,
            completion_date,
            final_score,
            hours_completed,
            verification_url
        } = certificateData;

        return new Promise(async (resolve, reject) => {
            try {
                // Crear documento PDF
                const doc = new PDFDocument({
                    layout: 'landscape',
                    size: 'A4',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 72,
                        right: 72
                    }
                });

                const filename = `${certificate_code}.pdf`;
                const filepath = path.join(this.certificatesDir, filename);
                const stream = fs.createWriteStream(filepath);

                doc.pipe(stream);

                // Fondo decorativo
                doc.rect(0, 0, 842, 595).fill('#f8f9fa');

                // Borde decorativo
                doc.roundedRect(30, 30, 782, 535, 10)
                    .lineWidth(3)
                    .strokeColor('#0ea5e9')
                    .stroke();

                doc.roundedRect(40, 40, 762, 515, 10)
                    .lineWidth(1)
                    .strokeColor('#38bdf8')
                    .stroke();

                // Logo/Header
                doc.fontSize(32)
                    .fillColor('#0369a1')
                    .font('Helvetica-Bold')
                    .text('CERTIFICADO DE FINALIZACIÓN', 60, 80, {
                        width: 722,
                        align: 'center'
                    });

                doc.fontSize(14)
                    .fillColor('#64748b')
                    .font('Helvetica')
                    .text('Escuela de Enseñanza Superior', 60, 130, {
                        width: 722,
                        align: 'center'
                    });

                // Línea separadora
                doc.moveTo(200, 170)
                    .lineTo(642, 170)
                    .lineWidth(2)
                    .strokeColor('#e2e8f0')
                    .stroke();

                // Texto principal
                doc.fontSize(16)
                    .fillColor('#475569')
                    .font('Helvetica')
                    .text('Se otorga el presente certificado a:', 60, 200, {
                        width: 722,
                        align: 'center'
                    });

                // Nombre del estudiante
                doc.fontSize(36)
                    .fillColor('#0c4a6e')
                    .font('Helvetica-Bold')
                    .text(student_name, 60, 240, {
                        width: 722,
                        align: 'center'
                    });

                // Texto del curso
                doc.fontSize(16)
                    .fillColor('#475569')
                    .font('Helvetica')
                    .text('Por haber completado satisfactoriamente el curso:', 60, 300, {
                        width: 722,
                        align: 'center'
                    });

                // Título del curso
                doc.fontSize(24)
                    .fillColor('#0369a1')
                    .font('Helvetica-Bold')
                    .text(course_title, 60, 330, {
                        width: 722,
                        align: 'center'
                    });

                // Información adicional
                let yPosition = 390;

                if (hours_completed) {
                    doc.fontSize(12)
                        .fillColor('#64748b')
                        .font('Helvetica')
                        .text(`Horas de estudio: ${hours_completed}h`, 60, yPosition, {
                            width: 722,
                            align: 'center'
                        });
                    yPosition += 20;
                }

                if (final_score) {
                    doc.fontSize(12)
                        .fillColor('#64748b')
                        .text(`Calificación final: ${final_score.toFixed(1)}/100`, 60, yPosition, {
                            width: 722,
                            align: 'center'
                        });
                    yPosition += 20;
                }

                // Fecha
                const formattedDate = new Date(completion_date).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                doc.fontSize(12)
                    .fillColor('#64748b')
                    .text(`Fecha de finalización: ${formattedDate}`, 60, yPosition, {
                        width: 722,
                        align: 'center'
                    });

                // Código de verificación y QR
                doc.fontSize(10)
                    .fillColor('#94a3b8')
                    .text(`Código de verificación: ${certificate_code}`, 60, 480, {
                        width: 500,
                        align: 'left'
                    });

                // Generar QR code
                const qrCodeDataURL = await QRCode.toDataURL(verification_url, {
                    errorCorrectionLevel: 'H',
                    type: 'image/png',
                    width: 100,
                    margin: 1
                });

                // Convertir data URL a buffer
                const qrBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');

                // Agregar QR code al PDF
                doc.image(qrBuffer, 690, 460, {
                    width: 80,
                    height: 80
                });

                doc.fontSize(8)
                    .fillColor('#94a3b8')
                    .text('Escanea para verificar', 680, 545, {
                        width: 100,
                        align: 'center'
                    });

                // Firma (placeholder)
                doc.moveTo(150, 510)
                    .lineTo(300, 510)
                    .lineWidth(1)
                    .strokeColor('#cbd5e1')
                    .stroke();

                doc.fontSize(10)
                    .fillColor('#64748b')
                    .text('Director Académico', 150, 515, {
                        width: 150,
                        align: 'center'
                    });

                // Finalizar PDF
                doc.end();

                stream.on('finish', () => {
                    resolve({
                        success: true,
                        filename,
                        filepath,
                        url: `/certificates/${filename}`
                    });
                });

                stream.on('error', (error) => {
                    reject(error);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    deleteCertificate(filename) {
        try {
            const filepath = path.join(this.certificatesDir, filename);
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
                return { success: true };
            }
            return { success: false, error: 'Archivo no encontrado' };
        } catch (error) {
            console.error('Error eliminando certificado:', error);
            return { success: false, error: error.message };
        }
    }

    getCertificatePath(filename) {
        return path.join(this.certificatesDir, filename);
    }
}

module.exports = CertificateService;
