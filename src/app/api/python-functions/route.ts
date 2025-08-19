import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Obteniendo funciones del usuario desde la base de datos...')

    // Obtener el user_id del header o query params
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere userId para obtener funciones del usuario',
        functions: []
      }, { status: 400 })
    }

    console.log(`👤 Buscando funciones para usuario: ${userId}`)

    // Consultar funciones del usuario en la base de datos
    const { data: userFunctions, error } = await supabase
      .from('user_functions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error consultando user_functions:', error)
      throw new Error(`Error consultando funciones: ${error.message}`)
    }

    console.log(`✅ Funciones encontradas en BD: ${userFunctions?.length || 0}`)

    if (!userFunctions || userFunctions.length === 0) {
      console.log('📋 No se encontraron funciones para este usuario')
      return NextResponse.json({
        success: true,
        functions: [],
        message: `No se encontraron funciones activas para el usuario ${userId}`
      })
    }

    // Convertir las funciones de la BD al formato esperado por el frontend
    const functions = userFunctions.map((func) => ({
      id: func.id,
      function_name: func.function_name,
      function_description: func.function_description,
      function_code: func.function_code, // Ruta al archivo Python
      is_active: func.is_active,
      created_at: func.created_at,
      updated_at: func.updated_at,
      user_id: func.user_id
    }))

    console.log('📋 Funciones procesadas:', functions)

    return NextResponse.json({
      success: true,
      functions: functions,
      message: `${functions.length} funciones cargadas para usuario ${userId}`
    })

  } catch (error) {
    console.error('Error obteniendo funciones de Python:', error)

    // Si la API Python no está disponible, mostrar mensaje específico
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        {
          success: false,
          error: 'API Python no disponible. Asegúrate de que la API Flask esté ejecutándose en http://localhost:5000',
          details: 'Ejecuta: cd python-api && python start.py',
          functions: []
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor: ' + (error instanceof Error ? error.message : 'Error desconocido'),
        functions: []
      },
      { status: 500 }
    )
  }
}