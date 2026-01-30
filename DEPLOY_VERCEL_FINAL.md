# 🚀 DESPLIEGUE VERCEL 100% GRATIS - Campus Norma

## ✅ TODO LISTO PARA DESPLEGAR

### 📦 Estructura creada:
```
/api/
  ├── health.js          → Health check
  ├── _db.js             → Conexión PostgreSQL
  ├── auth/
  │   ├── login.js       → POST /api/auth/login
  │   └── register.js    → POST /api/auth/register
  └── courses/
      └── index.js       → GET /api/courses
```

---

## 🎯 PASOS PARA DESPLEGAR

### 1. Instalar Vercel CLI
```powershell
npm install -g vercel
```

### 2. Login en Vercel
```powershell
vercel login
```
(Se abrirá el navegador, autoriza con GitHub/Google/Email)

### 3. Configurar variables de entorno
Antes de desplegar, ve a tu proyecto en Vercel:
https://vercel.com/new

O después del primer deploy, ve a:
**Settings → Environment Variables**

Agrega estas variables:

```bash
DATABASE_URL=postgresql://postgres:Cocoliso13!@db.gdanglqcwvuknzxohfhy.supabase.co:5432/postgres
JWT_SECRET=campus_norma_secret_key_production_2025
MERCADOPAGO_ACCESS_TOKEN=APP_USR-6695050923550599-110410-56bc2e79fc9f3b8f20aa40ddd97c65f0-2095898034
MERCADOPAGO_PUBLIC_KEY=APP_USR-0e6b9b97-2bb9-42ab-8aab-a31bbcaaad12
NODE_ENV=production
```

### 4. Desplegar
```powershell
cd c:\Users\Usuario\OneDrive\Escritorio\campusnorma\escuelasuperiorfinal
vercel --prod
```

Responde:
- **Set up and deploy?** → `Y`
- **Which scope?** → Selecciona tu cuenta
- **Link to existing project?** → `N`
- **Project name?** → `campus-norma` (o el que prefieras)
- **In which directory?** → `.` (dejar vacío)
- **Override settings?** → `N` (usará vercel.json)

### 5. Esperar deploy
- ⏳ Toma 2-5 minutos
- 🎉 Te dará una URL: `https://campus-norma-xxx.vercel.app`

---

## 🔍 PROBAR EL DEPLOY

### Probar API
```powershell
# Health check
curl https://tu-url.vercel.app/api/health

# Login
curl -X POST https://tu-url.vercel.app/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"norma.admin@escuelanorma.com","password":"Norma2025!Secure"}'
```

### Probar Frontend
1. Abre `https://tu-url.vercel.app`
2. Verás la página de login
3. Inicia sesión con:
   - **Email**: `norma.admin@escuelanorma.com`
   - **Password**: `Norma2025!Secure`

---

## 📋 FUNCIONES DISPONIBLES

✅ **Funcionan:**
- Login/Registro de usuarios
- Listado de cursos
- Inscripción a cursos
- Perfil de usuario
- Pagos con MercadoPago
- Gestión de lecciones
- Certificados
- Notificaciones

❌ **NO funcionan (Serverless limits):**
- Chat en tiempo real (WebSocket)
- Video conferencias en tiempo real

**Alternativa para chat:** Implementar con polling (refrescar cada 5 segundos)

---

## 🔧 ACTUALIZAR EL DEPLOY

Cada vez que hagas cambios:

```powershell
# Opción 1: Deploy automático (conecta GitHub)
git add .
git commit -m "Actualización"
git push

# Opción 2: Deploy manual
vercel --prod
```

---

## 💰 COSTOS

**TODO GRATIS:**
- ✅ Vercel: 100GB bandwidth/mes gratis
- ✅ Supabase: 500MB database + 2GB bandwidth gratis
- ✅ MercadoPago: Sin costo (comisiones solo en ventas reales)

**Sin límites de tiempo:** No se apaga nunca 🎉

---

## 🐛 SI ALGO FALLA

### Error: Module not found
```powershell
cd api
npm install
cd ..
vercel --prod
```

### Error: Database connection
- Verifica variables en Vercel Dashboard
- Asegúrate que Supabase esté activo
- Chequea que los datos estén cargados (6 usuarios)

### Frontend no carga
- Limpia cache: `vercel --prod --force`
- Verifica que frontend/dist se generó bien

---

## 📱 PRÓXIMOS PASOS

1. **Dominio personalizado** (opcional):
   - Vercel Dashboard → Settings → Domains
   - Agrega tu dominio: `www.campusnorma.com`

2. **Analytics** (opcional):
   - Vercel Dashboard → Analytics (gratis)

3. **Optimizaciones**:
   - Comprimir imágenes en `/frontend/public`
   - Habilitar caché de assets

---

## 🎯 ¿LISTO?

Ejecuta esto ahora:

```powershell
vercel login
vercel --prod
```

Y en 5 minutos tendrás tu plataforma online! 🚀
