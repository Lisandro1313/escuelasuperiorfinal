# 🚀 Guía de Despliegue a Producción

## Pre-requisitos
- ✅ Node.js 18+ instalado
- ✅ NPM 9+ instalado
- ✅ Cuenta de MercadoPago con credenciales de producción
- ✅ Dominio configurado (ej: escueladenorma.com)
- ✅ Certificado SSL configurado

## Pasos para Despliegue

### 1. Preparar Variables de Entorno

Copiar `.env.production` y actualizar con valores reales:

```bash
cp .env.production .env
# Editar .env con tus credenciales reales
```

### 2. Instalar Dependencias

```bash
# Backend
cd backend
npm install --production

# Frontend
cd ../frontend
npm install
```

### 3. Build del Frontend

```bash
cd frontend
npm run build
```

### 4. Configurar Base de Datos

```bash
cd backend
node scripts/init-database.js
```

### 5. Iniciar Backend (Producción)

Opción A - PM2 (Recomendado):
```bash
npm install -g pm2
cd backend
pm2 start server.js --name campus-norma-backend
pm2 save
pm2 startup
```

Opción B - Servicio Systemd (Linux):
```bash
sudo nano /etc/systemd/system/campus-norma.service
```

Contenido del servicio:
```ini
[Unit]
Description=Campus Norma Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/campusnorma/backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Activar:
```bash
sudo systemctl enable campus-norma
sudo systemctl start campus-norma
sudo systemctl status campus-norma
```

### 6. Configurar Nginx (Reverse Proxy)

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name escueladenorma.com www.escueladenorma.com;
    
    # Redirigir a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name escueladenorma.com www.escueladenorma.com;

    # SSL
    ssl_certificate /etc/letsencrypt/live/escueladenorma.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/escueladenorma.com/privkey.pem;
    
    # Frontend (archivos estáticos)
    root /var/www/campusnorma/frontend/dist;
    index index.html;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Frontend SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads
    location /uploads {
        proxy_pass http://localhost:5000;
        client_max_body_size 50M;
    }
}
```

### 7. Obtener Certificado SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d escueladenorma.com -d www.escueladenorma.com
sudo certbot renew --dry-run
```

### 8. Verificación Post-Despliegue

```bash
# Health check
curl https://escueladenorma.com/api/health

# Verificar logs
pm2 logs campus-norma-backend
# o
sudo journalctl -u campus-norma -f
```

## Checklist de Producción

- [ ] Variables de entorno configuradas
- [ ] Base de datos inicializada
- [ ] MercadoPago credenciales de producción
- [ ] SSL/HTTPS configurado
- [ ] Nginx reverse proxy configurado
- [ ] Firewall configurado (puertos 80, 443)
- [ ] Backups automáticos de BD configurados
- [ ] Monitoring configurado (PM2 o similar)
- [ ] Logs configurados
- [ ] Rate limiting activo
- [ ] CORS configurado correctamente

## Monitoreo

### PM2 Monit
```bash
pm2 monit
```

### Logs en tiempo real
```bash
pm2 logs campus-norma-backend --lines 100
```

### Backup de Base de Datos
```bash
# Crear cron job para backup diario
0 2 * * * cp /var/www/campusnorma/database/campus_norma.db /var/backups/campus_norma_$(date +\%Y\%m\%d).db
```

## Actualización del Sistema

```bash
# Detener servidor
pm2 stop campus-norma-backend

# Actualizar código
cd /var/www/campusnorma
git pull origin main

# Reinstalar dependencias si es necesario
cd backend && npm install
cd ../frontend && npm install && npm run build

# Reiniciar
pm2 restart campus-norma-backend
```

## Troubleshooting

### El servidor no inicia
```bash
pm2 logs campus-norma-backend --err
```

### Problemas de conexión
```bash
sudo netstat -tulpn | grep :5000
sudo ufw status
```

### Problemas de permisos
```bash
sudo chown -R www-data:www-data /var/www/campusnorma
sudo chmod -R 755 /var/www/campusnorma
```
