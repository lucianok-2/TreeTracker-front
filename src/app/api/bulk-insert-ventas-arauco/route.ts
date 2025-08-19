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
      console.log(`🔄 Procesando ${insert_statements.length} INSERT statements para ARAUCO...`);
      
      const parsedRecords = [];
      
      for (const statement of insert_statements) {
        try {
          // Extraer valores del INSERT statement usando regex - PARA 8 CAMPOS (incluyendo precio_unitario)
          const match = statement.match(/VALUES \('([^']+)', '([^']+)', '([^']+)', '([^']+)', ([^,]+), '([^']+)', (NULL|[^,]+), '([^']+)'\)/);
          if (match) {
            parsedRecords.push({
              fecha_venta: match[1],
              producto_codigo: match[2],
              cliente: match[3].replace(/''/g, "'"), // Desescapar comillas
              num_factura: match[4],
              volumen_m3: parseFloat(match[5]),
              certificacion: match[6].replace(/''/g, "'"), // Desescapar comillas
              precio_unitario: match[7] === 'NULL' ? null : parseFloat(match[7]),
              user_id: validUserId // Usar siempre el usuario autenticado
            });
            console.log(`✅ Statement ARAUCO parseado correctamente: ${match[4]} - ${match[3]}`);
          } else {
            console.log(`❌ NO SE PUDO PARSEAR STATEMENT ARAUCO: ${statement}`);
            errors.push(`No se pudo parsear statement: ${statement}`);
          }
        } catch (parseError) {
          errors.push(`Error parseando statement: ${parseError}`);
        }
      }

      if (parsedRecords.length > 0) {
        console.log(`🔄 Insertando ${parsedRecords.length} registros ARAUCO...`);
        console.log('📋 Primer registro de ejemplo:', parsedRecords[0]);

        // DEBUGGING: Mostrar el SQL completo que se va a ejecutar
        console.log('🔍 DEBUGGING - SQL COMPLETO ARAUCO:');
        console.log('='.repeat(80));
        
        // Generar el SQL INSERT completo para debugging
        const recordsWithAuthUser = parsedRecords.map(record => ({
          fecha_venta: record.fecha_venta,
          producto_codigo: record.producto_codigo,
          cliente: record.cliente,
          num_factura: record.num_factura,
          volumen_m3: record.volumen_m3,
          certificacion: record.certificacion,
          precio_unitario: record.precio_unitario,
          user_id: validUserId // SIEMPRE usar el usuario autenticado, NUNCA NULL
        }));

        // VERIFICACIÓN CRÍTICA: Asegurar que TODOS los registros tienen user_id válido
        const recordsWithoutUserId = recordsWithAuthUser.filter(r => !r.user_id || r.user_id === null || r.user_id === undefined);
        if (recordsWithoutUserId.length > 0) {
          console.error('❌ REGISTROS SIN USER_ID DETECTADOS:', recordsWithoutUserId.length);
          console.error('❌ Registros problemáticos:', recordsWithoutUserId);
          return NextResponse.json(
            { 
              error: 'Error crítico: Algunos registros no tienen user_id asignado', 
              details: `${recordsWithoutUserId.length} registros sin user_id`,
              problematic_records: recordsWithoutUserId.length
            },
            { status: 400 }
          );
        }
        
        console.log(`✅ VERIFICACIÓN COMPLETA: TODOS LOS ${recordsWithAuthUser.length} REGISTROS ARAUCO TIENEN USER_ID VÁLIDO: ${validUserId}`);

        // Mostrar el SQL INSERT que se generaría
        const sqlInsertExample = `
INSERT INTO ventas (fecha_venta, producto_codigo, cliente, num_factura, volumen_m3, certificacion, precio_unitario, user_id)
VALUES 
${recordsWithAuthUser.slice(0, 3).map(record => 
  `  ('${record.fecha_venta}', '${record.producto_codigo}', '${record.cliente.replace(/'/g, "''")}', '${record.num_factura}', ${record.volumen_m3}, '${record.certificacion.replace(/'/g, "''")}', ${record.precio_unitario || 'NULL'}, '${record.user_id}')`
).join(',\n')}
${recordsWithAuthUser.length > 3 ? `... y ${recordsWithAuthUser.length - 3} registros más` : ''};
        `;
        
        console.log('📝 SQL INSERT ARAUCO que se ejecutará:');
        console.log(sqlInsertExample);
        console.log('='.repeat(80));

        try {
          console.log('🚀 EJECUTANDO INSERCIÓN MASIVA ARAUCO...');
          const { data, error } = await supabase
            .from('ventas')
            .insert(recordsWithAuthUser)
            .select();

          console.log('📊 RESULTADO DE INSERCIÓN MASIVA ARAUCO:');
          console.log('- Error:', error);
          console.log('- Data length:', data?.length || 0);
          console.log('- Error code:', error?.code);
          console.log('- Error details:', error?.details);
          console.log('- Error hint:', error?.hint);
          console.log('- Error message completo:', error?.message);

          if (!error && data) {
            insertedCount = data.length;
            console.log(`✅ Inserción masiva ARAUCO exitosa: ${insertedCount} registros`);
          } else {
            throw new Error(`Inserción masiva ARAUCO falló: ${error?.message} (Code: ${error?.code})`);
          }
        } catch (massInsertError) {
          console.log('⚠️ Inserción masiva ARAUCO falló, intentando inserción individual...');
          
          // Fallback: Inserción individual
          let successCount = 0;
          
          for (const record of recordsWithAuthUser) {
            try {
              console.log(`📝 Insertando registro ARAUCO: ${record.num_factura}`);
              
              const { data: singleData, error: singleError } = await supabase
                .from('ventas')
                .insert([record])
                .select();

              if (!singleError && singleData) {
                successCount++;
                console.log(`✅ Registro ARAUCO ${record.num_factura} insertado exitosamente`);
              } else {
                console.error(`❌ Error insertando registro ARAUCO ${record.num_factura}:`, singleError);
                errors.push(`Error insertando registro ${record.num_factura}: ${singleError?.message || 'Error desconocido'}`);
              }
            } catch (singleInsertError) {
              console.error(`❌ Excepción insertando registro ARAUCO ${record.num_factura}:`, singleInsertError);
              errors.push(`Excepción insertando registro ${record.num_factura}: ${singleInsertError}`);
            }
          }
          
          insertedCount = successCount;
          console.log(`✅ Inserción individual ARAUCO completada: ${successCount}/${parsedRecords.length} registros`);
        }
      }

    } else if (records && Array.isArray(records)) {
      console.log(`🔄 Insertando ${records.length} registros ARAUCO directamente...`);
      
      const recordsToInsert = records.map(record => ({
        fecha_venta: record.fecha_venta,
        producto_codigo: record.producto_codigo,
        cliente: record.cliente,
        num_factura: record.num_factura,
        volumen_m3: record.volumen_m3,
        certificacion: record.certificacion,
        precio_unitario: record.precio_unitario,
        user_id: validUserId // Usar el user_id válido
      }));

      console.log('🔧 INSERTANDO DIRECTAMENTE ARAUCO CON SUPABASE CLIENT');
      console.log('📋 Primer registro ARAUCO a insertar:', recordsToInsert[0]);

      const { data, error } = await supabase
        .from('ventas')
        .insert(recordsToInsert)
        .select();

      console.log('📊 RESULTADO INSERCIÓN DIRECTA ARAUCO:');
      console.log('- Error:', error);
      console.log('- Data length:', data?.length || 0);
      console.log('- Error completo:', JSON.stringify(error, null, 2));

      if (error) {
        console.error('❌ Error insertando registros ARAUCO:', error);
        return NextResponse.json(
          { error: 'Error insertando registros ARAUCO', details: error.message },
          { status: 500 }
        );
      }

      insertedCount = data?.length || 0;
    }

    console.log(`✅ Inserción ARAUCO completada: ${insertedCount} registros insertados`);

    return NextResponse.json({
      success: true,
      message: errors.length > 0 
        ? `Se insertaron ${insertedCount} registros ARAUCO con ${errors.length} errores`
        : `Se insertaron ${insertedCount} registros ARAUCO exitosamente`,
      inserted_count: insertedCount,
      errors: errors
    });

  } catch (error) {
    console.error('❌ Error en bulk-insert-ventas-arauco:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}