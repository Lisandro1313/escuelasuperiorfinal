# 📚 Guía de Cursos Gratuitos y Panel de Administrador

## 🆓 **Sistema de Cursos Gratuitos**

### ¿Cómo Funciona?

#### **Para Profesores:**

1. **Crear Curso Gratuito**
   - Al crear un curso, establecer `price = 0`
   - El sistema automáticamente lo marca como curso gratuito
   - Puede tener contenido mixto (gratuito + lecciones premium)

```json
POST /api/courses
{
  "name": "Introducción a JavaScript",
  "description": "Curso básico gratuito",
  "price": 0,
  "category": "programming"
}
```

2. **Lecciones Pagas Opcionales**
   - Dentro de un curso gratuito, puede haber lecciones con precio
   - Permite modelo "freemium": contenido básico gratis, avanzado pago

```json
POST /api/modules/:moduleId/lessons
{
  "title": "Lección Premium: React Avanzado",
  "price": 9.99
}
```

#### **Para Estudiantes:**

1. **Verificar si un Curso es Gratuito**

```http
GET /api/courses/:courseId/pricing
```

**Respuesta:**
```json
{
  "course_id": 1,
  "course_name": "Intro a JavaScript",
  "price": 0,
  "is_free": true,
  "has_paid_content": false,
  "paid_lessons_count": 0,
  "is_enrolled": false,
  "enrollment_action": "free_enrollment"
}
```

Si `has_paid_content: true`, se muestra el mensaje:
> **"GRATIS"** con contenido o lecciones pagas

2. **Inscribirse a Curso Gratuito**

```http
POST /api/enrollments/free/:courseId
```

**Sin necesidad de pago**, el estudiante queda inscrito inmediatamente.

**Respuesta:**
```json
{
  "message": "Inscripción exitosa al curso gratuito",
  "enrollment": {
    "id": 123,
    "student_id": 5,
    "course_id": 1,
    "status": "active",
    "progress": 0
  },
  "course": {
    "id": 1,
    "name": "Intro a JavaScript",
    "is_free": true
  }
}
```

3. **Flujo en el Frontend:**

```jsx
// Componente CourseCard.tsx
const CourseCard = ({ course }) => {
  const [pricingInfo, setPricingInfo] = useState(null);

  useEffect(() => {
    // Obtener información de precio
    axios.get(`/api/courses/${course.id}/pricing`)
      .then(res => setPricingInfo(res.data));
  }, [course.id]);

  const handleEnroll = async () => {
    if (pricingInfo?.is_free) {
      // Inscripción gratuita
      await axios.post(`/api/enrollments/free/${course.id}`);
      toast.success('¡Inscrito exitosamente!');
    } else {
      // Redirigir a pago
      navigate(`/payment/${course.id}`);
    }
  };

  return (
    <div className="course-card">
      <h3>{course.name}</h3>
      
      {pricingInfo?.is_free ? (
        <div>
          <span className="badge-free">GRATIS</span>
          {pricingInfo.has_paid_content && (
            <p className="text-xs text-gray-500">
              * Incluye {pricingInfo.paid_lessons_count} lecciones premium
            </p>
          )}
        </div>
      ) : (
        <div className="price">${course.price}</div>
      )}

      <button onClick={handleEnroll}>
        {pricingInfo?.is_free ? 'Inscribirse Gratis' : 'Comprar Curso'}
      </button>
    </div>
  );
};
```

---

## 👨‍💼 **Panel de Administrador**

### **Funciones del Rol Admin:**

El administrador tiene **control total** del sistema. Aquí están todas sus funciones:

### 1. **Dashboard de Estadísticas**

```http
GET /api/admin/dashboard
```

**Respuesta:**
```json
{
  "overview": {
    "total_users": 156,
    "users_by_role": [
      { "role": "student", "count": 142 },
      { "role": "professor", "count": 13 },
      { "role": "admin", "count": 1 }
    ],
    "total_courses": 23,
    "total_enrollments": 487,
    "total_revenue": 12450.50,
    "monthly_revenue": 3200.00
  },
  "popular_courses": [
    { "id": 5, "name": "React Avanzado", "enrollments": 89 },
    { "id": 2, "name": "Python Básico", "enrollments": 67 }
  ],
  "recent_activity": [...]
}
```

**Vista:** Panel con gráficos, métricas y actividad reciente.

---

### 2. **Gestión de Usuarios**

#### Listar Usuarios
```http
GET /api/admin/users?role=student&search=juan&page=1&limit=20
```

**Funciones:**
- Ver todos los usuarios del sistema
- Filtrar por rol (student/professor/admin)
- Buscar por nombre o email
- Paginación

#### Cambiar Rol de Usuario
```http
PUT /api/admin/users/:userId/role
Body: { "role": "professor" }
```

**Casos de Uso:**
- Promover estudiante a profesor
- Degradar profesor a estudiante
- Crear nuevos administradores
- **Restricción:** No puede cambiar su propio rol

#### Eliminar Usuario
```http
DELETE /api/admin/users/:userId
```

**Restricción:** No puede eliminarse a sí mismo.

---

### 3. **Gestión de Cursos**

#### Listar Todos los Cursos
```http
GET /api/admin/courses?status=active&professor_id=5&search=react
```

**Información mostrada:**
- Datos del curso
- Nombre del profesor
- Total de inscripciones
- Ingresos generados

#### Aprobar/Rechazar Curso
```http
PUT /api/admin/courses/:courseId/status
Body: { "status": "active" }
```

**Estados:**
- `pending` - Curso en revisión
- `active` - Curso aprobado y visible
- `inactive` - Curso desactivado

**Flujo:**
1. Profesor crea curso → Estado: `pending`
2. Admin revisa y aprueba → Estado: `active`
3. Estudiantes pueden verlo e inscribirse

#### Eliminar Curso
```http
DELETE /api/admin/courses/:courseId
```

Elimina el curso y todas sus relaciones (módulos, lecciones, inscripciones).

---

### 4. **Gestión de Pagos**

#### Ver Todos los Pagos
```http
GET /api/admin/payments?status=approved&from_date=2025-01-01&to_date=2025-12-31
```

**Información:**
- ID de pago
- Usuario que pagó
- Curso comprado
- Monto
- Estado (pending/approved/rejected)
- Fecha

**Vista:** Tabla con filtros por fecha y estado.

---

### 5. **Gestión de Códigos de Descuento**

#### Ver Todos los Códigos
```http
GET /api/admin/discount-codes
```

**Información:**
- Código
- Tipo de descuento (porcentaje/fijo)
- Valor
- Veces usado
- Estado (activo/inactivo)
- Creador

#### Desactivar Código
```http
PUT /api/admin/discount-codes/:codeId/deactivate
```

Previene que el código siga siendo usado.

---

### 6. **Reportes y Analíticas**

#### Reporte de Ingresos
```http
GET /api/admin/reports/revenue?period=month
```

**Períodos:** `day`, `month`, `year`

**Respuesta:**
```json
[
  { "period": "2025-11", "total_transactions": 45, "total_amount": 3200.50 },
  { "period": "2025-10", "total_transactions": 38, "total_amount": 2850.00 },
  ...
]
```

**Vista:** Gráfico de barras o líneas con tendencia de ingresos.

#### Reporte de Actividad de Usuarios
```http
GET /api/admin/reports/user-activity
```

**Respuesta:**
```json
[
  { "date": "2025-11-13", "new_users": 8 },
  { "date": "2025-11-12", "new_users": 5 },
  ...
]
```

**Vista:** Gráfico de nuevos registros por día (últimos 30 días).

---

## 📊 **Comparación de Roles**

| Función | Estudiante | Profesor | Admin |
|---------|------------|----------|-------|
| Ver cursos | ✅ | ✅ | ✅ |
| Inscribirse gratis | ✅ | ✅ | ✅ |
| Comprar cursos | ✅ | ✅ | ✅ |
| Crear cursos | ❌ | ✅ | ✅ |
| Crear tareas | ❌ | ✅ | ✅ |
| Calificar | ❌ | ✅ | ✅ |
| Crear descuentos | ❌ | ✅ | ✅ |
| Ver dashboard admin | ❌ | ❌ | ✅ |
| Gestionar usuarios | ❌ | ❌ | ✅ |
| Cambiar roles | ❌ | ❌ | ✅ |
| Aprobar cursos | ❌ | ❌ | ✅ |
| Ver todos los pagos | ❌ | ❌ | ✅ |
| Reportes globales | ❌ | ❌ | ✅ |
| Eliminar cualquier contenido | ❌ | ❌ | ✅ |

---

## 🔐 **Seguridad**

### Middleware de Admin

```javascript
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Se requieren permisos de administrador' 
    });
  }
  next();
};
```

**Todas las rutas de admin están protegidas:**
- Requieren autenticación JWT
- Verifican rol de administrador
- Protección contra auto-modificación (no puede eliminarse a sí mismo)

---

## 🎯 **Casos de Uso Prácticos**

### Escenario 1: Curso Freemium
```
Profesor crea "Introducción a React" - $0
├── Módulo 1: Fundamentos (Gratis)
│   ├── Lección 1: JSX - $0
│   └── Lección 2: Components - $0
└── Módulo 2: Avanzado (Premium)
    ├── Lección 3: Hooks - $9.99
    └── Lección 4: Context API - $9.99

Estudiante:
1. Se inscribe GRATIS al curso
2. Accede a Módulo 1 completo
3. Para Módulo 2, debe pagar $9.99 por lección
```

### Escenario 2: Admin Modera Cursos
```
1. Profesor crea curso "Hacking Ético"
2. Sistema lo marca como "pending"
3. Admin revisa contenido
4. Admin aprueba → status: "active"
5. Curso visible para estudiantes
```

### Escenario 3: Admin Gestiona Fraude
```
1. Admin ve actividad sospechosa
2. Admin busca usuario en panel
3. Admin cambia rol a "student" (quita permisos de profesor)
4. Admin desactiva códigos de descuento del usuario
5. Admin puede eliminar cursos fraudulentos
```

---

## 📱 **Componente de Ejemplo: Admin Dashboard**

```tsx
// AdminDashboard.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardRes, usersRes] = await Promise.all([
          axios.get('/api/admin/dashboard'),
          axios.get('/api/admin/users?limit=10')
        ]);
        
        setStats(dashboardRes.data);
        setUsers(usersRes.data.users);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChangeRole = async (userId, newRole) => {
    try {
      await axios.put(`/api/admin/users/${userId}/role`, {
        role: newRole
      });
      
      // Recargar usuarios
      const res = await axios.get('/api/admin/users?limit=10');
      setUsers(res.data.users);
      
      toast.success('Rol actualizado');
    } catch (error) {
      toast.error('Error al cambiar rol');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="admin-dashboard">
      {/* Estadísticas */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="Usuarios" 
          value={stats.overview.total_users} 
          icon="👥"
        />
        <StatCard 
          title="Cursos" 
          value={stats.overview.total_courses} 
          icon="📚"
        />
        <StatCard 
          title="Inscripciones" 
          value={stats.overview.total_enrollments} 
          icon="✅"
        />
        <StatCard 
          title="Ingresos" 
          value={`$${stats.overview.total_revenue}`} 
          icon="💰"
        />
      </div>

      {/* Usuarios Recientes */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Usuarios Recientes</h2>
        <table className="w-full">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <select 
                    value={user.role}
                    onChange={(e) => handleChangeRole(user.id, e.target.value)}
                  >
                    <option value="student">Estudiante</option>
                    <option value="professor">Profesor</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <button onClick={() => handleDeleteUser(user.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Más secciones... */}
    </div>
  );
};
```

---

## ✅ **Resumen**

### **Cursos Gratuitos:**
- ✅ Precio = 0 → Inscripción automática sin pago
- ✅ Endpoint específico: `POST /api/enrollments/free/:courseId`
- ✅ Verificación de precio antes de mostrar: `GET /api/courses/:courseId/pricing`
- ✅ Soporte para contenido mixto (gratis + premium)
- ✅ Badge "GRATIS" en UI con nota de contenido pago si aplica

### **Panel de Administrador:**
- ✅ Dashboard con métricas globales
- ✅ Gestión completa de usuarios (cambiar roles, eliminar)
- ✅ Moderación de cursos (aprobar/rechazar)
- ✅ Visualización de todos los pagos
- ✅ Gestión de códigos de descuento
- ✅ Reportes de ingresos y actividad
- ✅ Control total del sistema

**🎉 Sistema completo de gestión implementado!**
