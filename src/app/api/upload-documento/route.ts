import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Crear cliente de Supabase con service role key (bypassa RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Esta key bypassa RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const archivo = formData.get('archivo') as File;
    const predioId = formData.get('predio_id') as string;
    const tipoDocumentoId = formData.get('tipo_documento_id') as string;
    const nombrePersonalizado = formData.get('nombre_personalizado') as string;
    const fechaVencimiento = formData.get('fecha_vencimiento') as string;
    const notas = formData.get('notas') as string;
    const userId = formData.get('user_id') as string;

    if (!archivo || !predioId || !userId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Validar tamaño del archivo
    if (archivo.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo no puede ser mayor a 10MB' },
        { status: 400 }
      );
    }

    // Crear estructura de carpetas: usuario_id/categoria/archivo
    const timestamp = Date.now();
    let categoria = 'sin_categoria';
    
    if (tipoDocumentoId === 'otros') {
      categoria = 'otros';
    } else if (tipoDocumentoId !== 'otros') {
      // Obtener nombre del tipo de documento
      const { data: tipoDoc } = await supabaseAdmin
        .from('tipos_documentos')
        .select('nombre')
        .eq('id', tipoDocumentoId)
        .single();
      
      if (tipoDoc) {
        categoria = tipoDoc.nombre
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .replace(/\s+/g, '_')
          .toLowerCase();
      }
    }

    // Estructura de carpetas: usuario_id/categoria/archivo
    const filePath = `${userId}/${categoria}/${timestamp}_${archivo.name}`;

    console.log('Intentando subir archivo a:', filePath);

    // Configurar opciones de subida para forzar la creación de carpetas
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documentos')
      .upload(filePath, archivo, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error de upload:', uploadError);
      return NextResponse.json(
        { error: `Error subiendo archivo: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('documentos')
      .getPublicUrl(filePath);

    // Guardar en base de datos usando admin client (bypassa RLS)
    const documentoData = {
      predio_id: predioId,
      tipo_documento_id: tipoDocumentoId === 'otros' ? null : tipoDocumentoId,
      nombre_archivo: (tipoDocumentoId === 'otros' && nombrePersonalizado?.trim()) 
        ? nombrePersonalizado.trim()
        : archivo.name,
      archivo_url: publicUrl,
      tamaño_archivo: archivo.size,
      tipo_mime: archivo.type,
      fecha_vencimiento: fechaVencimiento || null,
      notas: notas ? `${notas} | Usuario: ${userId} | Categoría: ${categoria}` : `Usuario: ${userId} | Categoría: ${categoria}`,
      estado: 'activo',
      created_by: userId
    };

    const { error: dbError, data: insertedData } = await supabaseAdmin
      .from('documentos')
      .insert(documentoData)
      .select();

    if (dbError) {
      console.error('Error de base de datos:', dbError);
      
      // Eliminar archivo si hay error en BD
      await supabaseAdmin.storage
        .from('documentos')
        .remove([filePath]);
      
      return NextResponse.json(
        { error: `Error guardando documento: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      documento: insertedData[0],
      message: 'Documento subido exitosamente'
    });

  } catch (error) {
    console.error('Error en upload-documento:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
