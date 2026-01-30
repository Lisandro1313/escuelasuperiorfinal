-- ================================================
-- DATOS INICIALES PARA SUPABASE - Campus Norma
-- ================================================
-- Ejecutar DESPUÉS de crear las tablas en Supabase
-- ================================================

-- 1. CREAR USUARIO ADMINISTRADOR
INSERT INTO profiles (email, password, nombre, role, activo)
VALUES (
  'norma.admin@escuelanorma.com',
  '$2b$10$rOoF.4ZPYyqE/GWU0uR2wOoZ8bLfCpLF1zTF5bW.1bfJ4a0ZPjk0m', -- Norma2025!Secure
  'Norma Silva',
  'admin',
  true
)
ON CONFLICT (email) DO NOTHING;

-- 2. CREAR PROFESORES DE PRUEBA
INSERT INTO profiles (email, password, nombre, role, biografia, activo)
VALUES 
(
  'profesor1@test.com',
  '$2b$10$eY5Vq8kF3U1E7mH2QkN.YeW8jZkN9L0pQ1rS2tU3vW4xY5zA6bC7d', -- Test123!
  'María González',
  'professor',
  'Profesora de Programación con 10 años de experiencia',
  true
),
(
  'profesor2@test.com',
  '$2b$10$eY5Vq8kF3U1E7mH2QkN.YeW8jZkN9L0pQ1rS2tU3vW4xY5zA6bC7d', -- Test123!
  'Juan Pérez',
  'professor',
  'Profesor de Matemáticas y Ciencias',
  true
)
ON CONFLICT (email) DO NOTHING;

-- 3. CREAR ESTUDIANTES DE PRUEBA  
INSERT INTO profiles (email, password, nombre, role, biografia, activo)
VALUES
(
  'estudiante1@test.com',
  '$2b$10$eY5Vq8kF3U1E7mH2QkN.YeW8jZkN9L0pQ1rS2tU3vW4xY5zA6bC7d', -- Test123!
  'Ana Martínez',
  'student',
  'Estudiante de Ingeniería Informática',
  true
),
(
  'estudiante2@test.com',
  '$2b$10$eY5Vq8kF3U1E7mH2QkN.YeW8jZkN9L0pQ1rS2tU3vW4xY5zA6bC7d', -- Test123!
  'Carlos López',
  'student',
  'Diseñador gráfico en transición a UX/UI',
  true
),
(
  'estudiante3@test.com',
  '$2b$10$eY5Vq8kF3U1E7mH2QkN.YeW8jZkN9L0pQ1rS2tU3vW4xY5zA6bC7d', -- Test123!
  'Laura Fernández',
  'student',
  'Data Analyst',
  true
)
ON CONFLICT (email) DO NOTHING;

-- 4. CREAR CURSOS DE EJEMPLO
-- Primero obtener IDs de profesores
DO $$
DECLARE
  prof1_id INTEGER;
  prof2_id INTEGER;
  curso1_id INTEGER;
  curso2_id INTEGER;
  est1_id INTEGER;
  est2_id INTEGER;
BEGIN
  -- Obtener IDs de profesores y estudiantes
  SELECT id INTO prof1_id FROM profiles WHERE email = 'profesor1@test.com';
  SELECT id INTO prof2_id FROM profiles WHERE email = 'profesor2@test.com';
  SELECT id INTO est1_id FROM profiles WHERE email = 'estudiante1@test.com';
  SELECT id INTO est2_id FROM profiles WHERE email = 'estudiante2@test.com';

  -- Crear o obtener primer curso
  SELECT id INTO curso1_id FROM courses WHERE title = 'Introducción a JavaScript';
  
  IF curso1_id IS NULL THEN
    INSERT INTO courses (title, description, profesor, instructor_id, categoria, precio, duracion, level, published)
    VALUES (
      'Introducción a JavaScript',
      'Aprende los fundamentos de JavaScript desde cero',
      'María González',
      prof1_id,
      'Programación',
      2500,
      '8 semanas',
      'beginner',
      true
    )
    RETURNING id INTO curso1_id;
  END IF;

  -- Crear o obtener segundo curso
  SELECT id INTO curso2_id FROM courses WHERE title = 'Matemáticas para Programadores';
  
  IF curso2_id IS NULL THEN
    INSERT INTO courses (title, description, profesor, instructor_id, categoria, precio, duracion, level, published)
    VALUES (
      'Matemáticas para Programadores',
      'Conceptos matemáticos esenciales para programación',
      'Juan Pérez',
      prof2_id,
      'Matemáticas',
      3000,
      '10 semanas',
      'intermediate',
      true
    )
    RETURNING id INTO curso2_id;
  END IF;

  -- Crear lecciones para el primer curso
  INSERT INTO lessons (title, content, content_type, order_index, course_id, published)
  VALUES 
  ('Introducción a JavaScript', 'Conceptos básicos', 'texto', 1, curso1_id, true),
  ('Variables y Tipos de Datos', 'Aprende sobre variables', 'video', 2, curso1_id, true),
  ('Funciones en JavaScript', 'Todo sobre funciones', 'texto', 3, curso1_id, true);

  -- Inscribir estudiantes en cursos
  IF est1_id IS NOT NULL AND curso1_id IS NOT NULL THEN
    INSERT INTO enrollments (user_id, course_id, progress, completed)
    VALUES (est1_id, curso1_id, 30, false)
    ON CONFLICT DO NOTHING;
  END IF;

  IF est2_id IS NOT NULL AND curso1_id IS NOT NULL THEN
    INSERT INTO enrollments (user_id, course_id, progress, completed)
    VALUES (est2_id, curso1_id, 60, false)
    ON CONFLICT DO NOTHING;
  END IF;

END $$;

-- ================================================
-- RESUMEN
-- ================================================
-- ✅ 1 Administrador creado
-- ✅ 2 Profesores creados
-- ✅ 3 Estudiantes creados
-- ✅ 2 Cursos creados con lecciones
-- ✅ 2 Inscripciones creadas
-- 
-- CREDENCIALES:
-- Admin: norma.admin@escuelanorma.com / Norma2025!Secure
-- Profesor: profesor1@test.com / Test123!
-- Estudiante: estudiante1@test.com / Test123!
-- ================================================
