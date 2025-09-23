import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST() {
  try {
    // Crear cliente de Supabase con service role key para operaciones administrativas
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Tipos de documentos obligatorios
    const tiposDocumentos = [
      {
        nombre: 'Registros de Capacitación',
        descripcion: 'Registro de todas las capacitaciones realizadas al personal del predio',
        obligatorio: true
      },
      {
        nombre: 'Reglamentos de Seguridad',
        descripcion: 'Reglamento Interno de Salud, Higiene y Seguridad en el Trabajo',
        obligatorio: true
      },
      {
        nombre: 'Resoluciones de Planes de Manejo',
        descripcion: 'Resoluciones y documentos relacionados con planes de manejo forestal',
        obligatorio: true
      },
      {
        nombre: 'Contratos Laborales',
        descripcion: 'Contratos de trabajo vigentes del personal que labora en el predio',
        obligatorio: true
      },
      {
        nombre: 'Permisos Ambientales',
        descripcion: 'Permisos y autorizaciones ambientales requeridas para la operación',
        obligatorio: true
      },
      {
        nombre: 'Títulos de Propiedad',
        descripcion: 'Escrituras o títulos de dominio que acreditan la propiedad del predio',
        obligatorio: true
      },
      {
        nombre: 'Consulta Antecedente Bien Raíz (SII)',
        descripcion: 'Certificado de antecedentes del bien raíz emitido por el SII',
        obligatorio: true
      },
      {
        nombre: 'Certificados Tributarios',
        descripcion: 'Certificados de cumplimiento tributario y situación fiscal',
        obligatorio: true
      },
      {
        nombre: 'Entrega de Elementos de Protección Personal (EPP)',
        descripcion: 'Registro de entrega y control de elementos de protección personal',
        obligatorio: true
      },
      {
        nombre: 'Derecho a Saber',
        descripcion: 'Documentos relacionados con el derecho a saber de los trabajadores',
        obligatorio: true
      },
      {
        nombre: 'Otros Documentos',
        descripcion: 'Documentos adicionales específicos del predio',
        obligatorio: false
      }
    ]

    // Insertar tipos de documentos
    const { data, error } = await supabase
      .from('tipos_documentos')
      .upsert(
        tiposDocumentos.map(tipo => ({
          ...tipo,
          activo: true
        })),
        { 
          onConflict: 'nombre',
          ignoreDuplicates: false 
        }
      )
      .select()

    if (error) {
      console.error('Error insertando tipos de documentos:', error)
      return NextResponse.json(
        { error: 'Error configurando tipos de documentos: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Tipos de documentos configurados exitosamente',
      data: data,
      count: data?.length || 0
    })

  } catch (error) {
    console.error('Error en setup-tipos-documentos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
