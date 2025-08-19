'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import ToastContainer from './ToastContainer'

interface UserFunction {
  id: number
  function_name: string
  function_description: string
  function_code: string
  is_active: boolean
  created_at: string
}

interface UserFunctionsManagerProps {
  isOpen: boolean
  onClose: () => void
  onFunctionSelect?: (functionId: number, functionName: string) => void
}

export default function UserFunctionsManager({ isOpen, onClose, onFunctionSelect }: UserFunctionsManagerProps) {
  const { user } = useAuth()
  const { toasts, showToast, removeToast } = useToast()
  const [functions, setFunctions] = useState<UserFunction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newFunctionName, setNewFunctionName] = useState('')
  const [newFunctionDescription, setNewFunctionDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isExecuting, setIsExecuting] = useState<number | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [executionResult, setExecutionResult] = useState<unknown>(null)
  const [isInserting, setIsInserting] = useState(false)
  const [insertResult, setInsertResult] = useState<unknown>(null)

  const loadUserFunctions = useCallback(async () => {
    setIsLoading(true)
    try {
      if (!user) {
        console.log('⚠️ No hay usuario autenticado')
        setFunctions([])
        return
      }

      console.log(`🔍 Cargando funciones para usuario: ${user.id}`)

      // Cargar funciones personalizadas del usuario
      const response = await fetch(`/api/python-functions?userId=${user.id}`)
      if (!response.ok) {
        throw new Error('Error cargando funciones personalizadas')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Error cargando funciones')
      }

      console.log(`✅ Funciones cargadas: ${result.functions.length}`)
      console.log('📋 Funciones:', result.functions)

      // Convertir las funciones al formato esperado
      const userFunctions = result.functions.map((func: unknown) => ({
        id: func.id,
        function_name: func.function_name,
        function_description: func.function_description,
        function_code: 'python_function', // Marcar como función Python
        is_active: func.is_active,
        created_at: new Date().toISOString(),
        user_specific: func.user_specific || false,
        file_path: func.file_path || null
      }))

      setFunctions(userFunctions)
    } catch (error) {
      console.error('Error loading user functions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (isOpen) {
      loadUserFunctions()
    }
  }, [isOpen, loadUserFunctions])

  const createFunction = async () => {
    if (!user || !newFunctionName.trim()) return

    setIsCreating(true)
    try {
      const { data, error } = await supabase
        .from('user_functions')
        .insert({
          user_id: user.id,
          function_name: newFunctionName.trim(),
          function_description: newFunctionDescription.trim(),
          function_code: '', // Se llenará cuando el proveedor implemente la función
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      // Recargar la lista
      await loadUserFunctions()

      // Limpiar el formulario
      setNewFunctionName('')
      setNewFunctionDescription('')

      alert('Función creada exitosamente. El proveedor implementará la lógica específica para tu caso.')
    } catch (error) {
      console.error('Error creating function:', error)
      alert('Error al crear la función')
    } finally {
      setIsCreating(false)
    }
  }

  const toggleFunctionStatus = async (functionId: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_functions')
        .update({ is_active: !currentStatus })
        .eq('id', functionId)
        .eq('user_id', user?.id)

      if (error) throw error
      await loadUserFunctions()
    } catch (error) {
      console.error('Error updating function status:', error)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      showToast('info', `Archivo seleccionado: ${file.name}`)
    }
  }

  const executeFunction = async (func: UserFunction) => {
    if (!selectedFile) {
      showToast('warning', 'Por favor selecciona un archivo primero')
      return
    }

    if (!user) {
      showToast('error', 'Debes estar autenticado para ejecutar funciones')
      return
    }

    setIsExecuting(func.id)
    
    // DEBUG: Log de la función que se está ejecutando
    console.log('🎯 EJECUTANDO FUNCIÓN:', func.id, func.function_name)

    try {
      showToast('info', 'Iniciando procesamiento del archivo...')

      // Crear FormData para enviar el archivo y los parámetros
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('functionId', func.id.toString())
      formData.append('userId', user?.id || '11111111-1111-1111-1111-111111111111')

      // Llamar a la API para ejecutar la función
      const response = await fetch('/api/execute-function', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        showToast('success', `¡Procesamiento completado! ${result.records_processed || 0} registros procesados exitosamente`)
        
        // FORZAR DETECCIÓN PARA FUNCIONES DE VENTAS (ID 3 y 4)
        if (func.id === 3 || func.id === 4) {
          console.log(`🎯 FUNCIÓN ID ${func.id} DETECTADA - FORZANDO TIPO VENTAS`)
          result.function_type = 'ventas'
        }
        
        setExecutionResult(result)
        setSelectedFile(null)

        // Limpiar el input de archivo
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        if (fileInput) {
          fileInput.value = ''
        }
      } else {
        throw new Error(result.error || 'Error desconocido en el procesamiento')
      }

    } catch (error) {
      console.error('Error executing function:', error)
      showToast('error', `Error al ejecutar la función: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setIsExecuting(null)
    }
  }

  const insertRecordsToDatabase = async () => {
    if (!executionResult || !executionResult.insert_statements) {
      showToast('error', 'No hay registros para insertar')
      return
    }

    setIsInserting(true)
    // NO limpiar insertResult aquí para mantener resultados anteriores visibles

    try {
      showToast('info', `Insertando ${executionResult.insert_statements.length} registros en la base de datos...`)

      // Obtener el token de autenticación del usuario actual
      const { data: { session } } = await supabase.auth.getSession()
      const authToken = session?.access_token

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      // Agregar token de autenticación si existe
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
        console.log('✅ Enviando token de autenticación con la request')
      } else {
        console.log('⚠️ No se encontró token de autenticación, usando fallback')
      }

      // Determinar qué API usar basado en el tipo de INSERT statements
      const firstStatement = executionResult.insert_statements[0]
      let apiEndpoint = '/api/bulk-insert-recepciones' // Default
      let tableType = 'recepciones'

      console.log('🔍 DEBUG - Primer INSERT statement:', firstStatement)
      console.log('🔍 DEBUG - Total statements:', executionResult.insert_statements.length)
      console.log('🔍 DEBUG - Contiene "INSERT INTO ventas"?', firstStatement?.includes('INSERT INTO ventas'))
      console.log('🔍 DEBUG - Contiene "INSERT INTO recepciones"?', firstStatement?.includes('INSERT INTO recepciones'))
      console.log('🔍 DEBUG - Function type forzado:', executionResult.function_type)

      // SOLUCIÓN DE EMERGENCIA: FORZAR SIEMPRE VENTAS SI CONTIENE "MASISA"
      console.log('🚨 SOLUCIÓN DE EMERGENCIA ACTIVADA')
      console.log('🔍 Buscando MASISA en statement:', firstStatement?.includes('MASISA'))
      console.log('🔍 Buscando ARAUCO en statement:', firstStatement?.includes('ARAUCO'))
      console.log('🔍 Buscando INSERT INTO ventas:', firstStatement?.includes('INSERT INTO ventas'))
      
      if (firstStatement && firstStatement.includes('ARAUCO')) {
        apiEndpoint = '/api/bulk-insert-ventas-arauco'
        tableType = 'ventas'
        console.log('🔥 DETECTADO ARAUCO - USANDO ENDPOINT ARAUCO')
        console.log('🔍 Statement completo:', firstStatement)
      } else if (firstStatement && (firstStatement.includes('MASISA') || firstStatement.includes('INSERT INTO ventas'))) {
        apiEndpoint = '/api/bulk-insert-ventas'
        tableType = 'ventas'
        console.log('🎯 DETECTADO MASISA - USANDO ENDPOINT MASISA')
        console.log('🔍 Statement completo:', firstStatement)
      } else {
        apiEndpoint = '/api/bulk-insert-recepciones'
        tableType = 'recepciones'
        console.log('❌ NO SE DETECTÓ CLIENTE ESPECÍFICO - USANDO RECEPCIONES')
        console.log('🔍 Statement completo:', firstStatement)
      }

      console.log(`🎯 Insertando en tabla: ${tableType} usando endpoint: ${apiEndpoint}`)

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          insert_statements: executionResult.insert_statements
        })
      })

      const result = await response.json()

      if (result.success && result.inserted_count > 0) {
        showToast('success', `¡Inserción completada! ${result.inserted_count} registros insertados exitosamente en ${tableType}`)
        setInsertResult(result)
        // Solo limpiar los resultados si la inserción fue 100% exitosa
        if (result.inserted_count === executionResult.insert_statements.length) {
          setExecutionResult(null)
        }
      } else if (result.success && result.inserted_count === 0) {
        showToast('warning', 'No se insertaron registros. Revisa los errores.')
        setInsertResult(result)
        // NO limpiar executionResult para permitir reintentos
      } else {
        // Mostrar error pero mantener los datos para reintentar
        showToast('error', `Error en la inserción: ${result.error || 'Error desconocido'}`)
        setInsertResult(result)
        // NO limpiar executionResult para permitir reintentos
      }

    } catch (error) {
      console.error('Error inserting records:', error)
      showToast('error', `Error al insertar registros: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      // NO limpiar executionResult para permitir reintentos
      setInsertResult({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        inserted_count: 0,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      })
    } finally {
      setIsInserting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Gestión de Funciones Personalizadas</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Formulario para crear nueva función */}
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">Crear Nueva Función</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Función *
              </label>
              <input
                type="text"
                value={newFunctionName}
                onChange={(e) => setNewFunctionName(e.target.value)}
                placeholder="Ej: Procesar Reporte Mensual Excel"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={newFunctionDescription}
                onChange={(e) => setNewFunctionDescription(e.target.value)}
                placeholder="Describe qué tipo de documento procesa y qué información extrae..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={createFunction}
              disabled={isCreating || !newFunctionName.trim()}
              className="treetracker-button-primary px-4 py-2 rounded-md disabled:opacity-50"
            >
              {isCreating ? 'Creando...' : 'Crear Función'}
            </button>
          </div>
        </div>

        {/* Sección de ejecución de funciones */}
        {functions.length > 0 && (
          <div className="mb-6 p-4 border rounded-lg bg-green-50">
            <h3 className="text-lg font-semibold mb-4">Ejecutar Función</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Archivo
                </label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".xlsx,.xls,.csv"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {selectedFile && (
                  <p className="text-sm text-green-600 mt-1">
                    Archivo seleccionado: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lista de funciones existentes */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Funciones Disponibles</h3>
          {isLoading ? (
            <div className="text-center py-4">Cargando funciones...</div>
          ) : functions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tienes funciones personalizadas aún. Crea tu primera función arriba.
            </div>
          ) : (
            <div className="space-y-3">
              {functions.map((func) => (
                <div
                  key={func.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{func.function_name}</h4>
                      {func.function_description && (
                        <p className="text-gray-600 text-sm mt-1">{func.function_description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Creada: {new Date(func.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {func.function_code && (
                        <button
                          onClick={() => executeFunction(func)}
                          disabled={isExecuting === func.id || !selectedFile}
                          className={`px-3 py-1 text-sm rounded ${isExecuting === func.id
                              ? 'bg-yellow-100 text-yellow-800 cursor-not-allowed'
                              : selectedFile
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                          {isExecuting === func.id ? 'Ejecutando...' : 'Ejecutar'}
                        </button>
                      )}
                      {onFunctionSelect && (
                        <button
                          onClick={() => onFunctionSelect(func.id, func.function_name)}
                          className="treetracker-button-primary px-3 py-1 text-sm rounded"
                        >
                          Usar
                        </button>
                      )}
                      <button
                        onClick={() => toggleFunctionStatus(func.id, func.is_active)}
                        className={`px-3 py-1 text-sm rounded ${func.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                      >
                        {func.is_active ? 'Activa' : 'Inactiva'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resultados del procesamiento */}
        {executionResult && (
          <div className="mt-6 p-4 border rounded-lg bg-green-50">
            <h3 className="text-lg font-semibold mb-4 text-green-800">📊 Resultados del Procesamiento</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white p-3 rounded border">
                <div className="text-2xl font-bold text-green-600">{executionResult.records_processed || 0}</div>
                <div className="text-sm text-gray-600">Registros Procesados</div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="text-2xl font-bold text-blue-600">{executionResult.sheets_processed || 0}</div>
                <div className="text-sm text-gray-600">Hojas Procesadas</div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="text-2xl font-bold text-purple-600">{executionResult.insert_statements?.length || 0}</div>
                <div className="text-sm text-gray-600">Statements Generados</div>
              </div>
            </div>

            {executionResult.errors && executionResult.errors.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Advertencias:</h4>
                <ul className="text-sm text-yellow-700 list-disc list-inside">
                  {executionResult.errors.map((error: string, index: number) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <p className="font-medium">{executionResult.message}</p>
                <p>Los datos están listos para ser insertados en la base de datos.</p>
              </div>
              <button
                onClick={insertRecordsToDatabase}
                disabled={isInserting || !executionResult.insert_statements?.length}
                className={`px-6 py-2 rounded-md font-medium ${isInserting
                    ? 'bg-yellow-100 text-yellow-800 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
              >
                {isInserting ? 'Insertando...' : '💾 Insertar en Base de Datos'}
              </button>
            </div>
          </div>
        )}

        {/* Resultado de la inserción */}
        {insertResult && (
          <div className="mt-4 p-4 border rounded-lg bg-blue-50">
            <h3 className="text-lg font-semibold mb-2 text-blue-800">✅ Inserción Completada</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded border">
                <div className="text-2xl font-bold text-green-600">{insertResult.inserted_count || 0}</div>
                <div className="text-sm text-gray-600">Registros Insertados</div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="text-2xl font-bold text-red-600">{insertResult.errors?.length || 0}</div>
                <div className="text-sm text-gray-600">Errores</div>
              </div>
            </div>

            {insertResult.errors && insertResult.errors.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                <h4 className="font-semibold text-red-800 mb-2">❌ Errores en la inserción:</h4>
                <ul className="text-sm text-red-700 list-disc list-inside max-h-32 overflow-y-auto">
                  {insertResult.errors.map((error: string, index: number) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-sm text-blue-700 mt-3">{insertResult.message}</p>
          </div>
        )}

        <div className="mt-6 text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">ℹ️ Información Importante:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Las funciones personalizadas son implementadas específicamente para tus necesidades</li>
            <li>Una vez creada la función, el proveedor desarrollará la lógica de procesamiento</li>
            <li>Podrás usar estas funciones para cargar documentos y actualizar automáticamente tu balance</li>
            <li>Cada función puede procesar diferentes tipos de documentos (Excel, CSV, PDF, etc.)</li>
          </ul>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}