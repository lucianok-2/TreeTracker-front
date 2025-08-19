#!/bin/bash

# 🚀 Script de Preparación para Producción - TreeTracker Balance App

echo "🌲 Preparando TreeTracker Balance App para producción..."
echo "=================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    log_error "No se encontró package.json. Ejecuta este script desde la raíz del proyecto."
    exit 1
fi

log_info "Verificando estructura del proyecto..."

# 2. Crear directorios necesarios para producción
log_info "Creando estructura de directorios para producción..."

mkdir -p production-build/{frontend,backend,nginx,scripts,logs}

# 3. Copiar archivos del frontend
log_info "Copiando archivos del frontend..."

# Archivos esenciales del frontend
cp -r src/ production-build/frontend/
cp -r public/ production-build/frontend/
cp package.json production-build/frontend/
cp package-lock.json production-build/frontend/ 2>/dev/null || true
cp next.config.js production-build/frontend/
cp tailwind.config.js production-build/frontend/
cp tsconfig.json production-build/frontend/
cp production.config.js production-build/frontend/next.config.js

log_success "Archivos del frontend copiados"

# 4. Copiar archivos del backend
log_info "Copiando archivos del backend..."

cp -r python-api/* production-build/backend/

# Crear requirements.txt si no existe
if [ ! -f "python-api/requirements.txt" ]; then
    log_warning "Creando requirements.txt..."
    cat > production-build/backend/requirements.txt << EOF
Flask==2.3.3
Flask-CORS==4.0.0
pandas==2.1.1
openpyxl==3.1.2
python-dotenv==1.0.0
gunicorn==21.2.0
EOF
fi

log_success "Archivos del backend copiados"

# 5. Crear archivos de configuración
log_info "Creando archivos de configuración..."

# Configuración de Nginx
cat > production-build/nginx/treetracker.conf << 'EOF'
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
EOF

# Configuración de Gunicorn
cat > production-build/backend/gunicorn.conf.py << 'EOF'
bind = "127.0.0.1:5000"
workers = 4
worker_class = "sync"
worker_connections = 1000
timeout = 300
keepalive = 2
max_requests = 1000
max_requests_jitter = 100
preload_app = True
EOF

log_success "Archivos de configuración creados"

# 6. Crear scripts de despliegue
log_info "Creando scripts de despliegue..."

# Script de inicio del frontend
cat > production-build/scripts/start-frontend.sh << 'EOF'
#!/bin/bash
cd /var/www/treetracker/frontend
npm start
EOF

# Script de inicio del backend
cat > production-build/scripts/start-backend.sh << 'EOF'
#!/bin/bash
cd /var/www/treetracker/backend
gunicorn -c gunicorn.conf.py app:app
EOF

# Script de despliegue principal
cat > production-build/scripts/deploy.sh << 'EOF'
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
EOF

# Hacer scripts ejecutables
chmod +x production-build/scripts/*.sh

log_success "Scripts de despliegue creados"

# 7. Crear archivos de servicio systemd
log_info "Creando archivos de servicio systemd..."

cat > production-build/scripts/treetracker-frontend.service << 'EOF'
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
EOF

cat > production-build/scripts/treetracker-backend.service << 'EOF'
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
EOF

log_success "Archivos de servicio systemd creados"

# 8. Crear archivo de variables de entorno de ejemplo
log_info "Creando archivos de variables de entorno de ejemplo..."

cat > production-build/frontend/.env.production.example << 'EOF'
# 🌲 TreeTracker - Variables de Entorno de Producción (Frontend)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
PYTHON_API_URL=http://localhost:5000
NODE_ENV=production
EOF

cat > production-build/backend/.env.example << 'EOF'
# 🌲 TreeTracker - Variables de Entorno de Producción (Backend)
FLASK_ENV=production
FLASK_DEBUG=False
EOF

log_success "Archivos de variables de entorno de ejemplo creados"

# 9. Crear README para producción
log_info "Creando README para producción..."

cat > production-build/README.md << 'EOF'
# 🚀 TreeTracker Balance App - Build de Producción

Este directorio contiene todos los archivos necesarios para desplegar TreeTracker Balance App en producción.

## 📁 Estructura

- `frontend/` - Aplicación Next.js
- `backend/` - API Python Flask
- `nginx/` - Configuración de Nginx
- `scripts/` - Scripts de despliegue y servicios systemd
- `logs/` - Directorio para logs (crear en el servidor)

## 🚀 Instrucciones de Despliegue

1. Subir todos los archivos al servidor VPS
2. Configurar variables de entorno (.env files)
3. Instalar dependencias
4. Configurar servicios systemd
5. Configurar Nginx
6. Iniciar servicios

Ver DEPLOYMENT_GUIDE.md para instrucciones detalladas.
EOF

log_success "README de producción creado"

# 10. Crear archivo de verificación
log_info "Creando checklist de verificación..."

cat > production-build/DEPLOYMENT_CHECKLIST.md << 'EOF'
# ✅ Checklist de Despliegue - TreeTracker

## Pre-requisitos del Servidor
- [ ] Ubuntu 20.04+ instalado
- [ ] Node.js 18+ instalado
- [ ] Python 3.8+ instalado
- [ ] Nginx instalado
- [ ] Git instalado

## Configuración
- [ ] Archivos subidos al servidor
- [ ] Variables de entorno configuradas
- [ ] Dependencias instaladas (npm install, pip install)
- [ ] Servicios systemd configurados
- [ ] Nginx configurado

## Testing
- [ ] Frontend accesible en puerto 3000
- [ ] Backend API responde en puerto 5000
- [ ] Nginx proxy funciona correctamente
- [ ] Autenticación con Supabase funciona
- [ ] Procesamiento de archivos funciona

## Producción
- [ ] Servicios habilitados para auto-inicio
- [ ] SSL configurado (opcional)
- [ ] Dominio configurado (opcional)
- [ ] Monitoreo configurado
- [ ] Backups configurados
EOF

log_success "Checklist de verificación creado"

# 11. Mostrar resumen
echo ""
echo "=================================================="
log_success "¡Preparación para producción completada!"
echo "=================================================="
echo ""
log_info "Archivos generados en: ./production-build/"
echo ""
log_info "Próximos pasos:"
echo "1. Revisar y personalizar archivos de configuración"
echo "2. Configurar variables de entorno (.env files)"
echo "3. Subir archivos al servidor VPS"
echo "4. Seguir DEPLOYMENT_GUIDE.md"
echo ""
log_warning "Recuerda:"
echo "- Configurar las variables de entorno antes del despliegue"
echo "- Cambiar 'tu-dominio.com' en nginx.conf"
echo "- Verificar permisos de archivos en el servidor"
echo ""
log_success "¡Tu aplicación TreeTracker está lista para producción! 🌲"