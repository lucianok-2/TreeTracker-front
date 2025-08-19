import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5000'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const functionId = formData.get('functionId') as string
    const userId = formData.get('userId') as string

    if (!file || !functionId || !userId) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    // Validar que el archivo sea Excel
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json(
        { error: 'El archivo debe ser un archivo Excel (.xlsx o .xls)' },
        { status: 400 }
      )
    }

    // Intentar crear registro en el historial de procesamiento
    let historyRecord = null
    try {
      const { data, error: historyError } = await supabase
        .from('document_processing_history')
        .insert({
          user_id: userId,
          function_id: functionId,
          file_name: file.name,
          file_size: file.size,
          processing_status: 'processing'
        })
        .select()
        .single()

      if (historyError) {
        console.warn('No se pudo crear registro de historial:', historyError.message)
        // Continuar sin historial si hay problemas de permisos
      } else {
        historyRecord = data
      }
    } catch (historyError) {
      console.warn('Error creando historial, continuando sin él:', historyError)
      // Continuar el procesamiento sin historial
    }

    // Crear FormData para enviar a la API Python (CON userId para que lo use en el procesamiento)
    const pythonFormData = new FormData()
    pythonFormData.append('file', file)
    pythonFormData.append('functionId', functionId)
    pythonFormData.append('userId', userId)  // PASAR EL USER_ID AL PYTHON

    try {
      // Llamar a la API Python Flask
      const pythonResponse = await fetch(`${PYTHON_API_URL}/execute-function`, {
        method: 'POST',
        body: pythonFormData,
      })

      if (!pythonResponse.ok) {
        const errorData = await pythonResponse.json()
        throw new Error(errorData.error || 'Error en la API Python')
      }

      const pythonResult = await pythonResponse.json()

      if (!pythonResult.success) {
        throw new Error(pythonResult.error || 'Error en el procesamiento Python')
      }

      // NO EJECUTAR INSERT STATEMENTS AUTOMÁTICAMENTE
      // Los INSERT statements se devuelven al frontend para que el usuario decida cuándo insertarlos
      console.log('📋 Devolviendo INSERT statements al frontend para inserción manual')
      
      const insertedRecords = 0
      const errors = []

      // Actualizar el historial con el resultado (si existe)
      if (historyRecord) {
        await supabase
          .from('document_processing_history')
          .update({
            processing_status: errors.length === 0 ? 'completed' : 'error',
            records_processed: insertedRecords,
            error_message: errors.length > 0 ? errors.join('; ') : null
          })
          .eq('id', historyRecord.id)
      }

      return NextResponse.json({
        success: true,
        records_processed: pythonResult.records_processed,
        sheets_processed: pythonResult.sheets_processed,
        total_sheets: pythonResult.total_sheets,
        errors: pythonResult.errors || [],
        insert_statements: pythonResult.insert_statements,
        message: `¡Procesamiento completado! ${pythonResult.records_processed} registros procesados. Presiona "Insertar en Base de Datos" para guardarlos.`
      })

    } catch (pythonError) {
      // Actualizar historial con error (si existe)
      if (historyRecord) {
        await supabase
          .from('document_processing_history')
          .update({
            processing_status: 'error',
            error_message: pythonError instanceof Error ? pythonError.message : 'Error desconocido'
          })
          .eq('id', historyRecord.id)
      }

      throw pythonError
    }

  } catch (error) {
    console.error('Error en execute-function:', error)

    // Si la API Python no está disponible, mostrar mensaje específico
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        {
          error: 'API Python no disponible. Asegúrate de que la API Flask esté ejecutándose en http://localhost:5000',
          details: 'Ejecuta: cd python-api && python start.py'
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor: ' + (error instanceof Error ? error.message : 'Error desconocido') },
      { status: 500 }
    )
  }
}

function parseInsertStatement(insertSql: string): unknown {
  /**
   * Convierte un INSERT SQL a un objeto para Supabase
   * Ejemplo: INSERT INTO recepciones (fecha_recepcion, producto_codigo, ..., user_id) VALUES ('2025-01-01', 'W1.1', ..., 'user-uuid')
   */
  try {
    // Extraer los valores del INSERT statement
    const valuesMatch = insertSql.match(/VALUES\s*\((.*)\)/i)
    if (!valuesMatch) {
      throw new Error('No se pudieron extraer los valores del INSERT')
    }

    const valuesStr = valuesMatch[1]

    // Parsear los valores (simplificado - asume el formato específico de nuestro INSERT)
    const values = valuesStr.split(',').map(v => v.trim().replace(/^'|'$/g, ''))

    return {
      fecha_recepcion: values[0],
      producto_codigo: values[1],
      proveedor: values[2],
      num_guia: values[3],
      volumen_m3: parseFloat(values[4]),
      certificacion: values[5],
      user_id: values[6]  // AGREGAR EL USER_ID
    }
  } catch (error) {
    console.error('Error parseando INSERT statement:', insertSql, error)
    throw new Error('Error parseando INSERT statement')
  }
}