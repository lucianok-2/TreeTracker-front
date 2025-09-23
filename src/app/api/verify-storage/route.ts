import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Crear cliente de Supabase con service role key (bypassa RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET() {
  try {
    console.log('=== VERIFICACIÓN CON ADMIN CLIENT ===');
    
    // Listar buckets con admin client
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    console.log('Buckets con admin:', buckets);
    console.log('Error con admin:', bucketsError);
    
    // Si no hay buckets o no existe documentos, intentar crear
    if (!buckets || buckets.length === 0 || !buckets.find(b => b.name === 'documentos')) {
      console.log('Bucket documentos no encontrado, intentando crear...');
      
      const { error: createError } = await supabaseAdmin.storage.createBucket('documentos', {
        public: true,
        allowedMimeTypes: [
          'application/pdf', 
          'image/jpeg', 
          'image/png', 
          'image/jpg', 
          'application/msword', 
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (createError) {
        console.error('Error creando bucket:', createError);
        return NextResponse.json({
          success: false,
          error: `Error creando bucket: ${createError.message}`,
          buckets: buckets || [],
          bucketCreated: false
        });
      } else {
        console.log('Bucket documentos creado exitosamente');
        
        // Refrescar lista de buckets
        const { data: newBuckets } = await supabaseAdmin.storage.listBuckets();
        
        return NextResponse.json({
          success: true,
          buckets: newBuckets || [],
          bucketCreated: true,
          message: 'Bucket documentos creado exitosamente'
        });
      }
    }
    
    if (bucketsError) {
      return NextResponse.json({
        success: false,
        error: 'Error accediendo a storage',
        buckets: []
      });
    }
    
    // Verificar bucket documentos específicamente
    const documentosBucket = buckets?.find(b => b.name === 'documentos');
    let archivos: object[] = [];
    let archivosError = null;
    
    if (documentosBucket) {
      // Listar archivos en el bucket documentos
      const { data: files, error: filesError } = await supabaseAdmin.storage
        .from('documentos')
        .list('', {
          limit: 20,
          offset: 0
        });
      
      archivos = files || [];
      archivosError = filesError;
      
      console.log('Archivos en documentos:', files);
      console.log('Error archivos:', filesError);
    }
    
    return NextResponse.json({
      success: true,
      buckets: buckets || [],
      documentosBucket: documentosBucket || null,
      archivos: archivos,
      archivosError: archivosError,
      totalBuckets: buckets?.length || 0,
      totalArchivos: archivos.length
    });
    
  } catch (error) {
    console.error('Error en verificación admin:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      buckets: []
    }, { status: 500 });
  }
}
