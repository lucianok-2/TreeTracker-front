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
        // Crear cliente con el token del usuario autenticado
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

    // IMPORTANTE: Usar SIEMPRE el usuario autenticado para mantener separación
    const validUserId = authenticatedUserId;

    if (!validUserId) {
      console.error('❌ No se pudo obtener usuario autenticado');
      return NextResponse.json(
        { error: 'Usuario no autenticado. Por favor inicia sesión.' },
        { status: 401 }
      );
    }

    console.log(`✅ Usando user_id del usuario autenticado: ${validUserId}`);

    if (insert_statements && Array.isArray(insert_statements)) {
      console.log(`🔄 Procesando ${insert_statements.length} INSERT statements para ventas...`);

      const parsedRecords = [];

      for (const statement of insert_statements) {
        try {
          // Regex mejorado que soporta comillas escapadas ('') y es flexible con espacios
          // Grupos: 1:fecha, 2:producto, 3:cliente, 4:factura, 5:volumen, 6:certificacion, 7:precio, 8:user_id
          const regex = /VALUES\s*\(\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'\s*,\s*([^,]+)\s*,\s*'((?:''|[^'])*)'\s*,\s*(NULL|[^,]+)\s*,\s*'([^']*)'\s*\)/i;
          const match = statement.match(regex);
          
          if (match) {
            parsedRecords.push({
              fecha_venta: match[1],
              producto_codigo: match[2].replace(/''/g, "'"),
              cliente: match[3].replace(/''/g, "'"),
              num_factura: match[4].replace(/''/g, "'"),
              volumen_m3: parseFloat(match[5]),
              certificacion: match[6].replace(/''/g, "'"),
              precio_unitario: match[7].trim().toUpperCase() === 'NULL' ? null : parseFloat(match[7]),
              user_id: validUserId
            });
          }
        } catch (parseError) {
          console.error('❌ Error parseando statement:', parseError);
        }
      }

      if (parsedRecords.length > 0) {
        console.log(`🔄 Insertando ${parsedRecords.length} registros de ventas finales...`);
        console.log('📋 Primer registro de muestra:', parsedRecords[0]);
        
        try {
          // USAR EL CLIENTE DE SUPABASE CONFIGURADO CON SERVICE ROLE
          const { data, error: insertError } = await (supabase as any)
            .from('ventas')
            .insert(parsedRecords)
            .select();

          if (insertError) {
            console.error('❌ ERROR DE SUPABASE AL INSERTAR:', insertError.message);
            console.error('❌ Detalles:', insertError);
            throw insertError;
          }

          insertedCount = data ? data.length : parsedRecords.length;
          console.log(`✅ Inserción masiva exitosa: ${insertedCount} registros guardados en DB`);
        } catch (dbError: any) {
          console.error('❌ ERROR FATAL EN BASE DE DATOS:', dbError.message || dbError);
          errors.push(`Error en inserción masiva: ${dbError.message || dbError}`);
        }
      } else {
        console.log('⚠️ No se parseó ningún registro válido de los enunciados recibidos.');
      }
    } else if (records && Array.isArray(records)) {
      console.log(`🔄 Insertando ${records.length} registros de ventas directamente...`);

      const recordsToInsert = records.map((record: any) => ({
        fecha_venta: record.fecha_venta,
        producto_codigo: record.producto_codigo,
        cliente: record.cliente,
        num_factura: record.num_factura,
        volumen_m3: record.volumen_m3,
        certificacion: record.certificacion,
        user_id: validUserId
      }));

      const { data, error } = await supabase
        .from('ventas')
        .insert(recordsToInsert)
        .select();

      if (error) {
        console.error('❌ Error insertando registros de ventas directamente:', error);
        return NextResponse.json(
          { error: 'Error insertando registros de ventas', details: error.message },
          { status: 500 }
        );
      }

      insertedCount = data?.length || 0;
    }

    console.log(`✅ Inserción de ventas completada: ${insertedCount} registros insertados`);

    return NextResponse.json({
      success: true,
      message: errors.length > 0
        ? `Se insertaron ${insertedCount} registros de ventas con ${errors.length} errores`
        : `Se insertaron ${insertedCount} registros de ventas exitosamente`,
      inserted_count: insertedCount,
      errors: errors
    });

  } catch (error) {
    console.error('❌ Error en bulk-insert-ventas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}