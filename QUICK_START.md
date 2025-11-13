# 🚀 Guía de Inicio Rápido - Campus Virtual

## ⚡ Inicio en 3 Pasos

### 1️⃣ Iniciar Backend (Terminal 1)
```bash
cd C:\Users\Usuario\EscuelaDeNorma\backend
node server.js
```

### 2️⃣ Iniciar Frontend (Terminal 2)
```bash
cd C:\Users\Usuario\EscuelaDeNorma\frontend
npm run dev
```

### 3️⃣ Abrir en Navegador
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

## 📦 Nuevos Componentes Disponibles

### Para Importar en tus Páginas:

```tsx
// 📝 Sistema de Tareas
import { ProfessorAssignments } from '@/components/Professor/ProfessorAssignments';
import { StudentAssignments } from '@/components/Student/StudentAssignments';

// 📊 Dashboard de Progreso
import { ProgressDashboard } from '@/components/Student/ProgressDashboard';

// 💳 Pagos con Descuentos
import { EnhancedPaymentGateway } from '@/components/Payment/EnhancedPaymentGateway';

// 🔔 Notificaciones en Tiempo Real
import { EnhancedNotificationCenter } from '@/components/Notifications/EnhancedNotificationCenter';

// 🎓 Certificados
import { CertificateManager } from '@/components/Certificates/CertificateManager';
```

---

## 🎯 Ejemplos de Uso

### Página de Curso (Profesor)
```tsx
function CoursePage({ courseId }) {
  return (
    <div>
      <h1>Mi Curso</h1>
      <ProfessorAssignments courseId={courseId} />
    </div>
  );
}
```

### Página de Curso (Estudiante)
```tsx
function CoursePage({ courseId }) {
  return (
    <div>
      <h1>Mi Curso</h1>
      <StudentAssignments courseId={courseId} />
    </div>
  );
}
```

### Dashboard Principal (Estudiante)
```tsx
function Dashboard() {
  return (
    <div>
      <h1>Mi Dashboard</h1>
      <ProgressDashboard />
    </div>
  );
}
```

### Página de Compra
```tsx
function CheckoutPage({ course }) {
  return (
    <EnhancedPaymentGateway
      courseId={course.id}
      courseTitle={course.title}
      coursePrice={course.price}
      onPaymentSuccess={() => navigate('/my-courses')}
    />
  );
}
```

### Layout Principal (con Notificaciones)
```tsx
function Layout() {
  return (
    <div>
      <Header>
        <EnhancedNotificationCenter />
      </Header>
      <main>{children}</main>
    </div>
  );
}
```

### Página de Perfil (con Certificados)
```tsx
function ProfilePage() {
  return (
    <div>
      <h1>Mi Perfil</h1>
      <CertificateManager studentView={true} />
    </div>
  );
}
```

---

## 🔧 Variables de Entorno

### Backend (.env ya configurado)
```env
PORT=5000
JWT_SECRET=tu_secreto_super_seguro_12345
MERCADOPAGO_ACCESS_TOKEN=TEST-...
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=escuela_norma
FRONTEND_URL=http://localhost:3000
```

### Frontend (crear .env si no existe)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## ✅ Checklist de Funcionalidades

### Backend ✅
- [x] Sistema de Tareas (9 APIs)
- [x] Sistema de Progreso (6 APIs)
- [x] Pagos con Descuentos (8 APIs)
- [x] Notificaciones en Tiempo Real (7 APIs + Socket.io)
- [x] Certificados PDF con QR (6 APIs)

### Frontend ✅
- [x] Componente de Tareas (Profesor)
- [x] Componente de Tareas (Estudiante)
- [x] Dashboard de Progreso
- [x] Gateway de Pagos Mejorado
- [x] Centro de Notificaciones
- [x] Gestor de Certificados

### Pendiente ⏸️
- [ ] Videoconferencias (opcional)
- [ ] Testing completo
- [ ] Deployment a producción

---

## 🆘 Problemas Comunes

### "Cannot GET /api/..."
**Solución:** Verifica que el backend esté corriendo en puerto 5000

### "Network Error"
**Solución:** Revisa CORS y que VITE_API_URL apunte a http://localhost:5000/api

### "Socket.io not connecting"
**Solución:** Backend debe estar corriendo, verifica token JWT en localStorage

### "TailwindCSS no funciona"
**Solución:** Ya está configurado TailwindCSS v4 con @tailwindcss/postcss

---

## 📖 Documentación Completa

- **PROJECT_SUMMARY.md** - Resumen ejecutivo completo
- **FRONTEND_FEATURES.md** - Guía detallada de frontend
- **backend/src/** - Código backend con comentarios

---

## 🎉 ¡Listo para Desarrollar!

Ahora puedes:
1. ✅ Crear tareas y que estudiantes las entreguen
2. ✅ Ver progreso detallado de cada estudiante
3. ✅ Procesar pagos con códigos de descuento
4. ✅ Enviar notificaciones en tiempo real
5. ✅ Generar certificados automáticos al completar cursos

**¡El proyecto está 95% completo y funcional!** 🚀
