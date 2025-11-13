/**
 * Rutas para el Sistema de Tareas/Asignaciones
 */

const express = require('express');
const router = express.Router();

module.exports = (db, authenticateToken, requireProfessor, upload) => {
    const Assignment = require('../models/Assignment');
    const assignmentModel = new Assignment(db);

    // ===== RUTAS PARA PROFESORES =====

    // Crear una nueva tarea
    router.post('/courses/:courseId/assignments', authenticateToken, requireProfessor, upload.single('file'), async (req, res) => {
        try {
            const { courseId } = req.params;
            const { title, description, due_date, max_score } = req.body;
            const professor_id = req.user.id;

            const assignmentData = {
                course_id: courseId,
                professor_id,
                title,
                description,
                due_date,
                max_score: max_score || 100,
                file_url: req.file ? `/uploads/${req.file.filename}` : null
            };

            const assignment = await assignmentModel.create(assignmentData);

            res.status(201).json({
                success: true,
                message: 'Tarea creada exitosamente',
                assignment
            });
        } catch (error) {
            console.error('Error creando assignment:', error);
            res.status(500).json({ error: 'Error al crear la tarea' });
        }
    });

    // Obtener todas las tareas de un curso
    router.get('/courses/:courseId/assignments', authenticateToken, async (req, res) => {
        try {
            const { courseId } = req.params;
            const assignments = await assignmentModel.getByCourse(courseId);

            res.json({
                success: true,
                assignments
            });
        } catch (error) {
            console.error('Error obteniendo assignments:', error);
            res.status(500).json({ error: 'Error al obtener las tareas' });
        }
    });

    // Obtener una tarea específica
    router.get('/assignments/:id', authenticateToken, async (req, res) => {
        try {
            const { id } = req.params;
            const assignment = await assignmentModel.getById(id);

            if (!assignment) {
                return res.status(404).json({ error: 'Tarea no encontrada' });
            }

            res.json({
                success: true,
                assignment
            });
        } catch (error) {
            console.error('Error obteniendo assignment:', error);
            res.status(500).json({ error: 'Error al obtener la tarea' });
        }
    });

    // Actualizar una tarea
    router.put('/assignments/:id', authenticateToken, requireProfessor, upload.single('file'), async (req, res) => {
        try {
            const { id } = req.params;
            const { title, description, due_date, max_score } = req.body;

            const assignmentData = {
                title,
                description,
                due_date,
                max_score,
                file_url: req.file ? `/uploads/${req.file.filename}` : req.body.file_url
            };

            const assignment = await assignmentModel.update(id, assignmentData);

            res.json({
                success: true,
                message: 'Tarea actualizada exitosamente',
                assignment
            });
        } catch (error) {
            console.error('Error actualizando assignment:', error);
            res.status(500).json({ error: 'Error al actualizar la tarea' });
        }
    });

    // Eliminar una tarea
    router.delete('/assignments/:id', authenticateToken, requireProfessor, async (req, res) => {
        try {
            const { id } = req.params;
            await assignmentModel.delete(id);

            res.json({
                success: true,
                message: 'Tarea eliminada exitosamente'
            });
        } catch (error) {
            console.error('Error eliminando assignment:', error);
            res.status(500).json({ error: 'Error al eliminar la tarea' });
        }
    });

    // Obtener todas las entregas de una tarea (solo profesores)
    router.get('/assignments/:id/submissions', authenticateToken, requireProfessor, async (req, res) => {
        try {
            const { id } = req.params;
            const submissions = await assignmentModel.getSubmissionsByAssignment(id);

            res.json({
                success: true,
                submissions
            });
        } catch (error) {
            console.error('Error obteniendo submissions:', error);
            res.status(500).json({ error: 'Error al obtener las entregas' });
        }
    });

    // Calificar una entrega (solo profesores)
    router.put('/submissions/:id/grade', authenticateToken, requireProfessor, async (req, res) => {
        try {
            const { id } = req.params;
            const { score, feedback } = req.body;
            const graded_by = req.user.id;

            const gradeData = {
                score,
                feedback,
                graded_by
            };

            const submission = await assignmentModel.gradeSubmission(id, gradeData);

            res.json({
                success: true,
                message: 'Entrega calificada exitosamente',
                submission
            });
        } catch (error) {
            console.error('Error calificando submission:', error);
            res.status(500).json({ error: 'Error al calificar la entrega' });
        }
    });

    // ===== RUTAS PARA ESTUDIANTES =====

    // Crear una entrega (estudiantes)
    router.post('/assignments/:id/submit', authenticateToken, upload.single('file'), async (req, res) => {
        try {
            const { id } = req.params;
            const student_id = req.user.id;
            const { submission_text } = req.body;

            // Verificar si ya existe una entrega
            const existingSubmission = await assignmentModel.getSubmissionByStudent(id, student_id);

            if (existingSubmission) {
                return res.status(400).json({
                    error: 'Ya has entregado esta tarea. Contacta a tu profesor si necesitas hacer cambios.'
                });
            }

            const submissionData = {
                assignment_id: id,
                student_id,
                submission_text,
                file_url: req.file ? `/uploads/${req.file.filename}` : null
            };

            const submission = await assignmentModel.createSubmission(submissionData);

            res.status(201).json({
                success: true,
                message: 'Tarea entregada exitosamente',
                submission
            });
        } catch (error) {
            console.error('Error creando submission:', error);
            res.status(500).json({ error: 'Error al entregar la tarea' });
        }
    });

    // Obtener la entrega de un estudiante para una tarea específica
    router.get('/assignments/:id/my-submission', authenticateToken, async (req, res) => {
        try {
            const { id } = req.params;
            const student_id = req.user.id;

            const submission = await assignmentModel.getSubmissionByStudent(id, student_id);

            res.json({
                success: true,
                submission: submission || null
            });
        } catch (error) {
            console.error('Error obteniendo submission:', error);
            res.status(500).json({ error: 'Error al obtener tu entrega' });
        }
    });

    // Obtener todas las entregas de un estudiante
    router.get('/my-submissions', authenticateToken, async (req, res) => {
        try {
            const student_id = req.user.id;
            const submissions = await assignmentModel.getSubmissionsByStudent(student_id);

            res.json({
                success: true,
                submissions
            });
        } catch (error) {
            console.error('Error obteniendo submissions del estudiante:', error);
            res.status(500).json({ error: 'Error al obtener tus entregas' });
        }
    });

    return router;
};
