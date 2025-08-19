import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RecepcionRecord {
  fecha_recepcion: string;
  producto_codigo: string;
  proveedor: string;
  num_guia: string;
  volumen_m3: number;
  certificacion: string;
  rol?: string | null;
  predio?: string | null;
  comuna?: string | null;
  user_id: string;
}

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
      console.log(`🔄 Procesando ${insert_statements.length} INSERT statements...`);
      
      const parsedRecords = [];
      
      for (const statement of insert_statements) {
        try {
          // Extraer columnas y valores del INSERT statement de forma más flexible
          const columnsMatch = statement.match(/INSERT INTO recepciones \(([^)]+)\)/);
          const valuesMatch = statement.match(/VALUES \(([^)]+)\)/);
          
          if (columnsMatch && valuesMatch) {
            const columns = columnsMatch[1].split(',').map(col => col.trim());
            const values = valuesMatch[1].split(',').map(val => val.trim());
            
            // Crear objeto con los valores parseados
            const record: Partial<RecepcionRecord> = {
              fecha_recepcion: '',
              producto_codigo: '',
              proveedor: '',
              num_guia: '',
              volumen_m3: 0,
              certificacion: '',
              rol: null,
              comuna: null,
              user_id: validUserId
            };
            
            // Mapear columnas a valores
            for (let i = 0; i < columns.length; i++) {
              const column = columns[i];
              const value = values[i];
              
              if (column === 'fecha_recepcion') {
                record.fecha_recepcion = value.replace(/'/g, '');
              } else if (column === 'producto_codigo') {
                record.producto_codigo = value.replace(/'/g, '');
              } else if (column === 'proveedor') {
                record.proveedor = value.replace(/'/g, '').replace(/''/g, "'");
              } else if (column === 'num_guia') {
                record.num_guia = value.replace(/'/g, '');
              } else if (column === 'volumen_m3') {
                record.volumen_m3 = parseFloat(value);
              } else if (column === 'certificacion') {
                record.certificacion = value.replace(/'/g, '').replace(/''/g, "'");
              } else if (column === 'rol') {
                record.rol = value.replace(/'/g, '').replace(/''/g, "'");
              } else if (column === 'origen' || column === 'predio' || column === 'PREDIO/ORIGEN') {
                record.predio = value.replace(/'/g, '').replace(/''/g, "'");
              } else if (column === 'comuna') {
                record.comuna = value.replace(/'/g, '').replace(/''/g, "'");
              }
              // Ignorar user_id del statement, usar el autenticado
            }
            
            parsedRecords.push(record);
            console.log(`✅ Statement parseado correctamente: ${record.num_guia} - ${record.proveedor}`);
          } else {
            console.log(`❌ NO SE PUDO PARSEAR STATEMENT: ${statement}`);
            errors.push(`No se pudo parsear statement: ${statement}`);
          }
        } catch (parseError) {
          errors.push(`Error parseando statement: ${parseError}`);
        }
      }

      if (parsedRecords.length > 0) {
        console.log(`🔄 Insertando ${parsedRecords.length} registros...`);
        console.log('📋 Primer registro de ejemplo:', parsedRecords[0]);

        const recordsWithAuthUser = parsedRecords.map((record: Partial<RecepcionRecord>) => ({
          fecha_recepcion: record.fecha_recepcion || '',
          producto_codigo: record.producto_codigo || '',
          proveedor: record.proveedor || '',
          num_guia: record.num_guia || '',
          volumen_m3: record.volumen_m3 || 0,
          certificacion: record.certificacion || '',
          rol: record.rol || null,
          predio: record.predio || null,
          comuna: record.comuna || null,
          user_id: validUserId // SIEMPRE usar el usuario autenticado, NUNCA NULL
          // NO incluir 'id' - se auto-genera
          // NO incluir 'created_at' - se auto-genera
          // NO incluir 'updated_at' - se auto-genera
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
        
        // VERIFICACIÓN ADICIONAL: Validar que el user_id es un UUID válido
        const invalidUserIds = recordsWithAuthUser.filter(r => {
          const userId = r.user_id;
          return !userId || typeof userId !== 'string' || userId.length !== 36 || !userId.includes('-');
        });
        
        if (invalidUserIds.length > 0) {
          console.error('❌ USER_IDS INVÁLIDOS DETECTADOS:', invalidUserIds.length);
          return NextResponse.json(
            { 
              error: 'Error crítico: Algunos registros tienen user_id inválido', 
              details: `${invalidUserIds.length} registros con user_id inválido`
            },
            { status: 400 }
          );
        }
        
        console.log(`✅ VERIFICACIÓN COMPLETA: TODOS LOS ${recordsWithAuthUser.length} REGISTROS TIENEN USER_ID VÁLIDO: ${validUserId}`);
        console.log(`✅ FORMATO USER_ID VERIFICADO: ${validUserId} (${validUserId.length} caracteres)`);


        
        const userSupabase = supabase;

        try {
          console.log('🚀 EJECUTANDO INSERCIÓN MASIVA...');
          const { data, error } = await userSupabase
            .from('recepciones')
            .insert(recordsWithAuthUser)
            .select();

          console.log(`${error ? '❌ Error en inserción masiva' : '✅ Inserción masiva exitosa'}`);
          if (error) {
            console.log('Error:', error.message);
          }

          if (!error && data) {
            insertedCount = data.length;
            console.log(`✅ Inserción masiva exitosa con usuario autenticado: ${insertedCount} registros`);
          } else {
            throw new Error(`Inserción masiva falló: ${error?.message} (Code: ${error?.code})`);
          }
        } catch (massInsertError) {
          console.log('⚠️ Inserción masiva falló, intentando inserción individual...');
          
          // Fallback: Inserción individual
          let successCount = 0;
          
          for (const record of recordsWithAuthUser) {
            try {
              console.log(`📝 Insertando registro: ${record.num_guia}`);
              
              const { data: singleData, error: singleError } = await userSupabase
                .from('recepciones')
                .insert([record])
                .select();

              if (!singleError && singleData) {
                successCount++;
                console.log(`✅ Registro ${record.num_guia} insertado exitosamente`);
              } else {
                console.error(`❌ Error insertando registro ${record.num_guia}:`, singleError);
                errors.push(`Error insertando registro ${record.num_guia}: ${singleError?.message || 'Error desconocido'}`);
              }
            } catch (singleInsertError) {
              console.error(`❌ Excepción insertando registro ${record.num_guia}:`, singleInsertError);
              errors.push(`Excepción insertando registro ${record.num_guia}: ${singleInsertError}`);
            }
          }
          
          insertedCount = successCount;
          console.log(`✅ Inserción individual completada: ${successCount}/${parsedRecords.length} registros`);
        }
      }

    } else if (records && Array.isArray(records)) {
      console.log(`🔄 Insertando ${records.length} registros directamente...`);
      
      const recordsToInsert = records.map(record => ({
        fecha_recepcion: record.fecha_recepcion,
        producto_codigo: record.producto_codigo,
        proveedor: record.proveedor,
        num_guia: record.num_guia,
        volumen_m3: record.volumen_m3,
        certificacion: record.certificacion,
        rol: record.rol || null,
        comuna: record.comuna || null,
        user_id: validUserId // Usar el user_id válido
      }));

      console.log('🔧 INSERTANDO DIRECTAMENTE CON SUPABASE CLIENT (SIN FUNCIÓN)');
      console.log('📋 Primer registro a insertar:', recordsToInsert[0]);

      const { data, error } = await supabase
        .from('recepciones')
        .insert(recordsToInsert)
        .select();

      console.log('📊 RESULTADO INSERCIÓN DIRECTA:');
      console.log('- Error:', error);
      console.log('- Data length:', data?.length || 0);
      console.log('- Error completo:', JSON.stringify(error, null, 2));

      if (error) {
        console.error('❌ Error insertando registros:', error);
        return NextResponse.json(
          { error: 'Error insertando registros', details: error.message },
          { status: 500 }
        );
      }

      insertedCount = data?.length || 0;
    }

    console.log(`✅ Inserción completada: ${insertedCount} registros insertados`);

    return NextResponse.json({
      success: true,
      message: errors.length > 0 
        ? `Se insertaron ${insertedCount} registros con ${errors.length} errores`
        : `Se insertaron ${insertedCount} registros exitosamente`,
      inserted_count: insertedCount,
      errors: errors
    });

  } catch (error) {
    console.error('❌ Error en bulk-insert-recepciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}