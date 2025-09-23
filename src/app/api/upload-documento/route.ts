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

    console.log('Datos recibidos:', {
      archivo: archivo?.name,
      predioId,
      tipoDocumentoId,
      nombrePersonalizado,
      userId
    });

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

    // Obtener información del predio
    const { data: predio } = await supabaseAdmin
      .from('predios')
      .select('nombre')
      .eq('id', predioId)
      .single();

    if (!predio) {
      return NextResponse.json(
        { error: 'Predio no encontrado' },
        { status: 404 }
      );
    }

    console.log('Predio encontrado:', predio.nombre);
    console.log('Caracteres del nombre original:', predio.nombre.split('').map((char: string) => `${char} (${char.charCodeAt(0)})`));

    // Limpiar nombre del predio para usar como carpeta - versión mejorada
    let nombrePredio = predio.nombre;
    
    // Primero, intentar una limpieza más permisiva
    nombrePredio = nombrePredio
      .normalize('NFD') // Normalizar caracteres acentuados
      .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos
      .replace(/[^a-zA-Z0-9\s\-_.]/g, '') // Solo mantener letras, números, espacios, guiones y puntos
      .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
      .replace(/_{2,}/g, '_') // Reemplazar múltiples guiones bajos con uno solo
      .replace(/^_+|_+$/g, '') // Remover guiones bajos al inicio y final
      .toLowerCase()
      .trim();

    console.log('Nombre después de primera limpieza:', nombrePredio);
    console.log('Longitud después de primera limpieza:', nombrePredio.length);

    // Si el resultado es muy corto, intentar una estrategia diferente
    if (!nombrePredio || nombrePredio.length < 3) {
      console.log('Nombre muy corto, intentando estrategia alternativa...');
      
      // Estrategia alternativa: mantener solo letras y números
      nombrePredio = predio.nombre
        .replace(/[^a-zA-Z0-9]/g, '') // Solo letras y números
        .toLowerCase();
      
      console.log('Nombre con estrategia alternativa:', nombrePredio);
      
      // Si aún es muy corto, usar el ID del predio
      if (!nombrePredio || nombrePredio.length < 3) {
        console.log('Usando ID del predio como fallback');
        nombrePredio = `predio_${predioId.replace(/-/g, '').substring(0, 8)}`;
      }
    }

    console.log('Nombre final del predio:', nombrePredio);

    // Crear estructura de carpetas: usuario_id/predio/categoria/archivo
    const timestamp = Date.now();
    let categoria = 'sin_categoria';
    
    if (tipoDocumentoId === 'otros') {
      categoria = 'otros';
    } else if (tipoDocumentoId && tipoDocumentoId !== 'otros') {
      // Obtener nombre del tipo de documento
      const { data: tipoDoc } = await supabaseAdmin
        .from('tipos_documentos')
        .select('nombre')
        .eq('id', tipoDocumentoId)
        .single();
      
      if (tipoDoc) {
        categoria = tipoDoc.nombre
          .normalize('NFD') // Normalizar caracteres acentuados
          .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos
          .replace(/[^a-zA-Z0-9\s\-_.]/g, '')
          .replace(/\s+/g, '_')
          .replace(/_{2,}/g, '_')
          .replace(/^_+|_+$/g, '')
          .toLowerCase();
        
        // Si la categoría queda muy corta, usar el ID
        if (!categoria || categoria.length < 2) {
          categoria = `tipo_${tipoDocumentoId.replace(/-/g, '').substring(0, 8)}`;
        }
      } else {
        categoria = `tipo_${tipoDocumentoId.replace(/-/g, '').substring(0, 8)}`;
      }
    }

    console.log('Categoría:', categoria);

    // Crear estructura de carpetas: user/predio/tipo_documento/archivo
    // Pero con nombres más seguros y compatibles con Supabase Storage
    
    // Limpiar userId - mantener solo primeros 8 caracteres alfanuméricos
    const safeUserId = userId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
    
    // Crear nombre seguro para el predio
    const safePredioId = predioId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
    const safePredioName = nombrePredio.length >= 3 ? nombrePredio : `predio${safePredioId}`;
    
    // Crear nombre seguro para la categoría
    const safeCategoria = categoria.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    
    // Limpiar nombre del archivo
    const cleanFileName = archivo.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Estructura de carpetas: user/predio/categoria/timestamp_archivo
    const filePath = `${safeUserId}/${safePredioName}/${safeCategoria}/${timestamp}_${cleanFileName}`;

    console.log('Estructura de carpetas creada:');
    console.log('- Usuario:', safeUserId);
    console.log('- Predio:', safePredioName);
    console.log('- Categoría:', safeCategoria);
    console.log('- Archivo:', `${timestamp}_${cleanFileName}`);
    console.log('- Ruta completa:', filePath);
    
    // Validar longitud total de la ruta (Supabase tiene límites)
    if (filePath.length > 255) {
      console.error('Ruta demasiado larga:', filePath.length);
      return NextResponse.json(
        { error: 'Nombre de archivo demasiado largo' },
        { status: 400 }
      );
    }

    // Verificar si el bucket existe, si no, crearlo
    try {
      const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
      
      if (bucketsError) {
        console.error('Error listando buckets:', bucketsError);
      } else {
        const bucketExists = buckets?.some(bucket => bucket.name === 'documentos');
        
        if (!bucketExists) {
          console.log('Bucket documentos no existe, creándolo...');
          const { error: createError } = await supabaseAdmin.storage.createBucket('documentos', {
            public: true,
            allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            fileSizeLimit: 10485760 // 10MB
          });
          
          if (createError) {
            console.error('Error creando bucket:', createError);
            return NextResponse.json(
              { error: `Error creando bucket de almacenamiento: ${createError.message}` },
              { status: 500 }
            );
          } else {
            console.log('Bucket documentos creado exitosamente');
          }
        } else {
          console.log('Bucket documentos ya existe');
        }
      }
    } catch (err) {
      console.error('Error verificando bucket:', err);
    }

    // Configurar opciones de subida
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

    console.log('Archivo subido exitosamente');

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
      notas: notas ? `${notas} | Usuario: ${userId} | Predio: ${predio.nombre} | Categoría: ${categoria} | Ruta: ${filePath}` : `Usuario: ${userId} | Predio: ${predio.nombre} | Categoría: ${categoria} | Ruta: ${filePath}`,
      estado: 'activo',
      created_by: userId
    };

    console.log('Guardando en base de datos:', documentoData);

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

    console.log('Documento guardado exitosamente:', insertedData[0]);

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
