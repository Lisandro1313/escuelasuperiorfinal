/**
 * Rutas para el Sistema de Progreso
 */

const express = require('express');
const router = express.Router();

module.exports = (db, authenticateToken) => {
    const Progress = require('../models/Progress');
    const progressModel = new Progress(db);

    // Marcar una lección como completada
    router.post('/lessons/:lessonId/complete', authenticateToken, async (req, res) => {
        try {
            const { lessonId } = req.params;
            const { courseId } = req.body;
            const studentId = req.user.id;

            if (!courseId) {
                return res.status(400).json({ error: 'courseId es requerido' });
            }

            await progressModel.markLessonComplete(studentId, courseId, lessonId);

            res.json({
                success: true,
                message: 'Lección marcada como completada'
            });
        } catch (error) {
            console.error('Error marcando lección como completada:', error);
            res.status(500).json({ error: 'Error al marcar la lección como completada' });
        }
    });

    // Actualizar último acceso a una lección
    router.post('/lessons/:lessonId/access', authenticateToken, async (req, res) => {
        try {
            const { lessonId } = req.params;
            const { courseId } = req.body;
            const studentId = req.user.id;

            if (!courseId) {
                return res.status(400).json({ error: 'courseId es requerido' });
            }

            await progressModel.updateLastAccessed(studentId, courseId, lessonId);

            res.json({
                success: true,
                message: 'Último acceso actualizado'
            });
        } catch (error) {
            console.error('Error actualizando último acceso:', error);
            res.status(500).json({ error: 'Error al actualizar último acceso' });
        }
    });

    // Obtener progreso de un curso específico
    router.get('/courses/:courseId/progress', authenticateToken, async (req, res) => {
        try {
            const { courseId } = req.params;
            const studentId = req.user.id;

            const progress = await progressModel.getCourseProgress(studentId, courseId);
            const modulesProgress = await progressModel.getModulesProgress(studentId, courseId);
            const lessonsProgress = await progressModel.getLessonsProgress(studentId, courseId);

            res.json({
                success: true,
                progress: {
                    course: progress,
                    modules: modulesProgress,
                    lessons: lessonsProgress
                }
            });
        } catch (error) {
            console.error('Error obteniendo progreso del curso:', error);
            res.status(500).json({ error: 'Error al obtener el progreso del curso' });
        }
    });

    // Obtener progreso de todos los cursos del estudiante
    router.get('/my-progress', authenticateToken, async (req, res) => {
        try {
            const studentId = req.user.id;

            const coursesProgress = await progressModel.getAllCoursesProgress(studentId);
            const studentStats = await progressModel.getStudentStats(studentId);

            res.json({
                success: true,
                courses: coursesProgress,
                stats: studentStats
            });
        } catch (error) {
            console.error('Error obteniendo progreso general:', error);
            res.status(500).json({ error: 'Error al obtener tu progreso' });
        }
    });

    // Obtener estadísticas generales del estudiante
    router.get('/my-stats', authenticateToken, async (req, res) => {
        try {
            const studentId = req.user.id;
            const stats = await progressModel.getStudentStats(studentId);

            res.json({
                success: true,
                stats
            });
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            res.status(500).json({ error: 'Error al obtener las estadísticas' });
        }
    });

    // Obtener progreso detallado por módulos
    router.get('/courses/:courseId/modules-progress', authenticateToken, async (req, res) => {
        try {
            const { courseId } = req.params;
            const studentId = req.user.id;

            const modulesProgress = await progressModel.getModulesProgress(studentId, courseId);

            res.json({
                success: true,
                modules: modulesProgress
            });
        } catch (error) {
            console.error('Error obteniendo progreso por módulos:', error);
            res.status(500).json({ error: 'Error al obtener el progreso por módulos' });
        }
    });

    return router;
};
