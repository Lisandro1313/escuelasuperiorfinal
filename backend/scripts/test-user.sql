-- Usuario de prueba para testing
-- Email: prueba@test.com
-- Password: Prueba123!
-- Rol: estudiante

INSERT INTO usuarios (email, password, nombre, rol, activo, fecha_registro) 
VALUES (
  'prueba@test.com', 
  '$2a$10$YWxLm5YJz.vEgRqKOVJ8H.nZqZLqF8xW8wZUqGqZqQqZqQqZqQqZq',
  'Usuario de Prueba',
  'estudiante',
  1,
  datetime('now')
);

-- Nota: El hash es para la contraseña "Prueba123!"
