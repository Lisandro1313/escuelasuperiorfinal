# 🎓 Campus Virtual - Escuela de Norma

Plataforma de aprendizaje en línea completa con gestión de cursos, videoconferencias, pagos y más.

## 🚀 Inicio Rápido (Desarrollo)

### 1. Clonar e Instalar
```bash
git clone https://github.com/Lisandro1313/EscuelaDeNorma.git
cd EscuelaDeNorma

# Instalar backend
cd backend
npm install

# Instalar frontend
cd ../frontend
npm install
```

### 2. Configurar Variables de Entorno
```bash
# Crear archivo .env en la raíz del backend
cp backend/.env.example backend/.env
# Editar backend/.env con tus credenciales
```

### 3. Iniciar Servidores

**Opción A - Terminales Separadas:**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Opción B - Usando PM2:**
```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

### 4. Acceder
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/api/health

## 📁 Estructura del Proyecto

```
CampusNorma/
├── backend/
│   ├── server.js              # Servidor principal
│   ├── src/
│   │   ├── models/            # Modelos de datos
│   │   ├── routes/            # Rutas API
│   │   └── services/          # Servicios externos
│   └── scripts/               # Scripts de utilidad
├── frontend/
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   ├── pages/             # Páginas
│   │   ├── services/          # Servicios API
│   │   └── context/           # Context API
│   └── public/
├── database/
│   ├── database.js            # Configuración BD
│   └── campus_norma.db        # Base de datos SQLite
└── uploads/                   # Archivos subidos

## ⚙️ Funcionalidades Principales

### Backend (72 Endpoints)
✅ Autenticación JWT
✅ Gestión de Cursos y Contenido
✅ Sistema de Tareas y Calificaciones
✅ Pagos con MercadoPago + Descuentos
✅ Notificaciones en Tiempo Real
✅ Certificados Digitales (PDF + QR)
✅ Videoconferencias (Jitsi)
✅ Chat en Vivo (Socket.IO)
✅ Foros de Discusión
✅ Gamificación (Badges + Leaderboard)
✅ Dashboard de Progreso
✅ Panel de Administración

### Frontend (React + TypeScript)
✅ Sistema de Autenticación
✅ Catálogo de Cursos
✅ Reproductor de Video
✅ Editor de Contenido (Profesor)
✅ Dashboard de Estudiante
✅ Dashboard de Profesor
✅ Sistema de Tareas
✅ Gestión de Pagos
✅ Certificados
✅ Notificaciones
✅ Chat en Tiempo Real
✅ Foros
✅ Gamificación

## 🔑 Usuarios de Prueba

### Administrador
- Email: `admin@campusnorma.com`
- Password: `Admin123!`

### Profesor
- Email: `luis.morales@campusnorma.com`
- Password: `password123`

### Alumno
- Email: `alumno@test.com`
- Password: `password123`

## 🛠️ Tecnologías

### Backend
- Node.js + Express 5.1
- SQLite (Base de datos)
- Socket.IO (WebSockets)
- JWT (Autenticación)
- MercadoPago SDK
- Bcrypt (Encriptación)
- Multer (Upload de archivos)
- PDFKit (Generación de PDFs)
- Helmet (Seguridad)

### Frontend
- React 19.2
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Socket.IO Client
- Axios

## 📝 Scripts Disponibles

### Backend
```bash
npm start          # Iniciar servidor
npm run dev        # Modo desarrollo con nodemon
npm test          # Tests (si hay configurados)
```

### Frontend
```bash
npm run dev       # Servidor de desarrollo
npm run build     # Build para producción
npm run preview   # Preview del build
```

## 🔧 Configuración de MercadoPago

1. Crear cuenta en [MercadoPago](https://www.mercadopago.com)
2. Obtener credenciales de prueba/producción
3. Agregar a `.env`:
```env
MERCADOPAGO_ACCESS_TOKEN=tu_access_token
MERCADOPAGO_PUBLIC_KEY=tu_public_key
```

## 📚 Documentación Adicional

- [Guía de Producción](./PRODUCTION_READY.md)
- [Deployment](./DEPLOY_PRODUCTION.md)
- [Testing](./TESTING_GUIDE.md)
- [Configuración Otra PC](./SETUP_OTRA_PC.md)

## 🐛 Troubleshooting

### El backend no inicia
```bash
# Verificar puerto 5000 libre
netstat -ano | findstr :5000
# Matar proceso si existe
taskkill /PID <PID> /F
```

### El frontend no conecta con el backend
- Verificar que backend esté corriendo en puerto 5000
- Revisar configuración CORS en `backend/server.js`
- Verificar URL del API en `frontend/src/services/api.ts`

### Problemas con la base de datos
```bash
# Reinicializar base de datos
cd backend
node scripts/init-database.js
```

## 📊 Estado del Proyecto

- **Backend**: 100% Completo (1303 líneas)
- **Frontend**: 95% Completo
- **Funcionalidades**: 12/12 Implementadas
- **APIs**: 72 Endpoints Funcionales
- **Base de Datos**: 25+ Tablas

## 🤝 Contribuir

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add: AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto es privado y pertenece a la Escuela de Norma.

## 👥 Contacto

- Repositorio: [https://github.com/Lisandro1313/EscuelaDeNorma](https://github.com/Lisandro1313/EscuelaDeNorma)
