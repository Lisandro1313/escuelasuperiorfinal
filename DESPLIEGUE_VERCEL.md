# 🚀 DESPLIEGUE VERCEL + RENDER - Campus Norma

## 📋 RESUMEN RÁPIDO
- **Frontend**: Vercel (gratis, CDN global)
- **Backend**: Render (gratis, PostgreSQL + WebSocket)
- **Base de datos**: Supabase (ya configurada ✅)
- **Tiempo estimado**: 20-30 minutos

---

## PARTE 1: DESPLEGAR BACKEND EN RENDER 🔧

### 1.1 Crear cuenta en Render
1. Ve a https://render.com/
2. Haz clic en "Get Started" → Sign up with GitHub
3. Autoriza a Render para acceder a tu repositorio

### 1.2 Crear Web Service
1. En Dashboard → "New +" → "Web Service"
2. Conecta tu repositorio: `Lisandro1313/escuelasuperiorfinal`
3. Configuración:
   - **Name**: `campus-norma-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server-postgres.js`
   - **Plan**: `Free`

### 1.3 Variables de entorno (Environment)
Agrega estas variables en Render:

```bash
DATABASE_URL=postgresql://postgres:Cocoliso13!@db.gdanglqcwvuknzxohfhy.supabase.co:5432/postgres
DB_HOST=db.gdanglqcwvuknzxohfhy.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=Cocoliso13!
JWT_SECRET=campus_norma_secret_key_production_2025
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://campus-norma.vercel.app
MERCADOPAGO_ACCESS_TOKEN=APP_USR-6695050923550599-110410-56bc2e79fc9f3b8f20aa40ddd97c65f0-2095898034
MERCADOPAGO_PUBLIC_KEY=APP_USR-0e6b9b97-2bb9-42ab-8aab-a31bbcaaad12
```

### 1.4 Deploy
- Haz clic en "Create Web Service"
- Espera 5-10 minutos mientras se despliega
- Copia la URL: `https://campus-norma-backend.onrender.com`

---

## PARTE 2: DESPLEGAR FRONTEND EN VERCEL 🎨

### 2.1 Instalar Vercel CLI
```powershell
npm install -g vercel
```

### 2.2 Login en Vercel
```powershell
vercel login
```

### 2.3 Configurar proyecto
1. Ve al directorio raíz del proyecto:
```powershell
cd c:\Users\Usuario\OneDrive\Escritorio\campusnorma\escuelasuperiorfinal
```

2. Edita `vercel.json` y reemplaza `tu-backend.onrender.com` con tu URL real de Render

### 2.4 Desplegar
```powershell
vercel --prod
```

Responde a las preguntas:
- Set up and deploy? → `Y`
- Which scope? → Tu cuenta
- Link to existing project? → `N`
- Project name? → `campus-norma`
- In which directory is your code located? → `.` (raíz)
- Want to override settings? → `Y`
  - Build Command: `cd frontend && npm install && npm run build`
  - Output Directory: `frontend/dist`
  - Development Command: `npm run dev`

### 2.5 Configurar variables de entorno en Vercel
1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto `campus-norma`
3. Settings → Environment Variables
4. Agrega:
   - `VITE_API_URL` = `https://campus-norma-backend.onrender.com`
   - `VITE_SOCKET_URL` = `https://campus-norma-backend.onrender.com`

5. Redeploy desde el dashboard o ejecuta:
```powershell
vercel --prod
```

---

## PARTE 3: VERIFICAR DESPLIEGUE ✅

### 3.1 Probar Backend
```powershell
# Verificar salud del servidor
curl https://campus-norma-backend.onrender.com/api/health

# Probar login
curl -X POST https://campus-norma-backend.onrender.com/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"norma.admin@escuelanorma.com","password":"Norma2025!Secure"}'
```

### 3.2 Probar Frontend
1. Abre tu URL de Vercel: `https://campus-norma.vercel.app`
2. Verifica que cargue la página de login
3. Intenta iniciar sesión con:
   - Email: `norma.admin@escuelanorma.com`
   - Password: `Norma2025!Secure`

---

## PARTE 4: ACTUALIZAR CORS EN BACKEND 🔐

Después del primer despliegue, actualiza el archivo `backend/server-postgres.js`:

```javascript
// En la configuración de CORS
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://campus-norma.vercel.app', // Tu dominio de Vercel
    'https://campus-norma-*.vercel.app' // Preview deployments
  ],
  credentials: true
};
```

Luego haz commit y push para que Render redepliegue:
```powershell
git add .
git commit -m "Update CORS for Vercel deployment"
git push
```

---

## 📝 URLS FINALES

| Servicio | URL |
|----------|-----|
| **Frontend** | https://campus-norma.vercel.app |
| **Backend** | https://campus-norma-backend.onrender.com |
| **API Docs** | https://campus-norma-backend.onrender.com/api/health |
| **Supabase** | https://supabase.com/dashboard/project/gdanglqcwvuknzxohfhy |

---

## 🐛 TROUBLESHOOTING

### Frontend no conecta con Backend
- Verifica las variables de entorno en Vercel
- Asegúrate que CORS esté configurado correctamente
- Revisa los logs en Render Dashboard

### Backend tarda en responder
- Render Free Tier duerme después de 15 min de inactividad
- Primera petición puede tardar 30-60 segundos
- Considera usar un "pinger" para mantenerlo activo

### Error de base de datos
- Verifica que Supabase esté activo
- Chequea las credenciales en variables de entorno
- Revisa logs en Render Dashboard → Logs

---

## 🎯 SIGUIENTE PASO

**¿Listo para desplegar?** 

1. Primero crea el backend en Render (toma 10 min)
2. Luego despliega frontend con Vercel (toma 5 min)
3. Verifica que todo funcione

¿Comenzamos con Render o prefieres que te guíe paso a paso?
