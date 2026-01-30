const db = require('../database/database');

async function testFullProgress() {
  try {
    const userId = 8;
    
    console.log('🔍 Testing full progress endpoint for userId:', userId);
    
    // Simular lo que hace el endpoint
    const enrollments = await db.getUserEnrollments(userId);
    console.log('\n📚 Enrollments:', JSON.stringify(enrollments, null, 2));
    
    if (enrollments.length > 0) {
      const enrollment = enrollments[0];
      const course = await db.getCourseById(enrollment.course_id);
      console.log('\n📖 Course data:', JSON.stringify(course, null, 2));
      
      const modules = await db.getCourseModules(enrollment.course_id);
      console.log('\n📦 Modules:', modules.length);
      
      let totalLessons = 0;
      for (const module of modules) {
        const lessons = await db.getModuleLessons(module.id);
        totalLessons += lessons.length;
      }
      
      const progressData = await db.getStudentCourseProgress(userId, enrollment.course_id);
      console.log('\n📊 Progress data:', JSON.stringify(progressData, null, 2));
      
      const completedLessons = progressData ? progressData.completed_lessons : 0;
      const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      
      console.log('\n✅ Final response would be:');
      console.log(JSON.stringify({
        cursoId: course.id,
        nombreCurso: course.nombre,
        progreso: progress,
        leccionesTotales: totalLessons,
        leccionesCompletadas: completedLessons,
        profesor: course.profesor,
        tiempoEstudio: course.duracion,
        ultimaActividad: progressData?.last_activity || enrollment.fecha_inscripcion
      }, null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testFullProgress();
