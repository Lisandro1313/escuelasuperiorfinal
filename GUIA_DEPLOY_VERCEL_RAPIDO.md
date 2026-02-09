# 🚀 Despliegue Rápido a Vercel - Campus Norma

## ✅ PRE-REQUISITOS COMPLETADOS
- ✅ Proyecto en Vercel: https://vercel.com/lisandro1313s-projects/escuelasuperiorfinal
- ✅ Repositorio GitHub: https://github.com/Lisandro1313/escuelasuperiorfinal
- ✅ Código sincronizado
- ✅ Supabase configurado

---

## 📝 PASO 1: CONFIGURAR VARIABLES DE ENTORNO EN VERCEL

Ve a: https://vercel.com/lisandro1313s-projects/escuelasuperiorfinal/settings/environment-variables

### Variables Frontend:
```
VITE_API_URL=https://escuelasuperiorfinal.vercel.app
VITE_SOCKET_URL=https://escuelasuperiorfinal.vercel.app
```

### Variables Backend (para API routes):
```
DATABASE_URL=postgresql://postgres:Cocoliso13!@db.gdanglqcwvuknzxohfhy.supabase.co:5432/postgres
DB_HOST=db.gdanglqcwvuknzxohfhy.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=Cocoliso13!
JWT_SECRET=campus_norma_secret_key_production_2025
NODE_ENV=production
MERCADOPAGO_ACCESS_TOKEN=APP_USR-6695050923550599-110410-56bc2e79fc9f3b8f20aa40ddd97c65f0-2095898034
MERCADOPAGO_PUBLIC_KEY=APP_USR-0e6b9b97-2bb9-42ab-8aab-a31bbcaaad12
FRONTEND_URL=https://escuelasuperiorfinal.vercel.app
```

**IMPORTANTE:** Marca todas como aplicables a **Production, Preview y Development**

---

## 🔧 PASO 2: CONFIGURAR BUILD SETTINGS EN VERCEL

En: https://vercel.com/lisandro1313s-projects/escuelasuperiorfinal/settings

### General Settings:
- **Framework Preset**: Other
- **Root Directory**: `./` (raíz)
- **Build Command**: `cd frontend && npm install && npm run build`
- **Output Directory**: `frontend/dist`
- **Install Command**: `npm install`

### Node.js Version:
- **Node Version**: 18.x (recomendado)

---

## 🚀 PASO 3: DEPLOYAR DESDE CLI

```powershell
# Desde la raíz del proyecto
cd c:\Users\Usuario\OneDrive\Escritorio\campusnorma\escuelasuperiorfinal

# Login a Vercel (si no lo has hecho)
vercel login

# Linkar con el proyecto existente
vercel link

# Cuando te pregunte:
# - Set up project? → Y
# - Scope? → lisandro1313s-projects
# - Link to existing project? → Y
# - Project name? → escuelasuperiorfinal

# Deployar a producción
vercel --prod
```

---

## ✅ VERIFICACIÓN POST-DEPLOY

### 1. Probar Frontend
```
https://escuelasuperiorfinal.vercel.app
```
- Debe cargar la página de login
- Sin errores de consola

### 2. Probar Backend Health
```powershell
curl https://escuelasuperiorfinal.vercel.app/api/health
```

### 3. Probar Login
- Email: `norma.admin@escuelanorma.com`
- Password: `Norma2025!Secure`

---

## 🐛 TROUBLESHOOTING

### Error: "Cannot find module"
- Verifica que `package.json` tenga todas las dependencias
- Re-deploy: `vercel --prod --force`

### Error: "Database connection failed"
- Verifica variables de entorno en Vercel
- Chequea que Supabase esté activo

### Error: CORS
- Verifica FRONTEND_URL en variables de entorno
- Asegúrate que coincida con el dominio de Vercel

---

## 📊 MONITOREO

### Logs en Tiempo Real:
```powershell
vercel logs escuelasuperiorfinal --follow
```

### Ver Deployments:
```powershell
vercel ls
```

### Ver URLs:
```powershell
vercel inspect escuelasuperiorfinal
```

---

## 🎯 PRÓXIMOS PASOS

Después del primer deploy exitoso:

1. **Custom Domain** (opcional):
   - Settings → Domains → Add Domain
   - Ej: `campus-norma.com`

2. **MercadoPago Producción**:
   - Obtener credenciales reales
   - Actualizar variables de entorno

3. **Supabase Realtime** (para chat):
   - Migrar Socket.IO a Supabase Realtime
   - Mayor estabilidad en serverless

---

## 📝 COMANDOS ÚTILES

```powershell
# Ver proyecto actual
vercel

# Deployar preview (no producción)
vercel

# Deployar a producción
vercel --prod

# Ver logs
vercel logs

# Remover deployment
vercel remove [deployment-url]

# Ver variables de entorno
vercel env ls
```

---

## ✅ CHECKLIST FINAL

- [ ] Variables de entorno configuradas en Vercel
- [ ] Build settings correctos
- [ ] Proyecto linkeado con CLI
- [ ] Deploy ejecutado: `vercel --prod`
- [ ] Frontend carga correctamente
- [ ] API health check responde
- [ ] Login funcional
- [ ] Database conectada (Supabase)

---

**¿Listo para deployar?** Ejecuta los comandos del PASO 3 👆
