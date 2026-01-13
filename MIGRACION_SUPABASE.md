# 🚀 Guía de Migración a Supabase

## ✅ Paso 1: Ejecutar SQL en Supabase (HAZ ESTO AHORA)

1. **Ve a tu dashboard de Supabase:**
   https://supabase.com/dashboard/project/gdanglqcwvuknzxohfhy

2. **Clic en "SQL Editor"** (ícono de base de datos en el menú lateral)

3. **Clic en "+ New query"**

4. **Copia TODO el contenido** del archivo `database/init-postgres.sql`

5. **Pégalo en el editor** y clic en **"Run"** (o Ctrl+Enter)

6. **Verifica que se ejecutó bien** - deberías ver "Success. No rows returned"

---

## ✅ Paso 2: Probar la Conexión Local

Una vez ejecutado el SQL, ejecuta el backend:

```bash
cd backend
node server.js
```

Si ves:
- ✅ `🐘 Conectado a PostgreSQL`
- ✅ `Tablas creadas/verificadas`

**¡Funciona!** Tu app local ahora usa Supabase.

---

## ✅ Paso 3: Configurar Render para Producción

En tu dashboard de Render (https://dashboard.render.com/web/srv-d4c6e5k9c44c738jshb0):

1. **Ve a "Environment"**

2. **Agrega estas variables:**
   ```
   DATABASE_URL=postgresql://postgres:Cocoliso13!@db.gdanglqcwvuknzxohfhy.supabase.co:5432/postgres
   DB_HOST=db.gdanglqcwvuknzxohfhy.supabase.co
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=Cocoliso13!
   NODE_ENV=production
   ```

3. **Guarda cambios** - Render redeployará automáticamente

---

## 🎓 Credenciales del Admin

Una vez que el backend esté corriendo con Supabase:

**Email:** norma.admin@escuelanorma.com  
**Password:** Norma2025!Secure

---

## 📊 Verificar que Funcionó

### Local (http://localhost:3000):
1. Inicia el backend y frontend
2. Intenta registrarte o iniciar sesión
3. Ve a Supabase → Table Editor → users
4. ¡Deberías ver tu usuario!

### Producción (Render):
1. Espera que Render termine de deployar
2. Ve a tu URL de Render
3. Intenta iniciar sesión
4. Revisa los logs en Render Dashboard

---

## 🔥 Ventajas de Supabase

✅ **Gratis para siempre** (no se borra después de 90 días como Render)  
✅ **500MB de datos** (suficiente para empezar)  
✅ **Backups automáticos**  
✅ **No se apaga** (24/7 disponible)  
✅ **Interface visual** para ver los datos (Table Editor)  
✅ **Panel de autenticación** incluido  

---

## 🆘 Solución de Problemas

### Error: "password authentication failed"
- Revisa que la contraseña en DATABASE_URL no tenga caracteres especiales mal escapados
- La contraseña `Cocoliso13!` ya está correcta en tu configuración

### Error: "relation does not exist"
- No ejecutaste el SQL en Supabase
- Ve al Paso 1 y ejecuta `init-postgres.sql`

### Backend no se conecta
- Verifica las variables de entorno en `.env`
- Comprueba que DATABASE_URL esté correctamente configurada

---

## 📝 Próximos Pasos

Una vez que funcione:

1. ✅ Migrar datos existentes (si los hay) desde SQLite a PostgreSQL
2. ✅ Probar todas las funcionalidades (login, cursos, pagos, etc.)
3. ✅ Actualizar las credenciales de MercadoPago para producción
4. ✅ Configurar el dominio personalizado
5. ✅ Configurar backups periódicos

---

**¡Ahora ejecuta el SQL en Supabase y avísame cuando esté listo!** 🚀
