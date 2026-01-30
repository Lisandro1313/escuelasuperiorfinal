# 🎯 CONFIGURACIÓN COMPLETA DE SUPABASE

## ✅ PASO 1: VERIFICAR ESQUEMA (Ya lo tienes)

Tu esquema de Supabase ya está creado con todas las tablas necesarias. ✅

**Tabla principal de usuarios:** `profiles` (no `users`)

---

## ✅ PASO 2: CARGAR DATOS INICIALES

### Opción A: Usar SQL Editor en Supabase

1. **Ve a tu dashboard:** https://supabase.com/dashboard/project/gdanglqcwvuknzxohfhy

2. **Clic en "SQL Editor"**

3. **Copia y pega** el contenido del archivo `database/supabase-initial-data.sql`

4. **Run** (Ctrl+Enter)

5. **Verifica:**
   - Ve a "Table Editor"
   - Abre la tabla `profiles`
   - Deberías ver 6 usuarios creados

### Opción B: Usar psql (si lo tienes instalado)

```bash
psql "postgresql://postgres:Cocoliso13!@db.gdanglqcwvuknzxohfhy.supabase.co:5432/postgres" < database/supabase-initial-data.sql
```

---

## ✅ PASO 3: VERIFICAR CONEXIÓN BACKEND ➜ SUPABASE

Actualiza tu `.env` en el backend:

```env
# Supabase Connection
DATABASE_URL=postgresql://postgres:Cocoliso13!@db.gdanglqcwvuknzxohfhy.supabase.co:5432/postgres
DB_HOST=db.gdanglqcwvuknzxohfhy.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=Cocoliso13!
NODE_ENV=development

# JWT
JWT_SECRET=campus_virtual_jwt_secret_production_2024

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-6695050923550599-110410-56bc2e79fc9f3b8f20aa40ddd97c65f0-2095898034
MERCADOPAGO_PUBLIC_KEY=APP_USR-0e6b9b97-3c0f-4d69-8a07-9c9ba3fc8769

# URLs
FRONTEND_URL=http://localhost:3000
```

---

## ⚠️ PASO 4: ADAPTAR BACKEND PARA USAR SUPABASE

Tu backend actual usa SQLite con tabla `users`.  
Supabase usa PostgreSQL con tabla `profiles` y columna `role` (no `tipo`).

### Cambios necesarios:

1. **Usar el modelo de PostgreSQL** que ya tienes en `backend/src/models/User.js`
2. **Mapear campos:**
   - `tipo` → `role`
   - `users` → `profiles`
   - `nombre` → `nombre` ✅

### Script para adaptar (ya existe):

El archivo `backend/server-postgres.js` ya está preparado para PostgreSQL.

---

## 🚀 PASO 5: PROBAR LOCALMENTE CON SUPABASE

### Opción 1: Usar server-postgres.js

```bash
cd backend
node server-postgres.js
```

### Opción 2: Usar server-hybrid.js (detecta automáticamente)

```bash
cd backend
# Asegúrate de tener DATABASE_URL en .env
node server-hybrid.js
```

### Verificar que funciona:

```bash
# Health check
curl http://localhost:5000/api/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"norma.admin@escuelanorma.com","password":"Norma2025!Secure"}'
```

---

## ✅ PASO 6: CREDENCIALES FINALES

### Admin:
```
Email: norma.admin@escuelanorma.com
Password: Norma2025!Secure
```

### Profesor:
```
Email: profesor1@test.com
Password: Test123!
```

### Estudiante:
```
Email: estudiante1@test.com
Password: Test123!
```

---

## 📝 DIFERENCIAS CLAVE: SQLite vs Supabase

| Concepto | SQLite (Local) | Supabase (PostgreSQL) |
|----------|----------------|----------------------|
| Tabla usuarios | `users` | `profiles` |
| Campo rol | `tipo` | `role` |
| Valores rol | `admin`, `profesor`, `alumno` | `admin`, `professor`, `student` |
| Sintaxis queries | `?` placeholders | `$1`, `$2` placeholders |
| Auto increment | `INTEGER PRIMARY KEY` | `SERIAL PRIMARY KEY` |

---

## 🔥 PARA PRODUCCIÓN EN RENDER

Variables de entorno a configurar:

```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:Cocoliso13!@db.gdanglqcwvuknzxohfhy.supabase.co:5432/postgres
DB_HOST=db.gdanglqcwvuknzxohfhy.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=Cocoliso13!
JWT_SECRET=campus_virtual_jwt_secret_production_2024
MERCADOPAGO_ACCESS_TOKEN=APP_USR-6695050923550599-110410-56bc2e79fc9f3b8f20aa40ddd97c65f0-2095898034
MERCADOPAGO_PUBLIC_KEY=APP_USR-0e6b9b97-3c0f-4d69-8a07-9c9ba3fc8769
FRONTEND_URL=https://tu-frontend.onrender.com
```

---

## 🆘 TROUBLESHOOTING

### "relation 'users' does not exist"
➜ Tu backend está buscando tabla `users` pero Supabase tiene `profiles`  
➜ **Solución:** Usa `server-postgres.js` o actualiza queries

### "column 'tipo' does not exist"
➜ Supabase usa `role` no `tipo`  
➜ **Solución:** Mapea: `tipo` → `role` en queries

### "password authentication failed"
➜ Verifica la contraseña en DATABASE_URL  
➜ **Contraseña correcta:** `Cocoliso13!`

### Backend no se conecta
➜ Verifica que DATABASE_URL esté en `.env`  
➜ Verifica que Supabase esté activo

---

## ✅ CHECKLIST FINAL

- [ ] Esquema de Supabase creado
- [ ] Datos iniciales cargados (supabase-initial-data.sql)
- [ ] Variables de entorno configuradas en `.env`
- [ ] Backend conectado exitosamente
- [ ] Login funciona con credenciales de prueba
- [ ] Usuarios aparecen en Supabase Table Editor
- [ ] Listo para deployar en Render

---

**¿Todo listo? Procede con el deployment en Render siguiendo el CHECKLIST_PRODUCCION_INMEDIATA.md**
