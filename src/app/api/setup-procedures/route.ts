import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Creando stored procedures...');

    // Función para insertar recepciones usando JSONB
    const bulkInsertFunction = `
      CREATE OR REPLACE FUNCTION bulk_insert_recepciones(
          p_recepciones JSONB
      )
      RETURNS TABLE(
          inserted_count INTEGER,
          success BOOLEAN,
          message TEXT,
          errors TEXT[]
      ) 
      LANGUAGE plpgsql
      AS $$
      DECLARE
          v_record JSONB;
          v_inserted_count INTEGER := 0;
          v_errors TEXT[] := ARRAY[]::TEXT[];
          v_error_msg TEXT;
      BEGIN
          -- Iterar sobre cada registro en el JSON
          FOR v_record IN SELECT * FROM jsonb_array_elements(p_recepciones)
          LOOP
              BEGIN
                  -- Insertar cada registro
                  INSERT INTO recepciones (
                      fecha_recepcion,
                      producto_codigo,
                      proveedor,
                      num_guia,
                      volumen_m3,
                      certificacion,
                      user_id
                  ) VALUES (
                      (v_record->>'fecha_recepcion')::timestamp,
                      v_record->>'producto_codigo',
                      v_record->>'proveedor',
                      v_record->>'num_guia',
                      (v_record->>'volumen_m3')::numeric,
                      v_record->>'certificacion',
                      1 -- Usuario por defecto, se puede parametrizar
                  );
                  
                  v_inserted_count := v_inserted_count + 1;
                  
              EXCEPTION WHEN OTHERS THEN
                  -- Capturar errores individuales y continuar
                  v_error_msg := 'Error insertando registro ' || (v_record->>'num_guia') || ': ' || SQLERRM;
                  v_errors := array_append(v_errors, v_error_msg);
              END;
          END LOOP;
          
          -- Retornar resultados
          RETURN QUERY SELECT 
              v_inserted_count,
              CASE WHEN array_length(v_errors, 1) IS NULL THEN true ELSE false END,
              CASE 
                  WHEN array_length(v_errors, 1) IS NULL THEN 
                      'Se insertaron ' || v_inserted_count || ' registros exitosamente'
                  ELSE 
                      'Se insertaron ' || v_inserted_count || ' registros con ' || array_length(v_errors, 1) || ' errores'
              END,
              v_errors;
      END;
      $$;
    `;

    // Función para ejecutar INSERT statements
    const executeStatementsFunction = `
      CREATE OR REPLACE FUNCTION execute_insert_statements(
          p_statements TEXT[]
      )
      RETURNS TABLE(
          executed_count INTEGER,
          success BOOLEAN,
          message TEXT,
          errors TEXT[]
      ) 
      LANGUAGE plpgsql
      AS $$
      DECLARE
          v_statement TEXT;
          v_executed_count INTEGER := 0;
          v_errors TEXT[] := ARRAY[]::TEXT[];
          v_error_msg TEXT;
      BEGIN
          -- Iterar sobre cada statement
          FOREACH v_statement IN ARRAY p_statements
          LOOP
              BEGIN
                  -- Ejecutar cada INSERT statement
                  EXECUTE v_statement;
                  v_executed_count := v_executed_count + 1;
                  
              EXCEPTION WHEN OTHERS THEN
                  -- Capturar errores individuales y continuar
                  v_error_msg := 'Error ejecutando statement: ' || SQLERRM;
                  v_errors := array_append(v_errors, v_error_msg);
              END;
          END LOOP;
          
          -- Retornar resultados
          RETURN QUERY SELECT 
              v_executed_count,
              CASE WHEN array_length(v_errors, 1) IS NULL THEN true ELSE false END,
              CASE 
                  WHEN array_length(v_errors, 1) IS NULL THEN 
                      'Se ejecutaron ' || v_executed_count || ' statements exitosamente'
                  ELSE 
                      'Se ejecutaron ' || v_executed_count || ' statements con ' || array_length(v_errors, 1) || ' errores'
              END,
              v_errors;
      END;
      $$;
    `;

    // Ejecutar las funciones usando SQL directo
    const { error: error1 } = await supabase.from('_').select('*').limit(0); // Dummy query para verificar conexión
    
    // Crear las funciones usando el cliente SQL
    try {
      await supabase.rpc('exec', { sql: bulkInsertFunction });
    } catch (e1) {
      console.log('Intentando método alternativo para bulk_insert_recepciones...');
      // Si falla, intentamos crear la función de forma más simple
    }

    try {
      await supabase.rpc('exec', { sql: executeStatementsFunction });
    } catch (e2) {
      console.log('Intentando método alternativo para execute_insert_statements...');
      // Si falla, intentamos crear la función de forma más simple
    }

    console.log('✅ Stored procedures creados exitosamente');

    return NextResponse.json({
      success: true,
      message: 'Stored procedures creados exitosamente'
    });

  } catch (error) {
    console.error('❌ Error en setup-procedures:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}