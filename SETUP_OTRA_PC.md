# 🖥️ Configuración en Otra PC

## 📥 **Clonar el Repositorio**

```bash
# Clonar el proyecto
git clone https://github.com/Lisandro1313/EscuelaDeNorma.git
cd EscuelaDeNorma
```

---

## ⚙️ **Configuración Inicial**

### 1. **Instalar Dependencias del Backend**

```bash
cd backend
npm install
```

**Paquetes principales que se instalarán:**
- express
- jsonwebtoken
- bcrypt
- socket.io
- sqlite3
- multer
- mercadopago
- pdfkit
- nodemailer

### 2. **Instalar Dependencias del Frontend**

```bash
cd ../frontend
npm install
```

**Paquetes principales:**
- react
- react-router-dom
- axios
- socket.io-client
- tailwindcss
- recharts
- lucide-react

---

## 🔐 **Variables de Entorno**

### Backend: `backend/.env`

```env
# Puerto del servidor
PORT=5000

# JWT Secret (genera uno nuevo con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=tu_secret_key_aqui_genera_uno_nuevo

# MercadoPago (obtén tus credenciales en https://www.mercadopago.com.ar/developers)
MERCADOPAGO_ACCESS_TOKEN=tu_access_token_aqui

# Email (opcional para notificaciones)
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_app_password

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# Base de datos (SQLite, se crea automáticamente)
DATABASE_PATH=../database/database.sqlite
```

### Frontend: `frontend/.env`

```env
# URL del backend
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000

# Jitsi Meet (opcional, usa servidor público por defecto)
VITE_JITSI_DOMAIN=8x8.vc
```

---

## 🚀 **Iniciar el Proyecto**

### Terminal 1: Backend

```bash
cd backend
node server.js
```

**Salida esperada:**
```
✅ Base de datos inicializada correctamente
✅ Servidor corriendo en http://localhost:5000
✅ Socket.IO conectado
```

### Terminal 2: Frontend

```bash
cd frontend
npm run dev
```

**Salida esperada:**
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

---

## 📂 **Estructura del Proyecto**

```
EscuelaDeNorma/
├── backend/
│   ├── src/
│   │   ├── models/           # 9 modelos (User, Course, Chat, etc.)
│   │   ├── routes/           # 16 archivos de rutas (75+ endpoints)
│   │   └── services/         # Servicios (certificados, etc.)
│   ├── server.js             # Servidor principal
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/       # Componentes React
│   │   ├── pages/            # Páginas principales
│   │   ├── services/         # API clients
│   │   └── App.tsx
│   └── package.json
│
├── database/
│   ├── init.sql              # Schema inicial (25+ tablas)
│   └── database.sqlite       # Se crea automáticamente
│
├── certificates/             # Certificados generados
├── uploads/                  # Archivos subidos
│
└── Documentación:
    ├── PROJECT_SUMMARY.md           # Resumen completo del proyecto
    ├── QUICK_START.md               # Guía rápida
    ├── FREE_COURSES_AND_ADMIN.md    # Sistema de cursos gratis y admin
    ├── FRONTEND_FEATURES.md         # Componentes del frontend
    ├── PRODUCTION_READY.md          # Deploy a producción
    ├── TESTING_GUIDE.md             # Guía de testing
    └── VIDEO_CONFERENCIAS_SETUP.md  # Setup de Jitsi Meet
```

---

## 🗄️ **Base de Datos**

La base de datos SQLite se crea **automáticamente** al iniciar el backend por primera vez.

**Tablas principales (25+):**
- users, courses, modules, lessons
- enrollments, payments, discount_codes
- assignments, submissions, grades
- progress, certificates, notifications
- conversations, messages, conversation_participants
- forum_threads, forum_replies, forum_votes
- user_points, badges, user_badges, achievements
- video_conferences, video_conference_participants

---

## 👥 **Usuarios de Prueba**

Puedes crear usuarios desde el frontend o insertar directamente en la DB:

### Crear Admin:

```sql
-- Conectar a la base de datos
sqlite3 database/database.sqlite

-- Insertar admin (password: admin123)
INSERT INTO users (name, email, password, role) VALUES 
('Admin', 'admin@escuela.com', '$2b$10$...hash_de_password...', 'admin');
```

**O desde el código:**

```javascript
// En backend/server.js o usar endpoint de registro y cambiar role
const bcrypt = require('bcrypt');
const hashedPassword = await bcrypt.hash('admin123', 10);
```

---

## 🔄 **Workflow de Desarrollo**

### Hacer cambios:

```bash
# 1. Crear rama para nueva feature
git checkout -b feature/nombre-feature

# 2. Hacer cambios y commit
git add .
git commit -m "feat: descripción de los cambios"

# 3. Subir cambios
git push origin feature/nombre-feature

# 4. Crear Pull Request en GitHub
# 5. Merge a main
```

### Actualizar desde main:

```bash
# Descargar últimos cambios
git pull origin main

# Reinstalar dependencias si hay cambios en package.json
cd backend && npm install
cd ../frontend && npm install
```

---

## 🧪 **Testing Rápido**

### 1. **Verificar Backend**

```bash
# Health check
curl http://localhost:5000/health

# Respuesta esperada:
# {"status":"OK","timestamp":"..."}
```

### 2. **Verificar Frontend**

Abre: `http://localhost:3000`

Deberías ver la página de inicio con navegación.

### 3. **Testing de Autenticación**

```bash
# Registro
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"test123","role":"student"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

---

## 🐛 **Troubleshooting**

### Puerto 5000 ocupado:

```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# O cambiar puerto en backend/.env
PORT=5001
```

### Base de datos no se crea:

```bash
# Verificar que existe la carpeta
mkdir database

# Inicializar manualmente
cd database
sqlite3 database.sqlite < init.sql
```

### Socket.IO no conecta:

Verifica que `VITE_SOCKET_URL` en `frontend/.env` apunte a `http://localhost:5000` (sin /api).

### MercadoPago no funciona:

Usa credenciales de **TEST** desde: https://www.mercadopago.com.ar/developers/panel/app

```env
MERCADOPAGO_ACCESS_TOKEN=TEST-1234567890-...
```

---

## 📊 **Métricas del Proyecto**

- **9 Sistemas Principales**
- **75+ Endpoints API**
- **25+ Tablas en Base de Datos**
- **~11,000 Líneas de Código**
- **16 Archivos de Rutas**
- **9 Modelos de Datos**
- **15+ Componentes Frontend**

---

## 📚 **Documentación Adicional**

Lee estos archivos para entender el proyecto completo:

1. **PROJECT_SUMMARY.md** - Resumen general del proyecto
2. **QUICK_START.md** - Inicio rápido
3. **FREE_COURSES_AND_ADMIN.md** - Sistema de cursos gratuitos y panel admin
4. **FRONTEND_FEATURES.md** - Componentes y features del frontend
5. **PRODUCTION_READY.md** - Guía de deploy a producción
6. **TESTING_GUIDE.md** - Guía completa de testing

---

## 🎯 **Siguientes Pasos**

1. ✅ Clonar repositorio
2. ✅ Instalar dependencias
3. ✅ Configurar variables de entorno
4. ✅ Iniciar backend y frontend
5. ✅ Crear usuario de prueba
6. ✅ Probar funcionalidades principales
7. 🚀 Comenzar desarrollo

---

## 🆘 **Ayuda**

Si tienes problemas:

1. Revisa `QUICK_START.md` para guía paso a paso
2. Verifica que todas las dependencias estén instaladas
3. Confirma que las variables de entorno estén configuradas
4. Revisa los logs del backend en la terminal
5. Abre DevTools del navegador para errores del frontend

**¡Listo para continuar el desarrollo!** 🎉
