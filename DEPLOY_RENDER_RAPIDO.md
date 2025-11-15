# 🚀 DESPLIEGUE RÁPIDO - RENDER.COM (GRATIS)

## ⚡ Pasos Rápidos

### 1. Hacer commit y push

```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### 2. Crear cuenta en Render

- Ve a: https://render.com
- Sign up with GitHub
- Autoriza acceso al repositorio

### 3. Desplegar con Blueprint

1. Click en **"New +"** → **"Blueprint"**
2. Selecciona el repositorio **EscuelaDeNorma**
3. Render detectará `render.yaml`
4. Click en **"Apply"**
5. Espera 5-10 minutos ⏳

### 4. Configurar variables de entorno

En el servicio **backend**, agrega en **Environment**:

```bash
MERCADOPAGO_ACCESS_TOKEN=APP_USR-6695050923550599-110410-56bc2e79fc9f3b8f20aa40ddd97c65f0-2095898034
MERCADOPAGO_PUBLIC_KEY=APP_USR-0e6b9b97-3c0f-4d69-8a07-9c9ba3fc8769
```

### 5. Actualizar URL del frontend

En el servicio **frontend**, actualiza en **Environment**:

```bash
VITE_API_URL=https://TU-BACKEND-URL.onrender.com/api
```

### 6. Configurar CORS

En el servicio **backend**, agrega:

```bash
FRONTEND_URL=https://TU-FRONTEND-URL.onrender.com
CORS_ORIGIN=https://TU-FRONTEND-URL.onrender.com
```

## ✅ Verificar

- Backend: `https://tu-backend.onrender.com/api/health`
- Frontend: `https://tu-frontend.onrender.com`

## 📚 Manual Completo

Ver: `MANUAL_DESPLIEGUE_RENDER.md`

---

**Costo**: $0/mes 🎉  
**Nota**: Se duerme después de 15 min sin uso (primera carga: 30-50 seg)
