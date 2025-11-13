# 🧪 Guía de Testing e Integración

## ✅ Estado de Servidores

### Backend (Puerto 5000)
```bash
cd C:\Users\Usuario\EscuelaDeNorma\backend
node server.js
```
**Status:** ✅ RUNNING
- 10 tablas creadas
- 36 endpoints disponibles
- Socket.io activo

### Frontend (Puerto 3000)
```bash
cd C:\Users\Usuario\EscuelaDeNorma\frontend
npm run dev
```
**Status:** ✅ RUNNING
- Vite compilando sin errores
- TailwindCSS v4 funcionando

---

## 🧪 Página de Testing Creada

He creado una **página de testing completa** en:
`frontend/src/pages/TestPage.tsx`

Esta página te permite probar todos los nuevos componentes sin tener que integrarlos aún:

### Componentes Disponibles en TestPage:
1. 📝 **Tareas - Vista Profesor** → `<ProfessorAssignments />`
2. 📝 **Tareas - Vista Estudiante** → `<StudentAssignments />`
3. 📊 **Dashboard de Progreso** → `<ProgressDashboard />`
4. 💳 **Pasarela de Pagos** → `<EnhancedPaymentGateway />`
5. 🔔 **Centro de Notificaciones** → `<EnhancedNotificationCenter />`
6. 🎓 **Gestor de Certificados** → `<CertificateManager />`

### Cómo Usar TestPage:

#### Opción 1: Agregar Ruta en tu App.tsx
```tsx
import { TestPage } from './pages/TestPage';

// En tus rutas:
<Route path="/test" element={<TestPage />} />
```

#### Opción 2: Reemplazar temporalmente tu página principal
```tsx
// En App.tsx o main.tsx
import { TestPage } from './pages/TestPage';

function App() {
  return <TestPage />;
}
```

---

## 🔐 Configuración de Autenticación

Para que los componentes funcionen, necesitas un token JWT válido:

### 1. Obtener Token (si no tienes uno)

**Opción A - Usar el admin existente:**
```javascript
// En la consola del navegador:
fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@escuela.com',
    password: 'admin123'
  })
})
.then(r => r.json())
.then(data => {
  localStorage.setItem('token', data.token);
  localStorage.setItem('userId', data.user.id);
  console.log('✅ Token guardado:', data.token);
});
```

**Opción B - Registrar nuevo usuario:**
```javascript
fetch('http://localhost:5000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Test User',
    email: 'test@test.com',
    password: 'test123',
    role: 'student' // o 'professor'
  })
})
.then(r => r.json())
.then(data => {
  localStorage.setItem('token', data.token);
  localStorage.setItem('userId', data.user.id);
  console.log('✅ Usuario creado y token guardado');
});
```

---

## 🧪 Testing Manual - Checklist

### 1. Sistema de Tareas ✅

**Como Profesor:**
- [ ] Abrir vista "Tareas - Vista Profesor"
- [ ] Crear una nueva tarea
- [ ] Establecer fecha de vencimiento
- [ ] Adjuntar archivo (opcional)
- [ ] Verificar que aparece en la lista

**Como Estudiante:**
- [ ] Abrir vista "Tareas - Vista Estudiante"
- [ ] Ver tareas disponibles
- [ ] Entregar una tarea con texto
- [ ] Adjuntar archivo
- [ ] Verificar estado "Entregada"

**Como Profesor (calificar):**
- [ ] Ver entregas recibidas
- [ ] Calificar una entrega
- [ ] Agregar retroalimentación
- [ ] Verificar que la calificación se guarda

### 2. Dashboard de Progreso ✅

**Como Estudiante:**
- [ ] Abrir "Dashboard de Progreso"
- [ ] Verificar estadísticas generales
- [ ] Ver progreso por curso
- [ ] Ver desglose por módulos
- [ ] Verificar porcentajes de finalización
- [ ] Revisar tiempo dedicado

### 3. Pagos con Descuentos ✅

**Como Estudiante:**
- [ ] Abrir "Pasarela de Pagos"
- [ ] Ver precio original del curso
- [ ] Ingresar código de descuento (crear uno primero)
- [ ] Validar descuento en tiempo real
- [ ] Ver precio final con descuento aplicado
- [ ] Click en "Pagar con MercadoPago"
- [ ] Verificar redirección a MercadoPago

**Crear código de descuento (en consola):**
```javascript
fetch('http://localhost:5000/api/payments/discount-codes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  },
  body: JSON.stringify({
    code: 'TEST50',
    type: 'percentage',
    value: 50,
    max_uses: 100,
    expires_at: '2025-12-31'
  })
})
.then(r => r.json())
.then(data => console.log('✅ Código creado:', data));
```

### 4. Notificaciones en Tiempo Real ✅

**Como Usuario:**
- [ ] Abrir "Centro de Notificaciones"
- [ ] Verificar conexión Socket.io (debe mostrar en consola: "🔔 Conectado")
- [ ] Enviar notificación de prueba (botón en preferencias)
- [ ] Verificar que aparece instantáneamente
- [ ] Marcar notificación como leída
- [ ] Configurar preferencias
- [ ] Habilitar notificaciones del navegador

**Probar notificación de prueba:**
```javascript
fetch('http://localhost:5000/api/notifications/test', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(() => console.log('✅ Notificación de prueba enviada'));
```

### 5. Certificados ✅

**Como Estudiante:**
- [ ] Abrir "Gestor de Certificados"
- [ ] Ver certificados obtenidos (si tienes alguno)
- [ ] Click en "Descargar PDF"
- [ ] Verificar que descarga el PDF
- [ ] Abrir PDF y verificar diseño profesional
- [ ] Ver código QR en el PDF
- [ ] Click en "Verificar Certificado"
- [ ] Ingresar código del certificado
- [ ] Verificar validación correcta

---

## 🔌 Verificación de APIs

La TestPage incluye un panel de **Estado de APIs** que verifica automáticamente:

1. ✅ Assignments API
2. ✅ Progress API
3. ✅ Notifications API
4. ✅ Payments API
5. ✅ Certificates API
6. ✅ Socket.io Connection

**Estado esperado:** Todos deben mostrar "✓ Disponible"

Si alguno muestra "✗ Error":
1. Verificar que el backend esté corriendo
2. Revisar la consola del navegador
3. Confirmar que tienes token válido

---

## 🐛 Debugging

### Backend no responde:
```bash
# Verificar que está corriendo:
Get-Process | Where-Object {$_.ProcessName -eq "node"}

# Si no está, reiniciar:
cd C:\Users\Usuario\EscuelaDeNorma\backend
node server.js
```

### Frontend no conecta a API:
1. Abrir DevTools → Console
2. Buscar errores de red
3. Verificar CORS headers
4. Confirmar que `.env` tiene las URLs correctas:
   ```
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   ```

### Socket.io no conecta:
1. Verificar en consola: "🔔 Conectado al sistema de notificaciones"
2. Si no conecta, revisar token JWT
3. Backend debe mostrar: "💬 Socket.IO habilitado"

### TypeScript Errors:
```bash
# Reinstalar dependencias si es necesario:
cd frontend
npm install
npm run dev
```

---

## 📊 Testing Automático (Futuro)

Para implementar tests automatizados:

### Backend Tests (Jest)
```bash
cd backend
npm install --save-dev jest supertest
```

### Frontend Tests (Vitest + Testing Library)
```bash
cd frontend
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

---

## 🎯 Próximos Pasos Después del Testing

1. **Integrar componentes en páginas existentes**
   - Agregar `<ProfessorAssignments />` en página de curso (profesor)
   - Agregar `<StudentAssignments />` en página de curso (estudiante)
   - Agregar `<ProgressDashboard />` en dashboard principal
   - Agregar notificaciones en navbar

2. **Videoconferencias (si se requiere)**
   - Evaluar Jitsi Meet
   - Implementar componente de videollamadas
   - Sistema de agendamiento

3. **Optimizaciones**
   - Implementar React Query
   - Lazy loading
   - Toast notifications
   - Skeleton loaders

4. **Deployment**
   - Configurar variables de producción
   - Deploy a Vercel/Netlify (frontend)
   - Deploy a Railway/Heroku (backend)

---

## ✅ Checklist Final

- [x] Backend corriendo en puerto 5000
- [x] Frontend corriendo en puerto 3000
- [x] Variables de entorno configuradas
- [x] TestPage creada y funcional
- [ ] Token JWT obtenido y guardado
- [ ] Testing manual completado
- [ ] Componentes integrados en app principal
- [ ] Testing end-to-end realizado
- [ ] Listo para producción

---

## 🎉 ¡Todo Listo para Testing!

Los servidores están corriendo y todos los componentes están listos.

**Accede a:** http://localhost:3000/test

O integra los componentes directamente en tus páginas existentes.

**Documentación adicional:**
- `QUICK_START.md` - Guía rápida de inicio
- `FRONTEND_FEATURES.md` - Detalles de componentes
- `PROJECT_SUMMARY.md` - Resumen completo
