# 🚀 MANUAL DE DESPLIEGUE EN RENDER.COM (GRATIS)

## Escuela de Norma - Despliegue Gratuito

---

## ✅ VENTAJAS DE RENDER

- ✅ **100% GRATIS** para siempre
- ✅ Backend + Frontend + PostgreSQL incluidos
- ✅ HTTPS automático
- ✅ Fácil de usar
- ⚠️ Se "duerme" después de 15 min sin uso (primera carga: 30-50 seg)

---

## 📋 PASO A PASO COMPLETO

### 🎯 PASO 1: PREPARAR GITHUB

#### 1.1 Verificar que todo esté actualizado

```powershell
cd c:\Users\Usuario\EscuelaDeNorma
git status
```

Si hay cambios:

```powershell
git add .
git commit -m "Preparado para Render deployment"
git push origin main
```

#### 1.2 Verificar que el repositorio sea público

1. Ve a: https://github.com/Lisandro1313/EscuelaDeNorma
2. Si dice "Private", ve a **Settings** → **Danger Zone** → **Change visibility** → **Make public**

---

## 🎯 PASO 2: CREAR ARCHIVOS DE CONFIGURACIÓN PARA RENDER

Vamos a crear los archivos que Render necesita:

### 2.1 Crear `render.yaml` en la raíz del proyecto

Este archivo le dice a Render cómo desplegar todo:

```yaml
services:
  # Backend (API)
  - type: web
    name: escuela-norma-backend
    env: node
    rootDir: backend
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5000
      - key: JWT_SECRET
        generateValue: true
      - key: MERCADOPAGO_ACCESS_TOKEN
        sync: false
      - key: MERCADOPAGO_PUBLIC_KEY
        sync: false
      - key: DATABASE_URL
        fromDatabase:
          name: escuela-norma-db
          property: connectionString
    healthCheckPath: /api/health

  # Frontend (React)
  - type: web
    name: escuela-norma-frontend
    env: node
    rootDir: frontend
    buildCommand: npm install && npm run build
    staticPublishPath: ./dist
    envVars:
      - key: VITE_API_URL
        value: https://escuela-norma-backend.onrender.com/api

databases:
  # PostgreSQL Database
  - name: escuela-norma-db
    databaseName: escuelanorma
    user: escuelanorma
```

### 2.2 Crear `build.sh` en la carpeta `backend`

```bash
#!/usr/bin/env bash
# exit on error
set -o errexit

npm install
npm run build || true
```

### 2.3 Actualizar `package.json` del backend

Asegúrate de que tenga estos scripts:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

---

## 🎯 PASO 3: CREAR CUENTA EN RENDER

### 3.1 Registro

1. Ve a: **https://render.com**
2. Haz clic en **"Get Started"** o **"Sign Up"**
3. Selecciona **"Sign up with GitHub"**
4. Autoriza Render para acceder a tus repositorios
5. Verifica tu email

### 3.2 Plan

- El **plan FREE** se selecciona automáticamente
- No necesitas tarjeta de crédito ✅

---

## 🎯 PASO 4: DESPLEGAR CON BLUEPRINT (AUTOMÁTICO)

Render puede leer el archivo `render.yaml` y desplegar todo automáticamente:

### 4.1 Crear Blueprint

1. En Render Dashboard, haz clic en **"New +"** → **"Blueprint"**
2. Selecciona **"Connect a repository"**
3. Busca y selecciona: **`Lisandro1313/EscuelaDeNorma`**
4. Render detectará el archivo `render.yaml`
5. Haz clic en **"Apply"**

### 4.2 Esperar el Deploy

Render va a:

- Crear la base de datos PostgreSQL
- Desplegar el backend
- Desplegar el frontend
- Todo automático 🎉

**Tiempo estimado**: 5-10 minutos

---

## 🎯 PASO 5: CONFIGURAR VARIABLES DE ENTORNO

### 5.1 Configurar MercadoPago en el Backend

1. En Render Dashboard, ve a **"escuela-norma-backend"**
2. Haz clic en **"Environment"** en el menú lateral
3. Agrega estas variables:

```bash
MERCADOPAGO_ACCESS_TOKEN=APP_USR-6695050923550599-110410-56bc2e79fc9f3b8f20aa40ddd97c65f0-2095898034
MERCADOPAGO_PUBLIC_KEY=APP_USR-0e6b9b97-3c0f-4d69-8a07-9c9ba3fc8769
```

4. Haz clic en **"Save Changes"**
5. El servicio se reiniciará automáticamente

### 5.2 Obtener URL del Backend

1. En el servicio backend, copia la URL (algo como: `https://escuela-norma-backend.onrender.com`)
2. Guárdala: **************\_\_\_\_**************

### 5.3 Actualizar URL del Backend en el Frontend

1. Ve al servicio **"escuela-norma-frontend"**
2. Ve a **"Environment"**
3. Busca `VITE_API_URL`
4. Actualízalo con la URL real del backend + `/api`:
   ```
   VITE_API_URL=https://TU-BACKEND-URL.onrender.com/api
   ```
5. Guarda y espera que se redespliegue

### 5.4 Configurar CORS en el Backend

1. Ve al servicio **backend**
2. En **"Environment"**, agrega:
   ```bash
   FRONTEND_URL=https://TU-FRONTEND-URL.onrender.com
   CORS_ORIGIN=https://TU-FRONTEND-URL.onrender.com
   ```
3. Guarda los cambios

---

## 🎯 PASO 6: VERIFICAR QUE TODO FUNCIONE

### 6.1 Verificar Backend

1. Abre tu navegador
2. Ve a: `https://TU-BACKEND-URL.onrender.com/api/health`
3. Deberías ver: `{"status":"ok"}`

### 6.2 Verificar Frontend

1. Ve a: `https://TU-FRONTEND-URL.onrender.com`
2. Deberías ver la página de inicio
3. Prueba hacer login o registrarte

### 6.3 Verificar Base de Datos

1. En Render, ve a **"escuela-norma-db"**
2. Haz clic en **"Connect"**
3. Copia la información de conexión (guárdala)

---

## 🎯 PASO 7: CREAR USUARIO ADMINISTRADOR

Necesitas crear un usuario admin inicial. Hay dos formas:

### Opción A: Desde el Frontend (Registrarse)

1. Regístrate normalmente en la plataforma
2. Luego, en la base de datos, cambia el rol a "admin"

### Opción B: Conectar a la DB y crear manualmente

1. En Render, ve a **"escuela-norma-db"**
2. Haz clic en **"Connect"** → **"PSQL Command"**
3. Cópialo y ejecútalo en tu terminal (necesitas PostgreSQL instalado)
4. Ejecuta:
   ```sql
   INSERT INTO users (name, email, password, role)
   VALUES ('Admin', 'admin@escuelanorma.com', '$2b$10$...', 'admin');
   ```

**Recomendación**: Regístrate normalmente y luego cambia el rol en la DB.

---

## 🎯 PASO 8: INICIALIZAR LA BASE DE DATOS

Si tienes un script de inicialización:

### 8.1 Opción con Script

1. En tu computadora, conecta a la DB de Render:
   ```powershell
   $env:DATABASE_URL="postgresql://..."
   node backend/scripts/init-database.js
   ```

### 8.2 Opción Manual (PSQL)

1. Usa el comando PSQL de Render
2. Ejecuta el contenido de `database/init.sql`

---

## 🔧 PASO 9: OPTIMIZAR PARA PLAN GRATUITO

### 9.1 Evitar que se Duerma (Opcional)

Puedes usar un servicio gratuito como **UptimeRobot** para "pingear" tu backend cada 10 minutos:

1. Ve a: **https://uptimerobot.com** (gratis)
2. Regístrate
3. Crea un nuevo monitor:
   - **Type**: HTTP(s)
   - **URL**: `https://tu-backend.onrender.com/api/health`
   - **Interval**: 10 minutos
4. Esto mantiene tu servidor "despierto"

⚠️ **Nota**: Esto consume más horas del plan gratuito, pero hay 750h/mes (suficiente para 1 servicio 24/7).

---

## 📊 MONITOREO Y LOGS

### Ver Logs en Tiempo Real

1. En Render, ve a tu servicio
2. Haz clic en **"Logs"** en el menú lateral
3. Los logs se actualizan automáticamente

### Ver Métricas de Uso

1. Ve a **"Metrics"**
2. Verás:
   - CPU
   - RAM
   - Ancho de banda
   - Tiempo de actividad

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Problema: Backend no inicia

**Solución**:

1. Revisa los logs en Render
2. Verifica que `package.json` tenga el script `start`
3. Verifica que todas las variables de entorno estén configuradas

### Problema: Frontend no se conecta al Backend

**Solución**:

1. Verifica que `VITE_API_URL` sea correcta (debe terminar en `/api`)
2. Verifica CORS en el backend
3. Revisa la consola del navegador (F12) para ver errores

### Problema: Error de Base de Datos

**Solución**:

1. Verifica que la DB esté running en Render
2. Verifica que `DATABASE_URL` esté configurada en el backend
3. Ejecuta el script de inicialización si no lo hiciste

### Problema: "Service Unavailable" o 503

**Solución**:

- Es normal si el servicio estaba dormido
- Espera 30-50 segundos
- Recarga la página

---

## 💰 LÍMITES DEL PLAN GRATUITO

### Plan FREE de Render incluye:

- ✅ **750 horas/mes** por servicio (suficiente para 1 servicio 24/7)
- ✅ **100GB ancho de banda/mes**
- ✅ **PostgreSQL gratis**: 1GB de almacenamiento
- ✅ **Build time**: 500 min/mes (más que suficiente)
- ⚠️ Se duerme después de 15 min de inactividad

### ¿Qué pasa si me paso?

- El servicio se detiene hasta el próximo mes
- Poco probable con tráfico bajo/moderado

---

## 🔄 ACTUALIZAR LA APLICACIÓN

### Cuando hagas cambios en el código:

1. En tu computadora:

   ```powershell
   git add .
   git commit -m "Descripción de cambios"
   git push origin main
   ```

2. Render **automáticamente**:
   - Detecta el push
   - Hace rebuild
   - Despliega la nueva versión
   - ¡No necesitas hacer nada más! 🎉

---

## 📱 DOMINIO PERSONALIZADO (OPCIONAL)

Si tienes un dominio propio (ej: `escuelanorma.com`):

### En Render:

1. Ve al servicio **frontend**
2. Ve a **"Settings"** → **"Custom Domain"**
3. Agrega: `www.escuelanorma.com`
4. Render te dará un CNAME record

### En tu Proveedor de Dominio:

1. Accede al panel DNS
2. Agrega el CNAME que Render te dio
3. Espera 10-60 min para propagación

---

## ✅ CHECKLIST DE VERIFICACIÓN FINAL

- [ ] Backend desplegado y running
- [ ] Frontend desplegado y running
- [ ] Base de datos PostgreSQL creada
- [ ] Variables de entorno configuradas
- [ ] CORS configurado correctamente
- [ ] Backend responde en `/api/health`
- [ ] Frontend carga correctamente
- [ ] Login/Registro funciona
- [ ] Usuario administrador creado
- [ ] Pagos de MercadoPago configurados
- [ ] URLs guardadas y compartidas:
  ```
  Frontend: _________________________________
  Backend: _________________________________
  ```

---

## 📞 SOPORTE

### Render

- Documentación: https://render.com/docs
- Comunidad: https://community.render.com

### Tu Proyecto

- Repositorio: https://github.com/Lisandro1313/EscuelaDeNorma

---

## 🎉 ¡LISTO!

Tu plataforma está en línea **GRATIS** y lista para mostrarle a tu cliente.

**URLs a compartir**:

- 🌐 Plataforma: `https://escuela-norma-frontend.onrender.com`
- 🔐 Usuario Admin: (el que creaste)

**Recuerda**:

- Primera carga después de inactividad: 30-50 seg (normal)
- Después funciona rápido
- Si necesitas que esté siempre activo: UptimeRobot (paso 9.1)

---

**Costos**: $0/mes ✅  
**Tiempo de setup**: 15-20 minutos  
**Dificultad**: Fácil 🟢
