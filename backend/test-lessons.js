const db = require('../database/database');

async function testLessons() {
  try {
    console.log('🔍 Buscando módulos del curso 1...');
    const modules = await db.getCourseModules(1);
    console.log(`Encontrados ${modules.length} módulos:`, JSON.stringify(modules, null, 2));
    
    if (modules && modules.length > 0) {
      console.log('\n🔍 Buscando lecciones del primer módulo...');
      const lessons = await db.getModuleLessons(modules[0].id);
      console.log(`Encontradas ${lessons.length} lecciones:`, JSON.stringify(lessons, null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testLessons();
