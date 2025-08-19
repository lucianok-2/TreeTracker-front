# 🚀 Guía de Despliegue - TreeTracker Balance App

## 📋 Resumen del Proyecto

**TreeTracker Balance App** es una aplicación web para gestión de balance forestal que consta de:
- **Frontend**: Next.js 14 con TypeScript
- **Backend API**: Python Flask para procesamiento de archivos
- **Base de datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth

---

## 🏗️ Arquitectura de Despliegue

### Opción Recomendada: VPS Hostinger

```
┌─────────────────────────────────────────┐
│           VPS Hostinger                 │
├─────────────────────────────────────────┤
│  Frontend (Next.js)                     │
│  ├─ Puerto 3000 (desarrollo)            │
│  ├─ Puerto 80/443 (producción)          │
│  └─ Nginx como proxy reverso            │
├─────────────────────────────────────────┤
│  Backend Python API                     │
│  ├─ Puerto 5000                         │
│  ├─ Flask + Gunicorn                    │
│  └─ Procesamiento de archivos Excel     │
├─────────────────────────────────────────┤
│  Base de Datos                          │
│  └─ Supabase (externa)                  │
└─────────────────────────────────────────┘
```

---

## 📁 Estructura de Carpetas para Despliegue

### En el VPS crear esta estructura:

```
/var/www/treetracker/
├── frontend/                    # Aplicación Next.js
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── .env.production
├── backend/                     # API Python
│   ├── app.py
│   ├── functions/
│   ├── requirements.txt
│   └── .env
├── nginx/                       # Configuración Nginx
│   └── treetracker.conf
├── scripts/                     # Scripts de despliegue
│   ├── deploy.sh
│   ├── start-frontend.sh
│   └── start-backend.sh
└── logs/                        # Logs de aplicación
    ├── frontend.log
    └── backend.log
```

---

## 🔧 Configuración por Componente

### 1. Frontend (Next.js)

**Archivos necesarios:**
```
frontend/
├── src/                         # Todo el código fuente
├── public/                      # Archivos estáticos
├── package.json                 # Dependencias
├── next.config.js              # Configuración Next.js
├── tailwind.config.js          # Configuración Tailwind
├── tsconfig.json               # Configuración TypeScript
└── .env.production             # Variables de entorno
```

**Variables de entorno (.env.production):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
PYTHON_API_URL=http://localhost:5000
NODE_ENV=production
```

**Comandos de despliegue:**
```bash
# Instalar dependencias
npm install

# Build para producción
npm run build

# Iniciar en producción
npm start
```

### 2. Backend Python API

**Archivos necesarios:**
```
backend/
├── app.py                      # Aplicación Flask principal
├── functions/                  # Procesadores Python
│   ├── process_inventario.py
│   ├── process_ventas.py
│   ├── process_ingresos.py
│   └── 496f6470-2f4d-40c6-9426-bb5421116a3d/
│       ├── process_recepciones.py
│       ├── process_ventas_masisa.py
│       └── process_ventas_arauco.py
├── requirements.txt            # Dependencias Python
├── .env                        # Variables de entorno
└── gunicorn.conf.py           # Configuración Gunicorn
```

**requirements.txt:**
```txt
Flask==2.3.3
Flask-CORS==4.0.0
pandas==2.1.1
openpyxl==3.1.2
python-dotenv==1.0.0
gunicorn==21.2.0
```

**Variables de entorno (.env):**
```env
FLASK_ENV=production
FLASK_DEBUG=False
```

**gunicorn.conf.py:**
```python
bind = "127.0.0.1:5000"
workers = 4
worker_class = "sync"
worker_connections = 1000
timeout = 300
keepalive = 2
max_requests = 1000
max_requests_jitter = 100
```

### 3. Nginx (Proxy Reverso)

**nginx/treetracker.conf:**
```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    # Frontend Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend Python API
    location /api/python/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Archivos estáticos
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 🚀 Scripts de Despliegue

### scripts/deploy.sh
```bash
#!/bin/bash
echo "🚀 Iniciando despliegue TreeTracker..."

# Actualizar código
cd /var/www/treetracker
git pull origin main

# Frontend
echo "📦 Construyendo frontend..."
cd frontend
npm install
npm run build

# Backend
echo "🐍 Configurando backend..."
cd ../backend
pip install -r requirements.txt

# Reiniciar servicios
echo "🔄 Reiniciando servicios..."
sudo systemctl restart treetracker-frontend
sudo systemctl restart treetracker-backend
sudo systemctl reload nginx

echo "✅ Despliegue completado!"
```

### scripts/start-frontend.sh
```bash
#!/bin/bash
cd /var/www/treetracker/frontend
npm start
```

### scripts/start-backend.sh
```bash
#!/bin/bash
cd /var/www/treetracker/backend
gunicorn -c gunicorn.conf.py app:app
```

---

## 🔐 Configuración de Servicios Systemd

### /etc/systemd/system/treetracker-frontend.service
```ini
[Unit]
Description=TreeTracker Frontend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/treetracker/frontend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### /etc/systemd/system/treetracker-backend.service
```ini
[Unit]
Description=TreeTracker Backend API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/treetracker/backend
ExecStart=/usr/local/bin/gunicorn -c gunicorn.conf.py app:app
Restart=always
RestartSec=10
Environment=FLASK_ENV=production

[Install]
WantedBy=multi-user.target
```

---

## 📋 Checklist de Despliegue

### Pre-requisitos VPS
- [ ] Ubuntu 20.04+ o CentOS 8+
- [ ] Node.js 18+ instalado
- [ ] Python 3.8+ instalado
- [ ] Nginx instalado
- [ ] Git instalado
- [ ] Dominio configurado (opcional)

### Configuración Inicial
- [ ] Crear usuario `www-data` si no existe
- [ ] Configurar firewall (puertos 80, 443, 22)
- [ ] Instalar certificado SSL (Let's Encrypt)
- [ ] Configurar backup automático

### Variables de Entorno
- [ ] Configurar `.env.production` para frontend
- [ ] Configurar `.env` para backend
- [ ] Verificar conexión a Supabase
- [ ] Probar autenticación

### Servicios
- [ ] Crear servicios systemd
- [ ] Habilitar servicios para auto-inicio
- [ ] Configurar Nginx
- [ ] Probar proxy reverso

### Testing
- [ ] Verificar frontend accesible
- [ ] Probar API Python
- [ ] Verificar procesamiento de archivos
- [ ] Probar autenticación completa
- [ ] Verificar logs de errores

---

## 🔧 Comandos de Mantenimiento

```bash
# Ver logs
sudo journalctl -u treetracker-frontend -f
sudo journalctl -u treetracker-backend -f

# Reiniciar servicios
sudo systemctl restart treetracker-frontend
sudo systemctl restart treetracker-backend
sudo systemctl reload nginx

# Verificar estado
sudo systemctl status treetracker-frontend
sudo systemctl status treetracker-backend
sudo systemctl status nginx

# Actualizar aplicación
cd /var/www/treetracker && ./scripts/deploy.sh
```

---

## 🚨 Consideraciones de Seguridad

1. **Variables de entorno**: Nunca commitear archivos `.env`
2. **Firewall**: Solo abrir puertos necesarios (80, 443, 22)
3. **SSL**: Usar HTTPS en producción
4. **Backups**: Configurar backup automático de datos
5. **Updates**: Mantener sistema y dependencias actualizadas
6. **Monitoring**: Configurar alertas de uptime

---

## 💰 Estimación de Recursos VPS

### Configuración Mínima
- **CPU**: 2 vCPU
- **RAM**: 4GB
- **Storage**: 50GB SSD
- **Bandwidth**: 1TB/mes
- **Costo estimado**: $15-25/mes

### Configuración Recomendada
- **CPU**: 4 vCPU
- **RAM**: 8GB
- **Storage**: 100GB SSD
- **Bandwidth**: 2TB/mes
- **Costo estimado**: $30-50/mes

---

## 📞 Soporte y Troubleshooting

### Logs Importantes
```bash
# Frontend logs
tail -f /var/www/treetracker/logs/frontend.log

# Backend logs
tail -f /var/www/treetracker/logs/backend.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Problemas Comunes
1. **Puerto ocupado**: Verificar procesos con `netstat -tulpn`
2. **Permisos**: Verificar ownership con `chown -R www-data:www-data`
3. **Memoria**: Monitorear con `htop` o `free -h`
4. **Disco**: Verificar espacio con `df -h`

---

## 🎯 Próximos Pasos

1. **Configurar VPS** con especificaciones recomendadas
2. **Clonar repositorio** en el servidor
3. **Seguir checklist** paso a paso
4. **Probar funcionalidad** completa
5. **Configurar monitoreo** y alertas
6. **Documentar** credenciales y configuraciones

¡Tu aplicación TreeTracker estará lista para producción! 🌲