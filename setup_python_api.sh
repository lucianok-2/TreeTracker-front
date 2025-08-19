#!/bin/bash

# Script de configuración rápida para la API Python Flask

echo "🚀 Configurando API Python Flask..."
echo "=================================="

# Navegar al directorio de la API Python
cd python-api

# Crear entorno virtual si no existe
if [ ! -d "venv" ]; then
    echo "📦 Creando entorno virtual..."
    python -m venv venv
fi

# Activar entorno virtual
echo "🔧 Activando entorno virtual..."
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null

# Instalar dependencias
echo "📥 Instalando dependencias..."
pip install -r requirements.txt

# Crear archivo .env si no existe
if [ ! -f ".env" ]; then
    echo "⚙️ Creando archivo .env..."
    cp .env.example .env
    echo "❗ IMPORTANTE: Edita el archivo python-api/.env con tus credenciales de Supabase"
fi

echo "=================================="
echo "✅ Configuración completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Edita python-api/.env con tus credenciales de Supabase"
echo "2. Ejecuta el script SQL: sql/init_functions.sql en Supabase"
echo "3. Inicia la API: cd python-api && python start.py"
echo "4. Prueba la API: cd python-api && python test_api.py"
echo ""
echo "🌐 La API estará disponible en: http://localhost:5000"