# Función: PROCESAR VENTA ASTILLA MASISA (ID = 3)

## Descripción
Función específica para procesar archivos XLS de ventas de astilla y aserrín a MASISA para el usuario `496f6470-2f4d-40c6-9426-bb5421116a3d`.

## Especificaciones Técnicas

### Columnas Requeridas en el Archivo XLS
1. **"Fecha contabiliz."** - Fecha en formato numérico (ej: 20250728 = 28/07/2025)
2. **"Guía Flete"** - Número de guía de despacho (se guarda en `num_factura`)
3. **"Descripción Material"** - Descripción del producto vendido
4. **"Recepción"** - Volumen en unidades originales

### Lógica de Procesamiento

#### Conversión de Fecha
- Formato de entrada: `20250728` (YYYYMMDD)
- Formato de salida: `2025-07-28` (ISO datetime)

#### Identificación de Productos
| Descripción Material | Producto | Código | Conversión |
|---------------------|----------|--------|------------|
| "MATERIAL VERDE VALOR. COMB. COGENERACION" | Aserrín | W3.2 | Sin conversión (volumen directo) |
| "ASTILLA VERDE (TS)" | Astilla | W3.1 | `(Recepción/1000) * 2.54` |

#### Datos de Salida
- **Cliente**: "MASISA" (fijo)
- **Certificación**: "Material Controlado" (por defecto)
- **Tabla destino**: `ventas`
- **Campo guía**: Se usa `num_factura` para almacenar el número de guía

### Archivos Creados

1. **Función Python**: `functions/496f6470-2f4d-40c6-9426-bb5421116a3d/process_venta_astilla_masisa.py`
2. **Script SQL**: `sql/insert_user_function_venta_masisa.sql`

### Configuración en Base de Datos

```sql
-- Ejecutar para registrar la función
\i sql/insert_user_function_venta_masisa.sql
```

### Mapeo en app.py
La función está mapeada específicamente para:
- **Usuario**: `496f6470-2f4d-40c6-9426-bb5421116a3d`
- **Function ID**: `3`
- **Archivo**: `functions/496f6470-2f4d-40c6-9426-bb5421116a3d/process_venta_astilla_masisa.py`

## Ejemplo de Uso

### Datos de Entrada (XLS)
| Fecha contabiliz. | Guía Flete | Descripción Material | Recepción |
|------------------|------------|---------------------|-----------|
| 20250728 | 12345 | ASTILLA VERDE (TS) | 1000 |
| 20250729 | 12346 | MATERIAL VERDE VALOR. COMB. COGENERACION | 500 |

### Datos de Salida (SQL)
```sql
INSERT INTO ventas (fecha_venta, producto_codigo, cliente, num_factura, volumen_m3, certificacion, user_id) 
VALUES ('2025-07-28', 'W3.1', 'MASISA', '12345', 2.54, 'Material Controlado', '496f6470-2f4d-40c6-9426-bb5421116a3d');

INSERT INTO ventas (fecha_venta, producto_codigo, cliente, num_factura, volumen_m3, certificacion, user_id) 
VALUES ('2025-07-29', 'W3.2', 'MASISA', '12346', 500, 'Material Controlado', '496f6470-2f4d-40c6-9426-bb5421116a3d');
```

## Validaciones Implementadas

1. **Fecha**: Debe ser un número válido de 8 dígitos (YYYYMMDD)
2. **Guía Flete**: No puede estar vacía
3. **Descripción Material**: Debe coincidir con algún producto conocido
4. **Volumen**: Debe ser mayor a 0
5. **Conversión Astilla**: Se aplica automáticamente para W3.1

## Manejo de Errores

- Filas con datos faltantes se omiten con log de advertencia
- Productos no reconocidos se omiten con log de advertencia
- Errores de conversión de fecha se reportan y omiten la fila
- Volúmenes <= 0 se omiten con log de advertencia
- **Soporte para archivos .XLS**: Usa engine 'xlrd' automáticamente
- **Caracteres especiales**: Maneja acentos y caracteres especiales en nombres de columnas

## Logs de Procesamiento

La función genera logs detallados que incluyen:
- Número de hojas procesadas
- Registros procesados por hoja
- Conversiones aplicadas
- Errores y advertencias
- Resumen final del procesamiento

## Configuración Final

### Para Completar la Configuración

1. **Instalar dependencias necesarias**:
   ```bash
   cd python-api
   python install_dependencies.py
   ```
   O manualmente:
   ```bash
   pip install xlrd>=2.0.1
   ```

2. **Ejecutar script SQL**:
   ```sql
   \i sql/insert_user_function_venta_masisa.sql
   ```

3. **Reiniciar la API Python** para cargar los cambios:
   ```bash
   python app.py
   ```

4. **Probar la función** subiendo un archivo XLS con las columnas especificadas

## Notas Importantes

- El campo "Guía Flete" del archivo XLS se almacena en la columna `num_factura` de la tabla `ventas`
- **Soporte completo para archivos .XLS**: La función detecta automáticamente el formato y usa el engine apropiado
- **Manejo de caracteres especiales**: Los nombres de columnas con acentos (ó, í, á) se procesan correctamente
- **Dependencia xlrd**: Necesaria para leer archivos .XLS (formato Excel antiguo)

## Solución de Problemas

### Error: "Excel file format cannot be determined"
```bash
# Instalar dependencia xlrd para archivos .XLS
pip install xlrd>=2.0.1

# O ejecutar el script de instalación automática
python python-api/install_dependencies.py
```

### Error: "Columnas no encontradas"
- Verificar que el archivo tenga las columnas: "Fecha contabiliz.", "Guía Flete", "Descripción Material", "Recepción"
- La función maneja automáticamente variaciones en caracteres especiales