import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Crear cliente con service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { insert_statements, records } = body;

    if (!insert_statements && !records) {
      return NextResponse.json(
        { error: 'Se requieren insert_statements o records' },
        { status: 400 }
      );
    }

    let insertedCount = 0;
    const errors: string[] = [];

    // Obtener el usuario autenticado real desde el request
    const authHeader = request.headers.get('authorization');
    let authenticatedUserId = null;

    if (authHeader) {
      try {
        const userSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: authHeader
              }
            }
          }
        );

        const { data: { user } } = await userSupabase.auth.getUser();
        if (user) {
          authenticatedUserId = user.id;
          console.log(`✅ Usuario autenticado encontrado: ${authenticatedUserId}`);
        }
      } catch (authError) {
        console.log('⚠️ Error obteniendo usuario autenticado:', authError);
      }
    }

    const validUserId = authenticatedUserId;
    if (!validUserId) {
      return NextResponse.json(
        { error: 'Usuario no autenticado. Por favor inicia sesión.' },
        { status: 401 }
      );
    }

    if (insert_statements && Array.isArray(insert_statements)) {
      console.log(`🔄 Procesando ${insert_statements.length} INSERT statements para produccion...`);

      const parsedRecords = [];

      for (const statement of insert_statements) {
        try {
          // Regex para Produccion
          // INSERT INTO produccion (fecha_produccion, producto_origen_codigo, producto_destino_codigo, volumen_origen_m3, volumen_destino_m3, descripcion, user_id) 
          // VALUES ('{fecha_iso}', 'W1.1', '{guardar_pd}', 0, {volumen}, '{guardar_desc}', '{user_id}');
          const regex = /VALUES\s*\(\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'\s*\)/i;
          const match = statement.match(regex);
          
          if (match) {
            parsedRecords.push({
              fecha_produccion: match[1],
              producto_origen_codigo: match[2].replace(/''/g, "'"),
              producto_destino_codigo: match[3].replace(/''/g, "'"),
              volumen_origen_m3: parseFloat(match[4]),
              volumen_destino_m3: parseFloat(match[5]),
              descripcion: match[6].replace(/''/g, "'"),
              user_id: validUserId
            });
          }
        } catch (parseError) {
          console.error('❌ Error parseando statement de produccion:', parseError);
        }
      }

      if (parsedRecords.length > 0) {
        console.log(`🔄 Insertando ${parsedRecords.length} registros de produccion finales...`);
        
        try {
          const { data, error: insertError } = await supabase
            .from('produccion')
            .insert(parsedRecords)
            .select();

          if (insertError) {
            console.error('❌ Error de Supabase al insertar produccion:', insertError);
            throw insertError;
          }

          insertedCount = data ? data.length : parsedRecords.length;
          console.log(`✅ Inserción masiva de produccion exitosa: ${insertedCount} registros`);
        } catch (dbError: any) {
          console.error('❌ Error fatal en base de datos (produccion):', dbError);
          errors.push(`Error en inserción masiva: ${dbError.message || dbError}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: errors.length > 0
        ? `Se insertaron ${insertedCount} registros de producción con ${errors.length} errores`
        : `Se insertaron ${insertedCount} registros de producción exitosamente`,
      inserted_count: insertedCount,
      errors: errors
    });

  } catch (error) {
    console.error('❌ Error en bulk-insert-produccion:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
