const db = require('../database/database');

async function testProgress() {
  try {
    const userId = 8; // lism.etcheverry@gmail.com
    
    console.log(`🔍 Probando progreso para userId: ${userId}\n`);
    
    // 1. Obtener enrollments
    const enrollments = await db.getUserEnrollments(userId);
    console.log(`📚 Enrollments encontrados: ${enrollments.length}`);
    console.log(JSON.stringify(enrollments, null, 2));
    
    if (enrollments.length > 0) {
      const enrollment = enrollments[0];
      console.log(`\n🎯 Procesando curso: ${enrollment.course_id}`);
      
      // 2. Obtener módulos
      const modules = await db.getCourseModules(enrollment.course_id);
      console.log(`📖 Módulos: ${modules.length}`);
      
      // 3. Contar lecciones
      let totalLessons = 0;
      for (const module of modules) {
        const lessons = await db.getModuleLessons(module.id);
        console.log(`   Módulo ${module.id}: ${lessons.length} lecciones`);
        totalLessons += lessons.length;
      }
      console.log(`📝 Total lecciones: ${totalLessons}`);
      
      // 4. Obtener progreso
      const progressData = await db.getStudentCourseProgress(userId, enrollment.course_id);
      console.log('\n📊 Progreso del estudiante:');
      console.log(JSON.stringify(progressData, null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testProgress();
