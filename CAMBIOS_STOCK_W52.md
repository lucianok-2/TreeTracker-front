# Cambios en el Cálculo de Stock para W5.2 (Madera)

## Problema Identificado
El cálculo del stock final para el producto W5.2 (Madera dimensionada pinus radiata) no estaba considerando correctamente la producción y las ventas.

## Fórmula Anterior (Incorrecta)
```
Stock Final = Stock Inicial + Recepciones - Consumo
```

## Fórmula Nueva (Correcta)
```
Stock Final W5.2 = Stock Inicial W5.2 + Producción W5.2 - Ventas W5.2
```

## Cambios Realizados

### 1. Modificación en `dashboard/page.tsx`
- **Archivo**: `src/app/dashboard/page.tsx`
- **Líneas**: 387-388
- **Cambio**: Se modificó el cálculo del stock final para diferenciar entre tipos de productos:
  - **W1.1** (Materia prima): Stock Inicial + Recepciones - Consumo
  - **W5.2** (Madera): Stock Inicial + Producción - Ventas
  - **W3.1, W3.2** (Subproductos): Stock Inicial + Producción - Ventas

### 2. Script SQL para Stock Inicial
- **Archivo**: `sql/insert_stock_inicial_w52.sql`
- **Propósito**: Insertar el stock inicial de enero para W5.2 con valor 248.3 m³

## Configuración del Stock Inicial

Para configurar el stock inicial de enero para W5.2 = 248.3 m³, tienes dos opciones:

### Opción 1: Usar la Interfaz Web
1. En el dashboard, hacer clic en "Stock Inicial"
2. Seleccionar:
   - Año: 2024 (o el año correspondiente)
   - Mes: Enero
   - Producto: W5.2 - Madera dimensionada pinus radiata
   - Volumen: 248.3
3. Guardar

### Opción 2: Ejecutar Script SQL
1. Editar el archivo `sql/insert_stock_inicial_w52.sql`
2. Reemplazar `'tu-user-id-aqui'` con tu ID de usuario real
3. Ejecutar el script en tu base de datos

## Verificación
Después de aplicar los cambios, el cálculo del stock final para W5.2 será:
- **Enero**: 248.3 + Producción Enero - Ventas Enero
- **Febrero**: Stock Final Enero + Producción Febrero - Ventas Febrero
- **Y así sucesivamente...**

## Impacto
- El stock final de W5.2 ahora reflejará correctamente el balance entre producción y ventas
- El stock inicial de cada mes será automáticamente el stock final del mes anterior
- Los cálculos serán más precisos para el seguimiento del inventario de madera