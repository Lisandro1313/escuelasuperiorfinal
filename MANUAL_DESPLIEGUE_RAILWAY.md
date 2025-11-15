# 🚀 MANUAL DE DESPLIEGUE EN RAILWAY - ESCUELA DE NORMA

## 📌 RESUMEN EJECUTIVO

Este manual te guiará para subir tu plataforma educativa a internet usando Railway.app de forma **GRATUITA** (con límites) o **PAGANDO $5/mes** por servicio.

### ¿Qué vamos a desplegar?

- ✅ **Backend** (servidor Node.js)
- ✅ **Frontend** (interfaz React)
- ✅ **Base de datos** (SQLite o PostgreSQL)

### Tiempo estimado: 30-45 minutos

---

## 🎯 PASO 1: PREPARAR GITHUB

### 1.1 Verificar que todo esté actualizado

```powershell
cd c:\Users\Usuario\EscuelaDeNorma
git status
```

Si hay cambios sin guardar:

```powershell
git add .
git commit -m "Listo para deploy en Railway"
git push origin main
```

### 1.2 Verificar que el repositorio sea público

1. Ve a: https://github.com/Lisandro1313/EscuelaDeNorma
2. Si dice "Private", haz clic en **Settings** → **Danger Zone** → **Change visibility** → **Make public**

---

## 🎯 PASO 2: CREAR CUENTA EN RAILWAY

### 2.1 Registro

1. Ve a: **https://railway.app**
2. Haz clic en **"Login"** o **"Start a New Project"**
3. Selecciona **"Login with GitHub"**
4. Autoriza Railway para acceder a tus repositorios
5. Verifica tu email si te lo pide

### 2.2 Plan de Railway

- **Plan Hobby (Gratis)**: $5 de crédito mensual (suficiente para pruebas)
- **Plan Developer ($5/mes)**: $5 de crédito + $0.000231/GB-hora
- **Recomendación**: Empieza con el plan gratis para probar

---

## 🎯 PASO 3: DESPLEGAR BACKEND (SERVIDOR)

### 3.1 Crear Proyecto Nuevo

1. En Railway Dashboard, haz clic en **"New Project"**
2. Selecciona **"Deploy from GitHub repo"**
3. Busca y selecciona: **`Lisandro1313/EscuelaDeNorma`**
4. Railway detectará automáticamente que es Node.js

### 3.2 Configurar el Servicio Backend

1. Haz clic en el servicio que se creó
2. Ve a la pestaña **"Settings"**
3. Configura:
   - **Service Name**: Ponle `backend` o `escuela-norma-api`
   - **Root Directory**: Escribe `backend`
   - **Start Command**: `npm start`
4. Haz clic en **"Deploy"**

### 3.3 Configurar Variables de Entorno

1. Ve a la pestaña **"Variables"**
2. Agrega estas variables una por una:

```bash
NODE_ENV=production
PORT=5000
JWT_SECRET=EscuelaNorma2024SecretKeyMuySegura!XYZ123
MERCADOPAGO_ACCESS_TOKEN=APP_USR-6695050923550599-110410-56bc2e79fc9f3b8f20aa40ddd97c65f0-2095898034
MERCADOPAGO_PUBLIC_KEY=APP_USR-0e6b9b97-3c0f-4d69-8a07-9c9ba3fc8769
```

3. Haz clic en **"Add"** después de cada una

### 3.4 Obtener la URL del Backend

1. Ve a la pestaña **"Settings"**
2. En la sección **"Networking"**, haz clic en **"Generate Domain"**
3. Copia la URL generada (ejemplo: `https://backend-production-a1b2.up.railway.app`)
4. **⚠️ GUARDA ESTA URL**, la necesitarás para el frontend

---

## 🎯 PASO 4: AGREGAR BASE DE DATOS (OPCIONAL PERO RECOMENDADO)

### Opción A: Usar SQLite (más simple, ya configurada)

No necesitas hacer nada, SQLite ya está configurada y funciona automáticamente.

### Opción B: Usar PostgreSQL (recomendado para producción)

1. En tu proyecto Railway, haz clic en **"+ New"**
2. Selecciona **"Database"** → **"Add PostgreSQL"**
3. Railway automáticamente:
   - Crea la base de datos
   - Genera la variable `DATABASE_URL`
   - La conecta a tu backend
4. **NO NECESITAS CONFIGURAR NADA MÁS**

---

## 🎯 PASO 5: DESPLEGAR FRONTEND (INTERFAZ WEB)

### 5.1 Agregar Nuevo Servicio

1. En el mismo proyecto Railway, haz clic en **"+ New"**
2. Selecciona **"GitHub Repo"**
3. Selecciona otra vez **`Lisandro1313/EscuelaDeNorma`**

### 5.2 Configurar el Servicio Frontend

1. Haz clic en el nuevo servicio
2. Ve a **"Settings"**
3. Configura:
   - **Service Name**: Ponle `frontend` o `escuela-norma-web`
   - **Root Directory**: Escribe `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve -s dist -p $PORT`

### 5.3 Configurar Variables de Entorno del Frontend

1. Ve a la pestaña **"Variables"**
2. Agrega esta variable (usa la URL del backend del PASO 3.4):

```bash
VITE_API_URL=https://TU-BACKEND-URL.railway.app/api
```

**⚠️ IMPORTANTE**: Reemplaza `TU-BACKEND-URL` con la URL real que copiaste en el Paso 3.4

Ejemplo real:

```bash
VITE_API_URL=https://backend-production-a1b2.up.railway.app/api
```

3. Haz clic en **"Deploy"**

### 5.4 Generar Dominio del Frontend

1. Ve a **"Settings"**
2. En **"Networking"**, haz clic en **"Generate Domain"**
3. Copia la URL generada (ejemplo: `https://frontend-production-c3d4.up.railway.app`)
4. **⚠️ GUARDA ESTA URL** - Esta es la URL que compartirás con tu cliente

---

## 🎯 PASO 6: CONFIGURAR CORS (SEGURIDAD)

### 6.1 Actualizar Variables del Backend

1. Ve al servicio **backend** en Railway
2. Ve a **"Variables"**
3. Agrega estas dos variables con la URL del frontend que acabas de generar:

```bash
FRONTEND_URL=https://TU-FRONTEND-URL.railway.app
CORS_ORIGIN=https://TU-FRONTEND-URL.railway.app
```

Ejemplo real:

```bash
FRONTEND_URL=https://frontend-production-c3d4.up.railway.app
CORS_ORIGIN=https://frontend-production-c3d4.up.railway.app
```

4. El servicio se reiniciará automáticamente

---

## 🎯 PASO 7: VERIFICAR QUE TODO FUNCIONE

### 7.1 Verificar el Backend

1. Abre tu navegador
2. Ve a: `https://TU-BACKEND-URL.railway.app/api/health`
3. Deberías ver algo como: `{"status":"ok","message":"Server is running"}`

### 7.2 Verificar el Frontend

1. Ve a: `https://TU-FRONTEND-URL.railway.app`
2. Deberías ver la página de inicio de la Escuela de Norma
3. Prueba hacer login o registrarte

### 7.3 Verificar Logs (si algo falla)

1. En Railway, ve al servicio que tiene problemas
2. Haz clic en la pestaña **"Deployments"**
3. Haz clic en el último deployment
4. Revisa los **logs** para ver qué está fallando

---

## 🎯 PASO 8: CONFIGURAR DOMINIO PERSONALIZADO (OPCIONAL)

Si tu cliente tiene un dominio propio (ej: `escuelanorma.com`):

### 8.1 En Railway

1. Ve al servicio **frontend**
2. Ve a **"Settings"** → **"Networking"**
3. En **"Custom Domain"**, agrega: `www.escuelanorma.com`
4. Railway te dará registros DNS

### 8.2 En el Proveedor de Dominio (GoDaddy, Namecheap, etc.)

1. Accede al panel de tu dominio
2. Ve a **"DNS Settings"** o **"Administrar DNS"**
3. Agrega los registros que Railway te dio (generalmente CNAME)
4. Espera 10-60 minutos para que se propague

---

## 📊 MONITOREO Y MANTENIMIENTO

### Ver Uso de Recursos

1. En Railway Dashboard, haz clic en tu proyecto
2. Ve a **"Usage"** para ver:
   - CPU
   - RAM
   - Ancho de banda
   - Créditos consumidos

### Reiniciar Servicios

Si algo falla:

1. Ve al servicio en Railway
2. Haz clic en los 3 puntos (⋮)
3. Selecciona **"Restart"**

### Ver Logs en Tiempo Real

1. Ve al servicio
2. Pestaña **"Deployments"**
3. Haz clic en el deployment activo
4. Los logs se actualizan automáticamente

---

## ⚠️ SOLUCIÓN DE PROBLEMAS COMUNES

### Problema 1: Frontend no se conecta al Backend

**Solución**: Verifica que `VITE_API_URL` en el frontend termine en `/api` y sea la URL correcta del backend.

### Problema 2: Error CORS

**Solución**: Asegúrate de que `CORS_ORIGIN` en el backend sea exactamente la URL del frontend (sin `/` al final).

### Problema 3: Error 503 o servicio no disponible

**Solución**: Revisa los logs del servicio, puede ser que te hayas quedado sin créditos en Railway o falte alguna variable de entorno.

### Problema 4: Los pagos de MercadoPago no funcionan

**Solución**: Verifica que las credenciales `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_PUBLIC_KEY` sean correctas y estén en modo producción.

---

## 💰 COSTOS ESTIMADOS

### Plan Hobby (Gratis)

- $5 USD de crédito mensual
- Suficiente para 1-2 servicios pequeños
- Perfecto para demo/pruebas

### Plan Developer ($5/mes)

- $5 USD de crédito incluido
- Más $0.000231 por GB-hora de uso
- **Estimado**: $10-15/mes para esta aplicación con tráfico bajo-moderado

### Plan Team ($20/mes por miembro)

- $10 USD de crédito incluido por miembro
- Para equipos más grandes

---

## 📝 CHECKLIST FINAL

Marca cada uno cuando lo completes:

- [ ] Repositorio GitHub actualizado
- [ ] Cuenta Railway creada
- [ ] Backend desplegado
- [ ] Variables de entorno del backend configuradas
- [ ] URL del backend copiada
- [ ] Base de datos agregada (opcional)
- [ ] Frontend desplegado
- [ ] Variables de entorno del frontend configuradas
- [ ] CORS configurado en el backend
- [ ] Backend verificado (endpoint /api/health)
- [ ] Frontend verificado (página carga correctamente)
- [ ] Login/Registro funcionando
- [ ] URLs compartidas con el cliente

---

## 🎥 PRÓXIMOS PASOS PARA VIDEOS TUTORIALES

### Video 1: "Cómo Acceder a tu Plataforma" (5 min)

- Mostrar la URL
- Cómo hacer login
- Cómo registrarse

### Video 2: "Panel de Administrador - Primeros Pasos" (10 min)

- Acceder al panel de admin
- Crear primer curso
- Subir contenido

### Video 3: "Gestión de Estudiantes" (8 min)

- Ver estudiantes registrados
- Inscribir estudiantes manualmente
- Ver progreso de estudiantes

### Video 4: "Configurar Pagos con MercadoPago" (7 min)

- Cómo funcionan los pagos
- Verificar pagos recibidos
- Inscribir estudiantes después del pago

### Video 5: "Crear y Gestionar Cursos" (15 min)

- Crear curso completo
- Subir videos
- Crear evaluaciones
- Configurar certificados

---

## 📞 SOPORTE

Si tienes problemas:

1. Revisa los logs en Railway
2. Verifica las variables de entorno
3. Consulta la documentación de Railway: https://docs.railway.app

---

**✅ ¡Tu plataforma educativa está lista para producción!**

La URL del frontend es la que compartirás con tu cliente para que empiece a ver la plataforma.
