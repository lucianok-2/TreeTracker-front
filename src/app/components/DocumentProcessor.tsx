'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'

interface UserFunction {
  id: number
  function_name: string
  function_description: string
  function_code: string
}

interface ProcessingHistory {
  id: number
  function_name: string
  file_name: string
  processing_status: string
  records_processed: number
  error_message: string | null
  processed_at: string
}

interface DocumentProcessorProps {
  isOpen: boolean
  onClose: () => void
  onProcessingComplete?: () => void
}

export default function DocumentProcessor({ isOpen, onClose, onProcessingComplete }: DocumentProcessorProps) {
  const { user } = useAuth()
  const [functions, setFunctions] = useState<UserFunction[]>([])
  const [selectedFunction, setSelectedFunction] = useState<number | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingHistory, setProcessingHistory] = useState<ProcessingHistory[]>([])
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    if (isOpen && user) {
      loadUserFunctions()
      loadProcessingHistory()
    }
  }, [isOpen, user])

  const loadUserFunctions = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_functions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('function_name')

      if (error) throw error
      setFunctions(data || [])
    } catch (error) {
      console.error('Error loading user functions:', error)
    }
  }

  const loadProcessingHistory = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('document_processing_history')
        .select(`
          *,
          user_functions!inner(function_name)
        `)
        .eq('user_id', user.id)
        .order('processed_at', { ascending: false })
        .limit(10)

      if (error) throw error
      
      const formattedHistory = data?.map(item => ({
        id: item.id,
        function_name: item.user_functions.function_name,
        file_name: item.file_name,
        processing_status: item.processing_status,
        records_processed: item.records_processed,
        error_message: item.error_message,
        processed_at: item.processed_at
      })) || []

      setProcessingHistory(formattedHistory)
    } catch (error) {
      console.error('Error loading processing history:', error)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const processDocument = async () => {
    if (!selectedFunction || !selectedFile || !user) return

    setIsProcessing(true)
    
    try {
      // Registrar el inicio del procesamiento
      const { data: historyRecord, error: historyError } = await supabase
        .from('document_processing_history')
        .insert({
          user_id: user.id,
          function_id: selectedFunction,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          processing_status: 'processing'
        })
        .select()
        .single()

      if (historyError) throw historyError

      // Aquí iría la lógica de procesamiento del documento
      // Por ahora, simularemos el procesamiento
      await simulateProcessing(historyRecord.id)
      
      // Recargar historial
      await loadProcessingHistory()
      
      // Limpiar formulario
      setSelectedFile(null)
      setSelectedFunction(null)
      
      if (onProcessingComplete) {
        onProcessingComplete()
      }
      
      alert('Documento procesado exitosamente')
      
    } catch (error) {
      console.error('Error processing document:', error)
      alert('Error al procesar el documento')
    } finally {
      setIsProcessing(false)
    }
  }

  // Simulación del procesamiento (esto será reemplazado por la lógica real)
  const simulateProcessing = async (historyId: number) => {
    // Simular tiempo de procesamiento
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Actualizar el estado del procesamiento
    await supabase
      .from('document_processing_history')
      .update({
        processing_status: 'completed',
        records_processed: Math.floor(Math.random() * 100) + 1
      })
      .eq('id', historyId)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'processing': return 'text-blue-600 bg-blue-100'
      case 'error': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completado'
      case 'processing': return 'Procesando'
      case 'error': return 'Error'
      case 'pending': return 'Pendiente'
      default: return status
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Procesador de Documentos</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Selector de función */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar Función de Procesamiento *
          </label>
          <select
            value={selectedFunction || ''}
            onChange={(e) => setSelectedFunction(Number(e.target.value) || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Selecciona una función...</option>
            {functions.map((func) => (
              <option key={func.id} value={func.id}>
                {func.function_name}
              </option>
            ))}
          </select>
          {functions.length === 0 && (
            <p className="text-sm text-gray-500 mt-1">
              No tienes funciones disponibles. Crea una función primero.
            </p>
          )}
        </div>

        {/* Área de carga de archivos */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cargar Documento *
          </label>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center ${
              dragActive
                ? 'border-green-400 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div>
                <p className="text-green-600 font-medium">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-red-500 text-sm mt-2 hover:underline"
                >
                  Remover archivo
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">
                  Arrastra y suelta tu archivo aquí, o
                </p>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  accept=".xlsx,.xls,.csv,.pdf,.txt"
                />
                <label
                  htmlFor="file-upload"
                  className="treetracker-button-secondary px-4 py-2 rounded cursor-pointer"
                >
                  Seleccionar archivo
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Formatos soportados: Excel, CSV, PDF, TXT
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Botón de procesamiento */}
        <div className="mb-6">
          <button
            onClick={processDocument}
            disabled={!selectedFunction || !selectedFile || isProcessing}
            className="treetracker-button-primary px-6 py-2 rounded disabled:opacity-50"
          >
            {isProcessing ? 'Procesando...' : 'Procesar Documento'}
          </button>
        </div>

        {/* Historial de procesamiento */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Historial de Procesamiento</h3>
          {processingHistory.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No hay historial de procesamiento aún.
            </div>
          ) : (
            <div className="space-y-3">
              {processingHistory.map((record) => (
                <div
                  key={record.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{record.file_name}</h4>
                      <p className="text-sm text-gray-600">Función: {record.function_name}</p>
                      {record.records_processed > 0 && (
                        <p className="text-sm text-gray-600">
                          Registros procesados: {record.records_processed}
                        </p>
                      )}
                      {record.error_message && (
                        <p className="text-sm text-red-600 mt-1">{record.error_message}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(record.processed_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getStatusColor(record.processing_status)}`}
                    >
                      {getStatusText(record.processing_status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}