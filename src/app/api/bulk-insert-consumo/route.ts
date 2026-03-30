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
    const { insert_statements } = body;

    if (!insert_statements) {
      return NextResponse.json(
        { error: 'Se requieren insert_statements' },
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
      console.log(`🔄 Procesando ${insert_statements.length} INSERT statements para consumos...`);

      const parsedRecords = [];

      for (const statement of insert_statements) {
        try {
          // Regex para Consumo
          // INSERT INTO consumos (fecha_consumo, producto_codigo, volumen_m3, descripcion, user_id) 
          // VALUES ('{fecha_iso}', '{producto_codigo}', {volumen}, '{guardar_desc}', '{user_id}');
          const regex = /VALUES\s*\(\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'\s*,\s*([^,]+)\s*,\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'\s*\)/i;
          const match = statement.match(regex);
          
          if (match) {
            parsedRecords.push({
              fecha_consumo: match[1],
              producto_codigo: match[2].replace(/''/g, "'"),
              volumen_m3: parseFloat(match[3]),
              descripcion: match[4].replace(/''/g, "'"),
              user_id: validUserId
            });
          }
        } catch (parseError) {
          console.error('❌ Error parseando statement de consumo:', parseError);
        }
      }

      if (parsedRecords.length > 0) {
        try {
          const { data, error: insertError } = await supabase
            .from('consumos')
            .insert(parsedRecords)
            .select();

          if (insertError) throw insertError;

          insertedCount = data ? data.length : parsedRecords.length;
        } catch (dbError: any) {
          errors.push(`Error en inserción masiva: ${dbError.message || dbError}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se insertaron ${insertedCount} consumos exitosamente`,
      inserted_count: insertedCount,
      errors: errors
    });

  } catch (error) {
    console.error('❌ Error en bulk-insert-consumo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
