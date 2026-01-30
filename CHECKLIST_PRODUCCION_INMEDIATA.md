# ✅ CHECKLIST PRODUCCIÓN INMEDIATA - Campus Norma

## 🚨 ESTADO ACTUAL
- ✅ Sistema funcionando localmente
- ✅ Backend en puerto 5000
- ✅ Frontend en puerto 3000
- ✅ Usuarios creándose correctamente
- ⚠️ Errores menores de WebSocket (no críticos)

---

## 🎯 PARA PASAR A PRODUCCIÓN AHORA

### 1. ✅ **USAR SUPABASE (Base de Datos)** - 10 minutos

Ya tienes Supabase configurado. Solo ejecuta esto:

**Dashboard Supabase:**
```
https://supabase.com/dashboard/project/gdanglqcwvuknzxohfhy
```

**Credenciales existentes:**
```env
DATABASE_URL=postgresql://postgres:Cocoliso13!@db.gdanglqcwvuknzxohfhy.supabase.co:5432/postgres
DB_HOST=db.gdanglqcwvuknzxohfhy.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=Cocoliso13!
```

**Si NO ejecutaste el SQL todavía:**
1. Ve a SQL Editor en Supabase
2. Copia el contenido de `database/init-postgres.sql`
3. Ejecuta → Run

---

### 2. 💳 **MERCADOPAGO** - Configurado

**Credenciales actuales (TEST):**
```env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-6695050923550599-110410-56bc2e79fc9f3b8f20aa40ddd97c65f0-2095898034
MERCADOPAGO_PUBLIC_KEY=APP_USR-0e6b9b97-3c0f-4d69-8a07-9c9ba3fc8769
```

✅ **Puedes deployar con estas credenciales de TEST**
⚠️ Para cobros reales necesitarás cambiar a credenciales de PRODUCCIÓN

**Cómo obtener credenciales de producción:**
1. https://www.mercadopago.com.ar/developers/
2. Tu aplicación → Credenciales → Producción (NO Test)
3. Copia Access Token y Public Key

---

### 3. 🚀 **DEPLOY EN RENDER.COM** - 20 minutos

#### A. Preparar Repositorio

```bash
# 1. Asegúrate de tener todo commiteado
git status

# 2. Si hay cambios sin commitear
git add .
git commit -m "Listo para producción"
git push origin main
```

#### B. Deploy Backend

1. Ve a https://render.com → New → Web Service
2. Conecta tu repo: `Lisandro1313/escuelasuperiorfinal`
3. Configurar:
   - **Name:** `escuela-norma-backend`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

4. **Variables de Entorno:** (Add en Environment)
   ```env
   NODE_ENV=production
   PORT=5000
   JWT_SECRET=campus_virtual_jwt_secret_production_2024
   
   # Supabase
   DATABASE_URL=postgresql://postgres:Cocoliso13!@db.gdanglqcwvuknzxohfhy.supabase.co:5432/postgres
   DB_HOST=db.gdanglqcwvuknzxohfhy.supabase.co
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=Cocoliso13!
   
   # MercadoPago
   MERCADOPAGO_ACCESS_TOKEN=APP_USR-6695050923550599-110410-56bc2e79fc9f3b8f20aa40ddd97c65f0-2095898034
   MERCADOPAGO_PUBLIC_KEY=APP_USR-0e6b9b97-3c0f-4d69-8a07-9c9ba3fc8769
   
   # IMPORTANTE: Actualizar después con URL del frontend
   FRONTEND_URL=https://tu-frontend-url.onrender.com
   ```

5. **Deploy**

6. **Copia la URL del backend** (ej: `https://escuela-norma-backend.onrender.com`)

#### C. Deploy Frontend

1. New → Static Site
2. Mismo repo: `Lisandro1313/escuelasuperiorfinal`
3. Configurar:
   - **Name:** `escuela-norma-frontend`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

4. **Variables de Entorno:**
   ```env
   VITE_API_URL=https://escuela-norma-backend.onrender.com/api
   ```
   ⚠️ Reemplaza con la URL real de tu backend

5. **Deploy**

#### D. Actualizar CORS

Vuelve al backend en Render → Environment → Agrega/Actualiza:
```env
FRONTEND_URL=https://tu-frontend-url.onrender.com
CORS_ORIGIN=https://tu-frontend-url.onrender.com
```

---

### 4. 🧪 **VERIFICAR QUE FUNCIONA**

1. **Backend Health Check:**
   ```
   https://escuela-norma-backend.onrender.com/api/health
   ```
   Debe responder: `{"status":"healthy",...}`

2. **Frontend:**
   ```
   https://escuela-norma-frontend.onrender.com
   ```
   Debe cargar la página de inicio

3. **Probar Login:**
   - Email: `norma.admin@escuelanorma.com`
   - Password: `Norma2025!Secure`

4. **Probar Registro de Usuario:**
   - Crea un nuevo usuario
   - Verifica en Supabase → Table Editor → users

5. **Probar MercadoPago (Modo Test):**
   - Inscríbete en un curso
   - Usa tarjeta de prueba:
     - Número: `4509 9535 6623 3704`
     - CVV: `123`
     - Vencimiento: `11/25`
     - Nombre: `APRO`

---

## 📝 **CREDENCIALES PARA ENTREGA**

### URLs de Producción:
```
Frontend: https://escuela-norma-frontend.onrender.com
Backend: https://escuela-norma-backend.onrender.com/api
```

### Cuentas de Usuario:
```
👑 Admin:
Email: norma.admin@escuelanorma.com
Password: Norma2025!Secure

👨‍🏫 Profesor:
Email: profesor1@test.com
Password: Test123!

👨‍🎓 Estudiante:
Email: estudiante1@test.com
Password: Test123!
```

### Pagos:
```
Modo: TEST
Tarjeta de Prueba:
  Número: 4509 9535 6623 3704
  CVV: 123
  Vencimiento: 11/25
  Nombre: APRO
```

---

## ⚠️ **LIMITACIONES CONOCIDAS (para arreglar después)**

1. **WebSocket intermitente** - No crítico, el chat puede tener delays
2. **Favicon faltante** - Añadir un favicon.ico
3. **Tailwind CDN** - Migrar a build compilado (mejor performance)

---

## 🔥 **PRÓXIMOS PASOS (DESPUÉS DE ENTREGAR)**

1. **Migrar MercadoPago a Producción** (credenciales reales)
2. **Configurar Dominio Personalizado** (ej: campusnorma.com)
3. **Configurar Email SMTP** (notificaciones por email)
4. **Optimizar imágenes** (CDN, compresión)
5. **Monitoring** (Sentry, LogRocket)
6. **Backups automáticos** (Supabase ya lo hace)
7. **Certificados SSL** (Render lo hace automático)
8. **Rate Limiting** (ya está implementado)

---

## 🎉 **¡LISTO PARA DEPLOYMENT!**

El sistema está **funcionalmente completo** y listo para usar en producción con:

✅ Autenticación completa (JWT)
✅ Gestión de cursos
✅ Inscripciones
✅ Pagos (MercadoPago Test)
✅ Dashboard admin
✅ Sistema de progreso
✅ Chat en tiempo real
✅ Notificaciones
✅ Certificados
✅ Base de datos persistente (Supabase)

**Tiempo estimado de deployment:** 30-40 minutos

**Costo:** $0 (todo en planes gratuitos)
