import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    const { data: tipos, error } = await supabase
      .from('tipos_documentos')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (error) {
      console.error('Error al obtener tipos de documentos:', error);
      return NextResponse.json({ error: 'Error al obtener tipos de documentos' }, { status: 500 });
    }

    return NextResponse.json({ tipos });

  } catch (error) {
    console.error('Error en GET /api/tipos-documentos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const { data: existingTypes } = await supabase
      .from('tipos_documentos')
      .select('nombre')
      .limit(1);

    // Si ya hay tipos de documentos, no insertar de nuevo
    if (existingTypes && existingTypes.length > 0) {
      return NextResponse.json({ message: 'Tipos de documentos ya existen' });
    }

    // Insertar tipos de documentos por defecto
    const tiposDocumentos = [
      {
        nombre: 'Registro de Capacitaciones',
        descripcion: 'Registro de todas las capacitaciones realizadas al personal',
        obligatorio: true
      },
      {
        nombre: 'Normativas de Seguridad',
        descripcion: 'Documentación de normativas y protocolos de seguridad',
        obligatorio: true
      },
      {
        nombre: 'Plan de Manejo Forestal',
        descripcion: 'Plan de manejo y explotación forestal del predio',
        obligatorio: true
      },
      {
        nombre: 'Contratos de Trabajo',
        descripcion: 'Contratos vigentes del personal que trabaja en el predio',
        obligatorio: true
      },
      {
        nombre: 'Permisos Ambientales',
        descripcion: 'Permisos y autorizaciones ambientales requeridas',
        obligatorio: true
      },
      {
        nombre: 'Títulos de Propiedad',
        descripcion: 'Documentación que acredita la propiedad del predio',
        obligatorio: true
      },
      {
        nombre: 'Certificados de Contribuciones',
        descripcion: 'Certificados de contribuciones y avalúo fiscal',
        obligatorio: true
      },
      {
        nombre: 'Registro de Entrega de EPP',
        descripcion: 'Registro de entrega de elementos de protección personal',
        obligatorio: true
      },
      {
        nombre: 'Documentos de Derecho a Saber',
        descripcion: 'Documentación relacionada con el derecho a saber de los trabajadores',
        obligatorio: true
      },
      {
        nombre: 'Otros Documentos',
        descripcion: 'Documentos adicionales específicos del predio',
        obligatorio: false
      }
    ];

    const { error } = await supabase
      .from('tipos_documentos')
      .insert(tiposDocumentos);

    if (error) {
      console.error('Error al insertar tipos de documentos:', error);
      return NextResponse.json({ error: 'Error al insertar tipos de documentos' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Tipos de documentos creados exitosamente' });

  } catch (error) {
    console.error('Error en POST /api/tipos-documentos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
