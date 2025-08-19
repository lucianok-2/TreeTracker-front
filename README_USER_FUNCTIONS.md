# Sistema de Funciones Personalizadas con API Python Flask

## 🎯 Resumen

Se ha implementado un sistema completo y modular para procesar diferentes tipos de archivos Excel usando una API Python Flask separada. El sistema incluye:

- **API Python Flask independiente** con funciones modulares
- **Interfaz web Next.js** con notificaciones toast en tiempo real
- **Múltiples procesadores especializados** para diferentes tipos de datos
- **Gestión automática de historial** de procesamiento

## 🏗️ Arquitectura del Sistema

```
Frontend (Next.js)
    ↓ HTTP Request
Next.js API Route (/api/execute-function)
    ↓ HTTP Request
Python Flask API (localhost:5000)
    ↓ Dynamic Import
Función Python Específica (process_*.py)
    ↓ Database Insert
Supabase Database
```

## 🚀 Funciones Implementadas

### Función ID 1: Procesador de Reportes de Ingreso
- **Archivo**: `python-api/functions/process_ingresos.py`
- **Propósito**: Procesa reportes de ingreso de planta con múltiples hojas (meses)
- **Columnas requeridas**: NOMBRE PROVEEDOR, ROL, Descripción de material código FSC, M3 o m3st
- **Tabla destino**: `recepciones`

### Función ID 2: Procesador de Ventas
- **Archivo**: `python-api/functions/process_ventas.py`
- **Propósito**: Procesa reportes de ventas con cálculo automático de totales
- **Columnas requeridas**: FECHA, CLIENTE, PRODUCTO, CANTIDAD, PRECIO_UNITARIO
- **Tabla destino**: `ventas`

### Función ID 3: Procesador de Inventario
- **Archivo**: `python-api/functions/process_inventario.py`
- **Propósito**: Actualiza inventario con determinación automática de estado de stock
- **Columnas requeridas**: PRODUCTO_CODIGO, DESCRIPCION, STOCK_ACTUAL, STOCK_MINIMO, UBICACION
- **Tabla destino**: `inventario`

## 📋 Instalación y Configuración

### Paso 1: Configurar la API Python Flask

#### Opción A: Script Automático (Recomendado)
```bash
# En Windows
setup_python_api.bat

# En Linux/Mac
chmod +x setup_python_api.sh
./setup_python_api.sh
```

#### Opción B: Configuración Manual
```bash
cd python-api
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Editar .env con tus credenciales de Supabase
```

### Paso 2: Configurar Base de Datos
Ejecuta el script SQL en Supabase SQL Editor:
```sql
-- Ejecutar sql/init_functions.sql
```

### Paso 3: Configurar Variables de Entorno

#### Python API (.env en python-api/)
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
FLASK_ENV=development
FLASK_DEBUG=True
```

#### Next.js (.env.local en raíz)
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
PYTHON_API_URL=http://localhost:5000
```

### Paso 4: Iniciar los Servicios

#### Terminal 1: API Python Flask
```bash
cd python-api
python start.py
# O alternativamente: python app.py
```

#### Terminal 2: Frontend Next.js
```bash
npm run dev
```

## 🧪 Pruebas y Verificación

### Probar la API Python
```bash
cd python-api
python test_api.py
```

### Verificar Endpoints
- **Health Check**: http://localhost:5000/health
- **Funciones**: http://localhost:5000/functions?userId=USER_ID
- **Frontend**: http://localhost:3000

## 🎯 Uso del Sistema

1. **Abrir la aplicación web** (http://localhost:3000)
2. **Navegar al UserFunctionsManager**
3. **Seleccionar archivo Excel** (.xlsx o .xls)
4. **Elegir función** según el tipo de datos
5. **Hacer clic en "Ejecutar"**
6. **Observar notificaciones toast** con el progreso

## 🔧 Agregar Nuevas Funciones

### 1. Crear Archivo Python
```python
# python-api/functions/nueva_funcion.py
def process_file(file, supabase):
    try:
        # Tu lógica de procesamiento aquí
        return {
            "success": True,
            "records_processed": 100,
            "message": "Procesamiento completado"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
```

### 2. Registrar en la API
```python
# En python-api/app.py, agregar al diccionario function_files:
function_files = {
    '1': 'functions/process_ingresos.py',
    '2': 'functions/process_ventas.py',
    '3': 'functions/process_inventario.py',
    '4': 'functions/nueva_funcion.py',  # Nueva función
}
```

### 3. Crear Registro en Base de Datos
```sql
INSERT INTO user_functions (id, user_id, function_name, function_description, function_code, is_active)
VALUES (4, 'USER_ID', 'Nueva Función', 'Descripción de la función', 'nueva_funcion.py', true);
```

## 🎨 Notificaciones Toast

El sistema usa notificaciones elegantes:
- **ℹ️ Info**: Progreso del procesamiento
- **✅ Success**: Operaciones completadas
- **⚠️ Warning**: Advertencias y validaciones
- **❌ Error**: Errores que requieren atención

## 🔒 Seguridad y Mejores Prácticas

- **Archivos temporales** se eliminan automáticamente
- **Validación de tipos** de archivo (.xlsx, .xls)
- **Manejo robusto de errores** con logs detallados
- **Políticas RLS** en Supabase para seguridad de datos
- **CORS configurado** para comunicación segura entre servicios

## 📊 Monitoreo y Logs

### Logs de la API Python
- Procesamiento detallado en consola
- Errores con stack traces completos
- Estadísticas de registros procesados

### Historial en Base de Datos
- Tabla `document_processing_history`
- Estado de procesamiento (processing, completed, error)
- Número de registros procesados
- Mensajes de error detallados

## 🚨 Solución de Problemas

### Error: "API Python no disponible"
```bash
# Verificar que la API Flask esté ejecutándose
cd python-api
python start.py
```

### Error: "Función no encontrada"
```sql
-- Verificar funciones en base de datos
SELECT * FROM user_functions WHERE is_active = true;
```

### Error: "Columnas faltantes"
- Revisar estructura del archivo Excel
- Verificar nombres exactos de columnas
- Consultar documentación de cada función

## 🎉 Ventajas del Nuevo Sistema

### ✅ Modularidad
- Cada función en archivo separado
- Fácil agregar nuevas funciones
- Mantenimiento independiente

### ✅ Escalabilidad
- API Python independiente
- Procesamiento asíncrono
- Manejo eficiente de archivos grandes

### ✅ Flexibilidad
- Diferentes tipos de procesamiento
- Validaciones específicas por función
- Configuración independiente

### ✅ Mantenibilidad
- Código organizado y limpio
- Logs detallados para debugging
- Pruebas automatizadas

## 🌟 ¡Sistema Completamente Funcional!

El nuevo sistema modular está listo para procesar múltiples tipos de archivos Excel con una arquitectura robusta y escalable. Cada función opera de manera independiente, facilitando el mantenimiento y la adición de nuevas funcionalidades.